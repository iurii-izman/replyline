use crate::app_log;
use crate::context_pack;
use crate::credentials;
use crate::observability::{self, Fields, PrivacyClass};
use crate::settings;
use crate::types::{
    AppSettings, CommandError, FeedbackErrorDto, FeedbackPayloadDto, FeedbackSettingsSummaryDto,
    PersistenceDiagnosticsDto, SecretSlot, SetupStatusDto,
};

#[tauri::command]
pub fn save_settings(input: AppSettings) -> Result<AppSettings, CommandError> {
    let _ = observability::log_audit(
        "settings_save_attempt",
        Fields::new()
            .with("source", "settings")
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
            .with("phase", "settings"),
    );
    let _ = app_log::append_event("settings_save_attempt", format!("hotkey={}", input.hotkey));
    match settings::save(&input) {
        Ok(saved) => {
            let _ = app_log::append_event("settings_save_ok", format!("hotkey={}", saved.hotkey));
            Ok(saved)
        }
        Err(err) => {
            let _ = app_log::append_event(
                "settings_save_failed",
                app_log::safe_provider_error_preview(&err.to_string()),
            );
            Err(CommandError::from(err))
        }
    }
}

#[tauri::command]
pub fn get_setup_status() -> Result<SetupStatusDto, CommandError> {
    let settings = settings::load()?;
    let deepgram_key_present = credentials::present(SecretSlot::DeepgramApiKey)?;
    let llm_key_present = credentials::present(SecretSlot::LlmApiKey)?;
    let llm_route_configured =
        !settings.llm_base_url.trim().is_empty() && !settings.llm_model.trim().is_empty();
    let runtime_path_ready = settings.runtime_path_configured(deepgram_key_present);
    let _ = app_log::append_event(
        "setup_status_checked",
        format!(
            "deepgram_key_present={deepgram_key_present} llm_key_present={llm_key_present} llm_route_configured={llm_route_configured} runtime_path_ready={runtime_path_ready}"
        ),
    );
    let _ = observability::log_audit(
        "credential_presence_checked",
        Fields::new()
            .with("source", "settings")
            .with("phase", "settings")
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
            .with("deepgram_key_present", deepgram_key_present)
            .with("llm_key_present", llm_key_present),
    );
    Ok(SetupStatusDto {
        deepgram_key_present,
        llm_key_present,
        llm_route_configured,
        runtime_path_ready,
    })
}

#[tauri::command]
pub fn get_feedback_payload(
    mode: Option<String>,
    error_category: Option<String>,
    error_code: Option<String>,
    error_summary: Option<String>,
) -> Result<FeedbackPayloadDto, CommandError> {
    let settings = settings::load()?;
    let pkg_version = env!("CARGO_PKG_VERSION").to_string();
    let commit_sha = option_env!("REPLYLINE_GIT_SHA")
        .unwrap_or("unknown")
        .to_string();

    let llm_route_kind = if settings.llm_base_url.trim().is_empty() {
        "not_configured"
    } else {
        let url = settings.llm_base_url.to_lowercase();
        if url.contains("openrouter.ai") {
            "openrouter"
        } else if url.contains("api.openai.com") {
            "openai"
        } else if url.contains("api.groq.com") {
            "groq"
        } else if url.contains("localhost") || url.contains("127.0.0.1") {
            "local"
        } else if url.starts_with("https://") {
            "remote_https"
        } else {
            "custom"
        }
    };

    let last_error = match (error_category, error_code, error_summary) {
        (Some(cat), Some(code), Some(summary)) => Some(FeedbackErrorDto {
            category: cat,
            code,
            summary,
        }),
        _ => None,
    };

    Ok(FeedbackPayloadDto {
        app_version: pkg_version,
        commit_sha,
        mode: mode.unwrap_or_else(|| "unknown".to_string()),
        settings_summary: FeedbackSettingsSummaryDto {
            schema_version: settings.schema_version,
            hotkey: settings.hotkey,
            capture_max_seconds: settings.capture_max_seconds,
            model_preset: settings.selected_model_preset.clone(),
            llm_route_kind: llm_route_kind.to_string(),
            active_profile: settings.active_answer_profile.clone(),
            bilingual_enabled: settings.bilingual_interview_enabled,
            trace_mode: format!("{:?}", settings.debug_trace_mode).to_lowercase(),
        },
        last_error,
    })
}

#[tauri::command]
pub fn get_persistence_diagnostics() -> Result<PersistenceDiagnosticsDto, CommandError> {
    let settings_path = settings::settings_path()?;
    let (exists, size, modified_at) = settings::settings_file_metadata(&settings_path);
    let raw = if exists {
        std::fs::read(&settings_path).ok()
    } else {
        None
    };
    let parsed = raw
        .as_ref()
        .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(bytes).ok());
    let settings_parse_ok = parsed.is_some();
    let settings = settings::load()?;
    let settings_validation_ok = settings::validate(&settings).is_ok();
    let llm_base_url_host = url::Url::parse(settings.llm_base_url.trim())
        .ok()
        .and_then(|url| url.host_str().map(|h| h.to_string()));
    let deepgram_key_present = credentials::present(SecretSlot::DeepgramApiKey)?;
    let llm_key_present = credentials::present(SecretSlot::LlmApiKey)?;
    let runtime_path_ready = settings.runtime_path_configured(deepgram_key_present);
    let corrupt_backups = settings::list_corrupt_backups(&settings_path);
    let ctx_pack_diag = context_pack::persistence_diagnostics();
    let log_status = app_log::status().ok();
    let (app_log_path, app_log_exists, last_log_event_time) = match log_status {
        Some(status) => {
            let exists = std::path::Path::new(&status.log_path).is_file();
            let ts = status.last_line.as_deref().and_then(|line| {
                let ts = line.split_whitespace().next()?.trim();
                if ts.is_empty() {
                    None
                } else {
                    Some(ts.to_string())
                }
            });
            (Some(status.log_path), exists, ts)
        }
        None => (None, false, None),
    };
    Ok(PersistenceDiagnosticsDto {
        settings_path: settings_path.display().to_string(),
        settings_path_hash: super::hash_path_for_log(&settings_path),
        settings_file_exists: exists,
        settings_file_size: size,
        settings_file_modified_at: modified_at,
        settings_parse_ok,
        settings_validation_ok,
        settings_schema_version: settings.schema_version,
        llm_base_url_present: !settings.llm_base_url.trim().is_empty(),
        llm_base_url_host,
        llm_model_present: !settings.llm_model.trim().is_empty(),
        selected_model_preset: settings.selected_model_preset,
        active_answer_profile: settings.active_answer_profile,
        hotkey: settings.hotkey,
        capture_max_seconds: settings.capture_max_seconds,
        corrupt_backups_count: corrupt_backups.len(),
        corrupt_backups,
        context_packs_file_exists: ctx_pack_diag.context_packs_file_exists,
        context_packs_count: ctx_pack_diag.context_packs_count,
        context_packs_active_present: ctx_pack_diag.context_packs_active_present,
        context_packs_corrupt_backups: ctx_pack_diag.context_packs_corrupt_backups,
        context_packs_corrupt_backups_count: ctx_pack_diag.context_packs_corrupt_backups_count,
        keyring_service_name: credentials::SERVICE.to_string(),
        deepgram_key_present,
        llm_key_present,
        runtime_path_ready,
        app_log_path,
        app_log_exists,
        last_log_event_time,
    })
}
