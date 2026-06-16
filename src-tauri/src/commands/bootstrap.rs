use crate::app_log;
use crate::credentials;
use crate::settings;
use crate::state::ReplylineState;
use crate::types::{BootstrapDto, CommandError, SecretSlot};
use tauri::{AppHandle, State};

#[tauri::command]
pub fn load_bootstrap(state: State<'_, ReplylineState>) -> Result<BootstrapDto, CommandError> {
    let _ = app_log::append_event("bootstrap_load_attempt", "-");
    let settings = settings::load()?;
    let retention_policy = crate::interview_report::retention_policy_from_days(
        settings.interview_report_retention_days,
    );
    let retention_result =
        crate::interview_report::enforce_retention(chrono::Utc::now(), retention_policy)
            .map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "interview_report_retention_applied",
        crate::interview_report::retention_log_detail(retention_policy, retention_result),
    );
    let (removed, kept) = crate::trace_manifest::enforce_trace_retention(
        chrono::Utc::now(),
        settings.debug_trace_retention_days,
    )
    .map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "debug_trace_retention_applied",
        format!("removed={removed} kept={kept}"),
    );
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
    let experimental_bilingual_allowed = crate::commands::shared::experimental_bilingual_allowed();
    let _ = app_log::append_event(
        "bootstrap_loaded",
        format!(
            "runtime_ready={runtime_ready} context_entries={context_entry_count} deepgram_present={deepgram_key_present} llm_key_present={llm_key_present}"
        ),
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
        experimental_bilingual_allowed,
    })
}

#[tauri::command]
pub fn log_client_event(event: String, detail: Option<String>) -> Result<(), CommandError> {
    app_log::append_metadata_event(
        &event,
        vec![
            ("source", "client".to_string()),
            ("detail_present", detail.is_some().to_string()),
        ],
    )
    .map_err(CommandError::Internal)
}

#[tauri::command]
pub fn quit_app(app: AppHandle) -> Result<(), CommandError> {
    let _ = app_log::append_event("quit_app", "header_button");
    app.exit(0);
    Ok(())
}
