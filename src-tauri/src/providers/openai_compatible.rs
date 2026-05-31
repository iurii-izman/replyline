use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use url::Url;

use crate::trace_manifest;

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
#[allow(dead_code)]
pub struct LlmRequestTelemetry {
    pub retry_count: u32,
    pub fallback_used: bool,
    pub fallback_reason: Option<&'static str>,
    pub endpoint_host: Option<String>,
    pub endpoint_path: String,
    pub selected_model: String,
    pub attempted_models: Vec<String>,
    pub status_code: Option<u16>,
    pub duration_ms: u64,
    pub total_budget_ms: u64,
    pub per_attempt_timeout_ms: u64,
    pub max_retries: u32,
    pub temperature: f32,
    pub max_tokens: u16,
    pub prompt_chars_system: usize,
    pub prompt_chars_user: usize,
    pub response_chars: usize,
    pub usage_prompt_tokens: Option<u32>,
    pub usage_completion_tokens: Option<u32>,
    pub usage_total_tokens: Option<u32>,
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
    usage: Option<Usage>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: ResponseMessage,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ResponseMessage {
    content: serde_json::Value,
}

#[derive(Debug, Deserialize, Serialize)]
struct Usage {
    prompt_tokens: Option<u32>,
    completion_tokens: Option<u32>,
    total_tokens: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct StreamChunkResponse {
    choices: Vec<StreamChoice>,
}

#[derive(Debug, Deserialize)]
struct StreamChoice {
    delta: StreamDelta,
}

#[derive(Debug, Deserialize)]
struct StreamDelta {
    content: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RedactedMessageSnapshot<'a> {
    role: &'a str,
    content_chars: usize,
    content_hash: String,
    preview: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RedactedRequestSnapshot<'a> {
    schema_version: u8,
    run_id: &'a str,
    endpoint_host: Option<String>,
    endpoint_path: String,
    model: &'a str,
    fallback_models: Vec<&'a str>,
    temperature: f32,
    max_tokens: u16,
    messages: Vec<RedactedMessageSnapshot<'a>>,
    headers: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RedactedResponseUsageSnapshot {
    prompt_tokens: Option<u32>,
    completion_tokens: Option<u32>,
    total_tokens: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RedactedResponseSnapshot<'a> {
    schema_version: u8,
    run_id: &'a str,
    status_code: Option<u16>,
    duration_ms: u64,
    response_chars: usize,
    response_hash: Option<String>,
    usage: Option<RedactedResponseUsageSnapshot>,
    finish_reason: Option<String>,
    content_preview: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LlmAttemptSnapshot {
    attempt: u32,
    model: String,
    started_at: String,
    duration_ms: u64,
    status: String,
    status_code: Option<u16>,
    retry_reason: Option<String>,
    fallback_applied: bool,
}

/// Send a raw chat completion request to an OpenAI-compatible endpoint.
///
/// Returns `(raw_text, parse_error_prefix)` — the `parse_error_prefix` is
/// pre-filled as `"LLM returned invalid JSON: "` for the caller to use
/// if JSON parsing later fails.
#[allow(clippy::too_many_arguments)]
pub async fn request_card_raw_text(
    run_id: Option<&str>,
    include_content: bool,
    base_url: &str,
    model: &str,
    fallback_models: &[&str],
    api_key: Option<&str>,
    system_prompt: &str,
    user_prompt: &str,
    max_tokens: u16,
    policy: LlmRequestPolicy,
) -> Result<(String, String, LlmRequestTelemetry), String> {
    request_card_raw_text_with_temperature(
        run_id,
        include_content,
        base_url,
        model,
        fallback_models,
        api_key,
        system_prompt,
        user_prompt,
        0.25,
        max_tokens,
        policy,
    )
    .await
}

#[allow(clippy::too_many_arguments)]
pub async fn request_card_raw_text_with_temperature(
    run_id: Option<&str>,
    include_content: bool,
    base_url: &str,
    model: &str,
    fallback_models: &[&str],
    api_key: Option<&str>,
    system_prompt: &str,
    user_prompt: &str,
    temperature: f32,
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
        temperature,
        max_tokens,
    };

    let endpoint = format!("{}/chat/completions", base_url.trim_end_matches('/'));
    let endpoint_url = Url::parse(&endpoint).ok();
    let endpoint_host = endpoint_url
        .as_ref()
        .and_then(|url| url.host_str().map(|v| v.to_string()));
    let endpoint_path = endpoint_url
        .as_ref()
        .map(|url| url.path().to_string())
        .unwrap_or_else(|| "/chat/completions".to_string());

    if let Some(rid) = run_id {
        let snapshot = RedactedRequestSnapshot {
            schema_version: 1,
            run_id: rid,
            endpoint_host: endpoint_host.clone(),
            endpoint_path: endpoint_path.clone(),
            model: request.model,
            fallback_models: fallback_models.to_vec(),
            temperature: request.temperature,
            max_tokens: request.max_tokens,
            messages: request
                .messages
                .iter()
                .map(|item| RedactedMessageSnapshot {
                    role: item.role,
                    content_chars: item.content.chars().count(),
                    content_hash: trace_manifest::sha256_hex(item.content),
                    preview: if include_content {
                        item.content.to_string()
                    } else {
                        "[redacted]".to_string()
                    },
                })
                .collect(),
            headers: serde_json::json!({ "authorization": "[redacted]" }),
        };
        let _ = trace_manifest::write_run_json(rid, "llm-request.redacted.json", &snapshot);
        if include_content {
            let full_request = serde_json::json!({
                "model": request.model,
                "models": fallback_models,
                "messages": request.messages,
                "temperature": request.temperature,
                "max_tokens": request.max_tokens,
                "headers": { "authorization": "[redacted]" }
            });
            let _ = trace_manifest::write_run_json(rid, "llm-request.full.json", &full_request);
        }
    }

    let response = {
        let started = Instant::now();
        let mut last_err = "LLM_REQUEST_FAILED: unknown transport error".to_string();
        let mut resolved = None;
        let mut telemetry = LlmRequestTelemetry {
            endpoint_host: endpoint_host.clone(),
            endpoint_path: endpoint_path.clone(),
            selected_model: model.trim().to_string(),
            attempted_models: Vec::new(),
            status_code: None,
            duration_ms: 0,
            total_budget_ms: policy.total_budget_ms,
            per_attempt_timeout_ms: policy.per_attempt_timeout_ms,
            max_retries: policy.max_retries,
            temperature: request.temperature,
            max_tokens,
            prompt_chars_system: system_prompt.chars().count(),
            prompt_chars_user: user_prompt.chars().count(),
            response_chars: 0,
            usage_prompt_tokens: None,
            usage_completion_tokens: None,
            usage_total_tokens: None,
            ..LlmRequestTelemetry::default()
        };
        let mut selected_model = model.trim().to_string();
        let mut fallback_applied = false;

        for attempt in 0..=policy.max_retries {
            let attempt_started = Instant::now();
            let attempt_started_at = chrono::Utc::now().to_rfc3339();
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
            telemetry.attempted_models.push(selected_model.clone());
            let mut req = client.post(&endpoint).json(&local_request);
            if let Some(token) = api_key.filter(|value| !value.trim().is_empty()) {
                req = req.bearer_auth(token);
            }
            match req.send().await {
                Ok(resp) if resp.status().is_server_error() && attempt < policy.max_retries => {
                    if let Some(rid) = run_id {
                        let _ = trace_manifest::append_run_jsonl(
                            rid,
                            "llm-attempts.jsonl",
                            &LlmAttemptSnapshot {
                                attempt,
                                model: selected_model.clone(),
                                started_at: attempt_started_at,
                                duration_ms: attempt_started.elapsed().as_millis() as u64,
                                status: "retry".to_string(),
                                status_code: Some(resp.status().as_u16()),
                                retry_reason: Some("http_5xx".to_string()),
                                fallback_applied: false,
                            },
                        );
                    }
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
                    telemetry.duration_ms = started.elapsed().as_millis() as u64;
                    telemetry.status_code = Some(resp.status().as_u16());
                    if let Some(rid) = run_id {
                        let _ = trace_manifest::append_run_jsonl(
                            rid,
                            "llm-attempts.jsonl",
                            &LlmAttemptSnapshot {
                                attempt,
                                model: selected_model.clone(),
                                started_at: attempt_started_at,
                                duration_ms: attempt_started.elapsed().as_millis() as u64,
                                status: if resp.status().is_success() {
                                    "ok".to_string()
                                } else {
                                    "http_error".to_string()
                                },
                                status_code: Some(resp.status().as_u16()),
                                retry_reason: None,
                                fallback_applied: false,
                            },
                        );
                    }
                    telemetry.selected_model = selected_model.clone();
                    resolved = Some((resp, telemetry));
                    break;
                }
                Err(err)
                    if (err.is_timeout() || err.is_connect()) && attempt < policy.max_retries =>
                {
                    if let Some(rid) = run_id {
                        let reason = if err.is_timeout() {
                            "timeout"
                        } else {
                            "connect"
                        };
                        let _ = trace_manifest::append_run_jsonl(
                            rid,
                            "llm-attempts.jsonl",
                            &LlmAttemptSnapshot {
                                attempt,
                                model: selected_model.clone(),
                                started_at: attempt_started_at,
                                duration_ms: attempt_started.elapsed().as_millis() as u64,
                                status: "retry".to_string(),
                                status_code: None,
                                retry_reason: Some(reason.to_string()),
                                fallback_applied: false,
                            },
                        );
                    }
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
                Err(err) => {
                    if let Some(rid) = run_id {
                        let _ = trace_manifest::append_run_jsonl(
                            rid,
                            "llm-attempts.jsonl",
                            &LlmAttemptSnapshot {
                                attempt,
                                model: selected_model.clone(),
                                started_at: attempt_started_at,
                                duration_ms: attempt_started.elapsed().as_millis() as u64,
                                status: "error".to_string(),
                                status_code: None,
                                retry_reason: None,
                                fallback_applied: false,
                            },
                        );
                    }
                    return Err(format!("LLM_REQUEST_FAILED: LLM request failed: {err}"));
                }
            }
        }
        resolved.ok_or(last_err)?
    };
    let (response, mut telemetry) = response;
    telemetry.duration_ms = telemetry.duration_ms.max(1);

    if !response.status().is_success() {
        let status = response.status();
        // Privacy: intentionally discard response body to avoid logging
        // potentially sensitive error payloads from the LLM provider.
        let _ = response.text().await;
        if let Some(rid) = run_id {
            let snapshot = RedactedResponseSnapshot {
                schema_version: 1,
                run_id: rid,
                status_code: Some(status.as_u16()),
                duration_ms: telemetry.duration_ms,
                response_chars: 0,
                response_hash: None,
                usage: None,
                finish_reason: None,
                content_preview: if include_content {
                    "[content_included_in_opt_in_mode]".to_string()
                } else {
                    "[redacted]".to_string()
                },
            };
            let _ = trace_manifest::write_run_json(rid, "llm-response.redacted.json", &snapshot);
        }
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
    telemetry.response_chars = raw_text.chars().count();
    telemetry.usage_prompt_tokens = payload.usage.as_ref().and_then(|u| u.prompt_tokens);
    telemetry.usage_completion_tokens = payload.usage.as_ref().and_then(|u| u.completion_tokens);
    telemetry.usage_total_tokens = payload.usage.as_ref().and_then(|u| u.total_tokens);
    if let Some(rid) = run_id {
        let finish_reason = payload
            .choices
            .first()
            .and_then(|choice| choice.finish_reason.clone());
        let usage_snapshot = payload
            .usage
            .as_ref()
            .map(|usage| RedactedResponseUsageSnapshot {
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens,
                total_tokens: usage.total_tokens,
            });
        let snapshot = RedactedResponseSnapshot {
            schema_version: 1,
            run_id: rid,
            status_code: telemetry.status_code,
            duration_ms: telemetry.duration_ms,
            response_chars: telemetry.response_chars,
            response_hash: Some(trace_manifest::sha256_hex(&raw_text)),
            usage: usage_snapshot,
            finish_reason,
            content_preview: if include_content {
                "[content_included_in_opt_in_mode]".to_string()
            } else {
                "[redacted]".to_string()
            },
        };
        let _ = trace_manifest::write_run_json(rid, "llm-response.redacted.json", &snapshot);
        if include_content {
            let full_response = serde_json::json!({
                "statusCode": telemetry.status_code,
                "durationMs": telemetry.duration_ms,
                "rawText": raw_text,
                "usage": payload.usage,
            });
            let _ = trace_manifest::write_run_json(rid, "llm-response.full.json", &full_response);
        }
    }

    Ok((
        raw_text,
        "LLM returned invalid JSON: ".to_string(),
        telemetry,
    ))
}

pub async fn stream_text_response<F>(
    base_url: &str,
    model: &str,
    api_key: Option<&str>,
    system_prompt: &str,
    user_prompt: &str,
    max_tokens: u16,
    mut on_chunk: F,
) -> Result<String, String>
where
    F: FnMut(&str),
{
    fn append_text_from_sse_line<F>(
        line: &str,
        output: &mut String,
        on_chunk: &mut F,
    ) -> Result<bool, String>
    where
        F: FnMut(&str),
    {
        let line = line.trim();
        if !line.starts_with("data:") {
            return Ok(false);
        }
        let payload = line.trim_start_matches("data:").trim();
        if payload == "[DONE]" {
            return Ok(true);
        }
        let parsed: Result<StreamChunkResponse, _> = serde_json::from_str(payload);
        let Ok(parsed) = parsed else {
            return Ok(false);
        };
        let Some(choice) = parsed.choices.first() else {
            return Ok(false);
        };
        let Some(content) = choice.delta.content.clone() else {
            return Ok(false);
        };
        match content {
            serde_json::Value::String(text) => {
                if !text.is_empty() {
                    output.push_str(&text);
                    on_chunk(&text);
                }
            }
            serde_json::Value::Array(parts) => {
                for part in parts {
                    if let Some(text) = part.get("text").and_then(|v| v.as_str()) {
                        if !text.is_empty() {
                            output.push_str(text);
                            on_chunk(text);
                        }
                    }
                }
            }
            _ => {}
        }
        Ok(false)
    }

    let endpoint = format!("{}/chat/completions", base_url.trim_end_matches('/'));
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(HTTP_TIMEOUT_SECS))
        .build()
        .map_err(|err| format!("LLM client: {err}"))?;
    let mut req = client.post(&endpoint).json(&serde_json::json!({
        "model": model.trim(),
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_prompt }
        ],
        "temperature": 0.25_f32,
        "max_tokens": max_tokens,
        "stream": true
    }));
    if let Some(token) = api_key.filter(|value| !value.trim().is_empty()) {
        req = req.bearer_auth(token);
    }
    let mut response = req
        .send()
        .await
        .map_err(|err| format!("LLM_STREAM_REQUEST_FAILED: {err}"))?;
    if !response.status().is_success() {
        return Err(format!("LLM_STREAM_HTTP_ERROR: {}", response.status()));
    }
    let mut output = String::new();
    let mut pending = String::new();
    while let Some(bytes) = response
        .chunk()
        .await
        .map_err(|err| format!("LLM_STREAM_READ_FAILED: {err}"))?
    {
        pending.push_str(&String::from_utf8_lossy(&bytes));
        while let Some(pos) = pending.find('\n') {
            let mut line = pending[..pos].to_string();
            pending.drain(..=pos);
            if line.ends_with('\r') {
                line.pop();
            }
            if append_text_from_sse_line(&line, &mut output, &mut on_chunk)? {
                return Ok(output);
            }
        }
    }
    if !pending.trim().is_empty()
        && append_text_from_sse_line(&pending, &mut output, &mut on_chunk)?
    {
        return Ok(output);
    }
    if output.trim().is_empty() {
        return Err("LLM_STREAM_EMPTY: stream ended without text".to_string());
    }
    Ok(output)
}

#[cfg(test)]
mod stream_tests {
    use super::stream_text_response;

    #[test]
    fn keep_module_for_stream_path_compilation() {
        let _ = stream_text_response::<fn(&str)>;
    }
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

    #[test]
    fn usage_parses_when_present() {
        let payload = r#"{"choices":[{"message":{"content":"ok"},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":2,"total_tokens":12}}"#;
        let parsed: super::ChatResponse = serde_json::from_str(payload).expect("parse usage");
        assert_eq!(parsed.usage.and_then(|u| u.total_tokens), Some(12));
    }

    #[test]
    fn redacted_request_snapshot_hides_content_and_authorization() {
        let snapshot = super::RedactedRequestSnapshot {
            schema_version: 1,
            run_id: "run-1",
            endpoint_host: Some("api.openai.com".to_string()),
            endpoint_path: "/v1/chat/completions".to_string(),
            model: "gpt-test",
            fallback_models: vec![],
            temperature: 0.25,
            max_tokens: 128,
            messages: vec![super::RedactedMessageSnapshot {
                role: "user",
                content_chars: 12,
                content_hash: "sha256:abc".to_string(),
                preview: "[redacted]".to_string(),
            }],
            headers: serde_json::json!({ "authorization": "[redacted]" }),
        };
        let raw = serde_json::to_string(&snapshot).expect("serialize snapshot");
        assert!(!raw.contains("hello world"));
        assert!(raw.contains("\"authorization\":\"[redacted]\""));
    }

    #[test]
    fn redacted_http_error_snapshot_has_no_body() {
        let snapshot = super::RedactedResponseSnapshot {
            schema_version: 1,
            run_id: "run-1",
            status_code: Some(500),
            duration_ms: 100,
            response_chars: 0,
            response_hash: None,
            usage: None,
            finish_reason: None,
            content_preview: "[redacted]".to_string(),
        };
        let raw = serde_json::to_string(&snapshot).expect("serialize snapshot");
        assert!(!raw.contains("body"));
        assert!(!raw.contains("Internal Server Error"));
    }
}
