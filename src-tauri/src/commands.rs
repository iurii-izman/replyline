use std::sync::atomic::{AtomicU64, Ordering};

use tauri::{AppHandle, Manager, State};

use crate::app_log;
use crate::audio::CaptureRun;
use crate::candidate_pack;
use crate::credentials;
use crate::fs_atomic;
use crate::observability::{self, Fields, PrivacyClass};
use crate::providers::candidate_pack_provider;
use crate::services::capture_pipeline;
use crate::services::pipeline_events::{emit_status, update_tray_title};
use crate::settings;
use crate::state::ReplylineState;
use crate::types::{
    AnalysisCardDto, AppSettings, BootstrapDto, CandidatePackDraftDto, CheckItemDto, CommandError,
    ContextStatusDto, InterviewReportDto, PersistenceDiagnosticsDto, PrepareCandidatePackInputDto,
    RuntimeCheckDto, SecretSlot, SetupStatusDto, TraceStatusDto,
};

static RUN_SEQ: AtomicU64 = AtomicU64::new(0);

fn next_run_id() -> String {
    let ts = chrono::Utc::now().timestamp_millis() as u64;
    let seq = RUN_SEQ.fetch_add(1, Ordering::Relaxed);
    format!("{}-{}", ts, seq)
}

fn candidate_pack_save_ok_detail(saved: &candidate_pack::CandidatePackDto) -> String {
    let weak_count = saved
        .resume_facts
        .iter()
        .filter(|fact| fact.strength == candidate_pack::CandidateFactStrength::Weak)
        .count();
    format!(
        "facts={} weak_facts={} summary_len={} role_len={}",
        saved.resume_facts.len(),
        weak_count,
        saved.candidate_summary.chars().count(),
        saved.target_role.chars().count()
    )
}

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

#[tauri::command]
pub fn load_bootstrap(state: State<'_, ReplylineState>) -> Result<BootstrapDto, CommandError> {
    let _ = app_log::append_event("bootstrap_load_attempt", "-");
    let settings = settings::load()?;
    let retention_policy = crate::interview_report::retention_policy_from_days(
        settings.interview_report_retention_days,
    );
    let retention_result =
        crate::interview_report::enforce_retention(chrono::Utc::now(), retention_policy)
            .map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "interview_report_retention_applied",
        crate::interview_report::retention_log_detail(retention_policy, retention_result),
    );
    let (removed, kept) = crate::trace_manifest::enforce_trace_retention(
        chrono::Utc::now(),
        settings.debug_trace_retention_days,
    )
    .map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "debug_trace_retention_applied",
        format!("removed={removed} kept={kept}"),
    );
    let deepgram_key_present = credentials::present(SecretSlot::DeepgramApiKey)?;
    let llm_key_present = credentials::present(SecretSlot::LlmApiKey)?;
    let (context_active, context_entry_count, last_transcript_preview, can_retry_last_transcript) = {
        let mut guard = state
            .context
            .lock()
            .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
        let status = guard.status();
        (
            status.context_active,
            status.entry_count,
            status.last_transcript_preview.clone(),
            status.can_retry_last_transcript,
        )
    };

    let runtime_ready = settings.runtime_path_configured(deepgram_key_present);
    let log_status = app_log::status().map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "bootstrap_loaded",
        format!(
            "runtime_ready={runtime_ready} context_entries={context_entry_count} deepgram_present={deepgram_key_present} llm_key_present={llm_key_present}"
        ),
    );

    Ok(BootstrapDto {
        settings,
        deepgram_key_present,
        llm_key_present,
        context_active,
        context_entry_count,
        runtime_ready,
        log_status,
        last_transcript_preview,
        can_retry_last_transcript,
    })
}

#[tauri::command]
pub fn get_trace_status() -> Result<TraceStatusDto, CommandError> {
    let settings = settings::load()?;
    let traces_dir = crate::trace_manifest::traces_base_dir().map_err(CommandError::Internal)?;
    let total_runs = if traces_dir.exists() {
        std::fs::read_dir(&traces_dir)
            .map_err(|err| CommandError::Internal(err.to_string()))?
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.path().is_dir())
            .count()
    } else {
        0
    };
    Ok(TraceStatusDto {
        mode: settings.debug_trace_mode,
        retention_days: settings.debug_trace_retention_days,
        traces_dir: traces_dir.display().to_string(),
        total_runs,
    })
}

#[tauri::command]
pub fn clear_debug_traces() -> Result<(), CommandError> {
    let removed = crate::trace_manifest::clear_all_traces().map_err(CommandError::Internal)?;
    let _ = app_log::append_event("debug_traces_cleared", format!("removed={removed}"));
    Ok(())
}

#[tauri::command]
pub fn open_trace_folder() -> Result<(), CommandError> {
    let traces_dir = crate::trace_manifest::traces_base_dir().map_err(CommandError::Internal)?;
    std::fs::create_dir_all(&traces_dir).map_err(|err| CommandError::Internal(err.to_string()))?;
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&traces_dir)
            .spawn()
            .map_err(|err| CommandError::Internal(err.to_string()))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&traces_dir)
            .spawn()
            .map_err(|err| CommandError::Internal(err.to_string()))?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&traces_dir)
            .spawn()
            .map_err(|err| CommandError::Internal(err.to_string()))?;
    }
    Ok(())
}

#[tauri::command]
pub fn log_client_event(event: String, detail: Option<String>) -> Result<(), CommandError> {
    app_log::append_event(&event, detail.unwrap_or_else(|| "-".to_string()))
        .map_err(CommandError::Internal)
}

#[tauri::command]
pub fn quit_app(app: AppHandle) -> Result<(), CommandError> {
    let _ = app_log::append_event("quit_app", "header_button");
    app.exit(0);
    Ok(())
}

#[tauri::command]
pub fn sync_tray_ui_phase(
    app: AppHandle,
    phase: String,
    detail: Option<String>,
) -> Result<(), CommandError> {
    let lang = crate::language_profile::default_language();
    let text = crate::tray_status::tooltip_for_phase(lang, &phase, detail.as_deref());
    update_tray_title(&app, &text);
    Ok(())
}

#[tauri::command]
pub fn refresh_tray_menu(app: AppHandle) -> Result<(), CommandError> {
    let lang = crate::language_profile::default_language();
    let menu = crate::build_main_tray_menu(&app, lang)
        .map_err(|e| CommandError::Internal(format!("tray menu build failed: {e}")))?;
    let tray = app
        .tray_by_id("main-tray")
        .ok_or_else(|| CommandError::Internal("main tray icon not found".to_string()))?;
    tray.set_menu(Some(menu))
        .map_err(|e| CommandError::Internal(format!("tray set_menu failed: {e}")))?;
    Ok(())
}

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
            let _ = app_log::append_event("settings_save_failed", err.to_string());
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
pub fn load_candidate_pack() -> Result<Option<candidate_pack::CandidatePackDto>, CommandError> {
    candidate_pack::load().map_err(CommandError::Internal)
}

#[tauri::command]
pub fn save_candidate_pack(
    input: candidate_pack::CandidatePackDto,
) -> Result<candidate_pack::CandidatePackDto, CommandError> {
    let fact_count = input.resume_facts.len();
    let _ = app_log::append_event("candidate_pack_save_attempt", format!("facts={fact_count}"));
    match candidate_pack::save(&input) {
        Ok(saved) => {
            let _ = app_log::append_event(
                "candidate_pack_save_ok",
                candidate_pack_save_ok_detail(&saved),
            );
            Ok(saved)
        }
        Err(err) => {
            let _ = app_log::append_event("candidate_pack_save_failed", "status=failed");
            Err(CommandError::Internal(err))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::candidate_pack_save_ok_detail;
    use crate::candidate_pack::{
        CandidateAnswerConstraints, CandidateFact, CandidateFactStrength, CandidateJobDescription,
        CandidatePackDto,
    };

    #[test]
    fn candidate_pack_log_detail_does_not_include_raw_profile_text() {
        let pack = CandidatePackDto {
            candidate_summary: "Raw summary should not be logged".to_string(),
            target_role: "Principal Engineer".to_string(),
            resume_facts: vec![CandidateFact {
                id: "fact-1".to_string(),
                title: "Title".to_string(),
                claim: "Claim".to_string(),
                description: "Description".to_string(),
                evidence: String::new(),
                skills: vec![],
                metrics: vec!["42%".to_string()],
                strength: CandidateFactStrength::Weak,
                suitable_for_questions: vec![],
            }],
            job_description: CandidateJobDescription {
                title: "Role".to_string(),
                company: "Company".to_string(),
                requirements: vec![],
                responsibilities: vec![],
                keywords: vec![],
            },
            company_values: vec!["Trust".to_string()],
            answer_constraints: CandidateAnswerConstraints {
                avoid_claims: vec![],
                preferred_examples: vec![],
                language: "ru".to_string(),
            },
        };
        let detail = candidate_pack_save_ok_detail(&pack);
        assert!(detail.contains("facts=1"));
        assert!(!detail.contains("Raw summary"));
        assert!(!detail.contains("Principal Engineer"));
    }
}

#[tauri::command]
pub fn clear_candidate_pack() -> Result<(), CommandError> {
    candidate_pack::clear().map_err(CommandError::Internal)?;
    let _ = app_log::append_event("candidate_pack_clear_ok", "status=cleared");
    Ok(())
}

#[tauri::command]
pub fn get_candidate_pack_status() -> Result<candidate_pack::CandidatePackStatusDto, CommandError> {
    candidate_pack::status().map_err(CommandError::Internal)
}

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
            let _ = app_log::append_event("secret_save_failed", format!("{slot_name}: {err}"));
            Err(CommandError::from(err))
        }
    }
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
    let log_status = app_log::status().ok();
    let (app_log_path, app_log_exists, last_log_event_time) = match log_status {
        Some(status) => {
            let exists = std::path::Path::new(&status.log_path).is_file();
            let ts = status
                .last_line
                .as_deref()
                .and_then(extract_log_timestamp_from_line);
            (Some(status.log_path), exists, ts)
        }
        None => (None, false, None),
    };
    Ok(PersistenceDiagnosticsDto {
        settings_path: settings_path.display().to_string(),
        settings_path_hash: hash_path_for_log(&settings_path),
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
        keyring_service_name: credentials::SERVICE.to_string(),
        deepgram_key_present,
        llm_key_present,
        runtime_path_ready,
        app_log_path,
        app_log_exists,
        last_log_event_time,
    })
}

fn extract_log_timestamp_from_line(line: &str) -> Option<String> {
    let ts = line.split_whitespace().next()?.trim();
    if ts.is_empty() {
        None
    } else {
        Some(ts.to_string())
    }
}

fn hash_path_for_log(path: &std::path::Path) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    path.to_string_lossy().hash(&mut hasher);
    format!("{:x}", hasher.finish())
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

#[tauri::command]
pub fn clear_context(state: State<'_, ReplylineState>) -> Result<ContextStatusDto, CommandError> {
    let mut guard = state
        .context
        .lock()
        .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
    guard.clear();
    Ok(guard.status())
}

#[tauri::command]
pub fn get_context_status(
    state: State<'_, ReplylineState>,
) -> Result<ContextStatusDto, CommandError> {
    let mut guard = state
        .context
        .lock()
        .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
    Ok(guard.status())
}

#[tauri::command]
pub fn capture_start(
    state: State<'_, ReplylineState>,
    app: AppHandle,
) -> Result<String, CommandError> {
    let _ = observability::log_audit(
        "capture_start_attempt",
        Fields::new()
            .with("source", "backend")
            .with("phase", "capture")
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
    );
    let _ = app_log::append_event("capture_start_attempt", "-");
    let settings = settings::load()?;
    let mut capture = state
        .capture
        .lock()
        .map_err(|_| CommandError::Internal("Capture lock poisoned".to_string()))?;
    if capture.active.is_some() {
        // Return current run_id if already capturing (idempotent guard).
        if let Some(ref existing_id) = capture.active_run_id {
            return Ok(existing_id.clone());
        }
        return Ok(String::new());
    }
    let run = CaptureRun::start(settings.capture_max_seconds).map_err(CommandError::Capture)?;
    let run_id = next_run_id();
    capture.active = Some(run);
    capture.active_run_id = Some(run_id.clone());
    emit_status(&app, Some(&run_id), "capturing", None);
    update_tray_title(
        &app,
        &crate::tray_status::tooltip_for_phase(
            crate::language_profile::default_language(),
            "capturing",
            None,
        ),
    );
    let _ = app_log::append_event("capture_start_ok", format!("run_id={run_id}"));
    let _ = observability::log_audit(
        "capture_start_ok",
        Fields::new()
            .with("source", "backend")
            .with("phase", "capture")
            .with("run_id", run_id.clone())
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
    );
    Ok(run_id)
}

#[tauri::command]
pub async fn capture_stop_and_analyze(
    state: State<'_, ReplylineState>,
    app: AppHandle,
) -> Result<AnalysisCardDto, CommandError> {
    capture_pipeline::capture_stop_and_analyze(&state, &app).await
}

#[tauri::command]
pub async fn retry_last_analysis(
    state: State<'_, ReplylineState>,
    app: AppHandle,
    run_id: Option<String>,
) -> Result<AnalysisCardDto, CommandError> {
    capture_pipeline::retry_last_analysis(&state, &app, run_id).await
}

#[tauri::command]
pub fn tray_open_main(app: AppHandle) -> Result<(), CommandError> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| CommandError::Internal("Missing main window".to_string()))?;
    window
        .show()
        .map_err(|err| CommandError::Internal(err.to_string()))?;
    window
        .set_focus()
        .map_err(|err| CommandError::Internal(err.to_string()))?;
    let _ = observability::log_audit(
        "tray_open_main",
        Fields::new()
            .with("source", "tray")
            .with("phase", "ui")
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
    );
    Ok(())
}

// ---------------------------------------------------------------------------
// Runtime preflight checks
// ---------------------------------------------------------------------------

/// Check Deepgram STT configuration without sending audio.
#[tauri::command]
pub fn check_stt_config() -> Result<CheckItemDto, CommandError> {
    match credentials::present(SecretSlot::DeepgramApiKey) {
        Ok(true) => Ok(CheckItemDto {
            ok: true,
            code: "ok".to_string(),
            message: "Deepgram API key configured".to_string(),
            action: None,
        }),
        Ok(false) => Ok(CheckItemDto {
            ok: false,
            code: "missing_key".to_string(),
            message: "Deepgram API key is not set".to_string(),
            action: Some("Add your Deepgram API key in the Speech section".to_string()),
        }),
        Err(err) => {
            let safe_err = crate::privacy::safe_preview(&err.to_string(), 200);
            Ok(CheckItemDto {
                ok: false,
                code: "config_error".to_string(),
                message: format!("Cannot read Deepgram key: {safe_err}"),
                action: Some("Check system credential store availability".to_string()),
            })
        }
    }
}

/// Check LLM endpoint configuration via lightweight health/model request.
/// Does NOT send a transcript or real chat completion.
#[tauri::command]
pub async fn check_llm_config() -> Result<CheckItemDto, CommandError> {
    let settings = settings::load()?;
    let base_url = settings.llm_base_url.trim().to_string();
    let model = settings.llm_model.trim().to_string();

    if base_url.is_empty() {
        return Ok(CheckItemDto {
            ok: false,
            code: "config_error".to_string(),
            message: "LLM base URL is empty".to_string(),
            action: Some("Set the LLM gateway URL in the Reply section".to_string()),
        });
    }

    if model.is_empty() {
        return Ok(CheckItemDto {
            ok: false,
            code: "config_error".to_string(),
            message: "LLM model name is empty".to_string(),
            action: Some("Set the LLM model name in the Reply section".to_string()),
        });
    }

    let llm_key = credentials::load(SecretSlot::LlmApiKey).unwrap_or(None);
    let base_trimmed = base_url.trim_end_matches('/');

    // Try /models first (OpenAI-compatible health check).
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|err| CommandError::Internal(format!("HTTP client: {err}")))?;

    let models_url = format!("{base_trimmed}/models");
    let mut req = client.get(&models_url);
    if let Some(ref token) = llm_key {
        if !token.trim().is_empty() {
            req = req.bearer_auth(token.trim());
        }
    }

    match req.send().await {
        Ok(resp) if resp.status().is_success() => {
            return Ok(CheckItemDto {
                ok: true,
                code: "ok".to_string(),
                message: format!("LLM endpoint reachable: {base_trimmed} (model: {model})"),
                action: None,
            });
        }
        Ok(resp) if resp.status().as_u16() == 401 || resp.status().as_u16() == 403 => {
            return Ok(CheckItemDto {
                ok: false,
                code: "auth_error".to_string(),
                message: format!(
                    "LLM endpoint returned {}: check your API key",
                    resp.status()
                ),
                action: Some("Verify your LLM API key in the Reply section".to_string()),
            });
        }
        Ok(resp) => {
            // Non-success, non-404 — try base URL as fallback.
            let _status = resp.status();
        }
        Err(_err) => {
            // Network error to /models — try base URL as fallback.
        }
    }

    // Fallback: try GET to base URL (some proxies expose a health endpoint at root).
    let health_url = format!("{base_trimmed}/");
    let mut health_req = client.get(&health_url);
    if let Some(ref token) = llm_key {
        if !token.trim().is_empty() {
            health_req = health_req.bearer_auth(token.trim());
        }
    }

    match health_req.send().await {
        Ok(resp) if resp.status().is_success() => Ok(CheckItemDto {
            ok: true,
            code: "ok".to_string(),
            message: format!("LLM endpoint reachable (root check): {base_trimmed}"),
            action: None,
        }),
        Ok(resp) if resp.status().as_u16() == 401 || resp.status().as_u16() == 403 => {
            Ok(CheckItemDto {
                ok: false,
                code: "auth_error".to_string(),
                message: format!(
                    "LLM endpoint returned {}: check your API key",
                    resp.status()
                ),
                action: Some("Verify your LLM API key in the Reply section".to_string()),
            })
        }
        Ok(_resp) => Ok(CheckItemDto {
            ok: false,
            code: "endpoint_error".to_string(),
            message: format!(
                "LLM endpoint unreachable: {base_trimmed}. The server may not support health checks."
            ),
            action: Some(
                "Check the URL, ensure the server is running, or proceed anyway \u{2014} the capture flow may still work."
                    .to_string(),
            ),
        }),
        Err(err) => {
            let safe_err = crate::privacy::safe_preview(&err.to_string(), 200);
            Ok(CheckItemDto {
                ok: false,
                code: "network_error".to_string(),
                message: format!("Cannot reach LLM endpoint: {safe_err}"),
                action: Some(
                    "Check your network connection and the LLM base URL".to_string(),
                ),
            })
        }
    }
}

/// Aggregate runtime preflight check: STT + LLM + settings validation.
#[tauri::command]
pub async fn check_runtime_config() -> Result<RuntimeCheckDto, CommandError> {
    let stt = check_stt_config()?;

    // LLM check is independent of STT result — always run both.
    let llm = check_llm_config().await?;

    // Settings validation.
    let settings_result = match settings::load() {
        Ok(ref s) => match settings::validate(s) {
            Ok(()) => CheckItemDto {
                ok: true,
                code: "ok".to_string(),
                message: "Settings valid".to_string(),
                action: None,
            },
            Err(err) => CheckItemDto {
                ok: false,
                code: "config_error".to_string(),
                message: format!("Settings validation failed: {err}"),
                action: Some("Review settings fields for errors".to_string()),
            },
        },
        Err(err) => CheckItemDto {
            ok: false,
            code: "config_error".to_string(),
            message: format!("Cannot load settings: {err}"),
            action: Some("Check that settings file is accessible".to_string()),
        },
    };

    let runtime_ready = stt.ok && llm.ok && settings_result.ok;

    Ok(RuntimeCheckDto {
        stt,
        llm,
        settings: settings_result,
        runtime_ready,
    })
}

fn prepared_candidate_pack_path() -> Result<std::path::PathBuf, CommandError> {
    let settings_path = settings::settings_path().map_err(CommandError::from)?;
    let dir = settings_path
        .parent()
        .ok_or_else(|| CommandError::Internal("settings parent directory missing".to_string()))?;
    Ok(dir.join("candidate-pack-latest.json"))
}

#[tauri::command]
pub async fn prepare_candidate_pack(
    input: PrepareCandidatePackInputDto,
) -> Result<CandidatePackDraftDto, CommandError> {
    let raw_resume = input.raw_resume.trim();
    let job_description = input.job_description.trim();
    let company_values_text = input.company_values_text.trim();
    if raw_resume.is_empty() || job_description.is_empty() {
        return Err(CommandError::Settings(
            "raw_resume and job_description are required".to_string(),
        ));
    }
    let detail =
        candidate_pack::build_prepare_log_detail(raw_resume, job_description, company_values_text);
    let _ = app_log::append_event("candidate_pack_prepare_attempt", detail);

    let settings = settings::load()?;
    let api_key = credentials::load(SecretSlot::LlmApiKey)
        .map_err(CommandError::from)?
        .unwrap_or_default();
    let draft_result = candidate_pack_provider::prepare_candidate_pack(
        &settings,
        if api_key.trim().is_empty() {
            None
        } else {
            Some(api_key.trim())
        },
        raw_resume,
        job_description,
        company_values_text,
    )
    .await;
    let draft = match draft_result {
        Ok(value) => value,
        Err(err) => {
            let safe_err = crate::privacy::safe_preview(&err, 240);
            let _ =
                app_log::append_event("candidate_pack_prepare_fail", format!("error={safe_err}"));
            return Err(CommandError::Pipeline(err));
        }
    };

    let _ = app_log::append_event(
        "candidate_pack_prepare_ok",
        format!(
            "facts={} role_keywords={} company_values={}",
            draft.candidate_facts.len(),
            draft.role_keywords.len(),
            draft.company_values.len()
        ),
    );
    Ok(draft)
}

#[tauri::command]
pub fn save_prepared_candidate_pack(draft: CandidatePackDraftDto) -> Result<(), CommandError> {
    let path = prepared_candidate_pack_path()?;
    fs_atomic::write_json_atomically(&path, &draft)
        .map_err(|err| CommandError::Internal(err.to_string()))?;
    let _ = app_log::append_event(
        "prepared_candidate_pack_save_ok",
        format!(
            "facts={} score={}",
            draft.candidate_facts.len(),
            draft.pack_quality_score
        ),
    );
    Ok(())
}

#[tauri::command]
pub fn start_interview_session(
    state: State<'_, ReplylineState>,
) -> Result<crate::interview_report::InterviewSessionState, CommandError> {
    let settings = settings::load()?;
    let retention_policy = crate::interview_report::retention_policy_from_days(
        settings.interview_report_retention_days,
    );
    let retention_result =
        crate::interview_report::enforce_retention(chrono::Utc::now(), retention_policy)
            .map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "interview_report_retention_applied",
        crate::interview_report::retention_log_detail(retention_policy, retention_result),
    );
    let mut session = state
        .interview_session
        .lock()
        .map_err(|_| CommandError::Internal("Interview session lock poisoned".to_string()))?;
    Ok(crate::interview_report::start_session(
        &mut session,
        crate::language_profile::default_language(),
    ))
}

#[tauri::command]
pub fn end_interview_session(
    state: State<'_, ReplylineState>,
) -> Result<Option<InterviewReportDto>, CommandError> {
    let settings = settings::load()?;
    let retention_policy = crate::interview_report::retention_policy_from_days(
        settings.interview_report_retention_days,
    );
    let mut session = state
        .interview_session
        .lock()
        .map_err(|_| CommandError::Internal("Interview session lock poisoned".to_string()))?;
    let report =
        crate::interview_report::end_session(&mut session).map_err(CommandError::Internal)?;
    let retention_result =
        crate::interview_report::enforce_retention(chrono::Utc::now(), retention_policy)
            .map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "interview_report_retention_applied",
        crate::interview_report::retention_log_detail(retention_policy, retention_result),
    );
    Ok(report)
}

#[tauri::command]
pub fn get_interview_report() -> Result<Option<InterviewReportDto>, CommandError> {
    let settings = settings::load()?;
    let retention_policy = crate::interview_report::retention_policy_from_days(
        settings.interview_report_retention_days,
    );
    let retention_result =
        crate::interview_report::enforce_retention(chrono::Utc::now(), retention_policy)
            .map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "interview_report_retention_applied",
        crate::interview_report::retention_log_detail(retention_policy, retention_result),
    );
    crate::interview_report::get_latest_report().map_err(CommandError::Internal)
}

#[tauri::command]
pub fn export_interview_report_markdown() -> Result<Option<String>, CommandError> {
    let out =
        crate::interview_report::export_latest_report_markdown().map_err(CommandError::Internal)?;
    let _ = observability::log_audit(
        "export_full_clicked",
        Fields::new()
            .with("source", "report")
            .with("phase", "export")
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
            .with("path_present", out.is_some()),
    );
    Ok(out)
}

#[tauri::command]
pub fn export_interview_report_redacted_markdown() -> Result<Option<String>, CommandError> {
    let out = crate::interview_report::export_latest_report_redacted_markdown()
        .map_err(CommandError::Internal)?;
    let _ = observability::log_audit(
        "export_redacted_clicked",
        Fields::new()
            .with("source", "report")
            .with("phase", "export")
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
            .with("path_present", out.is_some()),
    );
    Ok(out)
}

#[tauri::command]
pub fn clear_interview_reports(state: State<'_, ReplylineState>) -> Result<(), CommandError> {
    crate::interview_report::clear_reports().map_err(CommandError::Internal)?;
    let mut session = state
        .interview_session
        .lock()
        .map_err(|_| CommandError::Internal("Interview session lock poisoned".to_string()))?;
    *session = crate::interview_report::InterviewSessionState::default();
    let _ = observability::log_audit(
        "clear_reports_clicked",
        Fields::new()
            .with("source", "report")
            .with("phase", "report")
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
    );
    Ok(())
}
