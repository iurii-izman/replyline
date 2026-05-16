use crate::app_log;
use crate::diag_contract::{RL_CARD_INVALID, RL_LLM_FAILED};
use crate::privacy;
use crate::services::pipeline_events::log_diag;
use crate::types::CommandError;

/// Classify an LLM error string: returns (app_log_event_name, diag_code).
fn classify_llm_error(err: &str) -> (&'static str, &'static str) {
    if err.contains("Card output invalid:") {
        ("analysis_card_invalid", RL_CARD_INVALID)
    } else {
        ("analysis_llm_failed", RL_LLM_FAILED)
    }
}

/// Log the LLM failure via app_log + diag, then return a `CommandError::Pipeline`.
///
/// `stage` — diag stage (`"llm"` or `"retry"`).
/// `log_prefix` — prefix in the app_log detail (`"llm"` or `"retry_llm"`).
/// `extra_detail` — appended to diag detail (e.g. `" chars_band=short"`).
pub(crate) fn log_llm_failure(
    stage: &str,
    err: String,
    log_prefix: &str,
    extra_detail: &str,
) -> CommandError {
    let (event, code) = classify_llm_error(&err);
    // R3 safe_preview: prevent raw LLM response text from leaking into app_log.
    // The err may contain parse failures with partial LLM output — truncate to 200 chars.
    let log_detail = format!("{log_prefix}: {}", privacy::safe_preview(&err, 200));
    let _ = app_log::append_event(event, log_detail);
    let invalid_reason = err
        .split("Card output invalid:")
        .nth(1)
        .map(str::trim)
        .unwrap_or("-");
    let _ = log_diag(
        stage,
        "fail",
        code,
        format!("invalid_reason={invalid_reason}{extra_detail}"),
    );
    CommandError::Pipeline(err)
}
