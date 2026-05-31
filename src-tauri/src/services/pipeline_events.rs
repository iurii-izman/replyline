use tauri::{AppHandle, Emitter};

use crate::app_log;
use crate::diag_contract::DIAG_RUNTIME_EVENT_NAME;
use crate::types::{
    BilingualAnswerChunkDto, BilingualAnswerReadyDto, BilingualErrorDto, LiveTranscriptSegmentDto,
    LiveTranslationSegmentDto, StatusEventDto,
};

pub(crate) fn emit_status(
    app: &AppHandle,
    run_id: Option<&str>,
    phase: &str,
    detail: Option<String>,
) {
    let _ = app.emit(
        "replyline://status",
        StatusEventDto {
            run_id: run_id.map(String::from),
            phase: phase.to_string(),
            detail,
        },
    );
}

pub(crate) fn update_tray_title(app: &AppHandle, title: &str) {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_tooltip(Some(title.to_string()));
    }
}

pub(crate) fn emit_bilingual_session_status(
    app: &AppHandle,
    status: &str,
    session_id: Option<&str>,
) {
    let _ = app.emit(
        "bilingual://session-status",
        serde_json::json!({ "status": status, "sessionId": session_id }),
    );
}

pub(crate) fn emit_bilingual_segment(app: &AppHandle, segment: &LiveTranscriptSegmentDto) {
    let _ = app.emit("bilingual://transcript-segment", segment);
}

pub(crate) fn emit_bilingual_error(app: &AppHandle, error: &BilingualErrorDto) {
    let _ = app.emit("bilingual://error", error);
}

pub(crate) fn emit_bilingual_translation_segment(
    app: &AppHandle,
    segment: &LiveTranslationSegmentDto,
) {
    let _ = app.emit("bilingual://translation-segment", segment);
}

pub(crate) fn emit_bilingual_latency(
    app: &AppHandle,
    latency_ms: u64,
    sample_rate: u32,
    duration_ms: u32,
) {
    let _ = app.emit(
        "bilingual://latency-metrics",
        serde_json::json!({
            "latencyMs": latency_ms,
            "sampleRate": sample_rate,
            "durationMs": duration_ms
        }),
    );
}

pub(crate) fn emit_bilingual_partial_en_latency(app: &AppHandle, partial_en_ms: u64) {
    let _ = app.emit(
        "bilingual://latency-metrics",
        serde_json::json!({
            "partialEnMs": partial_en_ms
        }),
    );
}

pub(crate) fn emit_bilingual_translation_latency(app: &AppHandle, translation_ms: u64) {
    let _ = app.emit(
        "bilingual://latency-metrics",
        serde_json::json!({
            "translationMs": translation_ms
        }),
    );
}

pub(crate) fn emit_bilingual_answer_latency(
    app: &AppHandle,
    answer_ttft_ms: u64,
    answer_total_ms: u64,
) {
    let _ = app.emit(
        "bilingual://latency-metrics",
        serde_json::json!({
            "answerTtftMs": answer_ttft_ms,
            "answerTotalMs": answer_total_ms
        }),
    );
}

pub(crate) fn emit_bilingual_answer_ready(app: &AppHandle, payload: &BilingualAnswerReadyDto) {
    let _ = app.emit("bilingual://answer-ready", payload);
}

pub(crate) fn emit_bilingual_answer_chunk(app: &AppHandle, payload: &BilingualAnswerChunkDto) {
    let _ = app.emit("bilingual://answer-chunk", payload);
}

pub(crate) fn log_diag(
    stage: &str,
    outcome: &str,
    code: &str,
    detail: impl AsRef<str>,
) -> Result<(), String> {
    app_log::append_event(
        DIAG_RUNTIME_EVENT_NAME,
        format!(
            "stage={stage} outcome={outcome} code={code} detail={}",
            detail.as_ref()
        ),
    )
}
