use tauri::State;

use crate::app_log;
use crate::commands::shared::require_experimental_bilingual;
use crate::interview_card_v1::BilingualMeta;
use crate::providers::llm_provider;
use crate::providers::llm_provider::AnalysisMode;
use crate::providers::openai_compatible;
use crate::services::pipeline_events::{
    emit_bilingual_answer_chunk, emit_bilingual_answer_latency, emit_bilingual_answer_ready,
};
use crate::state::ReplylineState;
use crate::types::{
    BilingualAnswerChunkDto, BilingualAnswerReadyDto, BilingualExportInputDto, CommandError,
    ExportSummary, ExportType, SecretSlot,
};
use crate::{credentials, settings};

#[tauri::command]
pub async fn start_bilingual_session(
    state: State<'_, ReplylineState>,
    app: tauri::AppHandle,
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
    app: tauri::AppHandle,
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
    app: tauri::AppHandle,
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
    let context_pack_raw = crate::context_pack::get_active_context_pack()
        .ok()
        .flatten()
        .map(|pack| pack.content)
        .unwrap_or_default();
    let context_pack_content = crate::context_pack::compact_for_prompt(&context_pack_raw);
    let bilingual_context = format!(
        "Bilingual interview mode context (use only verified details):\n{}\n\nQuestion source: finalized streaming segments only.",
        if context_pack_content.trim().is_empty() {
            "(empty)"
        } else {
            context_pack_content.trim()
        }
    );

    let stream_system_prompt = "You are an interview assistant. Return only a concise English answer with no markdown. No disclaimers, no JSON.";
    let stream_user_prompt = format!(
        "Conversation context:\n{}\n\nInterview question:\n{}\n\nAnswer in 2-5 sentences (up to 8 for system design). Keep facts grounded and do not invent metrics/projects.",
        bilingual_context, question_en
    );
    let mut chunk_index: u32 = 0;
    let mut streamed_any = false;
    let stream_result = openai_compatible::stream_text_response(
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
        crate::providers::llm_provider::AnalysisOptions::new(AnalysisMode::Interview),
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
