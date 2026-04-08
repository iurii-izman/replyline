#![allow(dead_code)]

use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::thread;
use std::time::{Duration, Instant};

use chrono::Utc;
use serde::Serialize;

#[path = "../audio.rs"]
mod audio;
#[path = "../deepgram.rs"]
mod deepgram;
#[path = "../fs_atomic.rs"]
mod fs_atomic;
#[path = "../llm.rs"]
mod llm;
#[path = "../settings.rs"]
mod settings;
#[path = "../types.rs"]
mod types;

use types::AppSettings;

const DEFAULT_PROBE_TEXT: &str =
    "У нас есть риск сдвига на два дня. Если сегодня согласуем приоритеты, срок удержим.";
const DEFAULT_LLM_BASE_URL: &str = "https://openrouter.ai/api/v1";
const DEFAULT_LLM_MODEL: &str = "openai/gpt-4o-mini";
const DEFAULT_SCENARIO: &str = "loopback-tts-ru";
const DEFAULT_STT_MODE: &str = "batch";
const DEFAULT_AUDIO_MODE: &str = "tts";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeLatencyReport {
    generated_at_utc: String,
    settings_path: String,
    report_path: String,
    config_source: String,
    credentials_source: String,
    used_persistent_app_config: bool,
    scenario: String,
    audio_mode: String,
    audio_source_label: String,
    voice: String,
    llm_base_url: String,
    llm_model: String,
    stt_mode: String,
    deepgram_model: String,
    primary_language: String,
    capture_max_seconds: u16,
    capture_samples: usize,
    capture_window_ms: u128,
    captured_audio_ms: u128,
    stop_to_pcm_ms: u128,
    stt_ms: u128,
    llm_ms: u128,
    release_to_card_ms: u128,
    total_end_to_end_ms: u128,
    transcript: String,
    card: ProbeCard,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProbeCard {
    gist: String,
    say_now: String,
    next_move: String,
}

#[tokio::main]
async fn main() -> Result<(), String> {
    let deepgram_api_key =
        env::var("DEEPGRAM_API_KEY").map_err(|_| "DEEPGRAM_API_KEY is missing.".to_string())?;
    let llm_api_key = env::var("OPENROUTER_API_KEY")
        .or_else(|_| env::var("LLM_API_KEY"))
        .map_err(|_| "OPENROUTER_API_KEY or LLM_API_KEY is missing.".to_string())?;

    let settings = AppSettings {
        llm_base_url: env::var("REPLYLINE_LLM_BASE_URL")
            .unwrap_or_else(|_| DEFAULT_LLM_BASE_URL.to_string()),
        llm_model: env::var("REPLYLINE_LLM_MODEL")
            .unwrap_or_else(|_| DEFAULT_LLM_MODEL.to_string()),
        capture_max_seconds: env::var("REPLYLINE_CAPTURE_MAX_SECONDS")
            .ok()
            .and_then(|value| value.parse::<u16>().ok())
            .unwrap_or(30),
        ..AppSettings::default()
    };
    let probe_text =
        env::var("REPLYLINE_PROBE_TEXT").unwrap_or_else(|_| DEFAULT_PROBE_TEXT.to_string());
    let voice_name =
        env::var("REPLYLINE_PROBE_VOICE").unwrap_or_else(|_| "Microsoft Irina Desktop".to_string());
    let scenario = env::var("REPLYLINE_SCENARIO").unwrap_or_else(|_| DEFAULT_SCENARIO.to_string());
    let stt_mode = env::var("REPLYLINE_STT_MODE").unwrap_or_else(|_| DEFAULT_STT_MODE.to_string());
    let audio_mode =
        env::var("REPLYLINE_AUDIO_MODE").unwrap_or_else(|_| DEFAULT_AUDIO_MODE.to_string());
    let audio_source_label = env::var("REPLYLINE_AUDIO_SOURCE_LABEL").unwrap_or_else(|_| {
        if audio_mode == "tts" {
            voice_name.clone()
        } else {
            scenario.clone()
        }
    });

    let settings_path = settings::settings_path().map_err(|err| err.to_string())?;
    let report_path = report_path()?;
    let config_source = "probe-env-and-defaults".to_string();
    let credentials_source = "process-env-only".to_string();
    let used_persistent_app_config = false;

    println!("Replyline runtime probe");
    println!("Settings path: {}", settings_path.display());
    println!("Report path: {}", report_path.display());
    println!("Config source: {config_source}");
    println!("Credentials source: {credentials_source}");
    println!("Scenario: {scenario}");
    println!("Audio mode: {audio_mode}");
    println!("Audio source: {audio_source_label}");
    println!("STT mode: {stt_mode}");
    println!("Voice: {voice_name}");
    println!("Model: {}", settings.llm_model);
    println!("Capture cap: {}s", settings.capture_max_seconds);

    let started_at = Instant::now();
    let capture = audio::CaptureRun::start(settings.capture_max_seconds)?;
    thread::sleep(Duration::from_millis(350));

    let capture_started_at = Instant::now();
    play_probe_source(&audio_mode, &probe_text, &voice_name)?;
    thread::sleep(Duration::from_millis(350));

    let release_started_at = Instant::now();
    let pcm = capture.stop()?;
    let stop_to_pcm_ms = release_started_at.elapsed().as_millis();
    let capture_window_ms = capture_started_at.elapsed().as_millis();
    let captured_audio_ms = (pcm.len() as u128 * 1000) / 16_000;
    let stt_started_at = Instant::now();
    let transcript = match stt_mode.as_str() {
        "streaming" => {
            deepgram::transcribe_pcm_streaming(&settings, &deepgram_api_key, &pcm).await?
        }
        "batch" => {
            let wav = audio::encode_wav(&pcm);
            deepgram::transcribe_wav(&settings, &deepgram_api_key, &wav).await?
        }
        other => return Err(format!("Unknown REPLYLINE_STT_MODE: {other}")),
    };
    let stt_ms = stt_started_at.elapsed().as_millis();

    let llm_started_at = Instant::now();
    let card = llm::analyze_transcript(&settings, Some(&llm_api_key), &transcript, "").await?;
    let llm_ms = llm_started_at.elapsed().as_millis();
    let release_to_card_ms = release_started_at.elapsed().as_millis();
    let total_end_to_end_ms = started_at.elapsed().as_millis();

    let report = RuntimeLatencyReport {
        generated_at_utc: Utc::now().to_rfc3339(),
        settings_path: settings_path.display().to_string(),
        report_path: report_path.display().to_string(),
        config_source,
        credentials_source,
        used_persistent_app_config,
        scenario,
        audio_mode,
        audio_source_label,
        voice: voice_name,
        llm_base_url: settings.llm_base_url.clone(),
        llm_model: settings.llm_model.clone(),
        stt_mode,
        deepgram_model: settings.deepgram_model.clone(),
        primary_language: settings.primary_language.clone(),
        capture_max_seconds: settings.capture_max_seconds,
        capture_samples: pcm.len(),
        capture_window_ms,
        captured_audio_ms,
        stop_to_pcm_ms,
        stt_ms,
        llm_ms,
        release_to_card_ms,
        total_end_to_end_ms,
        transcript,
        card: ProbeCard {
            gist: card.gist,
            say_now: card.say_now,
            next_move: card.next_move,
        },
    };

    if let Some(parent) = report_path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let payload = serde_json::to_vec_pretty(&report).map_err(|err| err.to_string())?;
    fs_atomic::write_bytes_atomically(&report_path, &payload).map_err(|err| err.to_string())?;

    println!();
    println!("Transcript: {}", report.transcript);
    println!("Gist: {}", report.card.gist);
    println!("Say now: {}", report.card.say_now);
    println!("Next move: {}", report.card.next_move);
    println!();
    println!(
        "Latency: stop->pcm={}ms, stt={}ms, llm={}ms, release->card={}ms",
        report.stop_to_pcm_ms, report.stt_ms, report.llm_ms, report.release_to_card_ms
    );

    Ok(())
}

fn report_path() -> Result<PathBuf, String> {
    let file_name = env::var("REPLYLINE_REPORT_FILE")
        .unwrap_or_else(|_| "first-latency-report.json".to_string());
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or_else(|| "Cannot resolve workspace root.".to_string())?
        .join("reports")
        .join("runtime");
    Ok(root.join(file_name))
}

fn speak_probe_text(text: &str, voice_name: &str) -> Result<(), String> {
    let script = r#"
Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$preferred = $speaker.GetInstalledVoices() |
  Where-Object { $_.VoiceInfo.Culture.Name -eq 'ru-RU' } |
  Select-Object -First 1
if ($preferred) {
  $speaker.SelectVoice($preferred.VoiceInfo.Name)
} elseif ($env:REPLYLINE_PROBE_VOICE) {
  try { $speaker.SelectVoice($env:REPLYLINE_PROBE_VOICE) } catch {}
}
$speaker.Rate = -1
$speaker.Volume = 100
$speaker.Speak($env:REPLYLINE_PROBE_TEXT)
"#;

    let status = Command::new("pwsh")
        .arg("-NoProfile")
        .arg("-Command")
        .arg(script)
        .env("REPLYLINE_PROBE_TEXT", text)
        .env("REPLYLINE_PROBE_VOICE", voice_name)
        .status()
        .map_err(|err| format!("Failed to launch probe speech: {err}"))?;

    if !status.success() {
        return Err("Probe speech synthesis failed.".to_string());
    }

    Ok(())
}

fn play_probe_source(audio_mode: &str, text: &str, voice_name: &str) -> Result<(), String> {
    match audio_mode {
        "tts" => speak_probe_text(text, voice_name),
        "external-command" => run_external_audio_command(),
        "manual-wait" => wait_for_manual_audio(),
        other => Err(format!("Unknown REPLYLINE_AUDIO_MODE: {other}")),
    }
}

fn run_external_audio_command() -> Result<(), String> {
    let command = env::var("REPLYLINE_AUDIO_COMMAND").map_err(|_| {
        "REPLYLINE_AUDIO_COMMAND is required for external-command mode.".to_string()
    })?;

    let status = Command::new("pwsh")
        .arg("-NoProfile")
        .arg("-Command")
        .arg(command)
        .status()
        .map_err(|err| format!("Failed to launch external audio command: {err}"))?;

    if !status.success() {
        return Err("External audio command failed.".to_string());
    }

    Ok(())
}

fn wait_for_manual_audio() -> Result<(), String> {
    let wait_ms = env::var("REPLYLINE_MANUAL_WAIT_MS")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(15_000);
    println!("Manual audio window: {wait_ms}ms");
    thread::sleep(Duration::from_millis(wait_ms));
    Ok(())
}
