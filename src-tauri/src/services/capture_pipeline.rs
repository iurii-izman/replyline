use std::sync::atomic::{AtomicU64, Ordering};

use tauri::AppHandle;

use crate::app_log;
use crate::credentials;
use crate::diag_contract::{
    RL_ANALYSIS_OK, RL_CAPTURE_JOIN_FAILED, RL_CAPTURE_NOT_ACTIVE, RL_CAPTURE_READY,
    RL_CAPTURE_START, RL_CAPTURE_STOP_FAILED, RL_LLM_OK, RL_RETRY_EMPTY, RL_RETRY_OK,
    RL_STT_FAILED, RL_STT_KEY_MISSING, RL_STT_OK, RL_STT_TOO_SHORT,
};
use crate::llm;
use crate::providers::llm_provider;
use crate::providers::stt_provider;
use crate::services::pipeline_errors;
use crate::services::pipeline_events::{emit_status, log_diag, update_tray_title};
use crate::settings;
use crate::state::ReplylineState;
use crate::types::{AnalysisCardDto, CommandError, SecretSlot};
use crate::ui_strings::{en, pick_lang, ru};

const MIN_TRANSCRIPT_CHARS: usize = 25;

static RETRY_RUN_SEQ: AtomicU64 = AtomicU64::new(0);

fn next_retry_run_id() -> String {
    let ts = chrono::Utc::now().timestamp_millis() as u64;
    let seq = RETRY_RUN_SEQ.fetch_add(1, Ordering::Relaxed);
    format!("retry-{}-{}", ts, seq)
}

pub async fn capture_stop_and_analyze(
    state: &ReplylineState,
    app: &AppHandle,
) -> Result<AnalysisCardDto, CommandError> {
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

    let pcm = tauri::async_runtime::spawn_blocking(move || capture_run.stop())
        .await
        .map_err(|_| {
            let _ = log_diag(
                "capture",
                "fail",
                RL_CAPTURE_JOIN_FAILED,
                "capture join failed",
            );
            CommandError::Capture("Capture join failed".to_string())
        })?
        .map_err(|err| {
            let _ = log_diag("capture", "fail", RL_CAPTURE_STOP_FAILED, &err);
            CommandError::Capture(err)
        })?;
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

    let transcript = match stt_provider::transcribe(&settings, &deepgram_key, &pcm).await {
        Ok(t) => t,
        Err(err) => {
            let event = "analysis_stt_failed";
            let _ = app_log::append_event(event, &err);
            let code = RL_STT_FAILED;
            let _ = log_diag("stt", "fail", code, &err);
            return Err(CommandError::Pipeline(err));
        }
    };
    let transcript_chars = transcript.chars().count();
    let chars_band = llm::chars_band(&transcript);
    let _ = app_log::append_event(
        "analysis_stt_ok",
        format!("transcript_chars={transcript_chars} chars_band={chars_band}"),
    );
    let _ = log_diag(
        "stt",
        "ok",
        RL_STT_OK,
        format!("transcript_chars={transcript_chars} chars_band={chars_band}"),
    );
    if transcript_chars < MIN_TRANSCRIPT_CHARS {
        let err = pick_lang(lang, en::ERR_SHORT_CAPTURE, ru::ERR_SHORT_CAPTURE);
        {
            let mut context = state
                .context
                .lock()
                .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
            context.push_transcript(&transcript);
        }
        let _ = app_log::append_event(
            "analysis_short_capture",
            format!("transcript_chars={transcript_chars} chars_band={chars_band}"),
        );
        let _ = log_diag(
            "stt",
            "fail",
            RL_STT_TOO_SHORT,
            format!("transcript_chars={transcript_chars} chars_band={chars_band}"),
        );
        return Err(CommandError::Pipeline(err.to_string()));
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

    let outcome = match llm_provider::analyze_transcript(
        &settings,
        llm_key.as_deref(),
        &transcript,
        &context_text,
    )
    .await
    {
        Ok(outcome) => outcome,
        Err(err) => {
            return Err(pipeline_errors::log_llm_failure(
                "llm",
                err,
                "llm",
                &format!(" chars_band={chars_band}"),
            ));
        }
    };
    let card = outcome.card;
    if outcome.retry_attempted {
        let _ = app_log::append_event(
            "card_retry_attempt",
            format!("card_retry_attempt=1 success={}", outcome.retry_success),
        );
    }
    let _ = app_log::append_event(
        "analysis_llm_ok",
        format!(
            "gist_chars={} say_now_chars={} next_move_chars={} repair_used={} fallback_used={} chars_band={}",
            card.gist.chars().count(),
            card.say_now.chars().count(),
            card.next_move.chars().count(),
            card.repair_used,
            card.fallback_used,
            card.chars_band
        ),
    );
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
        context.push_transcript(&transcript);
        context.remember_card(card.clone());
    }

    emit_status(app, run_id.as_deref(), "ready", None);
    update_tray_title(
        app,
        &crate::tray_status::tooltip_for_phase(lang, "ready_card", None),
    );
    let _ = app_log::append_event("analysis_ok", "card_ready");
    let _ = log_diag("card", "ok", RL_ANALYSIS_OK, "card_ready");
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

    let (transcript, context_text) = {
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
        (transcript, context_text)
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

    let card = match llm_provider::analyze_transcript(
        &settings,
        llm_key.as_deref(),
        &transcript,
        &context_text,
    )
    .await
    {
        Ok(outcome) => outcome.card,
        Err(err) => {
            return Err(pipeline_errors::log_llm_failure(
                "retry",
                err,
                "retry_llm",
                "",
            ));
        }
    };
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
    Ok(card)
}
