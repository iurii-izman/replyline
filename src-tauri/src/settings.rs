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
const ALLOWED_DEBUG_TRACE_RETENTION_DAYS: [u16; 4] = [1, 3, 7, 0];

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

    let mut settings: AppSettings = match serde_json::from_value(migrated) {
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

    sanitize_bilingual_settings(&mut settings);

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

const CURRENT_SCHEMA_VERSION: u32 = 10;

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
    if version < 8 {
        migrate_v7_to_v8(&mut value);
    }
    if version < 9 {
        migrate_v8_to_v9(&mut value);
    }
    if version < 10 {
        migrate_v9_to_v10(&mut value);
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

fn migrate_v7_to_v8(value: &mut serde_json::Value) {
    if let Some(obj) = value.as_object_mut() {
        obj.insert("schemaVersion".to_string(), serde_json::json!(8));
        obj.entry("traceIncludeContent")
            .or_insert(serde_json::json!(false));
    }
}

fn migrate_v8_to_v9(value: &mut serde_json::Value) {
    if let Some(obj) = value.as_object_mut() {
        obj.insert("schemaVersion".to_string(), serde_json::json!(9));
        let trace_include_content = obj
            .get("traceIncludeContent")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        obj.insert(
            "debugTraceMode".to_string(),
            if trace_include_content {
                serde_json::json!("full_local")
            } else {
                serde_json::json!("redacted")
            },
        );
        obj.entry("debugTraceRetentionDays")
            .or_insert(serde_json::json!(3));
        obj.remove("traceIncludeContent");
    }
}

fn migrate_v9_to_v10(value: &mut serde_json::Value) {
    if let Some(obj) = value.as_object_mut() {
        obj.insert("schemaVersion".to_string(), serde_json::json!(10));
        obj.entry("bilingualInterviewEnabled")
            .or_insert(serde_json::json!(false));
        obj.entry("interviewInputLanguage")
            .or_insert(serde_json::json!("en"));
        obj.entry("translationLanguage")
            .or_insert(serde_json::json!("ru"));
        obj.entry("liveTranslationEnabled")
            .or_insert(serde_json::json!(true));
        obj.entry("translationDebounceMs")
            .or_insert(serde_json::json!(600));
        obj.entry("translationMinWordCount")
            .or_insert(serde_json::json!(3));
        obj.entry("bilingualRetentionBehavior")
            .or_insert(serde_json::json!("session_only"));
        obj.entry("bilingualAnswerStyle")
            .or_insert(serde_json::json!("b2_conversational"));
    }
}

pub fn save(settings: &AppSettings) -> Result<AppSettings, SettingsError> {
    let mut normalized = settings.clone();
    preserve_existing_llm_route_if_accidentally_cleared(&mut normalized);
    sanitize_bilingual_settings(&mut normalized);
    let _ = crate::app_log::append_event(
        "settings_save_attempt",
        format!(
            "schema={} llm_url_present={} llm_model_present={} hotkey_present={}",
            normalized.schema_version,
            !normalized.llm_base_url.trim().is_empty(),
            !normalized.llm_model.trim().is_empty(),
            !normalized.hotkey.trim().is_empty()
        ),
    );
    validate(&normalized)?;
    let path = settings_path()?;
    fs_atomic::write_json_atomically(&path, &normalized)?;
    let bytes = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
    let _ = crate::app_log::append_event("settings_save_ok", format!("bytes={bytes}"));
    Ok(normalized)
}

fn preserve_existing_llm_route_if_accidentally_cleared(settings: &mut AppSettings) {
    if !settings.llm_base_url.trim().is_empty() {
        return;
    }
    let Ok(existing) = load() else {
        return;
    };
    if existing.llm_base_url.trim().is_empty() {
        return;
    }
    settings.llm_base_url = existing.llm_base_url.clone();
    if settings.llm_model.trim().is_empty() {
        settings.llm_model = existing.llm_model.clone();
    }
    let _ = crate::app_log::append_event(
        "settings_save_guard_preserve_llm_route",
        format!(
            "llm_base_url_host_preserved={} llm_model_present={}",
            Url::parse(existing.llm_base_url.trim())
                .ok()
                .and_then(|url| url.host_str().map(|h| h.to_string()))
                .unwrap_or_else(|| "invalid".to_string()),
            !settings.llm_model.trim().is_empty()
        ),
    );
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
    if !ALLOWED_DEBUG_TRACE_RETENTION_DAYS.contains(&settings.debug_trace_retention_days) {
        return Err(SettingsError::RetentionPolicyInvalid);
    }
    if !["en", "ru"].contains(&settings.interview_input_language.as_str()) {
        return Err(SettingsError::PartialConfigInvalid);
    }
    if !["en", "ru"].contains(&settings.translation_language.as_str()) {
        return Err(SettingsError::PartialConfigInvalid);
    }
    Ok(())
}

fn sanitize_bilingual_settings(settings: &mut AppSettings) {
    settings.schema_version = CURRENT_SCHEMA_VERSION;
    let interview_lang = settings
        .interview_input_language
        .trim()
        .to_ascii_lowercase();
    settings.interview_input_language = if ["en", "ru"].contains(&interview_lang.as_str()) {
        interview_lang
    } else {
        "en".to_string()
    };
    let translation_lang = settings.translation_language.trim().to_ascii_lowercase();
    settings.translation_language = if ["en", "ru"].contains(&translation_lang.as_str()) {
        translation_lang
    } else {
        "ru".to_string()
    };
    if !(300..=1500).contains(&settings.translation_debounce_ms) {
        settings.translation_debounce_ms = 600;
    }
    if !(1..=10).contains(&settings.translation_min_word_count) {
        settings.translation_min_word_count = 3;
    }
    if settings.bilingual_retention_behavior.trim().is_empty() {
        settings.bilingual_retention_behavior = "session_only".to_string();
    }
    if settings.bilingual_answer_style.trim().is_empty() {
        settings.bilingual_answer_style = "b2_conversational".to_string();
    }
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
        "debugTraceMode",
        "debugTraceRetentionDays",
        "bilingualInterviewEnabled",
        "interviewInputLanguage",
        "translationLanguage",
        "liveTranslationEnabled",
        "translationDebounceMs",
        "translationMinWordCount",
        "bilingualRetentionBehavior",
        "bilingualAnswerStyle",
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

    fn fixture_json(name: &str) -> serde_json::Value {
        let raw = match name {
            "settings-v7-legacy.json" => {
                include_str!("../../tests/fixtures/runtime/settings-v7-legacy.json")
            }
            "settings-v8-legacy.json" => {
                include_str!("../../tests/fixtures/runtime/settings-v8-legacy.json")
            }
            "settings-v9-invalid-retention.json" => {
                include_str!("../../tests/fixtures/runtime/settings-v9-invalid-retention.json")
            }
            other => panic!("unknown fixture: {other}"),
        };
        serde_json::from_str(raw).expect("valid fixture json")
    }
    use std::sync::{Mutex, OnceLock};

    fn settings_override_env_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    fn with_settings_override_env<T>(value: &std::path::Path, f: impl FnOnce() -> T) -> T {
        let _guard = settings_override_env_lock()
            .lock()
            .expect("env mutex poisoned");
        let previous = std::env::var(SETTINGS_DIR_OVERRIDE_ENV).ok();
        std::env::set_var(
            SETTINGS_DIR_OVERRIDE_ENV,
            value.to_string_lossy().to_string(),
        );
        let result = f();
        if let Some(prev) = previous {
            std::env::set_var(SETTINGS_DIR_OVERRIDE_ENV, prev);
        } else {
            std::env::remove_var(SETTINGS_DIR_OVERRIDE_ENV);
        }
        result
    }
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
    fn allows_remote_https_llm_base_url() {
        let mut settings = AppSettings::default();
        settings.llm_base_url = "https://api.openai.com/v1".to_string();
        assert!(validate(&settings).is_ok());
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
    fn rejects_malformed_llm_base_url_safely() {
        let mut settings = AppSettings::default();
        settings.llm_base_url = "https://[::1".to_string();
        assert!(matches!(
            validate(&settings),
            Err(SettingsError::InvalidUrl)
        ));
    }

    #[test]
    fn migrates_v1_settings_to_v10_with_default_profile_and_preset() {
        let v1 = serde_json::json!({
            "schemaVersion": 1,
            "hotkey": "Ctrl+Alt+Space",
            "llmBaseUrl": "https://openrouter.ai/api/v1",
            "llmModel": "gpt-4o-mini",
            "captureMaxSeconds": 30
        });
        let migrated = super::migrate_settings(v1);
        assert_eq!(migrated["schemaVersion"], 10);
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
        assert_eq!(migrated["debugTraceMode"], "redacted");
        assert_eq!(migrated["debugTraceRetentionDays"], 3);
        assert_eq!(migrated["bilingualInterviewEnabled"], false);
        assert_eq!(migrated["interviewInputLanguage"], "en");
        assert_eq!(migrated["translationLanguage"], "ru");
        assert_eq!(migrated["liveTranslationEnabled"], true);
        assert_eq!(migrated["translationDebounceMs"], 600);
        assert_eq!(migrated["translationMinWordCount"], 3);
        assert_eq!(migrated["bilingualRetentionBehavior"], "session_only");
        assert_eq!(migrated["bilingualAnswerStyle"], "b2_conversational");
        // llmTemperature must NOT be injected — the field is not part of the current schema.
        assert!(migrated.get("llmTemperature").is_none());
    }

    #[test]
    fn v10_settings_pass_through_unchanged() {
        let v8 = serde_json::json!({
            "schemaVersion": 10,
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
            "interviewReportRetentionDays": 30,
            "debugTraceMode": "full_local",
            "debugTraceRetentionDays": 7,
            "bilingualInterviewEnabled": false,
            "interviewInputLanguage": "en",
            "translationLanguage": "ru",
            "liveTranslationEnabled": true,
            "translationDebounceMs": 600,
            "translationMinWordCount": 3,
            "bilingualRetentionBehavior": "session_only",
            "bilingualAnswerStyle": "b2_conversational"
        });
        let migrated = super::migrate_settings(v8);
        assert_eq!(migrated["schemaVersion"], 10);
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
        assert_eq!(migrated["debugTraceMode"], "full_local");
        assert_eq!(migrated["debugTraceRetentionDays"], 7);
        // Schema-defined fields must remain; no phantom fields should appear.
        assert!(migrated.get("llmTemperature").is_none());
    }

    #[test]
    fn migrates_v8_to_v10_with_trace_mode_defaults() {
        let v7 = serde_json::json!({
            "schemaVersion": 8,
            "hotkey": "Ctrl+Alt+Space",
            "llmBaseUrl": "https://openrouter.ai/api/v1",
            "llmModel": "gpt-4o-mini",
            "selectedModelPreset": "custom_openai_compatible",
            "captureMaxSeconds": 30,
            "activeAnswerProfile": "interview_default",
            "windowOpacity": 100,
            "hideToTrayOnClose": true,
            "keepOnTopDuringCapture": false,
            "interviewCompactMode": false,
            "interviewReportRetentionDays": 0,
            "traceIncludeContent": false
        });
        let migrated = super::migrate_settings(v7);
        assert_eq!(migrated["schemaVersion"], 10);
        assert_eq!(migrated["debugTraceMode"], "redacted");
        assert_eq!(migrated["debugTraceRetentionDays"], 3);
        assert_eq!(migrated["bilingualInterviewEnabled"], false);
    }

    #[test]
    fn fixture_v7_migrates_to_v10_shape() {
        let migrated = super::migrate_settings(fixture_json("settings-v7-legacy.json"));
        assert_eq!(migrated["schemaVersion"], 10);
        assert_eq!(migrated["debugTraceMode"], "redacted");
        assert_eq!(migrated["debugTraceRetentionDays"], 3);
    }

    #[test]
    fn fixture_v8_migrates_to_v10_shape() {
        let migrated = super::migrate_settings(fixture_json("settings-v8-legacy.json"));
        assert_eq!(migrated["schemaVersion"], 10);
        assert_eq!(migrated["debugTraceMode"], "redacted");
        assert_eq!(migrated["debugTraceRetentionDays"], 3);
        assert!(migrated.get("traceIncludeContent").is_none());
    }

    #[test]
    fn fixture_v9_invalid_retention_is_rejected() {
        let value = fixture_json("settings-v9-invalid-retention.json");
        let settings: AppSettings =
            serde_json::from_value(value).expect("fixture must deserialize into AppSettings");
        assert!(matches!(
            validate(&settings),
            Err(SettingsError::RetentionPolicyInvalid)
        ));
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
        with_settings_override_env(&dir, || {
            let path = settings_path().expect("settings_path");
            assert_eq!(path, dir.join(SETTINGS_FILE));
        });
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
        with_settings_override_env(&dir, || {
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
        });
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn sanitize_bilingual_ranges_and_languages_to_defaults() {
        let mut settings = AppSettings {
            interview_input_language: "de".to_string(),
            translation_language: "fr".to_string(),
            translation_debounce_ms: 100,
            translation_min_word_count: 42,
            ..AppSettings::default()
        };
        sanitize_bilingual_settings(&mut settings);
        assert_eq!(settings.interview_input_language, "en");
        assert_eq!(settings.translation_language, "ru");
        assert_eq!(settings.translation_debounce_ms, 600);
        assert_eq!(settings.translation_min_word_count, 3);
    }

    #[test]
    fn save_preserves_existing_llm_route_when_incoming_url_is_empty() {
        let dir = std::env::temp_dir().join(format!(
            "replyline-settings-preserve-route-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("time")
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).expect("mkdir");
        with_settings_override_env(&dir, || {
            let original = AppSettings {
                llm_base_url: "https://api.openai.com/v1".to_string(),
                llm_model: "gpt-4o-mini".to_string(),
                selected_model_preset: "custom_openai_compatible".to_string(),
                ..AppSettings::default()
            };
            save(&original).expect("seed save");

            let mut incoming = original.clone();
            incoming.llm_base_url = "".to_string();
            let saved = save(&incoming).expect("guard save");

            assert_eq!(saved.llm_base_url, original.llm_base_url);
            assert_eq!(saved.llm_model, original.llm_model);
        });
        let _ = std::fs::remove_dir_all(&dir);
    }
}
