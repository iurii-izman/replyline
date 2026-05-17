use serde::{Deserialize, Serialize};

const HTTP_TIMEOUT_SECS: u64 = 20;
const MAX_RETRIES: u32 = 2;
const RETRY_BASE_MS: u64 = 500;

#[derive(Debug, Serialize)]
pub struct ChatRequest<'a> {
    pub model: &'a str,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub models: Vec<&'a str>,
    pub messages: Vec<ChatMessage<'a>>,
    pub temperature: f32,
    pub max_tokens: u16,
}

#[derive(Debug, Serialize)]
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
pub async fn request_card_raw_text(
    base_url: &str,
    model: &str,
    fallback_models: &[&str],
    api_key: Option<&str>,
    system_prompt: &str,
    user_prompt: &str,
    max_tokens: u16,
) -> Result<(String, String), String> {
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

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(HTTP_TIMEOUT_SECS))
        .build()
        .map_err(|err| format!("LLM client: {err}"))?;

    let endpoint = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let response = {
        let mut last_err = String::new();
        let mut resolved = None;
        for attempt in 0..=MAX_RETRIES {
            if attempt > 0 {
                tokio::time::sleep(std::time::Duration::from_millis(
                    RETRY_BASE_MS * 2u64.pow(attempt - 1),
                ))
                .await;
            }
            let mut req = client.post(&endpoint).json(&request);
            if let Some(token) = api_key.filter(|value| !value.trim().is_empty()) {
                req = req.bearer_auth(token);
            }
            match req.send().await {
                Ok(resp) if resp.status().is_server_error() && attempt < MAX_RETRIES => {
                    last_err = format!("LLM_HTTP_5XX: LLM server error {}", resp.status());
                    continue;
                }
                Ok(resp) => {
                    resolved = Some(resp);
                    break;
                }
                Err(err) if (err.is_timeout() || err.is_connect()) && attempt < MAX_RETRIES => {
                    last_err = format!("LLM_RETRYABLE: LLM request failed: {err}");
                    continue;
                }
                Err(err) => return Err(format!("LLM_REQUEST_FAILED: LLM request failed: {err}")),
            }
        }
        resolved.ok_or(last_err)?
    };

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

    Ok((raw_text, "LLM returned invalid JSON: ".to_string()))
}

#[cfg(test)]
mod tests {
    use super::{ChatMessage, ChatRequest};

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
}
