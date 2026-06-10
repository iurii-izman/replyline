use super::deepgram;
use crate::audio::encode_wav;
use crate::diag_contract::{RL_STT_REQUEST_TIMED, RL_WAV_ENCODING_TIMED};
use crate::pipeline_timing::{PipelineTimer, StageTiming};
use crate::privacy;
use crate::trace_manifest;
use crate::types::AppSettings;
use serde::Serialize;

const MIN_AUDIBLE_PEAK: i16 = 32;
const MIN_ACTIVE_SAMPLES: usize = 8;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AudioSignalMetrics {
    sample_rate_hz: u32,
    channels: u8,
    duration_ms: u64,
    total_samples: usize,
    active_samples: usize,
    peak_abs: u16,
    mean_abs: u64,
}

#[derive(Debug)]
pub struct SttProviderError {
    pub message: String,
    pub stages: Vec<StageTiming>,
}

fn audio_signal_metrics(pcm: &[i16]) -> AudioSignalMetrics {
    let mut peak_abs = 0u16;
    let mut sum_abs = 0u64;
    let mut active_samples = 0usize;
    for sample in pcm {
        let absolute = sample.unsigned_abs();
        peak_abs = peak_abs.max(absolute);
        sum_abs = sum_abs.saturating_add(absolute as u64);
        if absolute >= MIN_AUDIBLE_PEAK as u16 {
            active_samples += 1;
        }
    }
    AudioSignalMetrics {
        sample_rate_hz: 16_000,
        channels: 1,
        duration_ms: pcm.len() as u64 * 1000 / 16_000,
        total_samples: pcm.len(),
        active_samples,
        peak_abs,
        mean_abs: if pcm.is_empty() {
            0
        } else {
            sum_abs / pcm.len() as u64
        },
    }
}

fn has_audible_signal(metrics: &AudioSignalMetrics) -> bool {
    metrics.peak_abs >= MIN_AUDIBLE_PEAK as u16 && metrics.active_samples >= MIN_ACTIVE_SAMPLES
}

fn failed_stt_detail(err: &str) -> String {
    let safe_err = privacy::safe_preview(err, 300);
    format!("stt: {safe_err}")
}

pub async fn transcribe(
    run_id: Option<&str>,
    include_content: bool,
    settings: &AppSettings,
    deepgram_key: &str,
    pcm: &[i16],
) -> Result<(String, Vec<StageTiming>, deepgram::SttRequestTelemetry), SttProviderError> {
    let mut stages: Vec<StageTiming> = Vec::new();

    let wav_timer = PipelineTimer::start();
    let wav = encode_wav(pcm);
    stages.push(wav_timer.measure("wav_encoding", "ok", RL_WAV_ENCODING_TIMED));
    let signal = audio_signal_metrics(pcm);
    if let Some(rid) = run_id {
        let _ = trace_manifest::write_run_json(rid, "audio-signal.redacted.json", &signal);
        if include_content {
            let _ = trace_manifest::write_run_bytes(rid, "capture.full.wav", &wav);
        }
    }

    if !has_audible_signal(&signal) {
        let message =
            failed_stt_detail("STT_NO_SPEECH: Captured audio contains no audible signal.");
        return Err(SttProviderError { message, stages });
    }

    let stt_timer = PipelineTimer::start();
    match deepgram::transcribe_wav(run_id, include_content, settings, deepgram_key, &wav).await {
        Ok((t, telemetry)) => {
            stages.push(stt_timer.measure("stt_request", "ok", RL_STT_REQUEST_TIMED));
            Ok((t, stages, telemetry))
        }
        Err(err) => {
            stages.push(stt_timer.measure("stt_request", "fail", RL_STT_REQUEST_TIMED));
            let message = failed_stt_detail(&err);
            Err(SttProviderError { message, stages })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{audio_signal_metrics, has_audible_signal};

    #[test]
    fn rejects_silent_pcm_before_provider_request() {
        assert!(!has_audible_signal(&audio_signal_metrics(&vec![0; 16_000])));
        assert!(!has_audible_signal(&audio_signal_metrics(&vec![
            31;
            16_000
        ])));
    }

    #[test]
    fn accepts_quiet_but_real_pcm_signal() {
        let mut pcm = vec![0; 16_000];
        pcm[8_000..8_008].fill(32);
        assert!(has_audible_signal(&audio_signal_metrics(&pcm)));
    }

    #[test]
    fn rejects_single_sample_click() {
        let mut pcm = vec![0; 16_000];
        pcm[8_000] = i16::MAX;
        assert!(!has_audible_signal(&audio_signal_metrics(&pcm)));
    }
}
