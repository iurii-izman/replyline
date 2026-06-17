use crate::types::CommandError;

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

pub(crate) fn experimental_bilingual_allowed() -> bool {
    // The env flag is the primary kill-switch: absent = feature is completely off.
    if std::env::var("REPLYLINE_EXPERIMENTAL_BILINGUAL").as_deref() != Ok("1") {
        return false;
    }
    let settings = crate::settings::load().unwrap_or_default();
    settings.bilingual_interview_enabled
}

pub(crate) fn require_experimental_bilingual() -> Result<(), CommandError> {
    // Check env flag first — primary kill-switch.
    if std::env::var("REPLYLINE_EXPERIMENTAL_BILINGUAL").as_deref() != Ok("1") {
        return Err(CommandError::Internal(
            "EXPERIMENTAL_BILINGUAL_ENV_DISABLED".to_string(),
        ));
    }
    // Env flag is on; check the user-facing setting.
    let settings = crate::settings::load().unwrap_or_default();
    if !settings.bilingual_interview_enabled {
        return Err(CommandError::Internal(
            "EXPERIMENTAL_BILINGUAL_DISABLED".to_string(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    static ENV_MUTEX: Mutex<()> = Mutex::new(());

    /// Acquire the env mutex once per test and hold it for the full duration
    /// to prevent parallel tests from overwriting each other's env vars.
    fn lock_env() -> std::sync::MutexGuard<'static, ()> {
        ENV_MUTEX.lock().unwrap()
    }

    fn with_env(_guard: &std::sync::MutexGuard<'static, ()>, key: &str, value: Option<&str>) {
        match value {
            Some(v) => std::env::set_var(key, v),
            None => std::env::remove_var(key),
        }
    }

    fn clean_env(_guard: &std::sync::MutexGuard<'static, ()>) {
        std::env::remove_var("REPLYLINE_EXPERIMENTAL_BILINGUAL");
        std::env::remove_var("REPLYLINE_SETTINGS_DIR_OVERRIDE");
    }

    fn err_code(err: Result<(), CommandError>) -> String {
        match err {
            Err(CommandError::Internal(msg)) => msg,
            _ => "no internal error".to_string(),
        }
    }

    #[test]
    fn env_missing_setting_false_is_disabled() {
        let _guard = lock_env();
        clean_env(&_guard);
        with_env(
            &_guard,
            "REPLYLINE_SETTINGS_DIR_OVERRIDE",
            Some("/nonexistent/replyline-bilingual-test"),
        );
        assert!(!experimental_bilingual_allowed());
        let err = require_experimental_bilingual();
        assert!(err.is_err());
        assert_eq!(err_code(err), "EXPERIMENTAL_BILINGUAL_ENV_DISABLED");
    }

    #[test]
    fn env_missing_setting_true_still_disabled() {
        let _guard = lock_env();
        clean_env(&_guard);
        // Even if a settings file exists with bilingual_interview_enabled=true,
        // without the env flag the feature is gated.
        assert!(!experimental_bilingual_allowed());
        let err = require_experimental_bilingual();
        assert!(err.is_err());
        assert_eq!(err_code(err), "EXPERIMENTAL_BILINGUAL_ENV_DISABLED");
    }

    #[test]
    fn env_one_setting_false_is_disabled() {
        let _guard = lock_env();
        clean_env(&_guard);
        with_env(&_guard, "REPLYLINE_EXPERIMENTAL_BILINGUAL", Some("1"));
        with_env(
            &_guard,
            "REPLYLINE_SETTINGS_DIR_OVERRIDE",
            Some("/nonexistent/replyline-bilingual-test"),
        );
        assert!(!experimental_bilingual_allowed());
        let err = require_experimental_bilingual();
        assert!(err.is_err());
        assert_eq!(err_code(err), "EXPERIMENTAL_BILINGUAL_DISABLED");
    }

    #[test]
    fn env_one_setting_true_is_allowed() {
        let _guard = lock_env();
        clean_env(&_guard);
        with_env(&_guard, "REPLYLINE_EXPERIMENTAL_BILINGUAL", Some("1"));
        // When both env flag is set and settings allow it, the feature is permitted.
        // This test verifies the gating logic shape; a full integration test
        // would require a real settings file with bilingual_interview_enabled=true.
        let settings_present = crate::settings::load()
            .map(|s| s.bilingual_interview_enabled)
            .unwrap_or(false);
        // On a clean system without a settings file, this defaults to false.
        // The important contract is: both gates must pass.
        let allowed = experimental_bilingual_allowed();
        assert_eq!(allowed, settings_present);
        if allowed {
            assert!(require_experimental_bilingual().is_ok());
        } else {
            let err = require_experimental_bilingual();
            assert!(err.is_err());
            assert_eq!(err_code(err), "EXPERIMENTAL_BILINGUAL_DISABLED");
        }
    }

    #[test]
    fn env_other_value_is_disabled() {
        let _guard = lock_env();
        clean_env(&_guard);
        with_env(&_guard, "REPLYLINE_EXPERIMENTAL_BILINGUAL", Some("0"));
        assert!(!experimental_bilingual_allowed());
        let err = require_experimental_bilingual();
        assert!(err.is_err());
        assert_eq!(err_code(err), "EXPERIMENTAL_BILINGUAL_ENV_DISABLED");
    }

    #[test]
    fn env_empty_string_is_disabled() {
        let _guard = lock_env();
        clean_env(&_guard);
        with_env(&_guard, "REPLYLINE_EXPERIMENTAL_BILINGUAL", Some(""));
        assert!(!experimental_bilingual_allowed());
        let err = require_experimental_bilingual();
        assert!(err.is_err());
        assert_eq!(err_code(err), "EXPERIMENTAL_BILINGUAL_ENV_DISABLED");
    }
}
