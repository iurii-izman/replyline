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
    let error_chars = err.chars().count();
    // R3 safe_preview: prevent raw LLM response text from leaking into app_log.
    // The err may contain parse failures with partial LLM output — truncate to 200 chars.
    let log_detail = format!(
        "{log_prefix}: llm_error_chars={error_chars} err_preview={}",
        privacy::safe_preview(&err, 80)
    );
    let _ = app_log::append_event(event, log_detail);
    let retry_reason = if err.contains("retry_reason=timeout") {
        "timeout"
    } else if err.contains("retry_reason=connect") {
        "connect"
    } else if err.contains("retry_reason=http_5xx") {
        "http_5xx"
    } else {
        "unknown"
    };
    let _ = log_diag(
        stage,
        "fail",
        code,
        format!("llm_error_chars={error_chars} llm_retry_reason={retry_reason}{extra_detail}"),
    );
    CommandError::Pipeline(err)
}

#[cfg(test)]
mod tests {
    use super::classify_llm_error;
    use crate::types::CommandError;

    #[test]
    fn classify_card_invalid_path() {
        let (event, code) = classify_llm_error("Card output invalid: raw prompt dump");
        assert_eq!(event, "analysis_card_invalid");
        assert_eq!(code, crate::diag_contract::RL_CARD_INVALID);
    }

    #[test]
    fn log_llm_failure_returns_pipeline_error_without_mutating_message() {
        let raw = "Card output invalid: transcript: very sensitive line api_key=secret";
        let err = super::log_llm_failure("llm", raw.to_string(), "llm", " chars_band=short");
        match err {
            CommandError::Pipeline(message) => assert_eq!(message, raw),
            other => panic!("unexpected error variant: {other:?}"),
        }
    }
}
