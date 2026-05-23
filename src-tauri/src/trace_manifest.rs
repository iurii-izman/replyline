use std::collections::BTreeMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

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
    content_included: bool,
}

fn traces_base_dir() -> Result<PathBuf, String> {
    let base = dirs::data_dir().ok_or_else(|| "data_dir_unavailable".to_string())?;
    Ok(base.join("com.replyline.app").join("traces"))
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
    format!("sha256:{:x}", hasher.finalize())
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
        content_included: settings.trace_include_content,
    };

    let manifest_path = dir.join("manifest.json");
    let manifest_raw = serde_json::to_vec_pretty(&manifest).map_err(|err| err.to_string())?;
    fs::write(manifest_path, manifest_raw).map_err(|err| err.to_string())?;

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
    use super::{append_timeline_event, ensure_run_started, sha256_hex};
    use crate::types::AppSettings;
    use std::collections::BTreeMap;

    #[test]
    fn manifest_created_without_content() {
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

        let base = dirs::data_dir().expect("data dir");
        let manifest_path = base
            .join("com.replyline.app")
            .join("traces")
            .join(&run_id)
            .join("manifest.json");
        let raw = std::fs::read_to_string(&manifest_path).expect("manifest read");
        assert!(raw.contains("\"contentIncluded\": false"));
        assert!(!raw.contains("transcript"));
        assert!(!raw.contains("prompt"));

        append_timeline_event(&run_id, "capture_start_ok", "capturing", BTreeMap::new())
            .expect("timeline");
    }

    #[test]
    fn manifest_content_toggle_respects_opt_in() {
        let run_id = format!(
            "test-run-content-{}",
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
        );
        let mut settings = AppSettings::default();
        settings.trace_include_content = true;
        ensure_run_started(
            &run_id,
            "2026-05-23T12:00:00Z",
            &settings,
            "work_conversation",
        )
        .expect("trace start");
        let base = dirs::data_dir().expect("data dir");
        let manifest_path = base
            .join("com.replyline.app")
            .join("traces")
            .join(&run_id)
            .join("manifest.json");
        let raw = std::fs::read_to_string(&manifest_path).expect("manifest read");
        assert!(raw.contains("\"contentIncluded\": true"));
    }

    #[test]
    fn sha256_is_stable() {
        let first = sha256_hex("same-value");
        let second = sha256_hex("same-value");
        let different = sha256_hex("other-value");
        assert_eq!(first, second);
        assert_ne!(first, different);
        assert!(first.starts_with("sha256:"));
    }
}
