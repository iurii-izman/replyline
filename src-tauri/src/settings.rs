use std::fs;
use std::io::{ErrorKind, Write};
use std::path::PathBuf;

use url::Url;

use crate::types::AppSettings;

const SETTINGS_DIR: &str = "com.replyline.app";
const SETTINGS_FILE: &str = "settings.json";

#[derive(Debug, thiserror::Error)]
pub enum SettingsError {
    #[error("IO: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON: {0}")]
    Json(#[from] serde_json::Error),
    #[error("URL: {0}")]
    Url(#[from] url::ParseError),
    #[error("INVALID_LANGUAGE")]
    InvalidLanguage,
    #[error("INVALID_URL")]
    InvalidUrl,
    #[error("INVALID_SCHEMA")]
    InvalidSchema,
    #[error("MODEL_REQUIRED")]
    ModelRequired,
    #[error("HOTKEY_REQUIRED")]
    HotkeyRequired,
    #[error("CAPTURE_RANGE_INVALID")]
    CaptureRangeInvalid,
}

pub fn settings_path() -> Result<PathBuf, SettingsError> {
    let base = dirs::config_dir()
        .ok_or_else(|| std::io::Error::new(ErrorKind::NotFound, "config_dir_unavailable"))?;
    Ok(base.join(SETTINGS_DIR).join(SETTINGS_FILE))
}

pub fn load() -> Result<AppSettings, SettingsError> {
    let path = settings_path()?;
    if !path.exists() {
        return Ok(AppSettings::default());
    }
    let raw = fs::read(&path)?;
    let settings: AppSettings = serde_json::from_slice(&raw)?;
    validate(&settings)?;
    Ok(settings)
}

pub fn save(settings: &AppSettings) -> Result<AppSettings, SettingsError> {
    validate(settings)?;
    let path = settings_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let tmp_path = path.with_extension("json.tmp");
    let payload = serde_json::to_vec_pretty(settings)?;
    let mut file = fs::File::create(&tmp_path)?;
    file.write_all(&payload)?;
    file.sync_all()?;
    if path.exists() {
        fs::remove_file(&path)?;
    }
    fs::rename(&tmp_path, &path)?;
    Ok(settings.clone())
}

pub fn validate(settings: &AppSettings) -> Result<(), SettingsError> {
    if settings.schema_version != 1 {
        return Err(SettingsError::InvalidSchema);
    }
    if settings.hotkey.trim().is_empty() {
        return Err(SettingsError::HotkeyRequired);
    }
    if settings.llm_model.trim().is_empty() {
        return Err(SettingsError::ModelRequired);
    }
    if !(5..=180).contains(&settings.capture_max_seconds) {
        return Err(SettingsError::CaptureRangeInvalid);
    }
    match settings.primary_language.trim() {
        "ru" | "en" => {}
        _ => return Err(SettingsError::InvalidLanguage),
    }
    let url = Url::parse(settings.llm_base_url.trim())?;
    if !(url.scheme() == "http" || url.scheme() == "https") {
        return Err(SettingsError::InvalidUrl);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_empty_hotkey() {
        let mut settings = AppSettings::default();
        settings.hotkey.clear();
        assert!(matches!(validate(&settings), Err(SettingsError::HotkeyRequired)));
    }

    #[test]
    fn rejects_unknown_language() {
        let mut settings = AppSettings::default();
        settings.primary_language = "de".to_string();
        assert!(matches!(
            validate(&settings),
            Err(SettingsError::InvalidLanguage)
        ));
    }

    #[test]
    fn rejects_capture_range_outside_bounds() {
        let mut settings = AppSettings::default();
        settings.capture_max_seconds = 4;
        assert!(matches!(
            validate(&settings),
            Err(SettingsError::CaptureRangeInvalid)
        ));
    }
}
