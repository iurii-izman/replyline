pub const DIAG_RUNTIME_EVENT_NAME: &str = "diag_runtime_event";

pub const RL_CAPTURE_START: &str = "RL_CAPTURE_START";
pub const RL_CAPTURE_NOT_ACTIVE: &str = "RL_CAPTURE_NOT_ACTIVE";
pub const RL_CAPTURE_JOIN_FAILED: &str = "RL_CAPTURE_JOIN_FAILED";
pub const RL_CAPTURE_STOP_FAILED: &str = "RL_CAPTURE_STOP_FAILED";
pub const RL_CAPTURE_READY: &str = "RL_CAPTURE_READY";
pub const RL_STT_KEY_MISSING: &str = "RL_STT_KEY_MISSING";
pub const RL_STT_FAILED: &str = "RL_STT_FAILED";
pub const RL_STT_STREAMING_FAILED: &str = "RL_STT_STREAMING_FAILED";
pub const RL_STT_OK: &str = "RL_STT_OK";
pub const RL_LLM_FAILED: &str = "RL_LLM_FAILED";
pub const RL_LLM_OK: &str = "RL_LLM_OK";
pub const RL_CARD_INVALID: &str = "RL_CARD_INVALID";
pub const RL_ANALYSIS_OK: &str = "RL_ANALYSIS_OK";
pub const RL_RETRY_EMPTY: &str = "RL_RETRY_EMPTY";
pub const RL_RETRY_OK: &str = "RL_RETRY_OK";

pub const RL_DIAG_CODES: [&str; 15] = [
    RL_CAPTURE_START,
    RL_CAPTURE_NOT_ACTIVE,
    RL_CAPTURE_JOIN_FAILED,
    RL_CAPTURE_STOP_FAILED,
    RL_CAPTURE_READY,
    RL_STT_KEY_MISSING,
    RL_STT_FAILED,
    RL_STT_STREAMING_FAILED,
    RL_STT_OK,
    RL_LLM_FAILED,
    RL_LLM_OK,
    RL_CARD_INVALID,
    RL_ANALYSIS_OK,
    RL_RETRY_EMPTY,
    RL_RETRY_OK,
];

pub fn is_known_diag_code(code: &str) -> bool {
    RL_DIAG_CODES.contains(&code)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn diag_codes_are_stable_unique_and_rl_prefixed() {
        let mut seen = HashSet::new();
        for code in RL_DIAG_CODES {
            assert!(code.starts_with("RL_"), "code must keep RL_ prefix: {code}");
            assert!(seen.insert(code), "duplicate diagnostic code: {code}");
        }
        assert_eq!(RL_DIAG_CODES.len(), 15);
    }

    #[test]
    fn lookup_accepts_known_rejects_unknown_codes() {
        assert!(is_known_diag_code(RL_STT_FAILED));
        assert!(!is_known_diag_code("RL_UNKNOWN_FUTURE"));
    }
}
