use std::sync::atomic::{AtomicU64, Ordering};

use tauri::AppHandle;

use crate::app_log;
use crate::candidate_pack;
use crate::credentials;
use crate::diag_contract::{
    RL_ANALYSIS_OK, RL_CAPTURE_JOIN_FAILED, RL_CAPTURE_NOT_ACTIVE, RL_CAPTURE_READY,
    RL_CAPTURE_START, RL_CAPTURE_STOP_FAILED, RL_CAPTURE_STOP_TIMED, RL_LLM_OK, RL_RETRY_EMPTY,
    RL_RETRY_OK, RL_STT_FAILED, RL_STT_KEY_MISSING, RL_STT_NO_SPEECH, RL_STT_OK, RL_TIMING_SUMMARY,
};
use crate::llm;
use crate::pipeline_timing::{self, PipelineTimer, StageTiming};
use crate::providers::llm_provider;
use crate::providers::llm_provider::AnalysisMode;
use crate::providers::stt_provider;
use crate::services::pipeline_errors;
use crate::services::pipeline_events::{emit_status, log_diag, update_tray_title};
use crate::settings;
use crate::state::ReplylineState;
use std::collections::BTreeMap;

use crate::types::{AnalysisCardDto, CommandError, SecretSlot};
use crate::ui_strings::{en, pick_lang, ru};
use crate::{
    observability::{self, Fields, PrivacyClass},
    trace_manifest,
};

static RETRY_RUN_SEQ: AtomicU64 = AtomicU64::new(0);

fn next_retry_run_id() -> String {
    let ts = chrono::Utc::now().timestamp_millis() as u64;
    let seq = RETRY_RUN_SEQ.fetch_add(1, Ordering::Relaxed);
    format!("retry-{}-{}", ts, seq)
}

fn classify_stt_failure(err: &str) -> &'static str {
    let lower = err.to_lowercase();
    if lower.contains("stt_no_speech") || lower.contains("no audible signal") {
        "no_speech"
    } else if lower.contains("stt_empty") || lower.contains("empty transcript") {
        "empty_transcript"
    } else if lower.contains("timeout") {
        "timeout"
    } else if lower.contains("http") {
        "http_error"
    } else if lower.contains("unauthorized")
        || lower.contains("forbidden")
        || lower.contains("key")
        || lower.contains("auth")
    {
        "auth_error"
    } else {
        "provider_error"
    }
}

fn is_interview_session_active(state: &ReplylineState) -> Result<bool, CommandError> {
    let session = state
        .interview_session
        .lock()
        .map_err(|_| CommandError::Internal("Interview session lock poisoned".to_string()))?;
    Ok(session.active)
}

fn mode_from_last_card(last_card: Option<&AnalysisCardDto>) -> Option<AnalysisMode> {
    last_card.map(|card| {
        if card.interview_card_schema_v1.is_some() {
            AnalysisMode::Interview
        } else {
            AnalysisMode::WorkConversation
        }
    })
}

fn combine_context_with_candidate(
    context_text: &str,
    candidate_context: &str,
    mode: AnalysisMode,
) -> String {
    let base = context_text.trim();
    if mode != AnalysisMode::Interview || candidate_context.trim().is_empty() {
        return base.to_string();
    }
    if base.is_empty() {
        format!("Candidate context:\n{}", candidate_context.trim())
    } else {
        format!("{base}\n\nCandidate context:\n{}", candidate_context.trim())
    }
}

pub async fn capture_stop_and_analyze(
    state: &ReplylineState,
    app: &AppHandle,
) -> Result<AnalysisCardDto, CommandError> {
    let started_at = chrono::Utc::now().to_rfc3339();
    let _ = app_log::append_event("analysis_start", "-");
    let _ = log_diag(
        "capture",
        "start",
        RL_CAPTURE_START,
        "capture_stop_and_analyze",
    );
    let settings = settings::load()?;
    let lang = crate::language_profile::default_language();

    let (capture_run, run_id) = {
        let mut capture = state
            .capture
            .lock()
            .map_err(|_| CommandError::Internal("Capture lock poisoned".to_string()))?;
        let run_id = capture.active_run_id.clone();
        let run = capture.active.take().ok_or_else(|| {
            let _ = log_diag(
                "capture",
                "fail",
                RL_CAPTURE_NOT_ACTIVE,
                "capture was not active",
            );
            CommandError::Capture(
                pick_lang(lang, en::ERR_NO_ACTIVE_CAPTURE, ru::ERR_NO_ACTIVE_CAPTURE).to_string(),
            )
        })?;
        (run, run_id)
    };
    let trace_redacted_enabled = settings.debug_trace_redacted_enabled();
    let trace_full_enabled = settings.debug_trace_full_enabled();
    if trace_redacted_enabled {
        if let Some(ref rid) = run_id {
            let _ = trace_manifest::ensure_run_started(
                rid,
                &started_at,
                &settings,
                "work_conversation",
            );
            let _ = trace_manifest::append_timeline_event(
                rid,
                "capture_stop_attempt",
                "capture",
                BTreeMap::new(),
            );
            let _ = observability::log_audit(
                "capture_stop_attempt",
                Fields::new()
                    .with("source", "backend")
                    .with("phase", "capture")
                    .with("run_id", rid)
                    .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
            );
        }
    }

    emit_status(
        app,
        run_id.as_deref(),
        "transcribing",
        Some(pick_lang(lang, en::STATUS_WAITING_TEXT, ru::STATUS_WAITING_TEXT).to_string()),
    );
    update_tray_title(
        app,
        &crate::tray_status::tooltip_for_phase(lang, "transcribing", None),
    );

    let pipeline_timer = PipelineTimer::start();
    let mut stage_timings: Vec<StageTiming> = Vec::new();

    let (pcm, capture_stop_timing) = tauri::async_runtime::spawn_blocking(move || {
        let stop_timer = PipelineTimer::start();
        let result = capture_run.stop();
        let outcome = if result.is_ok() { "ok" } else { "fail" };
        let code = if result.is_ok() {
            RL_CAPTURE_STOP_TIMED
        } else {
            RL_CAPTURE_STOP_FAILED
        };
        let timing = stop_timer.measure("capture_stop", outcome, code);
        (result, timing)
    })
    .await
    .map_err(|_| {
        let _ = log_diag(
            "capture",
            "fail",
            RL_CAPTURE_JOIN_FAILED,
            "capture join failed",
        );
        CommandError::Capture("Capture join failed".to_string())
    })?;
    let _ = pipeline_timing::log_stage_timing(&capture_stop_timing);
    stage_timings.push(capture_stop_timing);

    let pcm = pcm.map_err(|err| {
        let _ = log_diag("capture", "fail", RL_CAPTURE_STOP_FAILED, &err);
        CommandError::Capture(err)
    })?;
    if let Some(ref rid) = run_id {
        let _ = observability::log_audit(
            "capture_stop_ok",
            Fields::new()
                .with("source", "backend")
                .with("phase", "capture")
                .with("run_id", rid)
                .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
        );
    }
    let _ = log_diag(
        "capture",
        "ok",
        RL_CAPTURE_READY,
        format!("pcm_bytes={}", pcm.len()),
    );

    let deepgram_key = credentials::load(SecretSlot::DeepgramApiKey)?.ok_or_else(|| {
        let _ = log_diag("stt", "fail", RL_STT_KEY_MISSING, "deepgram key missing");
        CommandError::Credential(
            pick_lang(lang, en::ERR_NO_DEEPGRAM_KEY, ru::ERR_NO_DEEPGRAM_KEY).to_string(),
        )
    })?;
    let llm_key = credentials::load(SecretSlot::LlmApiKey)?;
    if let Some(ref rid) = run_id {
        let _ = observability::log_audit(
            "stt_request_start",
            Fields::new()
                .with("source", "stt")
                .with("phase", "transcribing")
                .with("run_id", rid)
                .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
        );
    }

    let (transcript, stt_stages, stt_telemetry) = match stt_provider::transcribe(
        if trace_redacted_enabled {
            run_id.as_deref()
        } else {
            None
        },
        trace_full_enabled,
        &settings,
        &deepgram_key,
        &pcm,
    )
    .await
    {
        Ok(value) => value,
        Err(failure) => {
            for timing in &failure.stages {
                let _ = pipeline_timing::log_stage_timing(timing);
            }
            stage_timings.extend(failure.stages);
            let err = failure.message;
            let failure_kind = classify_stt_failure(&err);
            let event = "analysis_stt_failed";
            let _ = app_log::append_event(event, format!("stt_failure_kind={failure_kind}"));
            let code = if failure_kind == "no_speech" {
                RL_STT_NO_SPEECH
            } else {
                RL_STT_FAILED
            };
            let _ = log_diag(
                "stt",
                "fail",
                code,
                format!("stt_failure_kind={failure_kind}"),
            );
            if let Some(ref rid) = run_id {
                let mut fields = BTreeMap::new();
                fields.insert("failure_kind".to_string(), failure_kind.to_string());
                let _ = trace_manifest::append_timeline_event(
                    rid,
                    "stt_request_failed",
                    "transcribing",
                    fields,
                );
                let _ = trace_manifest::write_timings(rid, &stage_timings);
                let _ = observability::log_error(
                    "stt_request_failed",
                    Fields::new()
                        .with("source", "stt")
                        .with("phase", "transcribing")
                        .with("run_id", rid)
                        .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
                        .with("failure_kind", failure_kind),
                );
            }
            return Err(CommandError::Pipeline(err));
        }
    };
    for timing in &stt_stages {
        let _ = pipeline_timing::log_stage_timing(timing);
    }
    stage_timings.extend(stt_stages);
    let transcript_chars = transcript.chars().count();
    let chars_band = llm::chars_band(&transcript);
    let _ = app_log::append_event(
        "analysis_stt_ok",
        format!(
            "transcript_chars={transcript_chars} chars_band={chars_band} stt_retries={} stt_retry_reason={}",
            stt_telemetry.retry_count,
            stt_telemetry.retry_reason.unwrap_or("none")
        ),
    );
    if let Some(ref rid) = run_id {
        let _ = observability::log_audit(
            "stt_request_ok",
            Fields::new()
                .with("source", "stt")
                .with("phase", "transcribing")
                .with("run_id", rid)
                .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
                .with("chars_band", chars_band)
                .with("stt_retries", stt_telemetry.retry_count),
        );
        let mut fields = BTreeMap::new();
        fields.insert("chars_band".to_string(), chars_band.to_string());
        let _ =
            trace_manifest::append_timeline_event(rid, "stt_request_ok", "transcribing", fields);
    }
    let _ = log_diag(
        "stt",
        "ok",
        RL_STT_OK,
        format!("transcript_chars={transcript_chars} chars_band={chars_band}"),
    );
    {
        let mut context = state
            .context
            .lock()
            .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
        context.remember_transcript(&transcript);
    }

    emit_status(
        app,
        run_id.as_deref(),
        "analyzing",
        Some(pick_lang(lang, en::STATUS_WAITING_CARD, ru::STATUS_WAITING_CARD).to_string()),
    );
    update_tray_title(
        app,
        &crate::tray_status::tooltip_for_phase(lang, "analyzing", None),
    );

    let context_text = {
        let mut context = state
            .context
            .lock()
            .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
        context.formatted_context()
    };
    let mode = if is_interview_session_active(state)? {
        AnalysisMode::Interview
    } else {
        AnalysisMode::WorkConversation
    };
    let candidate_context = candidate_pack::load()
        .ok()
        .flatten()
        .map(|pack| candidate_pack::compact_context(&pack))
        .unwrap_or_default();
    let combined_context = combine_context_with_candidate(&context_text, &candidate_context, mode);
    let _ = app_log::append_event(
        "candidate_pack_context_status",
        format!(
            "pack_active={} mode={} candidate_context_chars={}",
            mode == AnalysisMode::Interview && !candidate_context.trim().is_empty(),
            match mode {
                AnalysisMode::Interview => "interview",
                AnalysisMode::WorkConversation => "work",
            },
            candidate_context.chars().count()
        ),
    );
    if let Some(ref rid) = run_id {
        let _ = observability::log_audit(
            "llm_request_start",
            Fields::new()
                .with("source", "llm")
                .with("phase", "analyzing")
                .with("run_id", rid)
                .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
                .with("model", settings.llm_model.trim()),
        );
        let _ = observability::log_audit(
            "llm_request_attempt",
            Fields::new()
                .with("source", "llm")
                .with("phase", "analyzing")
                .with("run_id", rid)
                .with("attempt", 1)
                .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
        );
        let _ = observability::log_audit(
            "card_normalization_start",
            Fields::new()
                .with("source", "card")
                .with("phase", "analyzing")
                .with("run_id", rid)
                .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
        );
    }

    let outcome = match llm_provider::analyze_transcript(
        if trace_redacted_enabled {
            run_id.as_deref()
        } else {
            None
        },
        trace_full_enabled,
        &settings,
        llm_key.as_deref(),
        &transcript,
        &combined_context,
        mode,
    )
    .await
    {
        Ok(outcome) => outcome,
        Err(err) => {
            if let Some(ref rid) = run_id {
                let _ = observability::log_error(
                    "card_validation_failed",
                    Fields::new()
                        .with("source", "card")
                        .with("phase", "analyzing")
                        .with("run_id", rid)
                        .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
                );
            }
            if let Some(ref rid) = run_id {
                let _ = observability::log_error(
                    "llm_request_failed",
                    Fields::new()
                        .with("source", "llm")
                        .with("phase", "analyzing")
                        .with("run_id", rid)
                        .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
                        .with("chars_band", chars_band),
                );
            }
            return Err(pipeline_errors::log_llm_failure(
                "llm",
                err,
                "llm",
                &format!(" chars_band={chars_band}"),
            ));
        }
    };
    let card = outcome.card;
    for timing in &outcome.llm_stage_timings {
        let _ = pipeline_timing::log_stage_timing(timing);
    }
    stage_timings.extend(outcome.llm_stage_timings);
    if let Some(ref norm_timing) = outcome.card_norm_timing {
        let _ = pipeline_timing::log_stage_timing(norm_timing);
        stage_timings.push(norm_timing.clone());
    }
    if outcome.retry_attempted {
        let _ = app_log::append_event(
            "card_retry_attempt",
            format!("card_retry_attempt=1 success={}", outcome.retry_success),
        );
    }
    let _ = app_log::append_event(
        "analysis_llm_ok",
        format!(
            "gist_chars={} say_now_chars={} next_move_chars={} repair_used={} fallback_used={} chars_band={} llm_retries={} llm_fast_fallback_used={} llm_fast_fallback_reason={}",
            card.gist.chars().count(),
            card.say_now.chars().count(),
            card.next_move.chars().count(),
            card.repair_used,
            card.fallback_used,
            card.chars_band,
            outcome.llm_transport_retries,
            outcome.llm_fast_fallback_used,
            outcome.llm_fast_fallback_reason.unwrap_or("none")
        ),
    );
    if let Some(ref rid) = run_id {
        let _ = observability::log_audit(
            "llm_request_ok",
            Fields::new()
                .with("source", "llm")
                .with("phase", "analyzing")
                .with("run_id", rid)
                .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
                .with("model", settings.llm_model.trim())
                .with("llm_retries", outcome.llm_transport_retries),
        );
        let _ = observability::log_audit(
            "card_normalization_ok",
            Fields::new()
                .with("source", "card")
                .with("phase", "analyzing")
                .with("run_id", rid)
                .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
        );
        let _ = observability::log_audit(
            "card_ready",
            Fields::new()
                .with("source", "card")
                .with("phase", "ready")
                .with("run_id", rid)
                .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
        );
        let _ = trace_manifest::append_timeline_event(rid, "card_ready", "ready", BTreeMap::new());
    }
    let _ = log_diag(
        "llm",
        "ok",
        RL_LLM_OK,
        format!(
            "card generated repair_used={} fallback_used={} chars_band={}",
            card.repair_used, card.fallback_used, card.chars_band
        ),
    );

    {
        let mut context = state
            .context
            .lock()
            .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
        context.commit_transcript(&transcript);
        context.remember_card(card.clone());
    }
    if let Some(interview) = card.interview_card_schema_v1.as_ref() {
        if let Ok(mut session) = state.interview_session.lock() {
            crate::interview_report::append_question(&mut session, &transcript, interview);
        }
    }

    emit_status(app, run_id.as_deref(), "ready", None);
    update_tray_title(
        app,
        &crate::tray_status::tooltip_for_phase(lang, "ready_card", None),
    );
    let _ = app_log::append_event("analysis_ok", "card_ready");
    let _ = log_diag("card", "ok", RL_ANALYSIS_OK, "card_ready");
    let release_to_card = pipeline_timer.measure("release_to_card", "ok", RL_TIMING_SUMMARY);
    let _ = pipeline_timing::log_stage_timing(&release_to_card);
    stage_timings.push(release_to_card);
    if trace_redacted_enabled {
        if let Some(ref rid) = run_id {
            let _ = trace_manifest::write_timings(rid, &stage_timings);
        }
    }
    Ok(card)
}

pub async fn retry_last_analysis(
    state: &ReplylineState,
    app: &AppHandle,
    run_id_param: Option<String>,
) -> Result<AnalysisCardDto, CommandError> {
    let settings = settings::load()?;
    let lang = crate::language_profile::default_language();
    let llm_key = credentials::load(SecretSlot::LlmApiKey)?;

    let run_id = run_id_param.unwrap_or_else(next_retry_run_id);
    let started_at = chrono::Utc::now().to_rfc3339();
    let trace_redacted_enabled = settings.debug_trace_redacted_enabled();
    let trace_full_enabled = settings.debug_trace_full_enabled();
    if trace_redacted_enabled {
        let _ = trace_manifest::ensure_run_started(
            &run_id,
            &started_at,
            &settings,
            "work_conversation",
        );
    }
    let _ = observability::log_audit(
        "retry_clicked",
        Fields::new()
            .with("source", "ui")
            .with("phase", "analyzing")
            .with("run_id", run_id.clone())
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
    );
    let _ = observability::log_audit(
        "llm_request_start",
        Fields::new()
            .with("source", "llm")
            .with("phase", "analyzing")
            .with("run_id", run_id.clone())
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
            .with("model", settings.llm_model.trim()),
    );
    let _ = observability::log_audit(
        "llm_request_attempt",
        Fields::new()
            .with("source", "llm")
            .with("phase", "analyzing")
            .with("run_id", run_id.clone())
            .with("attempt", 1)
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
    );
    let _ = observability::log_audit(
        "card_normalization_start",
        Fields::new()
            .with("source", "card")
            .with("phase", "analyzing")
            .with("run_id", run_id.clone())
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
    );

    let (transcript, context_text, last_mode) = {
        let mut context = state
            .context
            .lock()
            .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
        let transcript = context.last_transcript().ok_or_else(|| {
            let _ = log_diag("retry", "fail", RL_RETRY_EMPTY, "nothing to retry");
            CommandError::Pipeline(
                pick_lang(lang, en::ERR_NOTHING_TO_RETRY, ru::ERR_NOTHING_TO_RETRY).to_string(),
            )
        })?;
        let context_text = context.formatted_context();
        let last_mode = mode_from_last_card(context.last_card().as_ref());
        (transcript, context_text, last_mode)
    };
    let mode = if let Some(last_mode) = last_mode {
        last_mode
    } else if is_interview_session_active(state)? {
        AnalysisMode::Interview
    } else {
        // Safe fallback when mode cannot be inferred from context/session.
        AnalysisMode::WorkConversation
    };

    let retry_detail = pick_lang(lang, en::RETRY_DETAIL, ru::RETRY_DETAIL);
    emit_status(
        app,
        Some(&run_id),
        "analyzing",
        Some(pick_lang(lang, en::STATUS_RETRYING_CARD, ru::STATUS_RETRYING_CARD).to_string()),
    );
    update_tray_title(
        app,
        &crate::tray_status::tooltip_for_phase(lang, "analyzing", Some(retry_detail)),
    );

    let candidate_context = candidate_pack::load()
        .ok()
        .flatten()
        .map(|pack| candidate_pack::compact_context(&pack))
        .unwrap_or_default();
    let combined_context = combine_context_with_candidate(&context_text, &candidate_context, mode);
    let card = match llm_provider::analyze_transcript(
        if trace_redacted_enabled {
            Some(&run_id)
        } else {
            None
        },
        trace_full_enabled,
        &settings,
        llm_key.as_deref(),
        &transcript,
        &combined_context,
        mode,
    )
    .await
    {
        Ok(outcome) => outcome.card,
        Err(err) => {
            let _ = observability::log_error(
                "card_validation_failed",
                Fields::new()
                    .with("source", "card")
                    .with("phase", "analyzing")
                    .with("run_id", run_id.clone())
                    .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
            );
            let _ = observability::log_error(
                "llm_request_failed",
                Fields::new()
                    .with("source", "llm")
                    .with("phase", "analyzing")
                    .with("run_id", run_id.clone())
                    .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
            );
            return Err(pipeline_errors::log_llm_failure(
                "retry",
                err,
                "retry_llm",
                "",
            ));
        }
    };
    let _ = observability::log_audit(
        "llm_request_ok",
        Fields::new()
            .with("source", "llm")
            .with("phase", "analyzing")
            .with("run_id", run_id.clone())
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str())
            .with("model", settings.llm_model.trim()),
    );
    let _ = observability::log_audit(
        "card_normalization_ok",
        Fields::new()
            .with("source", "card")
            .with("phase", "analyzing")
            .with("run_id", run_id.clone())
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
    );
    {
        let mut context = state
            .context
            .lock()
            .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
        context.remember_card(card.clone());
    }
    emit_status(app, Some(&run_id), "ready", None);
    update_tray_title(
        app,
        &crate::tray_status::tooltip_for_phase(lang, "ready_card", None),
    );
    let _ = log_diag(
        "retry",
        "ok",
        RL_RETRY_OK,
        format!(
            "card regenerated repair_used={} fallback_used={} chars_band={}",
            card.repair_used, card.fallback_used, card.chars_band
        ),
    );
    let _ = observability::log_audit(
        "card_ready",
        Fields::new()
            .with("source", "card")
            .with("phase", "ready")
            .with("run_id", run_id.clone())
            .with("privacy_class", PrivacyClass::SafeMetadata.as_str()),
    );
    Ok(card)
}

#[cfg(test)]
mod tests {
    use super::{combine_context_with_candidate, mode_from_last_card};
    use crate::providers::llm_provider::AnalysisMode;
    use crate::types::AnalysisCardDto;

    #[test]
    fn work_path_card_maps_to_work_mode() {
        let card = AnalysisCardDto {
            gist: "g".to_string(),
            say_now: "s".to_string(),
            star_evidence: None,
            risk_or_clarifier: None,
            next_move: "n".to_string(),
            chars_band: "short".to_string(),
            interview_card_schema_v1: None,
            repair_used: false,
            fallback_used: false,
        };
        assert_eq!(
            mode_from_last_card(Some(&card)),
            Some(AnalysisMode::WorkConversation)
        );
    }

    #[test]
    fn interview_path_card_maps_to_interview_mode() {
        let card = AnalysisCardDto {
            gist: "g".to_string(),
            say_now: "s".to_string(),
            star_evidence: None,
            risk_or_clarifier: None,
            next_move: "n".to_string(),
            chars_band: "short".to_string(),
            interview_card_schema_v1: Some(crate::interview_card_v1::InterviewCardDto {
                mode: crate::interview_card_v1::InterviewMode::Interview,
                question: crate::interview_card_v1::InterviewQuestion {
                    raw_transcript: "raw".to_string(),
                    clean_question: "clean".to_string(),
                    question_type: crate::interview_card_v1::InterviewQuestionType::Unknown,
                    interviewer_intent: "intent".to_string(),
                    confidence: crate::interview_card_v1::InterviewConfidence::Low,
                },
                answer: crate::interview_card_v1::InterviewAnswer {
                    main: "main".to_string(),
                    short: "short".to_string(),
                    strong: "strong".to_string(),
                    structure: crate::interview_card_v1::InterviewAnswerStructure::Direct,
                },
                signals: crate::interview_card_v1::InterviewSignals::default(),
                risks: crate::interview_card_v1::InterviewRisks {
                    weak_points: vec![],
                    avoid: vec![],
                    safe_reframe: "safe".to_string(),
                },
                follow_ups: vec![],
                clarifier: crate::interview_card_v1::InterviewClarifier::default(),
                bilingual_meta: None,
            }),
            repair_used: false,
            fallback_used: false,
        };
        assert_eq!(
            mode_from_last_card(Some(&card)),
            Some(AnalysisMode::Interview)
        );
    }

    #[test]
    fn work_mode_excludes_candidate_context_by_default() {
        let combined = combine_context_with_candidate(
            "Recent conversation context",
            "Candidate summary: Senior Rust engineer",
            AnalysisMode::WorkConversation,
        );
        assert_eq!(combined, "Recent conversation context");
        assert!(!combined.contains("Candidate context:"));
    }

    #[test]
    fn interview_mode_can_include_candidate_context() {
        let combined = combine_context_with_candidate(
            "Recent conversation context",
            "Candidate summary: Senior Rust engineer",
            AnalysisMode::Interview,
        );
        assert!(combined.contains("Candidate context:"));
        assert!(combined.contains("Candidate summary: Senior Rust engineer"));
    }
}
