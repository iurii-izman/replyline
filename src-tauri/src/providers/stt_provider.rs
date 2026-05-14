use crate::audio::encode_wav;
use crate::capture_debug;
use crate::deepgram;
use crate::types::AppSettings;

pub async fn transcribe(
    settings: &AppSettings,
    deepgram_key: &str,
    pcm: &[i16],
) -> Result<String, String> {
    if settings.use_streaming_stt {
        match deepgram::transcribe_pcm_streaming(settings, deepgram_key, pcm).await {
            Ok(t) => return Ok(t),
            Err(stream_err) if should_fallback_to_batch(&stream_err) => {
                let wav = encode_wav(pcm);
                return match deepgram::transcribe_wav(settings, deepgram_key, &wav).await {
                    Ok(t) => Ok(t),
                    Err(batch_err) => Err(format!(
                        "stt_streaming_failed_then_batch_failed: streaming={stream_err}; batch={batch_err}"
                    )),
                };
            }
            Err(stream_err) => return Err(format!("stt_streaming_failed: {stream_err}")),
        }
    }

    let wav = encode_wav(pcm);
    match deepgram::transcribe_wav(settings, deepgram_key, &wav).await {
        Ok(t) => Ok(t),
        Err(err) => {
            let detail = if capture_debug::should_persist_stt_debug(&err) {
                match capture_debug::save_failed_stt_wav(&wav) {
                    Ok(path) => format!("stt: {err} debug_wav={}", path.display()),
                    Err(save_err) => format!("stt: {err} debug_wav_save_failed={save_err}"),
                }
            } else {
                format!("stt: {err}")
            };
            Err(detail)
        }
    }
}

fn should_fallback_to_batch(err: &str) -> bool {
    let s = err.to_ascii_lowercase();
    s.contains("ws")
        || s.contains("websocket")
        || s.contains("timed out")
        || s.contains("timeout")
        || s.contains("connect failed")
        || s.contains("server error")
}
