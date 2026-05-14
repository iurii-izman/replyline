use serde::Deserialize;

use crate::types::AppSettings;

const HTTP_TIMEOUT_SECS: u64 = 20;
const MAX_RETRIES: u32 = 2;
const RETRY_BASE_MS: u64 = 500;

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
    _settings: &AppSettings,
    api_key: &str,
    wav_bytes: &[u8],
) -> Result<String, String> {
    let language = "ru";
    let model = "nova-3";
    let endpoint = format!(
        "https://api.deepgram.com/v1/listen?model={model}&language={language}&smart_format=true&punctuate=true"
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(HTTP_TIMEOUT_SECS))
        .build()
        .map_err(|err| format!("Deepgram client: {err}"))?;

    let body = bytes::Bytes::copy_from_slice(wav_bytes);
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
            match client
                .post(&endpoint)
                .header("Authorization", format!("Token {api_key}"))
                .header("Content-Type", "audio/wav")
                .body(body.clone())
                .send()
                .await
            {
                Ok(resp) if resp.status().is_server_error() && attempt < MAX_RETRIES => {
                    last_err = format!("STT_HTTP_5XX: Deepgram server error {}", resp.status());
                    continue;
                }
                Ok(resp) => {
                    resolved = Some(resp);
                    break;
                }
                Err(err) if (err.is_timeout() || err.is_connect()) && attempt < MAX_RETRIES => {
                    last_err = format!("STT_RETRYABLE: Deepgram request failed: {err}");
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
        let _ = response.text().await;
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

    Ok(transcript)
}
