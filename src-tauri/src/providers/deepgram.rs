use serde::Deserialize;
use std::time::{Duration, Instant};
use url::Url;

use crate::trace_manifest;
use crate::types::AppSettings;

const HTTP_TIMEOUT_SECS: u64 = 20;
const MAX_RETRIES: u32 = 2;
const RETRY_BASE_MS: u64 = 500;
const RETRY_MAX_BACKOFF_MS: u64 = 1_500;
const TOTAL_BUDGET_MS: u64 = 9_000;

#[derive(Debug, Clone, Copy)]
pub struct SttRequestPolicy {
    pub total_budget_ms: u64,
    pub per_attempt_timeout_ms: u64,
    pub max_retries: u32,
    pub retry_base_ms: u64,
    pub retry_max_backoff_ms: u64,
}

#[derive(Debug, Clone, Default)]
#[allow(dead_code)]
pub struct SttRequestTelemetry {
    pub retry_count: u32,
    pub retry_reason: Option<&'static str>,
    pub status_code: Option<u16>,
    pub duration_ms: u64,
    pub audio_bytes: usize,
    pub transcript_chars: usize,
}

impl Default for SttRequestPolicy {
    fn default() -> Self {
        Self {
            total_budget_ms: TOTAL_BUDGET_MS,
            per_attempt_timeout_ms: HTTP_TIMEOUT_SECS * 1000,
            max_retries: MAX_RETRIES,
            retry_base_ms: RETRY_BASE_MS,
            retry_max_backoff_ms: RETRY_MAX_BACKOFF_MS,
        }
    }
}

#[derive(Debug, Deserialize)]
struct DeepgramResponse {
    results: DeepgramResults,
}

#[derive(Debug, Deserialize)]
struct DeepgramResults {
    channels: Vec<DeepgramChannel>,
}

#[derive(Debug, Deserialize)]
struct DeepgramChannel {
    alternatives: Vec<DeepgramAlternative>,
}

#[derive(Debug, Deserialize)]
struct DeepgramAlternative {
    transcript: String,
}

pub async fn transcribe_wav(
    run_id: Option<&str>,
    include_content: bool,
    _settings: &AppSettings,
    api_key: &str,
    wav_bytes: &[u8],
) -> Result<(String, SttRequestTelemetry), String> {
    let language = crate::language_profile::stt_language();
    let model = "nova-3";
    let endpoint = format!(
        "https://api.deepgram.com/v1/listen?model={model}&language={language}&smart_format=true&punctuate=true"
    );
    let endpoint_url = Url::parse(&endpoint).ok();
    let endpoint_host = endpoint_url
        .as_ref()
        .and_then(|url| url.host_str().map(|v| v.to_string()));
    let endpoint_path = endpoint_url
        .as_ref()
        .map(|url| url.path().to_string())
        .unwrap_or_else(|| "/v1/listen".to_string());

    let policy = SttRequestPolicy::default();
    let started = Instant::now();
    let mut telemetry = SttRequestTelemetry {
        audio_bytes: wav_bytes.len(),
        ..SttRequestTelemetry::default()
    };

    if let Some(rid) = run_id {
        let request_snapshot = serde_json::json!({
            "schemaVersion": 1,
            "runId": rid,
            "provider": "deepgram",
            "endpointHost": endpoint_host,
            "endpointPath": endpoint_path,
            "model": model,
            "options": {
                "language": language,
                "smart_format": true,
                "punctuate": true,
            },
            "audioBytes": wav_bytes.len(),
            "sampleRateHz": serde_json::Value::Null,
            "channels": serde_json::Value::Null
        });
        let _ = trace_manifest::write_run_json(rid, "stt-request.redacted.json", &request_snapshot);
    }

    let body = bytes::Bytes::copy_from_slice(wav_bytes);
    let response = {
        let mut last_err = String::new();
        let mut resolved = None;
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
                    "STT_BUDGET_EXCEEDED: stt budget exceeded elapsed_ms={elapsed_ms} budget_ms={}",
                    policy.total_budget_ms
                );
                break;
            }
            let remaining_ms = policy.total_budget_ms - elapsed_ms;
            let timeout_ms = remaining_ms.min(policy.per_attempt_timeout_ms).max(1);
            let client = reqwest::Client::builder()
                .timeout(Duration::from_millis(timeout_ms))
                .build()
                .map_err(|err| format!("Deepgram client: {err}"))?;
            match client
                .post(&endpoint)
                .header("Authorization", format!("Token {api_key}"))
                .header("Content-Type", "audio/wav")
                .body(body.clone())
                .send()
                .await
            {
                Ok(resp) if resp.status().is_server_error() && attempt < policy.max_retries => {
                    telemetry.status_code = Some(resp.status().as_u16());
                    last_err = format!("STT_HTTP_5XX: Deepgram server error {}", resp.status());
                    telemetry.retry_reason = Some("http_5xx");
                    continue;
                }
                Ok(resp) => {
                    telemetry.status_code = Some(resp.status().as_u16());
                    resolved = Some(resp);
                    break;
                }
                Err(err)
                    if (err.is_timeout() || err.is_connect()) && attempt < policy.max_retries =>
                {
                    last_err = format!("STT_RETRYABLE: Deepgram request failed: {err}");
                    telemetry.retry_reason = Some(if err.is_timeout() {
                        "timeout"
                    } else {
                        "connect"
                    });
                    continue;
                }
                Err(err) => {
                    return Err(format!(
                        "STT_REQUEST_FAILED: Deepgram request failed: {err}"
                    ));
                }
            }
        }
        resolved.ok_or(last_err)?
    };

    if !response.status().is_success() {
        let status = response.status();
        // Privacy: intentionally discard response body to avoid logging
        // potentially sensitive error payloads from Deepgram.
        let _ = response.text().await;
        if let Some(rid) = run_id {
            let snapshot = serde_json::json!({
                "schemaVersion": 1,
                "runId": rid,
                "statusCode": status.as_u16(),
                "durationMs": started.elapsed().as_millis() as u64,
                "transcriptChars": 0,
                "transcriptHash": serde_json::Value::Null,
                "retries": telemetry.retry_count,
                "errorKind": "http_error",
                "contentPreview": if include_content { "[content_included_in_opt_in_mode]" } else { "[redacted]" }
            });
            let _ = trace_manifest::write_run_json(rid, "stt-response.redacted.json", &snapshot);
        }
        return Err(format!("STT_HTTP_ERROR: Deepgram error {status}"));
    }

    let payload: DeepgramResponse = response
        .json()
        .await
        .map_err(|err| format!("STT_PARSE_FAILED: Deepgram JSON parse failed: {err}"))?;

    let transcript = payload
        .results
        .channels
        .first()
        .and_then(|channel| channel.alternatives.first())
        .map(|item| item.transcript.trim().to_string())
        .unwrap_or_default();

    if transcript.is_empty() {
        return Err("STT_EMPTY: Deepgram returned an empty transcript.".to_string());
    }
    telemetry.duration_ms = started.elapsed().as_millis() as u64;
    telemetry.transcript_chars = transcript.chars().count();
    if let Some(rid) = run_id {
        let snapshot = serde_json::json!({
            "schemaVersion": 1,
            "runId": rid,
            "provider": "deepgram",
            "statusCode": telemetry.status_code,
            "durationMs": telemetry.duration_ms,
            "transcriptChars": telemetry.transcript_chars,
            "transcriptHash": trace_manifest::sha256_hex(&transcript),
            "retries": telemetry.retry_count,
            "errorKind": serde_json::Value::Null,
            "contentPreview": if include_content { transcript.clone() } else { "[redacted]".to_string() }
        });
        let _ = trace_manifest::write_run_json(rid, "stt-response.redacted.json", &snapshot);
    }

    Ok((transcript, telemetry))
}

#[cfg(test)]
mod tests {
    use super::{SttRequestPolicy, SttRequestTelemetry};

    #[test]
    fn default_policy_keeps_stt_within_budget() {
        let policy = SttRequestPolicy::default();
        assert_eq!(policy.total_budget_ms, 9_000);
        assert_eq!(policy.max_retries, 2);
    }

    #[test]
    fn telemetry_default_is_deterministic() {
        let telemetry = SttRequestTelemetry::default();
        assert_eq!(telemetry.retry_count, 0);
        assert_eq!(telemetry.retry_reason, None);
    }
}
