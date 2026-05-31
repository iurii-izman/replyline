use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use std::{collections::HashMap, sync::Mutex};

use tauri::AppHandle;
use tokio::sync::{mpsc, oneshot};

use crate::audio_streaming::{AudioChunk, StreamingCaptureConfig, StreamingCaptureRun};
use crate::bilingual::context_buffer::QuestionContextBuffer;
use crate::bilingual::segment_manager::SegmentManager;
use crate::bilingual::translation::{TranslationBatcher, TranslationObserver};
use crate::credentials;
use crate::providers::deepgram_streaming::{
    connect_deepgram_streaming, DeepgramStreamingClient, DeepgramStreamingParams, StreamingSttEvent,
};
use crate::services::pipeline_events::{
    emit_bilingual_error, emit_bilingual_latency, emit_bilingual_partial_en_latency,
    emit_bilingual_segment, emit_bilingual_session_status,
};
use crate::types::{
    BilingualErrorDto, CommandError, LiveTranscriptSegmentDto, LiveTranslationSegmentDto,
};
const MAX_WS_RETRIES: usize = 3;
const RECONNECT_BACKOFF_MS: [u64; MAX_WS_RETRIES] = [2_000, 4_000, 8_000];
pub const MAX_STORED_TRANSCRIPT_SEGMENTS: usize = 2_000;
pub const MAX_STORED_TRANSLATION_SEGMENTS: usize = 2_000;
pub const MAX_STORED_ANSWER_RECORDS: usize = 512;
pub const MAX_STORED_LATENCY_SAMPLES: usize = 10_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum BilingualStatus {
    #[default]
    Idle,
    Active,
    Reconnecting,
    Degraded,
    Error,
}

impl BilingualStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Idle => "idle",
            Self::Active => "active",
            Self::Reconnecting => "reconnecting",
            Self::Degraded => "degraded",
            Self::Error => "error",
        }
    }
}

pub struct ActiveBilingualSession {
    pub session_id: String,
    pub started_at: String,
    stop_tx: Option<oneshot::Sender<()>>,
    ws_task: Option<tokio::task::JoinHandle<()>>,
    audio_run: Option<StreamingCaptureRun>,
    pub context_buffer: Arc<Mutex<QuestionContextBuffer>>,
    pub translations_by_source_segment_id: Arc<Mutex<HashMap<String, String>>>,
    pub finalized_segments: Arc<Mutex<Vec<LiveTranscriptSegmentDto>>>,
    pub translation_segments: Arc<Mutex<Vec<LiveTranslationSegmentDto>>>,
    pub generated_answers: Arc<Mutex<Vec<BilingualAnswerRecord>>>,
    pub latency_samples_ms: Arc<Mutex<Vec<u64>>>,
}

#[derive(Clone)]
struct StreamingBuffers {
    context_buffer: Arc<Mutex<QuestionContextBuffer>>,
    finalized_segments: Arc<Mutex<Vec<LiveTranscriptSegmentDto>>>,
    latency_samples_ms: Arc<Mutex<Vec<u64>>>,
}

#[derive(Debug, Clone)]
pub struct BilingualAnswerRecord {
    pub timestamp: String,
    pub latency_ms: u64,
    pub source_segment_ids: Vec<String>,
    pub answer_main: String,
    pub answer_short: String,
    pub answer_strong: String,
}

#[derive(Debug, Clone)]
pub struct BilingualSessionExportSnapshot {
    pub session_id: String,
    pub started_at: String,
    pub ended_at: String,
    pub finalized_segments: Vec<LiveTranscriptSegmentDto>,
    pub translation_segments: Vec<LiveTranslationSegmentDto>,
    pub generated_answers: Vec<BilingualAnswerRecord>,
    pub latency_samples_ms: Vec<u64>,
}

impl BilingualSessionExportSnapshot {
    pub fn duration_ms(&self) -> u64 {
        let started = chrono::DateTime::parse_from_rfc3339(&self.started_at)
            .ok()
            .map(|value| value.timestamp_millis());
        let ended = chrono::DateTime::parse_from_rfc3339(&self.ended_at)
            .ok()
            .map(|value| value.timestamp_millis());
        match (started, ended) {
            (Some(started), Some(ended)) if ended >= started => (ended - started) as u64,
            _ => 0,
        }
    }
}

impl ActiveBilingualSession {
    fn is_finished(&self) -> bool {
        self.ws_task
            .as_ref()
            .map(tokio::task::JoinHandle::is_finished)
            .unwrap_or(false)
    }

    pub async fn stop(mut self) {
        if let Some(stop_tx) = self.stop_tx.take() {
            let _ = stop_tx.send(());
        }
        if let Some(ws_task) = self.ws_task.take() {
            let _ = ws_task.await;
        }
        if let Some(audio_run) = self.audio_run.take() {
            let _ = audio_run.stop();
        }
    }
}

#[derive(Default)]
pub struct BilingualSessionState {
    pub status: BilingualStatus,
    pub active: Option<ActiveBilingualSession>,
    pub last_completed_snapshot: Option<BilingualSessionExportSnapshot>,
}

impl BilingualSessionState {
    pub async fn start(&mut self, app: AppHandle) -> Result<(), CommandError> {
        if self
            .active
            .as_ref()
            .map(ActiveBilingualSession::is_finished)
            .unwrap_or(false)
        {
            if let Some(stale) = self.active.take() {
                stale.stop().await;
            }
        }
        if self.active.is_some() {
            return Ok(());
        }
        self.last_completed_snapshot = None;
        let api_key = credentials::load(crate::types::SecretSlot::DeepgramApiKey)
            .map_err(CommandError::from)?
            .unwrap_or_default();
        if api_key.trim().is_empty() {
            return Err(CommandError::Credential("DEEPGRAM_KEY_MISSING".to_string()));
        }
        let settings = crate::settings::load().map_err(CommandError::from)?;
        let llm_api_key =
            credentials::load(crate::types::SecretSlot::LlmApiKey).map_err(CommandError::from)?;
        let context_buffer = Arc::new(Mutex::new(QuestionContextBuffer::default()));
        let translations_by_source_segment_id =
            Arc::new(Mutex::new(HashMap::<String, String>::new()));
        let finalized_segments = Arc::new(Mutex::new(Vec::<LiveTranscriptSegmentDto>::new()));
        let translation_segments = Arc::new(Mutex::new(Vec::<LiveTranslationSegmentDto>::new()));
        let generated_answers = Arc::new(Mutex::new(Vec::<BilingualAnswerRecord>::new()));
        let latency_samples_ms = Arc::new(Mutex::new(Vec::<u64>::new()));
        let translation_map_for_observer = Arc::clone(&translations_by_source_segment_id);
        let translation_segments_for_observer = Arc::clone(&translation_segments);
        let observer: TranslationObserver = Arc::new(move |segment| {
            if let Ok(mut guard) = translation_map_for_observer.lock() {
                for source_id in &segment.source_segment_ids {
                    guard.insert(source_id.clone(), segment.translated_text.clone());
                }
                if segment.source_segment_ids.is_empty() {
                    guard.insert(
                        segment.primary_source_segment_id.clone(),
                        segment.translated_text.clone(),
                    );
                }
            }
            if let Ok(mut guard) = translation_segments_for_observer.lock() {
                push_bounded(&mut guard, segment.clone(), MAX_STORED_TRANSLATION_SEGMENTS);
            }
        });
        let translation_batcher = TranslationBatcher::start(
            app.clone(),
            settings.clone(),
            settings.llm_base_url.clone(),
            settings.llm_model.clone(),
            llm_api_key,
            Some(observer),
        );

        let (audio_tx, audio_rx) = mpsc::channel::<AudioChunk>(32);
        let audio_run = StreamingCaptureRun::start(StreamingCaptureConfig::default(), audio_tx)
            .map_err(CommandError::Capture)?;
        let (stop_tx, stop_rx) = oneshot::channel();
        let session_id = format!("bs-{}", chrono::Utc::now().timestamp_millis());
        let started_at = chrono::Utc::now().to_rfc3339();
        let _ = crate::app_log::append_event(
            "bilingual_session_start",
            format!("session_id={session_id} status=active"),
        );
        let ws_task = tokio::spawn(run_ws_task(
            app.clone(),
            api_key,
            translation_batcher,
            audio_rx,
            stop_rx,
            StreamingBuffers {
                context_buffer: Arc::clone(&context_buffer),
                finalized_segments: Arc::clone(&finalized_segments),
                latency_samples_ms: Arc::clone(&latency_samples_ms),
            },
        ));
        self.status = BilingualStatus::Active;
        emit_bilingual_session_status(&app, BilingualStatus::Active.as_str(), Some(&session_id));
        self.active = Some(ActiveBilingualSession {
            session_id,
            started_at,
            stop_tx: Some(stop_tx),
            ws_task: Some(ws_task),
            audio_run: Some(audio_run),
            context_buffer,
            translations_by_source_segment_id,
            finalized_segments,
            translation_segments,
            generated_answers,
            latency_samples_ms,
        });
        Ok(())
    }

    pub async fn stop(&mut self, app: AppHandle) -> Result<(), CommandError> {
        if let Some(active) = self.active.take() {
            let snapshot = BilingualSessionExportSnapshot {
                session_id: active.session_id.clone(),
                started_at: active.started_at.clone(),
                ended_at: chrono::Utc::now().to_rfc3339(),
                finalized_segments: active
                    .finalized_segments
                    .lock()
                    .map(|guard| guard.clone())
                    .unwrap_or_default(),
                translation_segments: active
                    .translation_segments
                    .lock()
                    .map(|guard| guard.clone())
                    .unwrap_or_default(),
                generated_answers: active
                    .generated_answers
                    .lock()
                    .map(|guard| guard.clone())
                    .unwrap_or_default(),
                latency_samples_ms: active
                    .latency_samples_ms
                    .lock()
                    .map(|guard| guard.clone())
                    .unwrap_or_default(),
            };
            let _ = crate::app_log::append_event(
                "bilingual_session_stop",
                format!(
                    "session_id={} started_at={}",
                    active.session_id, active.started_at
                ),
            );
            active.stop().await;
            self.last_completed_snapshot = Some(snapshot);
        }
        self.status = BilingualStatus::Idle;
        emit_bilingual_session_status(&app, BilingualStatus::Idle.as_str(), None);
        Ok(())
    }
}

async fn run_ws_task(
    app: AppHandle,
    api_key: String,
    translation_batcher: TranslationBatcher,
    mut audio_rx: mpsc::Receiver<AudioChunk>,
    mut stop_rx: oneshot::Receiver<()>,
    buffers: StreamingBuffers,
) {
    let stopped = Arc::new(AtomicBool::new(false));
    let mut retries = 0usize;
    let mut segment_manager = SegmentManager::default();

    loop {
        tokio::select! {
            _ = &mut stop_rx => {
                stopped.store(true, Ordering::SeqCst);
                break;
            }
            res = connect_and_stream(
                &app,
                api_key.as_str(),
                &translation_batcher,
                &mut audio_rx,
                &mut segment_manager,
                &buffers
            ) => {
                match res {
                    Ok(()) => break,
                    Err(err) => {
                        retries += 1;
                        if retries > MAX_WS_RETRIES {
                            emit_status(&app, BilingualStatus::Degraded);
                            emit_error(&app, "BILINGUAL_STREAM_DEGRADED", &err, true);
                            break;
                        }
                        emit_status(&app, BilingualStatus::Reconnecting);
                        let backoff_ms = reconnect_backoff_ms(retries);
                        let _ = crate::app_log::append_event(
                            "bilingual_stream_reconnect_attempt",
                            format!("attempt={retries} backoff_ms={backoff_ms}"),
                        );
                        tokio::time::sleep(Duration::from_millis(backoff_ms)).await;
                    }
                }
            }
        }
    }

    if !stopped.load(Ordering::SeqCst) {
        emit_status(&app, BilingualStatus::Idle);
    }
}

async fn connect_and_stream(
    app: &AppHandle,
    api_key: &str,
    translation_batcher: &TranslationBatcher,
    audio_rx: &mut mpsc::Receiver<AudioChunk>,
    segment_manager: &mut SegmentManager,
    buffers: &StreamingBuffers,
) -> Result<(), String> {
    let params = DeepgramStreamingParams::default();
    let mut client = connect_deepgram_streaming(api_key, &params).await?;
    emit_status(app, BilingualStatus::Active);
    streaming_loop(
        app,
        &mut client,
        translation_batcher,
        audio_rx,
        segment_manager,
        buffers,
    )
    .await
}

async fn streaming_loop(
    app: &AppHandle,
    client: &mut DeepgramStreamingClient,
    translation_batcher: &TranslationBatcher,
    audio_rx: &mut mpsc::Receiver<AudioChunk>,
    segment_manager: &mut SegmentManager,
    buffers: &StreamingBuffers,
) -> Result<(), String> {
    loop {
        while let Ok(chunk) = audio_rx.try_recv() {
            let now_ms = chrono::Utc::now().timestamp_millis() as u64;
            let latency_ms = now_ms.saturating_sub(chunk.started_at);
            emit_bilingual_latency(app, latency_ms, chunk.sample_rate, chunk.duration_ms);
            emit_bilingual_partial_en_latency(app, latency_ms);
            if let Ok(mut guard) = buffers.latency_samples_ms.lock() {
                push_bounded(&mut guard, latency_ms, MAX_STORED_LATENCY_SAMPLES);
            }
            client.send_audio_chunk(chunk.bytes).await?;
        }

        match tokio::time::timeout(Duration::from_millis(25), client.read_next_event()).await {
            Ok(Ok(event)) => {
                process_event(
                    app,
                    translation_batcher,
                    segment_manager,
                    &buffers.context_buffer,
                    &buffers.finalized_segments,
                    event,
                );
            }
            Ok(Err(err)) => return Err(err),
            Err(_) => {}
        }
    }
}

fn process_event(
    app: &AppHandle,
    translation_batcher: &TranslationBatcher,
    segment_manager: &mut SegmentManager,
    context_buffer: &Arc<Mutex<QuestionContextBuffer>>,
    finalized_segments: &Arc<Mutex<Vec<LiveTranscriptSegmentDto>>>,
    event: StreamingSttEvent,
) {
    if let StreamingSttEvent::Error {
        code,
        message,
        recoverable,
    } = &event
    {
        let safe_code = code.clone().unwrap_or_else(|| "UNKNOWN".to_string());
        emit_error(app, &safe_code, message, *recoverable);
        if !recoverable {
            emit_status(app, BilingualStatus::Error);
        }
        return;
    }
    let now_ms = chrono::Utc::now().timestamp_millis() as u64;
    let mut guard = match context_buffer.lock() {
        Ok(guard) => guard,
        Err(_) => {
            emit_error(
                app,
                "BILINGUAL_CONTEXT_LOCK_FAILED",
                "Context lock failed",
                true,
            );
            return;
        }
    };
    if let Some(segment) = segment_manager.handle_event(event, now_ms, &mut guard, |final_seg| {
        translation_batcher.enqueue_final(final_seg);
    }) {
        if segment.finalized {
            if let Ok(mut finalized) = finalized_segments.lock() {
                push_bounded(
                    &mut finalized,
                    segment.clone(),
                    MAX_STORED_TRANSCRIPT_SEGMENTS,
                );
            }
        }
        emit_bilingual_segment(app, &segment);
    }
}

fn push_bounded<T>(items: &mut Vec<T>, value: T, max_len: usize) {
    items.push(value);
    if items.len() > max_len {
        let overflow = items.len() - max_len;
        items.drain(0..overflow);
    }
}

fn emit_status(app: &AppHandle, status: BilingualStatus) {
    emit_bilingual_session_status(app, status.as_str(), None);
}

fn emit_error(app: &AppHandle, code: &str, message: &str, recoverable: bool) {
    let payload = BilingualErrorDto {
        code: code.to_string(),
        message: crate::privacy::safe_preview(message, 200),
        recoverable: Some(recoverable),
    };
    emit_bilingual_error(app, &payload);
}

fn reconnect_backoff_ms(attempt: usize) -> u64 {
    RECONNECT_BACKOFF_MS
        .get(attempt.saturating_sub(1))
        .copied()
        .unwrap_or(8_000)
}

#[cfg(test)]
fn simulate_reconnect_statuses(outcomes: &[Result<(), ()>]) -> Vec<BilingualStatus> {
    let mut retries = 0usize;
    let mut statuses = Vec::new();
    for outcome in outcomes {
        match outcome {
            Ok(()) => {
                statuses.push(BilingualStatus::Active);
                break;
            }
            Err(()) => {
                retries += 1;
                if retries > MAX_WS_RETRIES {
                    statuses.push(BilingualStatus::Degraded);
                    break;
                }
                statuses.push(BilingualStatus::Reconnecting);
            }
        }
    }
    statuses
}

#[cfg(test)]
mod tests {
    use super::{reconnect_backoff_ms, simulate_reconnect_statuses, BilingualStatus};

    #[test]
    fn reconnect_backoff_sequence_is_2_4_8_seconds() {
        assert_eq!(reconnect_backoff_ms(1), 2_000);
        assert_eq!(reconnect_backoff_ms(2), 4_000);
        assert_eq!(reconnect_backoff_ms(3), 8_000);
        assert_eq!(reconnect_backoff_ms(4), 8_000);
    }

    #[test]
    fn reconnect_transitions_to_active_when_recovered() {
        let statuses = simulate_reconnect_statuses(&[Err(()), Err(()), Ok(())]);
        assert_eq!(
            statuses,
            vec![
                BilingualStatus::Reconnecting,
                BilingualStatus::Reconnecting,
                BilingualStatus::Active
            ]
        );
    }

    #[test]
    fn reconnect_transitions_to_degraded_after_retry_budget_exhausted() {
        let statuses = simulate_reconnect_statuses(&[Err(()), Err(()), Err(()), Err(())]);
        assert_eq!(
            statuses,
            vec![
                BilingualStatus::Reconnecting,
                BilingualStatus::Reconnecting,
                BilingualStatus::Reconnecting,
                BilingualStatus::Degraded
            ]
        );
    }
}
