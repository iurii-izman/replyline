use std::cmp::min;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::thread;
use std::time::{Duration, Instant};

#[cfg(windows)]
use windows::Win32::Media::Audio::{
    eConsole, eRender, AUDCLNT_BUFFERFLAGS_SILENT, AUDCLNT_SHAREMODE_SHARED,
    AUDCLNT_STREAMFLAGS_LOOPBACK, IAudioCaptureClient, IAudioClient, IMMDeviceEnumerator,
    MMDeviceEnumerator,
};
#[cfg(windows)]
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, CLSCTX_ALL,
    COINIT_MULTITHREADED,
};

const TARGET_SAMPLE_RATE: u32 = 16_000;
const WAVE_FORMAT_PCM_TAG: u16 = 0x0001;
const WAVE_FORMAT_IEEE_FLOAT_TAG: u16 = 0x0003;
const WAVE_FORMAT_EXTENSIBLE_TAG: u16 = 0xFFFE;

pub struct CaptureRun {
    cancel: Arc<AtomicBool>,
    join: thread::JoinHandle<Result<Vec<i16>, String>>,
}

impl CaptureRun {
    pub fn start(max_capture_seconds: u16) -> Result<Self, String> {
        let cancel = Arc::new(AtomicBool::new(false));
        let worker_flag = Arc::clone(&cancel);
        let duration = Duration::from_secs(max_capture_seconds as u64);
        let join = thread::spawn(move || record_loopback(worker_flag, duration));
        Ok(Self { cancel, join })
    }

    pub fn stop(self) -> Result<Vec<i16>, String> {
        self.cancel.store(true, Ordering::SeqCst);
        self.join
            .join()
            .map_err(|_| "Capture thread panicked".to_string())?
    }
}

pub fn encode_wav(samples: &[i16]) -> Vec<u8> {
    let channels = 1u16;
    let bytes_per_sample = std::mem::size_of::<i16>() as u16;
    let byte_rate = TARGET_SAMPLE_RATE * channels as u32 * bytes_per_sample as u32;
    let block_align = channels * bytes_per_sample;
    let data_len = (samples.len() * std::mem::size_of::<i16>()) as u32;
    let chunk_len = 36 + data_len;

    let mut bytes = Vec::with_capacity(44 + data_len as usize);
    bytes.extend_from_slice(b"RIFF");
    bytes.extend_from_slice(&chunk_len.to_le_bytes());
    bytes.extend_from_slice(b"WAVE");
    bytes.extend_from_slice(b"fmt ");
    bytes.extend_from_slice(&16u32.to_le_bytes());
    bytes.extend_from_slice(&1u16.to_le_bytes());
    bytes.extend_from_slice(&channels.to_le_bytes());
    bytes.extend_from_slice(&TARGET_SAMPLE_RATE.to_le_bytes());
    bytes.extend_from_slice(&byte_rate.to_le_bytes());
    bytes.extend_from_slice(&block_align.to_le_bytes());
    bytes.extend_from_slice(&(bytes_per_sample * 8).to_le_bytes());
    bytes.extend_from_slice(b"data");
    bytes.extend_from_slice(&data_len.to_le_bytes());
    for sample in samples {
        bytes.extend_from_slice(&sample.to_le_bytes());
    }
    bytes
}

#[cfg(not(windows))]
fn record_loopback(_cancel: Arc<AtomicBool>, _max_capture_duration: Duration) -> Result<Vec<i16>, String> {
    Err("System audio capture is only available on Windows.".to_string())
}

#[cfg(windows)]
fn record_loopback(cancel: Arc<AtomicBool>, max_capture_duration: Duration) -> Result<Vec<i16>, String> {
    unsafe { CoInitializeEx(None, COINIT_MULTITHREADED).ok() }.map_err(|e| e.to_string())?;
    let result = capture_loopback(cancel, max_capture_duration);
    unsafe {
        CoUninitialize();
    }
    result
}

#[cfg(windows)]
fn capture_loopback(cancel: Arc<AtomicBool>, max_capture_duration: Duration) -> Result<Vec<i16>, String> {
    let enumerator: IMMDeviceEnumerator =
        unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) }
            .map_err(|e| e.to_string())?;

    let device = unsafe { enumerator.GetDefaultAudioEndpoint(eRender, eConsole) }
        .map_err(|e| e.to_string())?;
    let client: IAudioClient = unsafe { device.Activate(CLSCTX_ALL, None) }
        .map_err(|e| e.to_string())?;

    let mix_ptr = unsafe { client.GetMixFormat() }.map_err(|e| e.to_string())?;
    if mix_ptr.is_null() {
        return Err("WASAPI returned a null mix format.".to_string());
    }

    let mix = unsafe { *mix_ptr };
    let channels = mix.nChannels as usize;
    let sample_rate = mix.nSamplesPerSec;
    let format_tag = mix.wFormatTag;
    let bits_per_sample = mix.wBitsPerSample;

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
    let mut resampler = DownmixResampler::new(sample_rate);
    let started = Instant::now();
    let mut pcm = Vec::with_capacity(TARGET_SAMPLE_RATE as usize * max_capture_duration.as_secs() as usize);

    unsafe { client.Start() }.map_err(|e| e.to_string())?;

    while !cancel.load(Ordering::SeqCst) && started.elapsed() < max_capture_duration {
        let mut packet_frames = unsafe { capture.GetNextPacketSize() }.map_err(|e| e.to_string())?;
        if packet_frames == 0 {
            thread::sleep(Duration::from_millis(8));
            continue;
        }

        while packet_frames > 0 {
            let mut data_ptr = std::ptr::null_mut();
            let mut frames = 0u32;
            let mut flags = 0u32;
            unsafe {
                capture.GetBuffer(&mut data_ptr, &mut frames, &mut flags, None, None)
            }
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
            resampler.push_chunk(&mono, &mut pcm);

            unsafe { capture.ReleaseBuffer(frames) }.map_err(|e| e.to_string())?;
            packet_frames = unsafe { capture.GetNextPacketSize() }.map_err(|e| e.to_string())?;
        }
    }

    unsafe { client.Stop() }.map_err(|e| e.to_string())?;
    unsafe { CoTaskMemFree(Some(mix_ptr.cast())) };

    if pcm.is_empty() {
        return Err("No audio detected during snippet capture.".to_string());
    }
    Ok(pcm)
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
        (tag, 32) if tag == WAVE_FORMAT_IEEE_FLOAT_TAG || tag == WAVE_FORMAT_EXTENSIBLE_TAG =>
        {
            let source = unsafe { std::slice::from_raw_parts(data_ptr.cast::<f32>(), frames * channels) };
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
            let source = unsafe { std::slice::from_raw_parts(data_ptr.cast::<i16>(), frames * channels) };
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
    cursor: f32,
}

#[cfg(windows)]
impl DownmixResampler {
    fn new(input_rate: u32) -> Self {
        Self {
            input_rate: input_rate as f32,
            cursor: 0.0,
        }
    }

    fn push_chunk(&mut self, input: &[f32], out: &mut Vec<i16>) {
        if input.is_empty() {
            return;
        }
        let step = self.input_rate / TARGET_SAMPLE_RATE as f32;
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

#[cfg(test)]
mod tests {
    use super::encode_wav;

    #[test]
    fn wav_header_matches_expected_len() {
        let wav = encode_wav(&[1, 2, 3, 4]);
        assert_eq!(&wav[0..4], b"RIFF");
        assert_eq!(&wav[8..12], b"WAVE");
        assert_eq!(wav.len(), 44 + 8);
    }
}
