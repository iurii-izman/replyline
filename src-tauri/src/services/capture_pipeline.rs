use tauri::{AppHandle, Emitter};

use crate::app_log;
use crate::credentials;
use crate::providers::{llm_provider, stt_provider};
use crate::settings;
use crate::state::ReplylineState;
use crate::types::{AnalysisCardDto, CommandError, SecretSlot, StatusEventDto};
use crate::ui_strings::ru;

pub async fn capture_stop_and_analyze(
    state: &ReplylineState,
    app: &AppHandle,
) -> Result<AnalysisCardDto, CommandError> {
    let _ = app_log::append_event("analysis_start", "-");
    let capture_run = {
        let mut capture = state
            .capture
            .lock()
            .map_err(|_| CommandError::Internal("Capture lock poisoned".to_string()))?;
        capture
            .active
            .take()
            .ok_or_else(|| CommandError::Capture(ru::ERR_NO_ACTIVE_CAPTURE.to_string()))?
    };

    emit_status(app, "transcribing", Some(ru::STATUS_WAITING_TEXT));
    update_tray_title(
        app,
        &crate::tray_status::tooltip_for_phase("transcribing", None),
    );

    let pcm = tauri::async_runtime::spawn_blocking(move || capture_run.stop())
        .await
        .map_err(|_| CommandError::Capture("Capture join failed".to_string()))?
        .map_err(CommandError::Capture)?;

    let settings = settings::load()?;
    let deepgram_key = credentials::load(SecretSlot::DeepgramApiKey)?
        .ok_or_else(|| CommandError::Credential(ru::ERR_NO_DEEPGRAM_KEY.to_string()))?;
    let llm_key = credentials::load(SecretSlot::LlmApiKey)?;

    let transcript = match stt_provider::transcribe(&settings, &deepgram_key, &pcm).await {
        Ok(t) => t,
        Err(err) => {
            let event = if settings.use_streaming_stt {
                "analysis_stt_streaming_failed"
            } else {
                "analysis_stt_failed"
            };
            let _ = app_log::append_event(event, &err);
            return Err(CommandError::Pipeline(err));
        }
    };
    let _ = app_log::append_event(
        "analysis_stt_ok",
        format!("transcript_chars={}", transcript.chars().count()),
    );

    emit_status(app, "analyzing", Some(ru::STATUS_WAITING_CARD));
    update_tray_title(
        app,
        &crate::tray_status::tooltip_for_phase("analyzing", None),
    );

    let context_text = {
        let mut context = state
            .context
            .lock()
            .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
        context.formatted_context()
    };

    let card = match llm_provider::analyze(
        &settings,
        llm_key.as_deref(),
        &transcript,
        &context_text,
    )
    .await
    {
        Ok(card) => card,
        Err(err) => {
            let event = if err.contains("Card output invalid:") {
                "analysis_card_invalid"
            } else {
                "analysis_llm_failed"
            };
            let _ = app_log::append_event(event, format!("llm: {err}"));
            return Err(CommandError::Pipeline(err));
        }
    };
    let _ = app_log::append_event(
        "analysis_llm_ok",
        format!(
            "gist_chars={} say_now_chars={} next_move_chars={}",
            card.gist.chars().count(),
            card.say_now.chars().count(),
            card.next_move.chars().count()
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

    emit_status(app, "ready", None);
    update_tray_title(
        app,
        &crate::tray_status::tooltip_for_phase("ready_card", None),
    );
    let _ = app_log::append_event("analysis_ok", "card_ready");
    Ok(card)
}

pub async fn retry_last_analysis(
    state: &ReplylineState,
    app: &AppHandle,
) -> Result<AnalysisCardDto, CommandError> {
    let settings = settings::load()?;
    let llm_key = credentials::load(SecretSlot::LlmApiKey)?;

    let (transcript, context_text) = {
        let mut context = state
            .context
            .lock()
            .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
        let transcript = context
            .last_transcript()
            .ok_or_else(|| CommandError::Pipeline(ru::ERR_NOTHING_TO_RETRY.to_string()))?;
        let context_text = context.formatted_context();
        (transcript, context_text)
    };

    emit_status(app, "analyzing", Some(ru::STATUS_RETRYING_CARD));
    update_tray_title(
        app,
        &crate::tray_status::tooltip_for_phase("analyzing", Some("повтор")),
    );

    let card = match llm_provider::analyze(
        &settings,
        llm_key.as_deref(),
        &transcript,
        &context_text,
    )
    .await
    {
        Ok(card) => card,
        Err(err) => {
            let event = if err.contains("Card output invalid:") {
                "analysis_card_invalid"
            } else {
                "analysis_llm_failed"
            };
            let _ = app_log::append_event(event, format!("retry_llm: {err}"));
            return Err(CommandError::Pipeline(err));
        }
    };
    {
        let mut context = state
            .context
            .lock()
            .map_err(|_| CommandError::Internal("Context lock poisoned".to_string()))?;
        context.remember_card(card.clone());
    }
    emit_status(app, "ready", None);
    update_tray_title(
        app,
        &crate::tray_status::tooltip_for_phase("ready_card", None),
    );
    Ok(card)
}

fn emit_status(app: &AppHandle, phase: &str, detail: Option<&str>) {
    let _ = app.emit(
        "replyline://status",
        StatusEventDto {
            phase: phase.to_string(),
            detail: detail.map(|value| value.to_string()),
        },
    );
}

fn update_tray_title(app: &AppHandle, title: &str) {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_tooltip(Some(title.to_string()));
    }
}
