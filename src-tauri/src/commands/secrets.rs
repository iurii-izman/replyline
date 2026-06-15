use crate::app_log;
use crate::credentials;
use crate::observability::{self, Fields, PrivacyClass};
use crate::types::{CommandError, SecretSlot};

#[tauri::command]
pub fn save_secret(slot: String, value: String) -> Result<(), CommandError> {
    let slot = SecretSlot::from_str(&slot)
        .ok_or_else(|| CommandError::Internal("Unknown secret slot".to_string()))?;
    let slot_name = match slot {
        SecretSlot::DeepgramApiKey => "deepgram_api_key",
        SecretSlot::LlmApiKey => "llm_api_key",
    };
    let _ = app_log::append_event("secret_save_attempt", slot_name);
    let _ = observability::log_audit(
        "credential_save_attempt",
        Fields::new()
            .with("source", "settings")
            .with("phase", "settings")
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
            .with("slot", slot_name),
    );
    let trimmed = value.trim();
    if trimmed.is_empty() {
        let _ = app_log::append_event("secret_save_failed", format!("{slot_name}: empty_value"));
        return Err(CommandError::Settings("EMPTY_SECRET_NOT_SAVED".to_string()));
    }
    match credentials::save(slot, trimmed) {
        Ok(()) => {
            let _ = app_log::append_event("secret_save_ok", slot_name);
            let _ = observability::log_audit(
                "credential_save_ok",
                Fields::new()
                    .with("source", "settings")
                    .with("phase", "settings")
                    .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
                    .with("slot", slot_name),
            );
            Ok(())
        }
        Err(err) => {
            let _ = app_log::append_metadata_event(
                "secret_save_failed",
                vec![
                    ("slot", slot_name.to_string()),
                    (
                        "error",
                        app_log::safe_provider_error_preview(&err.to_string()),
                    ),
                ],
            );
            Err(CommandError::from(err))
        }
    }
}

#[tauri::command]
pub fn delete_secret(slot: String) -> Result<(), CommandError> {
    let slot = SecretSlot::from_str(&slot)
        .ok_or_else(|| CommandError::Internal("Unknown secret slot".to_string()))?;
    credentials::delete(slot).map_err(CommandError::from)?;
    let slot_name = match slot {
        SecretSlot::DeepgramApiKey => "deepgram_api_key",
        SecretSlot::LlmApiKey => "llm_api_key",
    };
    let _ = observability::log_audit(
        "credential_delete_ok",
        Fields::new()
            .with("source", "settings")
            .with("phase", "settings")
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
            .with("slot", slot_name),
    );
    Ok(())
}
