use keyring::Entry;

use crate::types::SecretSlot;

pub const SERVICE: &str = "com.replyline.app.credentials";

#[derive(Debug, thiserror::Error)]
pub enum CredentialError {
    #[error("KEYRING")]
    Keyring(#[from] keyring::Error),
}

fn entry(slot: SecretSlot) -> Result<Entry, keyring::Error> {
    let account = match slot {
        SecretSlot::DeepgramApiKey => "deepgram_api_key",
        SecretSlot::LlmApiKey => "llm_api_key",
    };
    Entry::new(SERVICE, account)
}

pub fn present(slot: SecretSlot) -> Result<bool, CredentialError> {
    let entry = entry(slot)?;
    match entry.get_password() {
        Ok(_) => {
            let _ = crate::app_log::append_event(
                "secret_present",
                format!("slot={slot:?} present=true"),
            );
            Ok(true)
        }
        Err(keyring::Error::NoEntry) => {
            let _ = crate::app_log::append_event(
                "secret_present",
                format!("slot={slot:?} present=false"),
            );
            Ok(false)
        }
        Err(err) => Err(CredentialError::Keyring(err)),
    }
}

pub fn load(slot: SecretSlot) -> Result<Option<String>, CredentialError> {
    let entry = entry(slot)?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(err) => Err(CredentialError::Keyring(err)),
    }
}

pub fn save(slot: SecretSlot, value: &str) -> Result<(), CredentialError> {
    if value.trim().is_empty() {
        return delete(slot);
    }
    entry(slot)?.set_password(value)?;
    Ok(())
}

pub fn delete(slot: SecretSlot) -> Result<(), CredentialError> {
    match entry(slot)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(CredentialError::Keyring(err)),
    }
}
