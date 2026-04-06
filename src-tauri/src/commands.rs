use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, State};

use crate::audio::{encode_wav, CaptureRun};
use crate::context::ConversationContext;
use crate::credentials;
use crate::deepgram;
use crate::llm;
use crate::memory::{JsonMemoryStore, MemorySpace, MemorySpaceRecord};
use crate::settings;
use crate::types::{AnalysisCardDto, AppSettings, BootstrapDto, ContextStatusDto, SecretSlot, StatusEventDto};

pub struct CaptureController {
    active: Option<CaptureRun>,
}

impl Default for CaptureController {
    fn default() -> Self {
        Self { active: None }
    }
}

pub struct ReplylineState {
    pub capture: Mutex<CaptureController>,
    pub context: Mutex<ConversationContext>,
}

impl Default for ReplylineState {
    fn default() -> Self {
        Self {
            capture: Mutex::new(CaptureController::default()),
            context: Mutex::new(ConversationContext::default()),
        }
    }
}

#[tauri::command]
pub fn load_bootstrap(state: State<'_, ReplylineState>) -> Result<BootstrapDto, String> {
    let settings = settings::load().map_err(|err| err.to_string())?;
    let deepgram_key_present =
        credentials::present(SecretSlot::DeepgramApiKey).map_err(|err| err.to_string())?;
    let llm_key_present = credentials::present(SecretSlot::LlmApiKey).map_err(|err| err.to_string())?;
    let context_active = state
        .context
        .lock()
        .map_err(|_| "Context lock poisoned".to_string())?
        .status()
        .context_active;

    Ok(BootstrapDto {
        settings,
        deepgram_key_present,
        llm_key_present,
        context_active,
    })
}

#[tauri::command]
pub fn save_settings(input: AppSettings) -> Result<AppSettings, String> {
    settings::save(&input).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn save_secret(slot: String, value: String) -> Result<(), String> {
    let slot = SecretSlot::from_str(&slot).ok_or_else(|| "Unknown secret slot".to_string())?;
    credentials::save(slot, value.trim()).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn delete_secret(slot: String) -> Result<(), String> {
    let slot = SecretSlot::from_str(&slot).ok_or_else(|| "Unknown secret slot".to_string())?;
    credentials::delete(slot).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn clear_context(state: State<'_, ReplylineState>) -> Result<ContextStatusDto, String> {
    let mut guard = state
        .context
        .lock()
        .map_err(|_| "Context lock poisoned".to_string())?;
    guard.clear();
    Ok(guard.status())
}

#[tauri::command]
pub fn capture_start(state: State<'_, ReplylineState>, app: AppHandle) -> Result<(), String> {
    let settings = settings::load().map_err(|err| err.to_string())?;
    let mut capture = state
        .capture
        .lock()
        .map_err(|_| "Capture lock poisoned".to_string())?;
    if capture.active.is_some() {
        return Ok(());
    }
    let run = CaptureRun::start(settings.capture_max_seconds)?;
    capture.active = Some(run);
    emit_status(&app, "capturing", None);
    update_tray_title(&app, "Replyline · Запись...");
    Ok(())
}

#[tauri::command]
pub async fn capture_stop_and_analyze(
    state: State<'_, ReplylineState>,
    app: AppHandle,
) -> Result<AnalysisCardDto, String> {
    let capture_run = {
        let mut capture = state
            .capture
            .lock()
            .map_err(|_| "Capture lock poisoned".to_string())?;
        capture
            .active
            .take()
            .ok_or_else(|| "Capture is not active.".to_string())?
    };

    emit_status(&app, "transcribing", Some("Распознаю фрагмент…"));
    update_tray_title(&app, "Replyline · Распознавание...");

    let pcm = tauri::async_runtime::spawn_blocking(move || capture_run.stop())
        .await
        .map_err(|_| "Capture join failed".to_string())??;

    let settings = settings::load().map_err(|err| err.to_string())?;
    let deepgram_key = credentials::load(SecretSlot::DeepgramApiKey)
        .map_err(|err| err.to_string())?
        .ok_or_else(|| "Deepgram API key is missing.".to_string())?;
    let llm_key = credentials::load(SecretSlot::LlmApiKey).map_err(|err| err.to_string())?;

    let wav = encode_wav(&pcm);
    let transcript = deepgram::transcribe_wav(&settings, &deepgram_key, wav).await?;

    emit_status(&app, "analyzing", Some("Собираю карточку…"));
    update_tray_title(&app, "Replyline · Анализ...");

    let context_text = {
        let mut context = state
            .context
            .lock()
            .map_err(|_| "Context lock poisoned".to_string())?;
        context.formatted_context()
    };

    let card = llm::analyze_transcript(&settings, llm_key.as_deref(), &transcript, &context_text).await?;

    {
        let mut context = state
            .context
            .lock()
            .map_err(|_| "Context lock poisoned".to_string())?;
        context.push_transcript(&transcript);
        context.remember_card(card.clone());
    }

    emit_status(&app, "ready", None);
    update_tray_title(&app, "Replyline · Готово");
    Ok(card)
}

#[tauri::command]
pub async fn retry_last_analysis(
    state: State<'_, ReplylineState>,
    app: AppHandle,
) -> Result<AnalysisCardDto, String> {
    let settings = settings::load().map_err(|err| err.to_string())?;
    let llm_key = credentials::load(SecretSlot::LlmApiKey).map_err(|err| err.to_string())?;

    let (transcript, context_text) = {
        let mut context = state
            .context
            .lock()
            .map_err(|_| "Context lock poisoned".to_string())?;
        let transcript = context
            .last_transcript()
            .ok_or_else(|| "Nothing to retry yet.".to_string())?;
        let context_text = context.formatted_context();
        (transcript, context_text)
    };

    emit_status(&app, "analyzing", Some("Пробую ещё раз…"));
    update_tray_title(&app, "Replyline · Повтор...");

    let card = llm::analyze_transcript(&settings, llm_key.as_deref(), &transcript, &context_text).await?;
    {
        let mut context = state
            .context
            .lock()
            .map_err(|_| "Context lock poisoned".to_string())?;
        context.remember_card(card.clone());
    }
    emit_status(&app, "ready", None);
    update_tray_title(&app, "Replyline · Готово");
    Ok(card)
}

#[tauri::command]
pub fn tray_open_main(app: AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or_else(|| "Missing main window".to_string())?;
    window.show().map_err(|err| err.to_string())?;
    window.set_focus().map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn memory_list_spaces() -> Result<Vec<MemorySpace>, String> {
    let store = JsonMemoryStore::default().map_err(memory_error_for_user)?;
    memory_list_spaces_with_store(&store)
}

#[tauri::command]
pub fn memory_get_space_record(space_id: String) -> Result<MemorySpaceRecord, String> {
    let store = JsonMemoryStore::default().map_err(memory_error_for_user)?;
    memory_get_space_record_with_store(&store, &space_id)
}

#[tauri::command]
pub fn memory_save_space_record(input: MemorySpaceRecord) -> Result<MemorySpaceRecord, String> {
    let store = JsonMemoryStore::default().map_err(memory_error_for_user)?;
    memory_save_space_record_with_store(&store, input)
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

fn memory_list_spaces_with_store(store: &JsonMemoryStore) -> Result<Vec<MemorySpace>, String> {
    store.list_spaces().map_err(memory_error_for_user)
}

fn memory_get_space_record_with_store(
    store: &JsonMemoryStore,
    space_id: &str,
) -> Result<MemorySpaceRecord, String> {
    store
        .load_record(space_id.trim())
        .map_err(memory_error_for_user)
}

fn memory_save_space_record_with_store(
    store: &JsonMemoryStore,
    input: MemorySpaceRecord,
) -> Result<MemorySpaceRecord, String> {
    store.save_record(&input).map_err(memory_error_for_user)?;
    Ok(input)
}

fn memory_error_for_user(err: impl std::fmt::Display) -> String {
    let text = err.to_string();
    if text.starts_with("VALIDATION:") {
        return "Memory input is invalid.".to_string();
    }
    if text.starts_with("NOT_FOUND:") {
        return "Memory space not found.".to_string();
    }
    "Memory store operation failed.".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use crate::memory::{
        MemoryCommitment, MemoryCommitmentStatus, MemoryFact, MemoryFactCategory,
        MemoryFactSourceKind, MemorySpaceKind, MemorySpaceStatus, MemoryTerm,
    };
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
        let spaces = memory_list_spaces_with_store(&store).expect("list");
        assert!(spaces.is_empty());
    }

    #[test]
    fn memory_list_spaces_returns_saved_spaces_after_writes() {
        let store = temp_store();
        let record = sample_record();
        let _saved = memory_save_space_record_with_store(&store, record).expect("save");

        let spaces = memory_list_spaces_with_store(&store).expect("list");
        assert_eq!(spaces.len(), 1);
        assert_eq!(spaces[0].id, "team:qa");
    }

    #[test]
    fn memory_get_space_record_returns_saved_record() {
        let store = temp_store();
        let record = sample_record();
        let _saved = memory_save_space_record_with_store(&store, record).expect("save");

        let loaded = memory_get_space_record_with_store(&store, "team:qa").expect("get");
        assert_eq!(loaded.space.label, "QA team");
        assert_eq!(loaded.facts.len(), 1);
    }

    #[test]
    fn memory_get_space_record_returns_user_safe_missing_error() {
        let store = temp_store();
        let err = memory_get_space_record_with_store(&store, "team:missing")
            .expect_err("must fail");
        assert_eq!(err, "Memory space not found.");
    }

    #[test]
    fn memory_save_space_record_rejects_invalid_input_cleanly() {
        let store = temp_store();
        let mut record = sample_record();
        record.facts[0].confidence = 2.0;
        let err = memory_save_space_record_with_store(&store, record).expect_err("must fail");
        assert_eq!(err, "Memory input is invalid.");
    }
}
