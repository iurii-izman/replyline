use tauri::{AppHandle, Emitter};

use crate::app_log;
use crate::diag_contract::DIAG_RUNTIME_EVENT_NAME;
use crate::types::StatusEventDto;

pub(crate) fn emit_status(
    app: &AppHandle,
    run_id: Option<&str>,
    phase: &str,
    detail: Option<String>,
) {
    let _ = app.emit(
        "replyline://status",
        StatusEventDto {
            run_id: run_id.map(String::from),
            phase: phase.to_string(),
            detail,
        },
    );
}

pub(crate) fn update_tray_title(app: &AppHandle, title: &str) {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_tooltip(Some(title.to_string()));
    }
}

pub(crate) fn log_diag(
    stage: &str,
    outcome: &str,
    code: &str,
    detail: impl AsRef<str>,
) -> Result<(), String> {
    app_log::append_event(
        DIAG_RUNTIME_EVENT_NAME,
        format!(
            "stage={stage} outcome={outcome} code={code} detail={}",
            detail.as_ref()
        ),
    )
}
