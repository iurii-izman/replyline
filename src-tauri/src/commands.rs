use serde::Deserialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_opener::OpenerExt;
use url::Url;

use crate::app_log;
use crate::audio::CaptureRun;
use crate::credentials;
use crate::diagnostic_bundle;
use crate::memory::{MemorySpace, MemorySpaceRecord};
use crate::settings;
use crate::services::{capture_pipeline, memory_service, provider_health};
use crate::state::ReplylineState;
use crate::types::{
    AnalysisCardDto, AppSettings, BootstrapDto, CommandError, ContextStatusDto,
    DiagnosticBundleDto, HealthCheckResult, RuntimeReadinessDto, SecretSlot, StatusEventDto,
};

impl From<crate::settings::SettingsError> for CommandError {
    fn from(err: crate::settings::SettingsError) -> Self {
        Self::Settings(err.to_string())
    }
}

impl From<crate::credentials::CredentialError> for CommandError {
    fn from(err: crate::credentials::CredentialError) -> Self {
        Self::Credential(err.to_string())
    }
}

impl From<crate::memory::MemoryError> for CommandError {
    fn from(err: crate::memory::MemoryError) -> Self {
        Self::Memory(err.to_string())
    }
}

#[tauri::command]
pub fn load_bootstrap(state: State<'_, ReplylineState>) -> Result<BootstrapDto, CommandError> {
    let _ = app_log::append_event("bootstrap_load_attempt", "-");
    let settings = settings::load()?;
    let deepgram_key_present = credentials::present(SecretSlot::DeepgramApiKey)?;
    let llm_key_present = credentials::present(SecretSlot::LlmApiKey)?;
    let (context_active, context_entry_count, last_transcript_preview, can_retry_last_transcript) = {
        let mut guard = state
            .context
            .lock()
            .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
        let status = guard.status();
        (
            status.context_active,
            status.entry_count,
            status.last_transcript_preview.clone(),
            status.can_retry_last_transcript,
        )
    };

    let runtime_ready = settings.runtime_path_configured(deepgram_key_present);
    let log_status = app_log::status().map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "bootstrap_loaded",
        format!("runtime_ready={runtime_ready} context_entries={context_entry_count}"),
    );

    Ok(BootstrapDto {
        settings,
        deepgram_key_present,
        llm_key_present,
        context_active,
        context_entry_count,
        runtime_ready,
        log_status,
        last_transcript_preview,
        can_retry_last_transcript,
    })
}

#[tauri::command]
pub fn collect_diagnostic_bundle() -> Result<DiagnosticBundleDto, CommandError> {
    diagnostic_bundle::collect_runtime_evidence_bundle().map_err(CommandError::Internal)
}

#[tauri::command]
pub fn get_log_status() -> Result<crate::types::LogStatusDto, CommandError> {
    app_log::status().map_err(CommandError::Internal)
}

#[tauri::command]
pub fn get_runtime_readiness(
    state: State<'_, ReplylineState>,
) -> Result<RuntimeReadinessDto, CommandError> {
    let settings = settings::load()?;
    let deepgram_key_present = credentials::present(SecretSlot::DeepgramApiKey)?;
    let llm_key_present = credentials::present(SecretSlot::LlmApiKey)?;
    let runtime_ready = settings.runtime_path_configured(deepgram_key_present);
    let mut guard = state
        .context
        .lock()
        .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
    let status = guard.status();
    let char_count = guard.last_transcript().map(|t| t.chars().count());
    Ok(RuntimeReadinessDto {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        settings_schema_version: settings.schema_version,
        deepgram_key_present,
        llm_key_present,
        runtime_ready,
        context_active: status.context_active,
        context_entry_count: status.entry_count,
        can_retry_last_transcript: status.can_retry_last_transcript,
        last_transcript_char_count: char_count,
    })
}

#[tauri::command]
pub fn log_client_event(event: String, detail: Option<String>) -> Result<(), CommandError> {
    app_log::append_event(&event, detail.unwrap_or_else(|| "-".to_string()))
        .map_err(CommandError::Internal)
}

#[tauri::command]
pub fn quit_app(app: AppHandle) -> Result<(), CommandError> {
    let _ = app_log::append_event("quit_app", "header_button");
    app.exit(0);
    Ok(())
}

#[tauri::command]
pub fn open_notebooklm(app: AppHandle, url: String) -> Result<(), CommandError> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err(CommandError::Settings(
            "INVALID_NOTEBOOKLM_URL: missing url".to_string(),
        ));
    }
    let parsed = Url::parse(trimmed)
        .map_err(|_| CommandError::Settings("INVALID_NOTEBOOKLM_URL".to_string()))?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err(CommandError::Settings("INVALID_NOTEBOOKLM_URL".to_string()));
    }
    let _ = app_log::append_event("notebooklm_open_attempt", trimmed);
    app.opener()
        .open_url(trimmed, None::<&str>)
        .map_err(|err| CommandError::Internal(format!("NotebookLM open failed: {err}")))?;
    let _ = app_log::append_event("notebooklm_open_ok", trimmed);
    Ok(())
}

#[tauri::command]
pub fn sync_tray_ui_phase(
    app: AppHandle,
    phase: String,
    detail: Option<String>,
) -> Result<(), CommandError> {
    let text = crate::tray_status::tooltip_for_phase(&phase, detail.as_deref());
    update_tray_title(&app, &text);
    Ok(())
}

#[tauri::command]
pub fn save_settings(input: AppSettings) -> Result<AppSettings, CommandError> {
    let _ = app_log::append_event("settings_save_attempt", format!("hotkey={}", input.hotkey));
    match settings::save(&input) {
        Ok(saved) => {
            let _ = app_log::append_event("settings_save_ok", format!("hotkey={}", saved.hotkey));
            Ok(saved)
        }
        Err(err) => {
            let _ = app_log::append_event("settings_save_failed", err.to_string());
            Err(CommandError::from(err))
        }
    }
}

#[tauri::command]
pub fn acknowledge_tray_intro() -> Result<AppSettings, CommandError> {
    let mut current = settings::load()?;
    current.tray_intro_seen = true;
    settings::save(&current).map_err(CommandError::from)
}

#[tauri::command]
pub fn save_secret(slot: String, value: String) -> Result<(), CommandError> {
    let slot = SecretSlot::from_str(&slot)
        .ok_or_else(|| CommandError::Internal("Unknown secret slot".to_string()))?;
    let slot_name = match slot {
        SecretSlot::DeepgramApiKey => "deepgram_api_key",
        SecretSlot::LlmApiKey => "llm_api_key",
    };
    let _ = app_log::append_event("secret_save_attempt", slot_name);
    match credentials::save(slot, value.trim()) {
        Ok(()) => {
            let _ = app_log::append_event("secret_save_ok", slot_name);
            Ok(())
        }
        Err(err) => {
            let _ = app_log::append_event("secret_save_failed", format!("{slot_name}: {err}"));
            Err(CommandError::from(err))
        }
    }
}

#[tauri::command]
pub fn delete_secret(slot: String) -> Result<(), CommandError> {
    let slot = SecretSlot::from_str(&slot)
        .ok_or_else(|| CommandError::Internal("Unknown secret slot".to_string()))?;
    credentials::delete(slot).map_err(CommandError::from)
}

#[tauri::command]
pub fn clear_context(state: State<'_, ReplylineState>) -> Result<ContextStatusDto, CommandError> {
    let mut guard = state
        .context
        .lock()
        .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
    guard.clear();
    Ok(guard.status())
}

#[tauri::command]
pub fn get_context_status(
    state: State<'_, ReplylineState>,
) -> Result<ContextStatusDto, CommandError> {
    let mut guard = state
        .context
        .lock()
        .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
    Ok(guard.status())
}

#[tauri::command]
pub fn capture_start(state: State<'_, ReplylineState>, app: AppHandle) -> Result<(), CommandError> {
    let _ = app_log::append_event("capture_start_attempt", "-");
    let settings = settings::load()?;
    let mut capture = state
        .capture
        .lock()
        .map_err(|_| CommandError::Internal("Capture lock poisoned".to_string()))?;
    if capture.active.is_some() {
        return Ok(());
    }
    let run = CaptureRun::start(settings.capture_max_seconds).map_err(CommandError::Capture)?;
    capture.active = Some(run);
    emit_status(&app, "capturing", None);
    update_tray_title(
        &app,
        &crate::tray_status::tooltip_for_phase("capturing", None),
    );
    let _ = app_log::append_event("capture_start_ok", "-");
    Ok(())
}

#[tauri::command]
pub async fn capture_stop_and_analyze(
    state: State<'_, ReplylineState>,
    app: AppHandle,
) -> Result<AnalysisCardDto, CommandError> {
    capture_pipeline::capture_stop_and_analyze(&state, &app).await
}

#[tauri::command]
pub async fn retry_last_analysis(
    state: State<'_, ReplylineState>,
    app: AppHandle,
) -> Result<AnalysisCardDto, CommandError> {
    capture_pipeline::retry_last_analysis(&state, &app).await
}

#[tauri::command]
pub fn tray_open_main(app: AppHandle) -> Result<(), CommandError> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| CommandError::Internal("Missing main window".to_string()))?;
    window
        .show()
        .map_err(|err| CommandError::Internal(err.to_string()))?;
    window
        .set_focus()
        .map_err(|err| CommandError::Internal(err.to_string()))?;
    Ok(())
}

#[tauri::command]
pub fn memory_list_spaces() -> Result<Vec<MemorySpace>, CommandError> {
    memory_service::list_spaces()
}

#[tauri::command]
pub fn memory_get_space_record(space_id: String) -> Result<MemorySpaceRecord, CommandError> {
    memory_service::get_space_record(&space_id)
}

#[tauri::command]
pub fn memory_save_space_record(
    input: MemorySpaceRecord,
) -> Result<MemorySpaceRecord, CommandError> {
    memory_service::save_space_record(input)
}

#[tauri::command]
pub async fn check_provider_health() -> Result<HealthCheckResult, CommandError> {
    let settings = settings::load()?;
    let deepgram_key = credentials::load(SecretSlot::DeepgramApiKey)?;
    let llm_key = credentials::load(SecretSlot::LlmApiKey)?;
    provider_health::check_provider_health(&settings, deepgram_key.as_deref(), llm_key.as_deref())
        .await
}

#[derive(Debug, Deserialize)]
struct FixtureSnippetRow {
    id: String,
    snippet: String,
}

/// Debug-only: run LLM card pipeline on a transcript snippet from `fixtures/ru-work-snippets.json` (no mic/STT).
#[tauri::command]
pub async fn dev_analyze_fixture_snippet(fixture_id: String) -> Result<AnalysisCardDto, CommandError> {
    if !cfg!(debug_assertions) {
        return Err(CommandError::Internal(
            "Прогон фикстур доступен только в debug-сборке.".to_string(),
        ));
    }
    let path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../fixtures/ru-work-snippets.json");
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| CommandError::Internal(format!("Не прочитан файл фикстур: {e}")))?;
    let list: Vec<FixtureSnippetRow> = serde_json::from_str(&raw)
        .map_err(|e| CommandError::Internal(format!("Фикстуры: неверный JSON ({e})")))?;
    let id = fixture_id.trim();
    let entry = list
        .iter()
        .find(|row| row.id == id)
        .ok_or_else(|| CommandError::Internal(format!("Неизвестный id фикстуры: {id}")))?;
    let settings = settings::load()?;
    let llm_key = credentials::load(SecretSlot::LlmApiKey)?;
    crate::llm::analyze_transcript(&settings, llm_key.as_deref(), &entry.snippet, "")
        .await
        .map_err(CommandError::Pipeline)
}

fn emit_status(app: &AppHandle, phase: &str, detail: Option<&str>) {
    let _ = app.emit(
        "replyline://status",
        StatusEventDto {
            phase: phase.to_string(),
            detail: detail.map(|value| value.to_string()),
        },
    );
}

fn update_tray_title(app: &AppHandle, title: &str) {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_tooltip(Some(title.to_string()));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::memory::{
        JsonMemoryStore, MemoryCommitment, MemoryCommitmentStatus, MemoryFact, MemoryFactCategory,
        MemoryFactSourceKind, MemorySpaceKind, MemorySpaceStatus, MemoryTerm,
    };
    use chrono::Utc;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_store() -> JsonMemoryStore {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("replyline-memory-api-test-{unique}"));
        JsonMemoryStore::new(root)
    }

    fn sample_record() -> MemorySpaceRecord {
        let ts = Utc::now();
        MemorySpaceRecord {
            space: MemorySpace {
                id: "team:qa".to_string(),
                kind: MemorySpaceKind::Team,
                label: "QA team".to_string(),
                status: MemorySpaceStatus::Active,
                created_at: ts,
                updated_at: ts,
            },
            facts: vec![MemoryFact {
                id: "fact-qa-1".to_string(),
                text: "Release window is Friday 17:00.".to_string(),
                category: MemoryFactCategory::Constraint,
                source_kind: MemoryFactSourceKind::Manual,
                confidence: 1.0,
                confirmed_by_user: true,
                created_at: ts,
                updated_at: ts,
            }],
            commitments: vec![MemoryCommitment {
                id: "commit-qa-1".to_string(),
                text: "Share test sign-off update.".to_string(),
                owner: "olga".to_string(),
                due_hint: Some("before release call".to_string()),
                status: MemoryCommitmentStatus::Open,
                confirmed_by_user: true,
                created_at: ts,
                updated_at: ts,
            }],
            terms: vec![MemoryTerm {
                id: "term-qa-1".to_string(),
                term: "Go/No-Go".to_string(),
                preferred_text: "release decision checkpoint".to_string(),
                note: None,
                created_at: ts,
                updated_at: ts,
            }],
        }
    }

    #[test]
    fn memory_list_spaces_returns_empty_on_clean_store() {
        let store = temp_store();
        let spaces = memory_service::list_spaces_with_store(&store).expect("list");
        assert!(spaces.is_empty());
    }

    #[test]
    fn memory_list_spaces_returns_saved_spaces_after_writes() {
        let store = temp_store();
        let record = sample_record();
        let _saved = memory_service::save_space_record_with_store(&store, record).expect("save");

        let spaces = memory_service::list_spaces_with_store(&store).expect("list");
        assert_eq!(spaces.len(), 1);
        assert_eq!(spaces[0].id, "team:qa");
    }

    #[test]
    fn memory_get_space_record_returns_saved_record() {
        let store = temp_store();
        let record = sample_record();
        let _saved = memory_service::save_space_record_with_store(&store, record).expect("save");

        let loaded = memory_service::get_space_record_with_store(&store, "team:qa").expect("get");
        assert_eq!(loaded.space.label, "QA team");
        assert_eq!(loaded.facts.len(), 1);
    }

    #[test]
    fn memory_get_space_record_returns_user_safe_missing_error() {
        let store = temp_store();
        let err =
            memory_service::get_space_record_with_store(&store, "team:missing")
                .expect_err("must fail");
        assert_eq!(err.to_string(), "Memory space not found.");
    }

    #[test]
    fn memory_save_space_record_rejects_invalid_input_cleanly() {
        let store = temp_store();
        let mut record = sample_record();
        record.facts[0].confidence = 2.0;
        let err = memory_service::save_space_record_with_store(&store, record)
            .expect_err("must fail");
        assert_eq!(err.to_string(), "Memory input is invalid.");
    }
}
