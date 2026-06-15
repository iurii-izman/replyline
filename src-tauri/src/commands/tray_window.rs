use crate::observability::{self, Fields, PrivacyClass};
use crate::services::pipeline_events::update_tray_title;
use crate::types::CommandError;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn sync_tray_ui_phase(
    app: AppHandle,
    phase: String,
    detail: Option<String>,
) -> Result<(), CommandError> {
    let lang = crate::language_profile::default_language();
    let text = crate::tray_status::tooltip_for_phase(lang, &phase, detail.as_deref());
    update_tray_title(&app, &text);
    Ok(())
}

#[tauri::command]
pub fn refresh_tray_menu(app: AppHandle) -> Result<(), CommandError> {
    let lang = crate::language_profile::default_language();
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
    let _ = observability::log_audit(
        "tray_open_main",
        Fields::new()
            .with("source", "tray")
            .with("phase", "ui")
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
    );
    Ok(())
}
