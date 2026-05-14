use tauri::{AppHandle, Emitter, Manager, State};

use crate::app_log;
use crate::audio::CaptureRun;
use crate::credentials;
use crate::services::capture_pipeline;
use crate::settings;
use crate::state::ReplylineState;
use crate::types::{
    AnalysisCardDto, AppSettings, BootstrapDto, CommandError, ContextStatusDto, SecretSlot,
    StatusEventDto,
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
pub fn sync_tray_ui_phase(
    app: AppHandle,
    phase: String,
    detail: Option<String>,
) -> Result<(), CommandError> {
    let lang = settings::load().unwrap_or_default().primary_language;
    let text = crate::tray_status::tooltip_for_phase(&lang, &phase, detail.as_deref());
    update_tray_title(&app, &text);
    Ok(())
}

#[tauri::command]
pub fn refresh_tray_menu(app: AppHandle) -> Result<(), CommandError> {
    let settings = settings::load()?;
    let lang = settings.primary_language.as_str();
    let menu = crate::build_main_tray_menu(&app, lang)
        .map_err(|e| CommandError::Internal(format!("tray menu build failed: {e}")))?;
    let tray = app
        .tray_by_id("main-tray")
        .ok_or_else(|| CommandError::Internal("main tray icon not found".to_string()))?;
    tray.set_menu(Some(menu))
        .map_err(|e| CommandError::Internal(format!("tray set_menu failed: {e}")))?;
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
        &crate::tray_status::tooltip_for_phase(
            settings.primary_language.as_str(),
            "capturing",
            None,
        ),
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
