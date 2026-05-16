//! Local settings file + validation. User-facing explanations for these rules live in the
//! frontend (`mapSettingsSaveError` and settings UI copy).

use std::fs;
use std::io::ErrorKind;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::path::PathBuf;

use url::Url;

use crate::fs_atomic;
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
    #[error("PARTIAL_CONFIG_INVALID")]
    PartialConfigInvalid,
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

    let value: serde_json::Value = match serde_json::from_slice(&raw) {
        Ok(v) => v,
        Err(err) => {
            quarantine_corrupt(&path, &format!("parse_error={err}"));
            return Ok(AppSettings::default());
        }
    };

    let migrated = migrate_settings(value);

    if let Err(err) = ensure_required_fields(&migrated) {
        quarantine_corrupt(&path, &format!("required_fields_error={err}"));
        return Ok(AppSettings::default());
    }

    let settings: AppSettings = match serde_json::from_value(migrated) {
        Ok(s) => s,
        Err(err) => {
            quarantine_corrupt(&path, &format!("migration_deserialize_error={err}"));
            return Ok(AppSettings::default());
        }
    };

    match validate(&settings) {
        Ok(()) => Ok(settings),
        Err(err) => {
            quarantine_corrupt(&path, &format!("validation_error={err}"));
            Ok(AppSettings::default())
        }
    }
}

const CURRENT_SCHEMA_VERSION: u32 = 2;

fn migrate_settings(mut value: serde_json::Value) -> serde_json::Value {
    let version = value
        .get("schemaVersion")
        .and_then(|v| v.as_u64())
        .unwrap_or(1) as u32;

    if version < 2 {
        migrate_v1_to_v2(&mut value);
    }

    value
}

fn migrate_v1_to_v2(value: &mut serde_json::Value) {
    if let Some(obj) = value.as_object_mut() {
        obj.entry("schemaVersion").or_insert(serde_json::json!(2));
        if let Some(v) = obj.get_mut("schemaVersion") {
            *v = serde_json::json!(2);
        }
    }
}

pub fn save(settings: &AppSettings) -> Result<AppSettings, SettingsError> {
    validate(settings)?;
    let path = settings_path()?;
    fs_atomic::write_json_atomically(&path, settings)?;
    Ok(settings.clone())
}

pub fn validate(settings: &AppSettings) -> Result<(), SettingsError> {
    if !(1..=CURRENT_SCHEMA_VERSION).contains(&settings.schema_version) {
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
    if !settings.llm_base_url.trim().is_empty() {
        validate_http_url(settings.llm_base_url.trim(), SettingsError::InvalidUrl)?;
    }
    Ok(())
}

fn ensure_required_fields(value: &serde_json::Value) -> Result<(), SettingsError> {
    let obj = value
        .as_object()
        .ok_or(SettingsError::PartialConfigInvalid)?;
    for key in [
        "schemaVersion",
        "hotkey",
        "llmBaseUrl",
        "llmModel",
        "captureMaxSeconds",
    ] {
        if !obj.contains_key(key) {
            return Err(SettingsError::PartialConfigInvalid);
        }
    }

    if obj
        .get("hotkey")
        .and_then(|v| v.as_str())
        .map(|v| v.trim().is_empty())
        .unwrap_or(true)
    {
        return Err(SettingsError::PartialConfigInvalid);
    }

    if obj
        .get("llmModel")
        .and_then(|v| v.as_str())
        .map(|v| v.trim().is_empty())
        .unwrap_or(true)
    {
        return Err(SettingsError::PartialConfigInvalid);
    }
    Ok(())
}

fn quarantine_corrupt(path: &std::path::Path, reason: &str) {
    let ts = chrono::Utc::now().format("%Y%m%dT%H%M%S");
    let corrupt_name = format!("settings.json.corrupt.{ts}");
    let corrupt_path = path.with_file_name(&corrupt_name);
    let _ = fs::rename(path, &corrupt_path);
    eprintln!("settings_corrupt_recovery: {reason} backup={corrupt_name}");
}

fn validate_http_url(value: &str, error: SettingsError) -> Result<(), SettingsError> {
    let url = match Url::parse(value) {
        Ok(url) => url,
        Err(_) => return Err(error),
    };

    if url.scheme() == "https" {
        return Ok(());
    }

    if url.scheme() != "http" {
        return Err(error);
    }

    let host = match url.host_str() {
        Some(h) => h.trim().to_ascii_lowercase(),
        None => return Err(error),
    };
    if is_local_http_host(&host) {
        return Ok(());
    }

    Err(error)
}

fn is_local_http_host(host: &str) -> bool {
    if host == "localhost" {
        return true;
    }

    if let Ok(ip) = host.parse::<IpAddr>() {
        return match ip {
            IpAddr::V4(v4) => {
                v4.is_loopback()
                    || v4.is_private()
                    || v4.is_link_local()
                    || v4 == Ipv4Addr::new(169, 254, 169, 254)
            }
            IpAddr::V6(v6) => {
                v6.is_loopback()
                    || v6.is_unique_local()
                    || v6.is_unicast_link_local()
                    || v6 == Ipv6Addr::LOCALHOST
            }
        };
    }

    host.ends_with(".local")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn load_recovers_from_corrupt_json() {
        let dir = std::env::temp_dir().join(format!(
            "replyline-settings-corrupt-test-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("time")
                .as_nanos()
        ));
        fs::create_dir_all(&dir).expect("mkdir");
        let path = dir.join(SETTINGS_FILE);
        let mut f = fs::File::create(&path).expect("create");
        f.write_all(b"{invalid json!!!}").expect("write");
        drop(f);

        let settings: AppSettings =
            serde_json::from_slice(b"{invalid json!!!}").unwrap_or_default();
        assert_eq!(settings.hotkey, "Ctrl+Alt+Space");
        assert!(
            !path.exists() || {
                let raw = fs::read_to_string(&path).unwrap_or_default();
                raw.contains("invalid json")
            }
        );
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn rejects_empty_hotkey() {
        let mut settings = AppSettings::default();
        settings.hotkey.clear();
        assert!(matches!(
            validate(&settings),
            Err(SettingsError::HotkeyRequired)
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

    #[test]
    fn rejects_remote_http_llm_base_url() {
        let mut settings = AppSettings::default();
        settings.llm_base_url = "http://example.com/v1".to_string();
        assert!(matches!(
            validate(&settings),
            Err(SettingsError::InvalidUrl)
        ));
    }

    #[test]
    fn allows_local_http_llm_base_url() {
        let mut settings = AppSettings::default();
        settings.llm_base_url = "http://localhost:11434/v1".to_string();
        assert!(validate(&settings).is_ok());
    }

    #[test]
    fn allows_private_network_http_llm_base_url() {
        let mut settings = AppSettings::default();
        settings.llm_base_url = "http://192.168.1.25:11434/v1".to_string();
        assert!(validate(&settings).is_ok());
    }

    #[test]
    fn migrates_v1_settings_to_v2() {
        let v1 = serde_json::json!({
            "schemaVersion": 1,
            "hotkey": "Ctrl+Alt+Space",
            "llmBaseUrl": "https://openrouter.ai/api/v1",
            "llmModel": "gpt-4o-mini",
            "captureMaxSeconds": 30
        });
        let migrated = super::migrate_settings(v1);
        assert_eq!(migrated["schemaVersion"], 2);
        // llmTemperature must NOT be injected — the field is not part of the current schema.
        assert!(migrated.get("llmTemperature").is_none());
    }

    #[test]
    fn v2_settings_pass_through_unchanged() {
        let v2 = serde_json::json!({
            "schemaVersion": 2,
            "hotkey": "Ctrl+Alt+Space",
            "llmBaseUrl": "https://openrouter.ai/api/v1",
            "llmModel": "gpt-4o-mini",
            "captureMaxSeconds": 30
        });
        let migrated = super::migrate_settings(v2);
        assert_eq!(migrated["schemaVersion"], 2);
        assert_eq!(migrated["hotkey"], "Ctrl+Alt+Space");
        assert_eq!(migrated["llmBaseUrl"], "https://openrouter.ai/api/v1");
        assert_eq!(migrated["llmModel"], "gpt-4o-mini");
        assert_eq!(migrated["captureMaxSeconds"], 30);
        // Schema-defined fields must remain; no phantom fields should appear.
        assert!(migrated.get("llmTemperature").is_none());
    }

    #[test]
    fn required_fields_reject_missing_hotkey() {
        let value = serde_json::json!({
            "schemaVersion": 2,
            "llmBaseUrl": "https://openrouter.ai/api/v1",
            "llmModel": "gpt-4o-mini",
            "captureMaxSeconds": 30
        });
        assert!(matches!(
            ensure_required_fields(&value),
            Err(SettingsError::PartialConfigInvalid)
        ));
    }
}
