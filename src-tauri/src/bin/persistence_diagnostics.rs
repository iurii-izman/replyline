#![allow(dead_code)]

use serde::Serialize;

#[path = "../app_log.rs"]
mod app_log;
#[path = "../capture_debug.rs"]
mod capture_debug;
#[path = "../credentials.rs"]
mod credentials;
#[path = "../fs_atomic.rs"]
mod fs_atomic;
#[path = "../interview_card_v1.rs"]
mod interview_card_v1;
#[path = "../privacy.rs"]
mod privacy;
#[path = "../prompt_registry.rs"]
mod prompt_registry;
#[path = "../settings.rs"]
mod settings;
#[path = "../types.rs"]
mod types;

use types::SecretSlot;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PersistenceDiagnosticsSnapshot {
    settings_path: String,
    app_log_path: String,
    settings_file_exists: bool,
    settings_parse_ok: bool,
    settings_validation_ok: bool,
    schema_version: u32,
    llm_base_url_present: bool,
    llm_model_present: bool,
    selected_model_preset: String,
    active_answer_profile: String,
    hotkey: String,
    deepgram_key_present: bool,
    llm_key_present: bool,
    runtime_path_ready: bool,
    corrupt_backups_count: usize,
    last_log_event_time: Option<String>,
}

fn main() -> Result<(), String> {
    let settings_path = settings::settings_path().map_err(|err| err.to_string())?;
    let app_log_path = app_log::log_file_path()?.display().to_string();
    let settings_file_exists = settings_path.is_file();
    let settings_parse_ok = if settings_file_exists {
        std::fs::read(&settings_path)
            .ok()
            .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).ok())
            .is_some()
    } else {
        false
    };
    let settings = settings::load().map_err(|err| err.to_string())?;
    let settings_validation_ok = settings::validate(&settings).is_ok();
    let deepgram_key_present =
        credentials::present(SecretSlot::DeepgramApiKey).map_err(|err| err.to_string())?;
    let llm_key_present =
        credentials::present(SecretSlot::LlmApiKey).map_err(|err| err.to_string())?;
    let runtime_path_ready = settings.runtime_path_configured(deepgram_key_present);
    let corrupt_backups_count = settings::list_corrupt_backups(&settings_path).len();
    let last_log_event_time = app_log::status()
        .ok()
        .and_then(|status| status.last_line)
        .and_then(|line| {
            let ts = line.split_whitespace().next()?.trim();
            if ts.is_empty() {
                None
            } else {
                Some(ts.to_string())
            }
        });

    let payload = PersistenceDiagnosticsSnapshot {
        settings_path: settings_path.display().to_string(),
        app_log_path,
        settings_file_exists,
        settings_parse_ok,
        settings_validation_ok,
        schema_version: settings.schema_version,
        llm_base_url_present: !settings.llm_base_url.trim().is_empty(),
        llm_model_present: !settings.llm_model.trim().is_empty(),
        selected_model_preset: settings.selected_model_preset,
        active_answer_profile: settings.active_answer_profile,
        hotkey: settings.hotkey,
        deepgram_key_present,
        llm_key_present,
        runtime_path_ready,
        corrupt_backups_count,
        last_log_event_time,
    };

    println!(
        "{}",
        serde_json::to_string_pretty(&payload).map_err(|err| err.to_string())?
    );
    Ok(())
}
