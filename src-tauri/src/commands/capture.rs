use tauri::{AppHandle, State};

use crate::app_log;
use crate::audio::CaptureRun;
use crate::language_profile;
use crate::observability::{self, Fields, PrivacyClass};
use crate::services::capture_pipeline;
use crate::services::pipeline_events::{emit_status, update_tray_title};
use crate::settings;
use crate::state::ReplylineState;
use crate::trace_manifest;
use crate::tray_status;
use crate::types::{AnalysisCardDto, AnswerRewriteStyle, CommandError};

#[tauri::command]
pub fn capture_start(
    state: State<'_, ReplylineState>,
    app: AppHandle,
) -> Result<String, CommandError> {
    let _ = observability::log_audit(
        "capture_start_attempt",
        Fields::new()
            .with("source", "backend")
            .with("phase", "capture")
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
    );
    let _ = app_log::append_event("capture_start_attempt", "-");
    let settings = settings::load()?;
    let mut capture = state
        .capture
        .lock()
        .map_err(|_| CommandError::Internal("Capture lock poisoned".to_string()))?;
    if capture.active.is_some() {
        // Return current run_id if already capturing (idempotent guard).
        if let Some(ref existing_id) = capture.active_run_id {
            return Ok(existing_id.clone());
        }
        return Ok(String::new());
    }
    let run = CaptureRun::start(settings.capture_max_seconds).map_err(CommandError::Capture)?;
    let run_id = super::next_run_id();
    if settings.debug_trace_redacted_enabled() {
        let started_at = chrono::Utc::now().to_rfc3339();
        let _ = trace_manifest::ensure_run_started(
            &run_id,
            &started_at,
            &settings,
            "work_conversation",
        );
        let _ = trace_manifest::append_timeline_event(
            &run_id,
            "capture_start_ok",
            "capturing",
            std::collections::BTreeMap::new(),
        );
    }
    capture.active = Some(run);
    capture.active_run_id = Some(run_id.clone());
    emit_status(&app, Some(&run_id), "capturing", None);
    update_tray_title(
        &app,
        &tray_status::tooltip_for_phase(language_profile::default_language(), "capturing", None),
    );
    let _ = app_log::append_event("capture_start_ok", format!("run_id={run_id}"));
    let _ = observability::log_audit(
        "capture_start_ok",
        Fields::new()
            .with("source", "backend")
            .with("phase", "capture")
            .with("run_id", run_id.clone())
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
    );
    Ok(run_id)
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
    run_id: Option<String>,
    style_override: Option<AnswerRewriteStyle>,
) -> Result<AnalysisCardDto, CommandError> {
    capture_pipeline::retry_last_analysis(&state, &app, run_id, style_override).await
}
