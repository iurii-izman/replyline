use tauri::{AppHandle, State};

use crate::app_log;
use crate::audio::CaptureRun;
use crate::candidate_pack;
use crate::commands::shared::require_experimental_bilingual;
use crate::credentials;
use crate::fs_atomic;
use crate::interview_card_v1::BilingualMeta;
use crate::observability::{self, Fields, PrivacyClass};
use crate::providers::candidate_pack_provider;
use crate::providers::llm_provider;
use crate::providers::llm_provider::AnalysisMode;
use crate::services::capture_pipeline;
use crate::services::pipeline_events::emit_bilingual_answer_chunk;
use crate::services::pipeline_events::emit_bilingual_answer_latency;
use crate::services::pipeline_events::emit_bilingual_answer_ready;
use crate::services::pipeline_events::{emit_status, update_tray_title};
use crate::settings;
use crate::state::ReplylineState;
use crate::types::{
    AnalysisCardDto, AppSettings, BilingualAnswerChunkDto, BilingualAnswerReadyDto,
    BilingualExportInputDto, CandidatePackDraftDto, CommandError, ExportSummary, ExportType,
    FeedbackErrorDto, FeedbackPayloadDto, FeedbackSettingsSummaryDto, InterviewReportDto,
    PersistenceDiagnosticsDto, PrepareCandidatePackInputDto, SecretSlot, SetupStatusDto,
};

pub mod bootstrap;
pub mod context;
pub mod diagnostics;
pub mod registry;
pub mod runtime_checks;
pub mod secrets;
pub mod shared;
pub mod tray_window;

// ── Domain split status ──
// ✅ diagnostics     — get_trace_status, clear_debug_traces, open_trace_folder
// ✅ tray_window     — sync_tray_ui_phase, refresh_tray_menu, tray_open_main
// ✅ context         — clear_context, get_context_status
// ✅ runtime_checks  — check_stt_config, check_llm_config, check_runtime_config
// ✅ secrets         — save_secret, delete_secret
// ✅ bootstrap       — load_bootstrap, log_client_event, quit_app (PARTIAL: file exists, needs mod.rs cleanup)
// ⬜ settings        — save_settings, get_setup_status, get_feedback_payload, get_persistence_diagnostics
// ⬜ capture         — capture_start, capture_stop_and_analyze, retry_last_analysis
// ⬜ candidate_pack  — load/save/clear/get_status/prepare/save_prepared (high-coupling: shared helpers + tests)
// ⬜ interview       — start/end/get/export/clear interview session/report (high-coupling: report flow)
// ⬜ bilingual_exp   — start/stop/capture/export_bilingual_interview_report (high-coupling: experimental gate)

static RUN_SEQ: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

fn next_run_id() -> String {
    let ts = chrono::Utc::now().timestamp_millis() as u64;
    let seq = RUN_SEQ.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    format!("{}-{}", ts, seq)
}

fn candidate_pack_save_ok_detail(saved: &candidate_pack::CandidatePackDto) -> String {
    let weak_count = saved
        .resume_facts
        .iter()
        .filter(|fact| fact.strength == candidate_pack::CandidateFactStrength::Weak)
        .count();
    crate::app_log::safe_candidate_pack_summary(
        saved.resume_facts.len(),
        weak_count,
        saved.candidate_summary.chars().count(),
        saved.target_role.chars().count(),
    )
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
            let _ = app_log::append_event(
                "candidate_pack_save_failed",
                app_log::safe_status_detail("failed"),
            );
            Err(CommandError::Internal(err))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{candidate_pack_save_ok_detail, compact_candidate_pack_context};
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

    #[test]
    fn compact_candidate_pack_context_excludes_full_job_description_fields() {
        let pack = CandidatePackDto {
            candidate_summary: "Built systems".to_string(),
            target_role: "Principal Engineer".to_string(),
            resume_facts: vec![],
            job_description: CandidateJobDescription {
                title: "Staff Engineer".to_string(),
                company: "Acme".to_string(),
                requirements: vec!["RAW JD REQUIREMENT SHOULD NOT APPEAR".to_string()],
                responsibilities: vec!["RAW JD RESPONSIBILITY SHOULD NOT APPEAR".to_string()],
                keywords: vec!["distributed".to_string()],
            },
            company_values: vec![],
            answer_constraints: CandidateAnswerConstraints {
                avoid_claims: vec![],
                preferred_examples: vec![],
                language: "en".to_string(),
            },
        };
        let compact = compact_candidate_pack_context(&pack);
        assert!(compact.contains("Role: Principal Engineer"));
        assert!(!compact.contains("RAW JD REQUIREMENT SHOULD NOT APPEAR"));
        assert!(!compact.contains("RAW JD RESPONSIBILITY SHOULD NOT APPEAR"));
    }
}

#[tauri::command]
pub fn clear_candidate_pack() -> Result<(), CommandError> {
    candidate_pack::clear().map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "candidate_pack_clear_ok",
        app_log::safe_status_detail("cleared"),
    );
    Ok(())
}

#[tauri::command]
pub fn get_candidate_pack_status() -> Result<candidate_pack::CandidatePackStatusDto, CommandError> {
    candidate_pack::status().map_err(CommandError::Internal)
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
    if settings.debug_trace_redacted_enabled() {
        let started_at = chrono::Utc::now().to_rfc3339();
        let _ = crate::trace_manifest::ensure_run_started(
            &run_id,
            &started_at,
            &settings,
            "work_conversation",
        );
        let _ = crate::trace_manifest::append_timeline_event(
            &run_id,
            "capture_start_ok",
            "capturing",
            std::collections::BTreeMap::new(),
        );
    }
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
pub async fn start_bilingual_session(
    state: State<'_, ReplylineState>,
    app: AppHandle,
) -> Result<(), CommandError> {
    require_experimental_bilingual()?;
    let mut session_state = {
        let mut guard = state
            .bilingual_session
            .lock()
            .map_err(|_| CommandError::Internal("Bilingual session lock poisoned".to_string()))?;
        std::mem::take(&mut *guard)
    };
    let result = session_state.start(app).await;
    let mut guard = state
        .bilingual_session
        .lock()
        .map_err(|_| CommandError::Internal("Bilingual session lock poisoned".to_string()))?;
    *guard = session_state;
    result
}

#[tauri::command]
pub async fn stop_bilingual_session(
    state: State<'_, ReplylineState>,
    app: AppHandle,
) -> Result<(), CommandError> {
    require_experimental_bilingual()?;
    let mut session_state = {
        let mut guard = state
            .bilingual_session
            .lock()
            .map_err(|_| CommandError::Internal("Bilingual session lock poisoned".to_string()))?;
        std::mem::take(&mut *guard)
    };
    let result = session_state.stop(app).await;
    let mut guard = state
        .bilingual_session
        .lock()
        .map_err(|_| CommandError::Internal("Bilingual session lock poisoned".to_string()))?;
    *guard = session_state;
    result
}

#[tauri::command]
pub async fn capture_bilingual_answer(
    state: State<'_, ReplylineState>,
    app: AppHandle,
) -> Result<BilingualAnswerReadyDto, CommandError> {
    require_experimental_bilingual()?;
    let started_at = std::time::Instant::now();
    let (session_id, snapshot, translations) = {
        let guard = state
            .bilingual_session
            .lock()
            .map_err(|_| CommandError::Internal("Bilingual session lock poisoned".to_string()))?;
        let active = guard
            .active
            .as_ref()
            .ok_or_else(|| CommandError::Pipeline("BILINGUAL_SESSION_INACTIVE".to_string()))?;
        let snapshot = active
            .context_buffer
            .lock()
            .map_err(|_| CommandError::Internal("Bilingual context lock poisoned".to_string()))?
            .snapshot_for_answer();
        let translations = active
            .translations_by_source_segment_id
            .lock()
            .map_err(|_| CommandError::Internal("Bilingual translation lock poisoned".to_string()))?
            .clone();
        (active.session_id.clone(), snapshot, translations)
    };

    if snapshot.is_empty() {
        return Err(CommandError::Pipeline(
            "BILINGUAL_CONTEXT_EMPTY".to_string(),
        ));
    }

    let question_en = snapshot
        .iter()
        .map(|segment| segment.text.trim())
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>()
        .join(" ");
    if question_en.trim().is_empty() {
        return Err(CommandError::Pipeline(
            "BILINGUAL_CONTEXT_EMPTY".to_string(),
        ));
    }
    let source_segment_ids = snapshot
        .iter()
        .map(|segment| segment.segment_id.clone())
        .collect::<Vec<_>>();
    let question_ru = source_segment_ids
        .iter()
        .filter_map(|segment_id| translations.get(segment_id))
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>()
        .join(" ");
    let question_ru = if question_ru.trim().is_empty() {
        None
    } else {
        Some(question_ru)
    };

    let settings = settings::load()?;
    let llm_key = credentials::load(SecretSlot::LlmApiKey)?;
    let candidate_context = candidate_pack::load()
        .ok()
        .flatten()
        .map(|pack| compact_candidate_pack_context(&pack))
        .unwrap_or_default();
    let bilingual_context = format!(
        "Bilingual interview mode context (use only verified details):\n{}\n\nQuestion source: finalized streaming segments only.",
        if candidate_context.trim().is_empty() {
            "(empty)"
        } else {
            candidate_context.trim()
        }
    );

    let stream_system_prompt = "You are an interview assistant. Return only a concise English answer with no markdown. No disclaimers, no JSON.";
    let stream_user_prompt = format!(
        "Candidate context:\n{}\n\nInterview question:\n{}\n\nAnswer in 2-5 sentences (up to 8 for system design). Keep facts grounded and do not invent metrics/projects.",
        bilingual_context,
        question_en
    );
    let mut chunk_index: u32 = 0;
    let mut streamed_any = false;
    let stream_result = crate::providers::openai_compatible::stream_text_response(
        &settings.llm_base_url,
        &settings.llm_model,
        llm_key.as_deref(),
        stream_system_prompt,
        &stream_user_prompt,
        220,
        |text| {
            streamed_any = true;
            let payload = BilingualAnswerChunkDto {
                session_id: session_id.clone(),
                text: text.to_string(),
                is_final: false,
                chunk_index,
            };
            chunk_index = chunk_index.saturating_add(1);
            emit_bilingual_answer_chunk(&app, &payload);
        },
    )
    .await;
    if let Err(err) = &stream_result {
        let _ = app_log::append_event(
            "bilingual_answer_stream_fallback",
            format!(
                "status=degraded reason={}",
                err.split(':').next().unwrap_or("stream_error")
            ),
        );
    }
    if stream_result.is_ok() && streamed_any {
        let payload = BilingualAnswerChunkDto {
            session_id: session_id.clone(),
            text: String::new(),
            is_final: true,
            chunk_index,
        };
        emit_bilingual_answer_chunk(&app, &payload);
    }

    let outcome = llm_provider::analyze_transcript(
        None,
        false,
        &settings,
        llm_key.as_deref(),
        &question_en,
        &bilingual_context,
        AnalysisMode::Interview,
    )
    .await
    .map_err(CommandError::Pipeline)?;
    let answer_ttft_ms = started_at.elapsed().as_millis() as u64;
    let mut interview_card = outcome
        .card
        .interview_card_schema_v1
        .ok_or_else(|| CommandError::Pipeline("INTERVIEW_CARD_MISSING".to_string()))?;
    interview_card.bilingual_meta = Some(BilingualMeta {
        session_id: session_id.clone(),
        source_segment_ids,
        question_ru,
        listening_status: "active".to_string(),
    });
    let payload = BilingualAnswerReadyDto {
        answer_card: interview_card,
    };
    {
        let guard = state
            .bilingual_session
            .lock()
            .map_err(|_| CommandError::Internal("Bilingual session lock poisoned".to_string()))?;
        if let Some(active) = guard.active.as_ref() {
            if let Ok(mut answers) = active.generated_answers.lock() {
                answers.push(crate::bilingual::session::BilingualAnswerRecord {
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    latency_ms: started_at.elapsed().as_millis() as u64,
                    source_segment_ids: payload
                        .answer_card
                        .bilingual_meta
                        .as_ref()
                        .map(|meta| meta.source_segment_ids.clone())
                        .unwrap_or_default(),
                    answer_main: payload.answer_card.answer.main.clone(),
                    answer_short: payload.answer_card.answer.short.clone(),
                    answer_strong: payload.answer_card.answer.strong.clone(),
                });
                if answers.len() > crate::bilingual::session::MAX_STORED_ANSWER_RECORDS {
                    let overflow =
                        answers.len() - crate::bilingual::session::MAX_STORED_ANSWER_RECORDS;
                    answers.drain(0..overflow);
                }
            }
        }
    }
    let answer_total_ms = started_at.elapsed().as_millis() as u64;
    emit_bilingual_answer_latency(&app, answer_ttft_ms, answer_total_ms);
    emit_bilingual_answer_ready(&app, &payload);
    Ok(payload)
}

fn compact_candidate_pack_context(pack: &candidate_pack::CandidatePackDto) -> String {
    fn clip(value: &str, max_chars: usize) -> String {
        let trimmed = value.trim();
        if trimmed.chars().count() <= max_chars {
            return trimmed.to_string();
        }
        trimmed.chars().take(max_chars).collect::<String>()
    }
    let role = if !pack.target_role.trim().is_empty() {
        pack.target_role.trim().to_string()
    } else {
        pack.job_description.title.trim().to_string()
    };
    let skills = pack
        .resume_facts
        .iter()
        .flat_map(|fact| fact.skills.iter())
        .map(|skill| skill.trim())
        .filter(|skill| !skill.is_empty())
        .take(10)
        .collect::<Vec<_>>();
    let recent_experience = clip(&pack.candidate_summary, 260);
    let key_projects = pack
        .resume_facts
        .iter()
        .map(|fact| clip(&fact.claim, 180))
        .filter(|value| !value.is_empty())
        .take(3)
        .collect::<Vec<_>>();
    let preferred_examples = pack
        .answer_constraints
        .preferred_examples
        .iter()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .take(5)
        .collect::<Vec<_>>();
    let avoid_claims = pack
        .answer_constraints
        .avoid_claims
        .iter()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    [
        format!("Role: {}", role),
        format!("Skills: {}", skills.join(", ")),
        format!("RecentExperience: {}", recent_experience),
        format!("KeyProjects: {}", key_projects.join(" | ")),
        format!(
            "TargetCompany: {}",
            clip(pack.job_description.company.trim(), 120)
        ),
        format!(
            "TargetRole: {}",
            clip(pack.job_description.title.trim(), 120)
        ),
        format!("AvoidClaims: {}", avoid_claims.join(" | ")),
        format!("PreferredExamples: {}", preferred_examples.join(" | ")),
    ]
    .join("\n")
}

#[tauri::command]
pub fn export_bilingual_interview_report(
    state: State<'_, ReplylineState>,
    input: Option<BilingualExportInputDto>,
) -> Result<ExportSummary, CommandError> {
    require_experimental_bilingual()?;
    let input = input.unwrap_or(BilingualExportInputDto {
        export_type: ExportType::Full,
        output_path: None,
    });
    let snapshot = {
        let guard = state
            .bilingual_session
            .lock()
            .map_err(|_| CommandError::Internal("Bilingual session lock poisoned".to_string()))?;
        if let Some(active) = guard.active.as_ref() {
            crate::bilingual::session::BilingualSessionExportSnapshot {
                session_id: active.session_id.clone(),
                started_at: active.started_at.clone(),
                ended_at: chrono::Utc::now().to_rfc3339(),
                finalized_segments: active
                    .finalized_segments
                    .lock()
                    .map(|segments| segments.clone())
                    .unwrap_or_default(),
                translation_segments: active
                    .translation_segments
                    .lock()
                    .map(|segments| segments.clone())
                    .unwrap_or_default(),
                generated_answers: active
                    .generated_answers
                    .lock()
                    .map(|answers| answers.clone())
                    .unwrap_or_default(),
                latency_samples_ms: active
                    .latency_samples_ms
                    .lock()
                    .map(|samples| samples.clone())
                    .unwrap_or_default(),
            }
        } else if let Some(snapshot) = guard.last_completed_snapshot.as_ref() {
            snapshot.clone()
        } else {
            return Err(CommandError::Pipeline(
                "BILINGUAL_SESSION_EMPTY".to_string(),
            ));
        }
    };

    let summary = crate::bilingual::report::export_session_report(
        &snapshot,
        input.export_type,
        input.output_path,
    )
    .map_err(CommandError::Internal)?;
    let _ = app_log::append_event(
        "bilingual_export_report_ok",
        format!(
            "export_type={:?} session_id={} transcript_segments={} answers={}",
            summary.export_type,
            summary.session_id,
            summary.transcript_segments_count,
            summary.questions_count
        ),
    );
    Ok(summary)
}

// ---------------------------------------------------------------------------

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
    let output_language = match input.output_language.trim().to_ascii_lowercase().as_str() {
        "en" => "en",
        _ => "ru",
    };
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
        output_language,
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
