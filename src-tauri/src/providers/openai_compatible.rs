use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

const HTTP_TIMEOUT_SECS: u64 = 20;
const MAX_RETRIES: u32 = 2;
const RETRY_BASE_MS: u64 = 500;
const RETRY_MAX_BACKOFF_MS: u64 = 1_500;
const TOTAL_BUDGET_MS: u64 = 12_000;

#[derive(Debug, Clone, Copy)]
pub struct LlmRequestPolicy {
    pub total_budget_ms: u64,
    pub per_attempt_timeout_ms: u64,
    pub max_retries: u32,
    pub retry_base_ms: u64,
    pub retry_max_backoff_ms: u64,
    pub enable_fast_fallback: bool,
}

#[derive(Debug, Clone, Default)]
pub struct LlmRequestTelemetry {
    pub retry_count: u32,
    pub fallback_used: bool,
    pub fallback_reason: Option<&'static str>,
}

impl Default for LlmRequestPolicy {
    fn default() -> Self {
        Self {
            total_budget_ms: TOTAL_BUDGET_MS,
            per_attempt_timeout_ms: HTTP_TIMEOUT_SECS * 1000,
            max_retries: MAX_RETRIES,
            retry_base_ms: RETRY_BASE_MS,
            retry_max_backoff_ms: RETRY_MAX_BACKOFF_MS,
            enable_fast_fallback: true,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatRequest<'a> {
    pub model: &'a str,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub models: Vec<&'a str>,
    pub messages: Vec<ChatMessage<'a>>,
    pub temperature: f32,
    pub max_tokens: u16,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatMessage<'a> {
    pub role: &'a str,
    pub content: &'a str,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: ResponseMessage,
}

#[derive(Debug, Deserialize)]
struct ResponseMessage {
    content: serde_json::Value,
}

/// Send a raw chat completion request to an OpenAI-compatible endpoint.
///
/// Returns `(raw_text, parse_error_prefix)` — the `parse_error_prefix` is
/// pre-filled as `"LLM returned invalid JSON: "` for the caller to use
/// if JSON parsing later fails.
#[allow(clippy::too_many_arguments)]
pub async fn request_card_raw_text(
    base_url: &str,
    model: &str,
    fallback_models: &[&str],
    api_key: Option<&str>,
    system_prompt: &str,
    user_prompt: &str,
    max_tokens: u16,
    policy: LlmRequestPolicy,
) -> Result<(String, String, LlmRequestTelemetry), String> {
    let request = ChatRequest {
        model: model.trim(),
        models: fallback_models.to_vec(),
        messages: vec![
            ChatMessage {
                role: "system",
                content: system_prompt,
            },
            ChatMessage {
                role: "user",
                content: user_prompt,
            },
        ],
        temperature: 0.25,
        max_tokens,
    };

    let endpoint = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let response = {
        let started = Instant::now();
        let mut last_err = "LLM_REQUEST_FAILED: unknown transport error".to_string();
        let mut resolved = None;
        let mut telemetry = LlmRequestTelemetry::default();
        let mut selected_model = model.trim().to_string();
        let mut fallback_applied = false;

        for attempt in 0..=policy.max_retries {
            if attempt > 0 {
                telemetry.retry_count += 1;
                let backoff = (policy.retry_base_ms.saturating_mul(2u64.pow(attempt - 1)))
                    .min(policy.retry_max_backoff_ms);
                tokio::time::sleep(Duration::from_millis(backoff)).await;
            }
            let elapsed_ms = started.elapsed().as_millis() as u64;
            if elapsed_ms >= policy.total_budget_ms {
                last_err = format!(
                    "LLM_BUDGET_EXCEEDED: llm budget exceeded elapsed_ms={elapsed_ms} budget_ms={}",
                    policy.total_budget_ms
                );
                break;
            }
            let remaining_ms = policy.total_budget_ms - elapsed_ms;
            let timeout_ms = remaining_ms.min(policy.per_attempt_timeout_ms).max(1);
            let client = reqwest::Client::builder()
                .timeout(Duration::from_millis(timeout_ms))
                .build()
                .map_err(|err| format!("LLM client: {err}"))?;
            let mut local_request = request.clone();
            local_request.model = selected_model.as_str();
            local_request.models = vec![];
            let mut req = client.post(&endpoint).json(&local_request);
            if let Some(token) = api_key.filter(|value| !value.trim().is_empty()) {
                req = req.bearer_auth(token);
            }
            match req.send().await {
                Ok(resp) if resp.status().is_server_error() && attempt < policy.max_retries => {
                    last_err = format!(
                        "LLM_RETRYABLE_5XX: LLM server error {} retry_reason=http_5xx",
                        resp.status()
                    );
                    if policy.enable_fast_fallback
                        && !fallback_applied
                        && !fallback_models.is_empty()
                    {
                        selected_model = fallback_models[0].to_string();
                        fallback_applied = true;
                        telemetry.fallback_used = true;
                        telemetry.fallback_reason = Some("http_5xx");
                    }
                    continue;
                }
                Ok(resp) => {
                    resolved = Some((resp, telemetry));
                    break;
                }
                Err(err)
                    if (err.is_timeout() || err.is_connect()) && attempt < policy.max_retries =>
                {
                    let reason = if err.is_timeout() {
                        "timeout"
                    } else {
                        "connect"
                    };
                    last_err =
                        format!("LLM_RETRYABLE: LLM request failed retry_reason={reason}: {err}");
                    if policy.enable_fast_fallback
                        && !fallback_applied
                        && !fallback_models.is_empty()
                    {
                        selected_model = fallback_models[0].to_string();
                        fallback_applied = true;
                        telemetry.fallback_used = true;
                        telemetry.fallback_reason = Some(reason);
                    }
                    continue;
                }
                Err(err) => return Err(format!("LLM_REQUEST_FAILED: LLM request failed: {err}")),
            }
        }
        resolved.ok_or(last_err)?
    };
    let (response, telemetry) = response;

    if !response.status().is_success() {
        let status = response.status();
        // Privacy: intentionally discard response body to avoid logging
        // potentially sensitive error payloads from the LLM provider.
        let _ = response.text().await;
        return Err(format!("LLM_HTTP_ERROR: LLM error {status}"));
    }

    let payload: ChatResponse = response
        .json()
        .await
        .map_err(|err| format!("LLM_PARSE_FAILED: LLM response parse failed: {err}"))?;
    let content = payload
        .choices
        .first()
        .ok_or_else(|| "LLM_EMPTY: LLM returned no choices.".to_string())?
        .message
        .content
        .clone();

    let raw_text = match content {
        serde_json::Value::String(value) => value,
        serde_json::Value::Array(items) => items
            .iter()
            .filter_map(|item| item.get("text").and_then(|value| value.as_str()))
            .collect::<Vec<_>>()
            .join("\n"),
        other => other.to_string(),
    };

    Ok((
        raw_text,
        "LLM returned invalid JSON: ".to_string(),
        telemetry,
    ))
}

#[cfg(test)]
mod tests {
    use super::{ChatMessage, ChatRequest, LlmRequestPolicy, LlmRequestTelemetry};

    #[test]
    fn request_payload_includes_models_when_present() {
        let req = ChatRequest {
            model: "openai/gpt-4o-mini",
            models: vec!["anthropic/claude-3.5-haiku"],
            messages: vec![ChatMessage {
                role: "user",
                content: "ping",
            }],
            temperature: 0.25,
            max_tokens: 64,
        };
        let raw = serde_json::to_string(&req).expect("serialize request");
        assert!(raw.contains("\"models\":[\"anthropic/claude-3.5-haiku\"]"));
    }

    #[test]
    fn request_payload_omits_models_when_empty() {
        let req = ChatRequest {
            model: "gpt-4o-mini",
            models: vec![],
            messages: vec![ChatMessage {
                role: "user",
                content: "ping",
            }],
            temperature: 0.25,
            max_tokens: 64,
        };
        let raw = serde_json::to_string(&req).expect("serialize request");
        assert!(!raw.contains("\"models\""));
    }

    #[test]
    fn default_policy_uses_bounded_budget_and_retry() {
        let policy = LlmRequestPolicy::default();
        assert_eq!(policy.total_budget_ms, 12_000);
        assert_eq!(policy.max_retries, 2);
        assert!(policy.enable_fast_fallback);
    }

    #[test]
    fn telemetry_defaults_to_no_retry_no_fallback() {
        let telemetry = LlmRequestTelemetry::default();
        assert_eq!(telemetry.retry_count, 0);
        assert!(!telemetry.fallback_used);
        assert_eq!(telemetry.fallback_reason, None);
    }
}
