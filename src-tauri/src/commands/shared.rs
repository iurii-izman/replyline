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

pub(crate) fn require_experimental_bilingual() -> Result<(), CommandError> {
    let settings = crate::settings::load().unwrap_or_default();
    if !settings.bilingual_interview_enabled {
        return Err(CommandError::Internal(
            "EXPERIMENTAL_BILINGUAL_DISABLED".to_string(),
        ));
    }
    Ok(())
}
