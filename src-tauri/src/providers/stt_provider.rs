use super::deepgram;
use crate::audio::encode_wav;
use crate::capture_debug;
use crate::privacy;
use crate::types::AppSettings;

pub async fn transcribe(
    settings: &AppSettings,
    deepgram_key: &str,
    pcm: &[i16],
) -> Result<String, String> {
    let wav = encode_wav(pcm);
    match deepgram::transcribe_wav(settings, deepgram_key, &wav).await {
        Ok(t) => Ok(t),
        Err(err) => {
            // R3 safe_preview: err may contain Deepgram response details;
            // keep it safe in case raw response text ever gets appended.
            let safe_err = privacy::safe_preview(&err, 300);
            let detail = if capture_debug::should_persist_stt_debug(&safe_err) {
                match capture_debug::save_failed_stt_wav(&wav) {
                    Ok(path) => format!("stt: {safe_err} debug_wav={}", path.display()),
                    Err(save_err) => format!("stt: {safe_err} debug_wav_save_failed={save_err}"),
                }
            } else {
                format!("stt: {safe_err}")
            };
            Err(detail)
        }
    }
}

#[cfg(test)]
mod tests {
    // reserved for future provider transport tests
}
