use std::collections::BTreeMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;
use std::path::PathBuf;
#[cfg(test)]
use std::sync::OnceLock;

use crate::model_presets::{resolve_model_preset, ProviderKind};
use crate::pipeline_timing::StageTiming;
use crate::types::AppSettings;
use serde::Serialize;
use sha2::{Digest, Sha256};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct TraceManifest<'a> {
    schema_version: u8,
    run_id: &'a str,
    started_at: &'a str,
    app_version: &'static str,
    mode: &'a str,
    profile: &'a str,
    provider_kind: &'a str,
    endpoint_host: String,
    model: &'a str,
    privacy_mode: &'static str,
    trace_mode: &'a str,
    content_included: bool,
}

pub fn traces_base_dir() -> Result<PathBuf, String> {
    #[cfg(test)]
    {
        static TEST_BASE_DIR: OnceLock<PathBuf> = OnceLock::new();
        return Ok(TEST_BASE_DIR
            .get_or_init(|| {
                std::env::temp_dir().join(format!(
                    "replyline-traces-test-{}-{}",
                    std::process::id(),
                    chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
                ))
            })
            .clone());
    }

    #[cfg(not(test))]
    let base = dirs::data_dir().ok_or_else(|| "data_dir_unavailable".to_string())?;
    #[cfg(not(test))]
    {
        Ok(base.join("com.replyline.app").join("traces"))
    }
}

fn run_dir(run_id: &str) -> Result<PathBuf, String> {
    Ok(traces_base_dir()?.join(run_id))
}

pub fn write_run_json<T: Serialize>(
    run_id: &str,
    file_name: &str,
    value: &T,
) -> Result<(), String> {
    let path = run_dir(run_id)?.join(file_name);
    let raw = serde_json::to_vec_pretty(value).map_err(|err| err.to_string())?;
    fs::write(path, raw).map_err(|err| err.to_string())
}

pub fn write_run_text(run_id: &str, file_name: &str, value: &str) -> Result<(), String> {
    let path = run_dir(run_id)?.join(file_name);
    fs::write(path, value).map_err(|err| err.to_string())
}

pub fn write_run_bytes(run_id: &str, file_name: &str, value: &[u8]) -> Result<(), String> {
    let path = run_dir(run_id)?.join(file_name);
    fs::write(path, value).map_err(|err| err.to_string())
}

pub fn append_run_jsonl<T: Serialize>(
    run_id: &str,
    file_name: &str,
    value: &T,
) -> Result<(), String> {
    let path = run_dir(run_id)?.join(file_name);
    let line = serde_json::to_string(value).map_err(|err| err.to_string())?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|err| err.to_string())?;
    writeln!(file, "{line}").map_err(|err| err.to_string())
}

pub fn sha256_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    let digest = hasher.finalize();
    format!(
        "sha256:{}",
        digest
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>()
    )
}

pub fn ensure_run_started(
    run_id: &str,
    started_at: &str,
    settings: &AppSettings,
    mode: &str,
) -> Result<(), String> {
    let dir = run_dir(run_id)?;
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;

    let preset = resolve_model_preset(&settings.selected_model_preset);
    let provider_kind = match preset.provider_kind {
        ProviderKind::Custom | ProviderKind::OpenAiCompatible => "custom",
        ProviderKind::OpenRouter => "openrouter",
    };
    let endpoint_host = url::Url::parse(settings.llm_base_url.trim())
        .ok()
        .and_then(|url| url.host_str().map(|v| v.to_string()))
        .unwrap_or_else(|| "unknown".to_string());

    let manifest = TraceManifest {
        schema_version: 1,
        run_id,
        started_at,
        app_version: env!("CARGO_PKG_VERSION"),
        mode,
        profile: &settings.active_answer_profile,
        provider_kind,
        endpoint_host,
        model: &settings.llm_model,
        privacy_mode: "safe_metadata",
        trace_mode: match settings.debug_trace_mode {
            crate::types::DebugTraceMode::Off => "off",
            crate::types::DebugTraceMode::Redacted => "redacted",
            crate::types::DebugTraceMode::FullLocal => "full_local",
        },
        content_included: settings.debug_trace_full_enabled(),
    };

    let manifest_path = dir.join("manifest.json");
    if !manifest_path.is_file() {
        let manifest_raw = serde_json::to_vec_pretty(&manifest).map_err(|err| err.to_string())?;
        fs::write(manifest_path, manifest_raw).map_err(|err| err.to_string())?;
    }

    let timeline_path = dir.join("timeline.jsonl");
    if !timeline_path.is_file() {
        fs::write(timeline_path, "").map_err(|err| err.to_string())?;
    }

    let timings_path = dir.join("timings.json");
    if !timings_path.is_file() {
        fs::write(timings_path, b"[]").map_err(|err| err.to_string())?;
    }

    Ok(())
}

pub fn enforce_trace_retention(
    now: chrono::DateTime<chrono::Utc>,
    retention_days: u16,
) -> Result<(usize, usize), String> {
    let base = traces_base_dir()?;
    if !base.exists() {
        return Ok((0, 0));
    }
    let mut removed = 0usize;
    let mut kept = 0usize;
    for entry in fs::read_dir(&base).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        if retention_days == 0 {
            kept += 1;
            continue;
        }
        if is_older_than(&path, now, retention_days)? {
            fs::remove_dir_all(&path).map_err(|err| err.to_string())?;
            removed += 1;
        } else {
            kept += 1;
        }
    }
    Ok((removed, kept))
}

fn is_older_than(
    path: &Path,
    now: chrono::DateTime<chrono::Utc>,
    days: u16,
) -> Result<bool, String> {
    let metadata = fs::metadata(path).map_err(|err| err.to_string())?;
    let modified = metadata.modified().map_err(|err| err.to_string())?;
    let modified: chrono::DateTime<chrono::Utc> = modified.into();
    let age = now.signed_duration_since(modified);
    Ok(age >= chrono::Duration::days(i64::from(days)))
}

pub fn clear_all_traces() -> Result<usize, String> {
    let base = traces_base_dir()?;
    if !base.exists() {
        return Ok(0);
    }
    let mut removed = 0usize;
    for entry in fs::read_dir(&base).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            fs::remove_dir_all(path).map_err(|err| err.to_string())?;
            removed += 1;
        }
    }
    Ok(removed)
}

pub fn append_timeline_event(
    run_id: &str,
    event: &str,
    phase: &str,
    fields: BTreeMap<String, String>,
) -> Result<(), String> {
    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Timeline<'a> {
        at: String,
        event: &'a str,
        phase: &'a str,
        fields: BTreeMap<String, String>,
    }

    let payload = Timeline {
        at: chrono::Utc::now().to_rfc3339(),
        event,
        phase,
        fields,
    };
    let line = serde_json::to_string(&payload).map_err(|err| err.to_string())?;

    let path = run_dir(run_id)?.join("timeline.jsonl");
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|err| err.to_string())?;
    writeln!(file, "{line}").map_err(|err| err.to_string())
}

pub fn write_timings(run_id: &str, timings: &[StageTiming]) -> Result<(), String> {
    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Timing<'a> {
        stage: &'a str,
        duration_ms: u128,
        outcome: &'a str,
        code: &'a str,
    }

    let data: Vec<Timing<'_>> = timings
        .iter()
        .map(|t| Timing {
            stage: t.stage,
            duration_ms: t.duration_ms,
            outcome: t.outcome,
            code: t.code,
        })
        .collect();

    let raw = serde_json::to_vec_pretty(&data).map_err(|err| err.to_string())?;
    let path = run_dir(run_id)?.join("timings.json");
    fs::write(path, raw).map_err(|err| err.to_string())
}

#[cfg(test)]
mod tests {
    use super::{
        append_timeline_event, clear_all_traces, enforce_trace_retention, ensure_run_started,
        sha256_hex, traces_base_dir, write_run_bytes,
    };
    use crate::types::AppSettings;
    use std::collections::BTreeMap;
    use std::fs;
    use std::sync::{Mutex, OnceLock};
    use std::time::{Duration, SystemTime};

    fn trace_test_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    #[test]
    fn manifest_created_without_content() {
        let _guard = trace_test_lock().lock().expect("trace lock");
        let run_id = format!(
            "test-run-{}",
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
        );
        let settings = AppSettings::default();
        ensure_run_started(
            &run_id,
            "2026-05-23T12:00:00Z",
            &settings,
            "work_conversation",
        )
        .expect("trace start");

        let manifest_path = traces_base_dir()
            .expect("trace base")
            .join(&run_id)
            .join("manifest.json");
        let raw = std::fs::read_to_string(&manifest_path).expect("manifest read");
        assert!(raw.contains("\"traceMode\": \"redacted\""));
        assert!(raw.contains("\"contentIncluded\": false"));
        assert!(!raw.contains("transcript"));
        assert!(!raw.contains("prompt"));

        append_timeline_event(&run_id, "capture_start_ok", "capturing", BTreeMap::new())
            .expect("timeline");
    }

    #[test]
    fn manifest_content_toggle_respects_opt_in() {
        let _guard = trace_test_lock().lock().expect("trace lock");
        let run_id = format!(
            "test-run-content-{}",
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
        );
        let mut settings = AppSettings::default();
        settings.debug_trace_mode = crate::types::DebugTraceMode::FullLocal;
        ensure_run_started(
            &run_id,
            "2026-05-23T12:00:00Z",
            &settings,
            "work_conversation",
        )
        .expect("trace start");
        let manifest_path = traces_base_dir()
            .expect("trace base")
            .join(&run_id)
            .join("manifest.json");
        let raw = std::fs::read_to_string(&manifest_path).expect("manifest read");
        assert!(raw.contains("\"traceMode\": \"full_local\""));
        assert!(raw.contains("\"contentIncluded\": true"));
        write_run_bytes(&run_id, "capture.full.wav", b"RIFF-test").expect("audio trace write");
        let audio_path = manifest_path
            .parent()
            .expect("trace dir")
            .join("capture.full.wav");
        assert_eq!(
            fs::read(audio_path).expect("audio trace read"),
            b"RIFF-test"
        );
    }

    #[test]
    fn existing_manifest_keeps_original_capture_start() {
        let _guard = trace_test_lock().lock().expect("trace lock");
        let run_id = format!(
            "test-run-stable-start-{}",
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
        );
        let settings = AppSettings::default();
        ensure_run_started(
            &run_id,
            "2026-05-23T12:00:00Z",
            &settings,
            "work_conversation",
        )
        .expect("first trace start");
        ensure_run_started(
            &run_id,
            "2026-05-23T12:00:05Z",
            &settings,
            "work_conversation",
        )
        .expect("second trace start");

        let manifest_path = traces_base_dir()
            .expect("trace base")
            .join(&run_id)
            .join("manifest.json");
        let raw = std::fs::read_to_string(manifest_path).expect("manifest read");
        assert!(raw.contains("\"startedAt\": \"2026-05-23T12:00:00Z\""));
        assert!(!raw.contains("2026-05-23T12:00:05Z"));
    }

    #[test]
    fn sha256_is_stable() {
        let _guard = trace_test_lock().lock().expect("trace lock");
        let first = sha256_hex("same-value");
        let second = sha256_hex("same-value");
        let different = sha256_hex("other-value");
        assert_eq!(first, second);
        assert_ne!(first, different);
        assert!(first.starts_with("sha256:"));
    }

    #[test]
    fn test_trace_dir_is_isolated_from_app_data() {
        let _guard = trace_test_lock().lock().expect("trace lock");
        let base = traces_base_dir().expect("trace base");
        assert!(base.starts_with(std::env::temp_dir()));
        if let Some(data_dir) = dirs::data_dir() {
            assert_ne!(base, data_dir.join("com.replyline.app").join("traces"));
        }
    }

    #[test]
    fn retention_removes_old_trace_dirs() {
        let _guard = trace_test_lock().lock().expect("trace lock");
        let base = traces_base_dir().expect("base dir");
        let old_run = format!("retention-old-{}", chrono::Utc::now().timestamp_millis());
        let keep_run = format!("retention-keep-{}", chrono::Utc::now().timestamp_millis());
        fs::create_dir_all(base.join(&old_run)).expect("create old");
        fs::create_dir_all(base.join(&keep_run)).expect("create keep");

        let old_time = SystemTime::now()
            .checked_sub(Duration::from_secs(60 * 60 * 24 * 5))
            .expect("old time");
        let filetime = filetime::FileTime::from_system_time(old_time);
        filetime::set_file_mtime(base.join(&old_run), filetime).expect("set mtime");

        let (removed, kept) = enforce_trace_retention(chrono::Utc::now(), 1).expect("retention");
        assert!(removed >= 1);
        assert!(kept >= 1);
        assert!(!base.join(&old_run).exists());
        assert!(base.join(&keep_run).exists());
        let _ = fs::remove_dir_all(base.join(&keep_run));
    }

    #[test]
    fn clear_removes_all_trace_dirs() {
        let _guard = trace_test_lock().lock().expect("trace lock");
        let base = traces_base_dir().expect("base dir");
        let run_a = format!("clear-a-{}", chrono::Utc::now().timestamp_millis());
        let run_b = format!("clear-b-{}", chrono::Utc::now().timestamp_millis());
        fs::create_dir_all(base.join(&run_a)).expect("create run a");
        fs::create_dir_all(base.join(&run_b)).expect("create run b");

        let removed = clear_all_traces().expect("clear");
        assert!(removed >= 2);
        assert!(!base.join(&run_a).exists());
        assert!(!base.join(&run_b).exists());
    }
}
