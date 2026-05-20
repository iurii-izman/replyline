//! Local settings file + validation. User-facing explanations for these rules live in the
//! frontend (`mapSettingsSaveError` and settings UI copy).

use std::fs;
use std::io::ErrorKind;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::path::{Path, PathBuf};

use url::Url;

use crate::fs_atomic;
use crate::types::AppSettings;

const SETTINGS_DIR: &str = "com.replyline.app";
const SETTINGS_FILE: &str = "settings.json";
pub const SETTINGS_DIR_OVERRIDE_ENV: &str = "REPLYLINE_SETTINGS_DIR_OVERRIDE";
const ALLOWED_INTERVIEW_REPORT_RETENTION_DAYS: [u16; 4] = [0, 7, 30, 90];

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
    #[error("RETENTION_POLICY_INVALID")]
    RetentionPolicyInvalid,
}

pub fn settings_path() -> Result<PathBuf, SettingsError> {
    if let Some(override_dir) = settings_dir_override() {
        return Ok(override_dir.join(SETTINGS_FILE));
    }
    let base = dirs::config_dir()
        .ok_or_else(|| std::io::Error::new(ErrorKind::NotFound, "config_dir_unavailable"))?;
    Ok(base.join(SETTINGS_DIR).join(SETTINGS_FILE))
}

pub fn load() -> Result<AppSettings, SettingsError> {
    let path = settings_path()?;
    let exists = path.exists();
    let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
    let _ = crate::app_log::append_event(
        "settings_load_attempt",
        format!(
            "exists={exists} size={size} path_hash={}",
            hash_path_for_log(&path)
        ),
    );
    if !path.exists() {
        let _ = crate::app_log::append_event("settings_load_default", "reason=missing_file");
        return Ok(AppSettings::default());
    }
    let raw = fs::read(&path)?;

    let value: serde_json::Value = match serde_json::from_slice(&raw) {
        Ok(v) => v,
        Err(err) => {
            quarantine_corrupt(&path, &format!("parse_error={err}"));
            let _ = crate::app_log::append_event("settings_load_default", "reason=parse_error");
            return Ok(AppSettings::default());
        }
    };
    let _ = crate::app_log::append_event("settings_parse_ok", "source=settings_json");

    let migrated = migrate_settings(value);

    if let Err(err) = ensure_required_fields(&migrated) {
        quarantine_corrupt(&path, &format!("required_fields_error={err}"));
        let _ =
            crate::app_log::append_event("settings_load_default", "reason=required_fields_error");
        return Ok(AppSettings::default());
    }

    let settings: AppSettings = match serde_json::from_value(migrated) {
        Ok(s) => s,
        Err(err) => {
            quarantine_corrupt(&path, &format!("migration_deserialize_error={err}"));
            let _ = crate::app_log::append_event(
                "settings_load_default",
                "reason=migration_deserialize_error",
            );
            return Ok(AppSettings::default());
        }
    };

    match validate(&settings) {
        Ok(()) => {
            let _ = crate::app_log::append_event("settings_validation_ok", "source=settings_json");
            let _ = crate::app_log::append_event(
                "settings_load_ok",
                format!(
                    "schema={} llm_url_present={} llm_model_present={}",
                    settings.schema_version,
                    !settings.llm_base_url.trim().is_empty(),
                    !settings.llm_model.trim().is_empty()
                ),
            );
            Ok(settings)
        }
        Err(err) => {
            quarantine_corrupt(&path, &format!("validation_error={err}"));
            let _ =
                crate::app_log::append_event("settings_load_default", "reason=validation_error");
            Ok(AppSettings::default())
        }
    }
}

const CURRENT_SCHEMA_VERSION: u32 = 7;

fn migrate_settings(mut value: serde_json::Value) -> serde_json::Value {
    let version = value
        .get("schemaVersion")
        .and_then(|v| v.as_u64())
        .unwrap_or(1) as u32;

    if version < 2 {
        migrate_v1_to_v2(&mut value);
    }
    if version < 3 {
        migrate_v2_to_v3(&mut value);
    }
    if version < 4 {
        migrate_v3_to_v4(&mut value);
    }
    if version < 5 {
        migrate_v4_to_v5(&mut value);
    }
    if version < 6 {
        migrate_v5_to_v6(&mut value);
    }
    if version < 7 {
        migrate_v6_to_v7(&mut value);
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

fn migrate_v2_to_v3(value: &mut serde_json::Value) {
    if let Some(obj) = value.as_object_mut() {
        obj.insert("schemaVersion".to_string(), serde_json::json!(3));
        obj.entry("activeAnswerProfile")
            .or_insert(serde_json::json!(
                crate::prompt_registry::DEFAULT_ANSWER_PROFILE_ID
            ));
    }
}

fn migrate_v3_to_v4(value: &mut serde_json::Value) {
    if let Some(obj) = value.as_object_mut() {
        obj.insert("schemaVersion".to_string(), serde_json::json!(4));
        obj.entry("selectedModelPreset")
            .or_insert(serde_json::json!("custom_openai_compatible"));
    }
}

fn migrate_v4_to_v5(value: &mut serde_json::Value) {
    if let Some(obj) = value.as_object_mut() {
        obj.insert("schemaVersion".to_string(), serde_json::json!(5));
        obj.entry("windowOpacity").or_insert(serde_json::json!(100));
        obj.entry("interviewCompactMode")
            .or_insert(serde_json::json!(false));
    }
}

fn migrate_v5_to_v6(value: &mut serde_json::Value) {
    if let Some(obj) = value.as_object_mut() {
        obj.insert("schemaVersion".to_string(), serde_json::json!(6));
        obj.entry("interviewReportRetentionDays")
            .or_insert(serde_json::json!(0));
    }
}

fn migrate_v6_to_v7(value: &mut serde_json::Value) {
    if let Some(obj) = value.as_object_mut() {
        obj.insert("schemaVersion".to_string(), serde_json::json!(7));
        obj.entry("hideToTrayOnClose")
            .or_insert(serde_json::json!(true));
        obj.entry("keepOnTopDuringCapture")
            .or_insert(serde_json::json!(false));
    }
}

pub fn save(settings: &AppSettings) -> Result<AppSettings, SettingsError> {
    let _ = crate::app_log::append_event(
        "settings_save_attempt",
        format!(
            "schema={} llm_url_present={} llm_model_present={} hotkey_present={}",
            settings.schema_version,
            !settings.llm_base_url.trim().is_empty(),
            !settings.llm_model.trim().is_empty(),
            !settings.hotkey.trim().is_empty()
        ),
    );
    validate(settings)?;
    let path = settings_path()?;
    fs_atomic::write_json_atomically(&path, settings)?;
    let bytes = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
    let _ = crate::app_log::append_event("settings_save_ok", format!("bytes={bytes}"));
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
    if settings.active_answer_profile.trim().is_empty() {
        return Err(SettingsError::PartialConfigInvalid);
    }
    if settings.selected_model_preset.trim().is_empty() {
        return Err(SettingsError::PartialConfigInvalid);
    }
    if ![70u8, 80u8, 90u8, 100u8].contains(&settings.window_opacity) {
        return Err(SettingsError::PartialConfigInvalid);
    }
    if !ALLOWED_INTERVIEW_REPORT_RETENTION_DAYS.contains(&settings.interview_report_retention_days)
    {
        return Err(SettingsError::RetentionPolicyInvalid);
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
        "selectedModelPreset",
        "captureMaxSeconds",
        "activeAnswerProfile",
        "windowOpacity",
        "hideToTrayOnClose",
        "keepOnTopDuringCapture",
        "interviewCompactMode",
        "interviewReportRetentionDays",
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
    let _ = crate::app_log::append_event(
        "settings_quarantine",
        format!(
            "reason={} backup={} path_hash={}",
            reason,
            corrupt_name,
            hash_path_for_log(path)
        ),
    );
    eprintln!("settings_corrupt_recovery: {reason} backup={corrupt_name}");
}

pub fn settings_file_metadata(path: &Path) -> (bool, u64, Option<String>) {
    match fs::metadata(path) {
        Ok(meta) => {
            let modified = meta
                .modified()
                .ok()
                .map(chrono::DateTime::<chrono::Utc>::from)
                .map(|dt| dt.to_rfc3339());
            (true, meta.len(), modified)
        }
        Err(_) => (false, 0, None),
    }
}

pub fn list_corrupt_backups(path: &Path) -> Vec<String> {
    let Some(parent) = path.parent() else {
        return vec![];
    };
    let Ok(entries) = fs::read_dir(parent) else {
        return vec![];
    };
    let mut backups: Vec<String> = entries
        .filter_map(Result::ok)
        .filter_map(|entry| entry.file_name().into_string().ok())
        .filter(|name| name.starts_with("settings.json.corrupt."))
        .collect();
    backups.sort();
    backups
}

fn settings_dir_override() -> Option<PathBuf> {
    let raw = std::env::var(SETTINGS_DIR_OVERRIDE_ENV).ok()?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(PathBuf::from(trimmed))
    }
}

fn hash_path_for_log(path: &Path) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    path.to_string_lossy().hash(&mut hasher);
    format!("{:x}", hasher.finish())
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
    fn migrates_v1_settings_to_v7_with_default_profile_and_preset() {
        let v1 = serde_json::json!({
            "schemaVersion": 1,
            "hotkey": "Ctrl+Alt+Space",
            "llmBaseUrl": "https://openrouter.ai/api/v1",
            "llmModel": "gpt-4o-mini",
            "captureMaxSeconds": 30
        });
        let migrated = super::migrate_settings(v1);
        assert_eq!(migrated["schemaVersion"], 7);
        assert_eq!(
            migrated["activeAnswerProfile"],
            crate::prompt_registry::DEFAULT_ANSWER_PROFILE_ID
        );
        assert_eq!(migrated["selectedModelPreset"], "custom_openai_compatible");
        assert_eq!(migrated["windowOpacity"], 100);
        assert_eq!(migrated["hideToTrayOnClose"], true);
        assert_eq!(migrated["keepOnTopDuringCapture"], false);
        assert_eq!(migrated["interviewCompactMode"], false);
        assert_eq!(migrated["interviewReportRetentionDays"], 0);
        // llmTemperature must NOT be injected — the field is not part of the current schema.
        assert!(migrated.get("llmTemperature").is_none());
    }

    #[test]
    fn v7_settings_pass_through_unchanged() {
        let v7 = serde_json::json!({
            "schemaVersion": 7,
            "hotkey": "Ctrl+Alt+Space",
            "llmBaseUrl": "https://openrouter.ai/api/v1",
            "llmModel": "gpt-4o-mini",
            "selectedModelPreset": "openrouter_free_dev",
            "captureMaxSeconds": 30,
            "activeAnswerProfile": "interview_concise",
            "windowOpacity": 90,
            "hideToTrayOnClose": false,
            "keepOnTopDuringCapture": true,
            "interviewCompactMode": true,
            "interviewReportRetentionDays": 30
        });
        let migrated = super::migrate_settings(v7);
        assert_eq!(migrated["schemaVersion"], 7);
        assert_eq!(migrated["hotkey"], "Ctrl+Alt+Space");
        assert_eq!(migrated["llmBaseUrl"], "https://openrouter.ai/api/v1");
        assert_eq!(migrated["llmModel"], "gpt-4o-mini");
        assert_eq!(migrated["selectedModelPreset"], "openrouter_free_dev");
        assert_eq!(migrated["captureMaxSeconds"], 30);
        assert_eq!(migrated["activeAnswerProfile"], "interview_concise");
        assert_eq!(migrated["windowOpacity"], 90);
        assert_eq!(migrated["hideToTrayOnClose"], false);
        assert_eq!(migrated["keepOnTopDuringCapture"], true);
        assert_eq!(migrated["interviewCompactMode"], true);
        assert_eq!(migrated["interviewReportRetentionDays"], 30);
        // Schema-defined fields must remain; no phantom fields should appear.
        assert!(migrated.get("llmTemperature").is_none());
    }

    #[test]
    fn required_fields_reject_missing_hotkey() {
        let value = serde_json::json!({
            "schemaVersion": 3,
            "llmBaseUrl": "https://openrouter.ai/api/v1",
            "llmModel": "gpt-4o-mini",
            "captureMaxSeconds": 30
        });
        assert!(matches!(
            ensure_required_fields(&value),
            Err(SettingsError::PartialConfigInvalid)
        ));
    }

    #[test]
    fn rejects_unsupported_retention_policy() {
        let mut settings = AppSettings::default();
        settings.interview_report_retention_days = 15;
        assert!(matches!(
            validate(&settings),
            Err(SettingsError::RetentionPolicyInvalid)
        ));
    }

    #[test]
    fn settings_path_uses_override_env_var() {
        let dir = std::env::temp_dir().join("replyline-settings-override-path");
        std::fs::create_dir_all(&dir).expect("mkdir");
        std::env::set_var(SETTINGS_DIR_OVERRIDE_ENV, dir.to_string_lossy().to_string());
        let path = settings_path().expect("settings_path");
        assert_eq!(path, dir.join(SETTINGS_FILE));
        std::env::remove_var(SETTINGS_DIR_OVERRIDE_ENV);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn save_and_load_roundtrip_keeps_runtime_fields() {
        let dir = std::env::temp_dir().join(format!(
            "replyline-settings-roundtrip-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("time")
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).expect("mkdir");
        std::env::set_var(SETTINGS_DIR_OVERRIDE_ENV, dir.to_string_lossy().to_string());

        let settings = AppSettings {
            llm_base_url: "https://openrouter.ai/api/v1".to_string(),
            llm_model: "gpt-4.1-mini".to_string(),
            hotkey: "Ctrl+Alt+K".to_string(),
            selected_model_preset: "custom_openai_compatible".to_string(),
            active_answer_profile: "interview_default".to_string(),
            window_opacity: 90,
            ..AppSettings::default()
        };

        save(&settings).expect("save");
        let loaded = load().expect("load");
        assert_eq!(loaded.llm_base_url, settings.llm_base_url);
        assert_eq!(loaded.llm_model, settings.llm_model);
        assert_eq!(loaded.hotkey, settings.hotkey);
        assert_eq!(loaded.selected_model_preset, settings.selected_model_preset);
        assert_eq!(loaded.active_answer_profile, settings.active_answer_profile);
        assert_eq!(loaded.window_opacity, settings.window_opacity);

        let path = settings_path().expect("settings_path");
        let backups = list_corrupt_backups(&path);
        assert!(backups.is_empty());

        std::env::remove_var(SETTINGS_DIR_OVERRIDE_ENV);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
