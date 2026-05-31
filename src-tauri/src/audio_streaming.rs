use std::cmp::min;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::thread;
use std::time::Duration;

use tokio::sync::mpsc::Sender;

#[cfg(windows)]
use windows::Win32::Media::Audio::{
    eConsole, eRender, IAudioCaptureClient, IAudioClient, IMMDeviceEnumerator, MMDeviceEnumerator,
    AUDCLNT_BUFFERFLAGS_SILENT, AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_LOOPBACK,
};
#[cfg(windows)]
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, CLSCTX_ALL,
    COINIT_MULTITHREADED,
};

const WAVE_FORMAT_PCM_TAG: u16 = 0x0001;
const WAVE_FORMAT_IEEE_FLOAT_TAG: u16 = 0x0003;
const WAVE_FORMAT_EXTENSIBLE_TAG: u16 = 0xFFFE;
const MIN_CHUNK_DURATION_MS: u32 = 100;
const MAX_CHUNK_DURATION_MS: u32 = 250;

#[derive(Clone, Copy, Debug)]
pub struct StreamingCaptureConfig {
    pub target_sample_rate: u32,
    pub chunk_duration_ms: u32,
    pub channels: u16,
}

impl Default for StreamingCaptureConfig {
    fn default() -> Self {
        Self {
            target_sample_rate: 16_000,
            chunk_duration_ms: 200,
            channels: 1,
        }
    }
}

impl StreamingCaptureConfig {
    fn validate(self) -> Result<Self, String> {
        if self.target_sample_rate == 0 {
            return Err("target_sample_rate must be > 0".to_string());
        }
        if !(MIN_CHUNK_DURATION_MS..=MAX_CHUNK_DURATION_MS).contains(&self.chunk_duration_ms) {
            return Err(format!(
                "chunk_duration_ms must be in {MIN_CHUNK_DURATION_MS}..={MAX_CHUNK_DURATION_MS}"
            ));
        }
        if self.channels != 1 {
            return Err("only mono streaming is supported (channels=1)".to_string());
        }
        Ok(self)
    }
}

#[derive(Debug)]
pub struct AudioChunk {
    pub bytes: Vec<u8>,
    pub sample_rate: u32,
    pub started_at: u64,
    pub duration_ms: u32,
}

pub struct StreamingCaptureRun {
    cancel: Arc<AtomicBool>,
    join: thread::JoinHandle<Result<(), String>>,
}

impl StreamingCaptureRun {
    pub fn start(
        config: StreamingCaptureConfig,
        sender: Sender<AudioChunk>,
    ) -> Result<Self, String> {
        let config = config.validate()?;
        let _ = crate::app_log::append_event(
            "streaming_capture_start",
            format!(
                "native_sample_rate=pending target_sample_rate={} channels={} chunk_duration_ms={}",
                config.target_sample_rate, config.channels, config.chunk_duration_ms
            ),
        );

        let cancel = Arc::new(AtomicBool::new(false));
        let worker_flag = Arc::clone(&cancel);
        let join = thread::spawn(move || record_loopback_streaming(worker_flag, config, sender));
        Ok(Self { cancel, join })
    }

    pub fn stop(self) -> Result<(), String> {
        self.cancel.store(true, Ordering::SeqCst);
        self.join
            .join()
            .map_err(|_| "Streaming capture thread panicked".to_string())?
    }
}

#[cfg(not(windows))]
fn record_loopback_streaming(
    _cancel: Arc<AtomicBool>,
    _config: StreamingCaptureConfig,
    _sender: Sender<AudioChunk>,
) -> Result<(), String> {
    Err("System audio streaming capture is only available on Windows.".to_string())
}

#[cfg(windows)]
fn record_loopback_streaming(
    cancel: Arc<AtomicBool>,
    config: StreamingCaptureConfig,
    sender: Sender<AudioChunk>,
) -> Result<(), String> {
    unsafe { CoInitializeEx(None, COINIT_MULTITHREADED).ok() }.map_err(|e| e.to_string())?;
    let result = capture_loopback_streaming(cancel, config, sender);
    unsafe {
        CoUninitialize();
    }
    result
}

#[cfg(windows)]
fn capture_loopback_streaming(
    cancel: Arc<AtomicBool>,
    config: StreamingCaptureConfig,
    sender: Sender<AudioChunk>,
) -> Result<(), String> {
    struct MixFormatGuard(*mut windows::Win32::Media::Audio::WAVEFORMATEX);
    impl Drop for MixFormatGuard {
        fn drop(&mut self) {
            unsafe { CoTaskMemFree(Some(self.0.cast())) };
        }
    }
    struct AudioClientStopGuard(IAudioClient);
    impl Drop for AudioClientStopGuard {
        fn drop(&mut self) {
            let _ = unsafe { self.0.Stop() };
        }
    }

    let enumerator: IMMDeviceEnumerator =
        unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) }
            .map_err(|e| e.to_string())?;
    let device = unsafe { enumerator.GetDefaultAudioEndpoint(eRender, eConsole) }
        .map_err(|e| e.to_string())?;
    let client: IAudioClient =
        unsafe { device.Activate(CLSCTX_ALL, None) }.map_err(|e| e.to_string())?;

    let mix_ptr = unsafe { client.GetMixFormat() }.map_err(|e| e.to_string())?;
    if mix_ptr.is_null() {
        return Err("WASAPI returned a null mix format.".to_string());
    }
    let _mix_guard = MixFormatGuard(mix_ptr);

    let mix = unsafe { *mix_ptr };
    let channels = mix.nChannels as usize;
    let native_sample_rate = mix.nSamplesPerSec;
    let format_tag = mix.wFormatTag;
    let bits_per_sample = mix.wBitsPerSample;

    let _ = crate::app_log::append_event(
        "streaming_capture_format",
        format!(
            "native_sample_rate={} target_sample_rate={} channels={} chunk_duration_ms={}",
            native_sample_rate,
            config.target_sample_rate,
            config.channels,
            config.chunk_duration_ms
        ),
    );

    unsafe {
        client.Initialize(
            AUDCLNT_SHAREMODE_SHARED,
            AUDCLNT_STREAMFLAGS_LOOPBACK,
            0,
            0,
            mix_ptr,
            None,
        )
    }
    .map_err(|e| e.to_string())?;

    let capture: IAudioCaptureClient = unsafe { client.GetService() }.map_err(|e| e.to_string())?;
    let mut resampler = DownmixResampler::new(native_sample_rate, config.target_sample_rate);
    let mut pending_pcm = Vec::<i16>::new();
    let frames_per_chunk =
        ((config.target_sample_rate as u64 * config.chunk_duration_ms as u64) / 1000) as usize;
    let base_started_at = chrono::Utc::now().timestamp_millis() as u64;
    let mut emitted_frames = 0u64;

    unsafe { client.Start() }.map_err(|e| e.to_string())?;
    let _stop_guard = AudioClientStopGuard(client.clone());

    while !cancel.load(Ordering::SeqCst) {
        let mut packet_frames =
            unsafe { capture.GetNextPacketSize() }.map_err(|e| e.to_string())?;
        if packet_frames == 0 {
            thread::sleep(Duration::from_millis(8));
            continue;
        }

        while packet_frames > 0 {
            let mut data_ptr = std::ptr::null_mut();
            let mut frames = 0u32;
            let mut flags = 0u32;
            unsafe { capture.GetBuffer(&mut data_ptr, &mut frames, &mut flags, None, None) }
                .map_err(|e| e.to_string())?;

            let silent = (flags & AUDCLNT_BUFFERFLAGS_SILENT.0 as u32) != 0;
            let mono = decode_to_mono(
                data_ptr as *const u8,
                frames as usize,
                channels,
                format_tag,
                bits_per_sample,
                silent,
            )?;
            resampler.push_chunk(&mono, &mut pending_pcm);

            while pending_pcm.len() >= frames_per_chunk {
                let chunk_samples: Vec<i16> = pending_pcm.drain(..frames_per_chunk).collect();
                let chunk_started_at =
                    base_started_at + ((emitted_frames * 1000) / config.target_sample_rate as u64);
                emitted_frames += chunk_samples.len() as u64;
                let chunk = AudioChunk {
                    bytes: pcm16_to_le_bytes(&chunk_samples),
                    sample_rate: config.target_sample_rate,
                    started_at: chunk_started_at,
                    duration_ms: config.chunk_duration_ms,
                };
                if sender.blocking_send(chunk).is_err() {
                    return Ok(());
                }
            }

            unsafe { capture.ReleaseBuffer(frames) }.map_err(|e| e.to_string())?;
            packet_frames = unsafe { capture.GetNextPacketSize() }.map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[cfg(windows)]
fn decode_to_mono(
    data_ptr: *const u8,
    frames: usize,
    channels: usize,
    format_tag: u16,
    bits_per_sample: u16,
    silent: bool,
) -> Result<Vec<f32>, String> {
    if silent {
        return Ok(vec![0.0; frames]);
    }
    if channels == 0 {
        return Err("Invalid channel count from WASAPI.".to_string());
    }

    let mut mono = Vec::with_capacity(frames);
    match (format_tag, bits_per_sample) {
        (tag, 32) if tag == WAVE_FORMAT_IEEE_FLOAT_TAG || tag == WAVE_FORMAT_EXTENSIBLE_TAG => {
            let source =
                unsafe { std::slice::from_raw_parts(data_ptr.cast::<f32>(), frames * channels) };
            for frame in 0..frames {
                let offset = frame * channels;
                let take = min(channels, 2);
                let mut acc = 0.0f32;
                for channel in 0..take {
                    acc += source[offset + channel];
                }
                mono.push((acc / take as f32).clamp(-1.0, 1.0));
            }
        }
        (tag, 16) if tag == WAVE_FORMAT_PCM_TAG || tag == WAVE_FORMAT_EXTENSIBLE_TAG => {
            let source =
                unsafe { std::slice::from_raw_parts(data_ptr.cast::<i16>(), frames * channels) };
            for frame in 0..frames {
                let offset = frame * channels;
                let take = min(channels, 2);
                let mut acc = 0.0f32;
                for channel in 0..take {
                    acc += source[offset + channel] as f32 / i16::MAX as f32;
                }
                mono.push((acc / take as f32).clamp(-1.0, 1.0));
            }
        }
        _ => {
            return Err(format!(
                "Unsupported WASAPI format (tag={format_tag}, bits={bits_per_sample})."
            ));
        }
    }

    Ok(mono)
}

#[cfg(windows)]
struct DownmixResampler {
    input_rate: f32,
    output_rate: f32,
    cursor: f32,
}

#[cfg(windows)]
impl DownmixResampler {
    fn new(input_rate: u32, output_rate: u32) -> Self {
        Self {
            input_rate: input_rate as f32,
            output_rate: output_rate as f32,
            cursor: 0.0,
        }
    }

    fn push_chunk(&mut self, input: &[f32], out: &mut Vec<i16>) {
        if input.is_empty() {
            return;
        }
        let step = self.input_rate / self.output_rate;
        while self.cursor < input.len() as f32 {
            let base = self.cursor.floor() as usize;
            let next = min(base + 1, input.len() - 1);
            let mix = self.cursor - base as f32;
            let sample = input[base] * (1.0 - mix) + input[next] * mix;
            out.push((sample.clamp(-1.0, 1.0) * i16::MAX as f32).round() as i16);
            self.cursor += step;
        }
        self.cursor -= input.len() as f32;
    }
}

fn pcm16_to_le_bytes(samples: &[i16]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(samples.len() * 2);
    for sample in samples {
        bytes.extend_from_slice(&sample.to_le_bytes());
    }
    bytes
}

#[cfg(test)]
fn take_exact_chunk(pending: &mut Vec<i16>, frames_per_chunk: usize) -> Option<Vec<i16>> {
    if pending.len() < frames_per_chunk {
        return None;
    }
    Some(pending.drain(..frames_per_chunk).collect())
}

#[cfg(test)]
mod tests {
    use super::{pcm16_to_le_bytes, take_exact_chunk, StreamingCaptureConfig};

    #[test]
    fn pcm16_le_conversion_is_stable() {
        let bytes = pcm16_to_le_bytes(&[-32768, -1, 0, 1, 32767]);
        assert_eq!(
            bytes,
            vec![0x00, 0x80, 0xFF, 0xFF, 0x00, 0x00, 0x01, 0x00, 0xFF, 0x7F]
        );
    }

    #[test]
    fn chunk_sizing_drains_only_full_chunks() {
        let mut pending = vec![1, 2, 3, 4, 5, 6, 7];
        let first = take_exact_chunk(&mut pending, 4).expect("first chunk");
        assert_eq!(first, vec![1, 2, 3, 4]);
        assert_eq!(pending, vec![5, 6, 7]);
        assert!(take_exact_chunk(&mut pending, 4).is_none());
    }

    #[test]
    fn config_validation_rejects_invalid_chunk_duration() {
        let config = StreamingCaptureConfig {
            target_sample_rate: 16_000,
            chunk_duration_ms: 99,
            channels: 1,
        };
        let err = config.validate().expect_err("expected validation error");
        assert!(err.contains("chunk_duration_ms"));
    }

    #[cfg(not(windows))]
    #[test]
    fn non_windows_streaming_capture_is_unsupported() {
        let runtime = tokio::runtime::Runtime::new().expect("runtime");
        runtime.block_on(async {
            let (tx, _rx) = tokio::sync::mpsc::channel(1);
            let result = super::record_loopback_streaming(
                std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false)),
                StreamingCaptureConfig::default(),
                tx,
            );
            assert!(result.is_err());
            assert!(result
                .expect_err("unsupported error")
                .contains("only available on Windows"));
        });
    }
}
