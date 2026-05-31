use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::http::{header::AUTHORIZATION, Request};
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};
use url::Url;

#[derive(Debug, Clone)]
#[allow(dead_code)] // Wired in next bilingual lane integration block.
pub struct DeepgramStreamingParams {
    pub model: String,
    pub language: String,
    pub encoding: String,
    pub sample_rate: u32,
    pub channels: u8,
    pub interim_results: bool,
    pub punctuate: bool,
    pub smart_format: bool,
    pub endpointing: u32,
    pub utterance_end_ms: u32,
    pub vad_events: bool,
}

impl Default for DeepgramStreamingParams {
    fn default() -> Self {
        Self {
            model: "nova-3".to_string(),
            language: "en".to_string(),
            encoding: "linear16".to_string(),
            sample_rate: 16_000,
            channels: 1,
            interim_results: true,
            punctuate: true,
            smart_format: true,
            endpointing: 300,
            utterance_end_ms: 1200,
            vad_events: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
#[allow(dead_code)] // Wired in next bilingual lane integration block.
pub enum StreamingSttEvent {
    Partial {
        text: String,
        confidence: Option<f32>,
        started_at: Option<f64>,
        stable: bool,
    },
    Final {
        text: String,
        confidence: Option<f32>,
        started_at: Option<f64>,
        ended_at: Option<f64>,
        speech_final: bool,
    },
    Error {
        code: Option<String>,
        message: String,
        recoverable: bool,
    },
}

pub struct DeepgramStreamingClient {
    ws: WebSocketStream<MaybeTlsStream<TcpStream>>,
}

#[allow(dead_code)] // Wired in next bilingual lane integration block.
impl DeepgramStreamingClient {
    pub async fn send_audio_chunk(&mut self, chunk: Vec<u8>) -> Result<(), String> {
        self.ws
            .send(Message::Binary(chunk.into()))
            .await
            .map_err(|err| format!("STT_STREAM_SEND_FAILED: {err}"))
    }

    pub async fn read_next_event(&mut self) -> Result<StreamingSttEvent, String> {
        loop {
            let msg = self
                .ws
                .next()
                .await
                .ok_or_else(|| "STT_STREAM_CLOSED: stream closed".to_string())?
                .map_err(|err| format!("STT_STREAM_READ_FAILED: {err}"))?;

            match msg {
                Message::Text(text) => match parse_streaming_event(&text) {
                    Some(event) => return Ok(event),
                    None => continue,
                },
                Message::Binary(_) | Message::Ping(_) | Message::Pong(_) => continue,
                Message::Close(_) => {
                    return Err("STT_STREAM_CLOSED: server closed stream".to_string());
                }
                Message::Frame(_) => continue,
            }
        }
    }

    pub async fn close(mut self) -> Result<(), String> {
        self.ws
            .close(None)
            .await
            .map_err(|err| format!("STT_STREAM_CLOSE_FAILED: {err}"))
    }
}

#[allow(dead_code)] // Wired in next bilingual lane integration block.
pub fn build_streaming_url(params: &DeepgramStreamingParams) -> Result<Url, String> {
    let mut url = Url::parse("wss://api.deepgram.com/v1/listen")
        .map_err(|err| format!("STT_STREAM_URL_INVALID: {err}"))?;
    {
        let mut qp = url.query_pairs_mut();
        qp.append_pair("model", &params.model);
        qp.append_pair("language", &params.language);
        qp.append_pair("encoding", &params.encoding);
        qp.append_pair("sample_rate", &params.sample_rate.to_string());
        qp.append_pair("channels", &params.channels.to_string());
        qp.append_pair("interim_results", &params.interim_results.to_string());
        qp.append_pair("punctuate", &params.punctuate.to_string());
        qp.append_pair("smart_format", &params.smart_format.to_string());
        qp.append_pair("endpointing", &params.endpointing.to_string());
        qp.append_pair("utterance_end_ms", &params.utterance_end_ms.to_string());
        qp.append_pair("vad_events", &params.vad_events.to_string());
    }
    Ok(url)
}

#[allow(dead_code)] // Wired in next bilingual lane integration block.
fn build_handshake_request(url: &Url, api_key: &str) -> Result<Request<()>, String> {
    let auth_value = format!("Token {api_key}");
    Request::builder()
        .method("GET")
        .uri(url.as_str())
        .header(AUTHORIZATION, auth_value)
        .body(())
        .map_err(|err| format!("STT_STREAM_REQUEST_BUILD_FAILED: {err}"))
}

#[allow(dead_code)] // Wired in next bilingual lane integration block.
pub async fn connect_deepgram_streaming(
    api_key: &str,
    params: &DeepgramStreamingParams,
) -> Result<DeepgramStreamingClient, String> {
    let url = build_streaming_url(params)?;
    let request = build_handshake_request(&url, api_key)?;
    let (ws, _) = connect_async(request)
        .await
        .map_err(|err| format!("STT_STREAM_CONNECT_FAILED: {err}"))?;
    Ok(DeepgramStreamingClient { ws })
}

#[derive(Debug, Deserialize)]
struct DeepgramStreamingPayload {
    #[serde(rename = "type")]
    kind: Option<String>,
    channel: Option<DeepgramStreamingChannel>,
    is_final: Option<bool>,
    speech_final: Option<bool>,
    start: Option<f64>,
    duration: Option<f64>,
    from_finalize: Option<bool>,
    code: Option<String>,
    message: Option<String>,
    description: Option<String>,
    variant: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DeepgramStreamingChannel {
    alternatives: Vec<DeepgramStreamingAlternative>,
}

#[derive(Debug, Deserialize)]
struct DeepgramStreamingAlternative {
    transcript: Option<String>,
    confidence: Option<f32>,
}

fn parse_streaming_event(payload: &str) -> Option<StreamingSttEvent> {
    let parsed = serde_json::from_str::<DeepgramStreamingPayload>(payload).ok()?;
    let kind = parsed.kind.as_deref().unwrap_or_default();

    if kind.eq_ignore_ascii_case("error") || parsed.code.is_some() || parsed.message.is_some() {
        let message = parsed
            .message
            .or(parsed.description)
            .or(parsed.variant)
            .unwrap_or_else(|| "streaming error".to_string());
        let recoverable = parsed
            .code
            .as_deref()
            .map(is_recoverable_code)
            .unwrap_or(false);
        return Some(StreamingSttEvent::Error {
            code: parsed.code,
            message,
            recoverable,
        });
    }

    if !kind.is_empty() && !kind.eq_ignore_ascii_case("results") {
        return None;
    }

    let alt = parsed.channel?.alternatives.into_iter().next()?;
    let text = alt.transcript.unwrap_or_default().trim().to_string();
    if text.is_empty() {
        return None;
    }

    let started_at = parsed.start;
    let ended_at = parsed
        .duration
        .map(|duration| started_at.unwrap_or(0.0) + duration);
    let is_final = parsed.is_final.unwrap_or(false);
    let speech_final = parsed.speech_final.unwrap_or(false);
    let stable = parsed.from_finalize.unwrap_or(false) || speech_final;

    if is_final {
        Some(StreamingSttEvent::Final {
            text,
            confidence: alt.confidence,
            started_at,
            ended_at,
            speech_final,
        })
    } else {
        Some(StreamingSttEvent::Partial {
            text,
            confidence: alt.confidence,
            started_at,
            stable,
        })
    }
}

fn is_recoverable_code(code: &str) -> bool {
    matches!(code, "429" | "500" | "502" | "503" | "504")
}

#[cfg(test)]
mod tests {
    use super::{
        build_handshake_request, build_streaming_url, parse_streaming_event,
        DeepgramStreamingParams, StreamingSttEvent,
    };

    #[test]
    fn streaming_url_builder_includes_expected_defaults() {
        let params = DeepgramStreamingParams::default();
        let url = build_streaming_url(&params).expect("url");
        assert_eq!(
            url.as_str(),
            "wss://api.deepgram.com/v1/listen?model=nova-3&language=en&encoding=linear16&sample_rate=16000&channels=1&interim_results=true&punctuate=true&smart_format=true&endpointing=300&utterance_end_ms=1200&vad_events=true"
        );
    }

    #[test]
    fn handshake_request_sets_auth_header_without_token_logging() {
        let params = DeepgramStreamingParams::default();
        let url = build_streaming_url(&params).expect("url");
        let token = "test_token_not_for_logs";
        let req = build_handshake_request(&url, token).expect("request");
        let auth = req.headers().get("authorization").expect("auth header");
        let auth_str = auth.to_str().expect("ascii auth header");
        assert!(auth_str.starts_with("Token "));
        assert_eq!(auth_str.len(), "Token ".len() + token.len());
    }

    #[test]
    fn parse_partial_payload() {
        let payload = r#"{
            "type":"Results",
            "start":2.0,
            "duration":0.7,
            "is_final":false,
            "speech_final":false,
            "channel":{"alternatives":[{"transcript":"hello world","confidence":0.91}]}
        }"#;
        let event = parse_streaming_event(payload).expect("event");
        match event {
            StreamingSttEvent::Partial {
                confidence,
                started_at,
                stable,
                ..
            } => {
                assert_eq!(confidence, Some(0.91));
                assert_eq!(started_at, Some(2.0));
                assert!(!stable);
            }
            _ => panic!("expected partial"),
        }
    }

    #[test]
    fn parse_final_payload() {
        let payload = r#"{
            "type":"Results",
            "start":4.2,
            "duration":1.3,
            "is_final":true,
            "speech_final":true,
            "channel":{"alternatives":[{"transcript":"final answer","confidence":0.98}]}
        }"#;
        let event = parse_streaming_event(payload).expect("event");
        match event {
            StreamingSttEvent::Final {
                confidence,
                started_at,
                ended_at,
                speech_final,
                ..
            } => {
                assert_eq!(confidence, Some(0.98));
                assert_eq!(started_at, Some(4.2));
                assert_eq!(ended_at, Some(5.5));
                assert!(speech_final);
            }
            _ => panic!("expected final"),
        }
    }

    #[test]
    fn parse_error_payload() {
        let payload = r#"{
            "type":"Error",
            "code":"429",
            "description":"rate limited"
        }"#;
        let event = parse_streaming_event(payload).expect("event");
        match event {
            StreamingSttEvent::Error {
                code, recoverable, ..
            } => {
                assert_eq!(code.as_deref(), Some("429"));
                assert!(recoverable);
            }
            _ => panic!("expected error"),
        }
    }
}
