use tauri::State;

use crate::app_log;
use crate::interview_report;
use crate::language_profile;
use crate::observability::{self, Fields, PrivacyClass};
use crate::state::ReplylineState;
use crate::types::{CommandError, InterviewReportDto};

#[tauri::command]
pub fn start_interview_session(
    state: State<'_, ReplylineState>,
) -> Result<interview_report::InterviewSessionState, CommandError> {
    let settings = crate::settings::load()?;
    let retention_policy =
        interview_report::retention_policy_from_days(settings.interview_report_retention_days);
    let retention_result =
        interview_report::enforce_retention(chrono::Utc::now(), retention_policy)
            .map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "interview_report_retention_applied",
        interview_report::retention_log_detail(retention_policy, retention_result),
    );
    let mut session = state
        .interview_session
        .lock()
        .map_err(|_| CommandError::Internal("Interview session lock poisoned".to_string()))?;
    Ok(interview_report::start_session(
        &mut session,
        language_profile::default_language(),
    ))
}

#[tauri::command]
pub fn end_interview_session(
    state: State<'_, ReplylineState>,
) -> Result<Option<InterviewReportDto>, CommandError> {
    let settings = crate::settings::load()?;
    let retention_policy =
        interview_report::retention_policy_from_days(settings.interview_report_retention_days);
    let mut session = state
        .interview_session
        .lock()
        .map_err(|_| CommandError::Internal("Interview session lock poisoned".to_string()))?;
    let report = interview_report::end_session(&mut session).map_err(CommandError::Internal)?;
    let retention_result =
        interview_report::enforce_retention(chrono::Utc::now(), retention_policy)
            .map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "interview_report_retention_applied",
        interview_report::retention_log_detail(retention_policy, retention_result),
    );
    Ok(report)
}

#[tauri::command]
pub fn get_interview_report() -> Result<Option<InterviewReportDto>, CommandError> {
    let settings = crate::settings::load()?;
    let retention_policy =
        interview_report::retention_policy_from_days(settings.interview_report_retention_days);
    let retention_result =
        interview_report::enforce_retention(chrono::Utc::now(), retention_policy)
            .map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "interview_report_retention_applied",
        interview_report::retention_log_detail(retention_policy, retention_result),
    );
    interview_report::get_latest_report().map_err(CommandError::Internal)
}

#[tauri::command]
pub fn export_interview_report_markdown() -> Result<Option<String>, CommandError> {
    let out = interview_report::export_latest_report_markdown().map_err(CommandError::Internal)?;
    let _ = observability::log_audit(
        "export_full_clicked",
        Fields::new()
            .with("source", "report")
            .with("phase", "export")
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
            .with("path_present", out.is_some()),
    );
    Ok(out)
}

#[tauri::command]
pub fn export_interview_report_redacted_markdown() -> Result<Option<String>, CommandError> {
    let out = interview_report::export_latest_report_redacted_markdown()
        .map_err(CommandError::Internal)?;
    let _ = observability::log_audit(
        "export_redacted_clicked",
        Fields::new()
            .with("source", "report")
            .with("phase", "export")
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
            .with("path_present", out.is_some()),
    );
    Ok(out)
}

#[tauri::command]
pub fn clear_interview_reports(state: State<'_, ReplylineState>) -> Result<(), CommandError> {
    interview_report::clear_reports().map_err(CommandError::Internal)?;
    let mut session = state
        .interview_session
        .lock()
        .map_err(|_| CommandError::Internal("Interview session lock poisoned".to_string()))?;
    *session = interview_report::InterviewSessionState::default();
    let _ = observability::log_audit(
        "clear_reports_clicked",
        Fields::new()
            .with("source", "report")
            .with("phase", "report")
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
    );
    Ok(())
}
