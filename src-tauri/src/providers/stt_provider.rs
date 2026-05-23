use super::deepgram;
use crate::audio::encode_wav;
use crate::capture_debug;
use crate::diag_contract::{RL_STT_REQUEST_TIMED, RL_WAV_ENCODING_TIMED};
use crate::pipeline_timing::{PipelineTimer, StageTiming};
use crate::privacy;
use crate::types::AppSettings;

pub async fn transcribe(
    run_id: Option<&str>,
    include_content: bool,
    settings: &AppSettings,
    deepgram_key: &str,
    pcm: &[i16],
) -> Result<(String, Vec<StageTiming>, deepgram::SttRequestTelemetry), String> {
    let mut stages: Vec<StageTiming> = Vec::new();

    let wav_timer = PipelineTimer::start();
    let wav = encode_wav(pcm);
    stages.push(wav_timer.measure("wav_encoding", "ok", RL_WAV_ENCODING_TIMED));

    let stt_timer = PipelineTimer::start();
    match deepgram::transcribe_wav(run_id, include_content, settings, deepgram_key, &wav).await {
        Ok((t, telemetry)) => {
            stages.push(stt_timer.measure("stt_request", "ok", RL_STT_REQUEST_TIMED));
            Ok((t, stages, telemetry))
        }
        Err(err) => {
            stages.push(stt_timer.measure("stt_request", "fail", RL_STT_REQUEST_TIMED));
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
