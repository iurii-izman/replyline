use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use tokio::time::{timeout, Duration};
use tokio_tungstenite::{
    connect_async, tungstenite::client::IntoClientRequest, tungstenite::Message,
};

use crate::types::AppSettings;

const HTTP_TIMEOUT_SECS: u64 = 20;
const WS_CONNECT_TIMEOUT_SECS: u64 = 10;
const WS_READ_TIMEOUT_SECS: u64 = 15;
const MAX_RETRIES: u32 = 2;

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

#[derive(Debug, Deserialize)]
struct DeepgramStreamingMessage {
    #[serde(default)]
    #[allow(dead_code)]
    r#type: Option<String>,
    #[serde(default)]
    is_final: Option<bool>,
    #[serde(default)]
    speech_final: Option<bool>,
    #[serde(default)]
    channel: Option<DeepgramStreamingChannel>,
}

#[derive(Debug, Deserialize)]
struct DeepgramStreamingChannel {
    alternatives: Vec<DeepgramAlternative>,
}

pub async fn transcribe_wav(
    settings: &AppSettings,
    api_key: &str,
    wav_bytes: &[u8],
) -> Result<String, String> {
    let language = settings.primary_language.trim();
    let model = settings.deepgram_model.trim();
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
                tokio::time::sleep(Duration::from_millis(500 * 2u64.pow(attempt - 1))).await;
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
                    last_err = format!("Deepgram server error {}", resp.status());
                    continue;
                }
                Ok(resp) => {
                    resolved = Some(resp);
                    break;
                }
                Err(err) if (err.is_timeout() || err.is_connect()) && attempt < MAX_RETRIES => {
                    last_err = format!("Deepgram request failed: {err}");
                    continue;
                }
                Err(err) => return Err(format!("Deepgram request failed: {err}")),
            }
        }
        resolved.ok_or(last_err)?
    };

    if !response.status().is_success() {
        let status = response.status();
        let _ = response.text().await;
        return Err(format!("Deepgram error {status}"));
    }

    let payload: DeepgramResponse = response
        .json()
        .await
        .map_err(|err| format!("Deepgram JSON parse failed: {err}"))?;

    let transcript = payload
        .results
        .channels
        .first()
        .and_then(|channel| channel.alternatives.first())
        .map(|item| item.transcript.trim().to_string())
        .unwrap_or_default();

    if transcript.is_empty() {
        return Err("Deepgram returned an empty transcript.".to_string());
    }

    Ok(transcript)
}

pub async fn transcribe_pcm_streaming(
    settings: &AppSettings,
    api_key: &str,
    pcm_samples: &[i16],
) -> Result<String, String> {
    let language = settings.primary_language.trim();
    let model = settings.deepgram_model.trim();
    let endpoint = format!(
        "wss://api.deepgram.com/v1/listen?model={model}&language={language}&smart_format=true&punctuate=true&encoding=linear16&sample_rate=16000&channels=1&interim_results=false"
    );

    let mut request = endpoint
        .into_client_request()
        .map_err(|err| format!("Deepgram WS request build failed: {err}"))?;
    request.headers_mut().insert(
        "Authorization",
        format!("Token {api_key}")
            .parse()
            .map_err(|err| format!("Deepgram auth header failed: {err}"))?,
    );

    let (mut socket, _) = timeout(
        Duration::from_secs(WS_CONNECT_TIMEOUT_SECS),
        connect_async(request),
    )
    .await
    .map_err(|_| "Deepgram WS connect timed out.".to_string())?
    .map_err(|err| format!("Deepgram WS connect failed: {err}"))?;

    let pcm_bytes = samples_to_le_bytes(pcm_samples);
    for chunk in pcm_bytes.chunks(3_200) {
        socket
            .send(Message::Binary(chunk.to_vec().into()))
            .await
            .map_err(|err| format!("Deepgram WS send failed: {err}"))?;
    }

    socket
        .send(Message::Text(
            r#"{"type":"CloseStream"}"#.to_string().into(),
        ))
        .await
        .map_err(|err| format!("Deepgram WS close message failed: {err}"))?;

    let mut final_parts: Vec<String> = Vec::new();
    let mut fallback_latest: Option<String> = None;

    loop {
        let next = timeout(Duration::from_secs(WS_READ_TIMEOUT_SECS), socket.next())
            .await
            .map_err(|_| "Deepgram WS response timed out.".to_string())?;

        let Some(frame) = next else {
            break;
        };

        match frame.map_err(|err| format!("Deepgram WS read failed: {err}"))? {
            Message::Text(text) => {
                if let Ok(payload) = serde_json::from_str::<DeepgramStreamingMessage>(&text) {
                    let transcript = payload
                        .channel
                        .as_ref()
                        .and_then(|channel| channel.alternatives.first())
                        .map(|item| item.transcript.trim().to_string())
                        .filter(|value| !value.is_empty());

                    if let Some(value) = transcript {
                        fallback_latest = Some(value.clone());
                        if payload.is_final.unwrap_or(false)
                            || payload.speech_final.unwrap_or(false)
                        {
                            final_parts.push(value);
                        }
                    }
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    let transcript = if final_parts.is_empty() {
        fallback_latest.unwrap_or_default()
    } else {
        final_parts.join(" ").trim().to_string()
    };

    if transcript.is_empty() {
        return Err("Deepgram streaming returned an empty transcript.".to_string());
    }

    Ok(transcript)
}

fn samples_to_le_bytes(samples: &[i16]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(std::mem::size_of_val(samples));
    for sample in samples {
        bytes.extend_from_slice(&sample.to_le_bytes());
    }
    bytes
}
