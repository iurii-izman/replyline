use std::sync::Arc;
use std::time::{Duration, Instant};

use tokio::sync::mpsc;

use crate::model_presets::{resolve_model_preset, ProviderKind};
use crate::providers::openai_compatible::{self, LlmRequestPolicy};
use crate::services::pipeline_events::emit_bilingual_translation_latency;
use crate::services::pipeline_events::emit_bilingual_translation_segment;
use crate::types::{
    AppSettings, LiveTranscriptSegmentDto, LiveTranslationSegmentDto, TranslationStrategy,
};

const DEFAULT_TIMEOUT_MS: u64 = 2_000;
const MAX_TRANSLATION_RETRIES: usize = 1;
const TRANSLATION_RETRY_BACKOFF_MS: u64 = 150;
const TRANSLATION_FALLBACK_TEXT: &str = "[перевод недоступен]";
const SYSTEM_PROMPT: &str = "You are a real-time interpreter for technical software engineering interviews.\nRules:\n- Output ONLY the Russian translation.\n- Be faithful and literal, but natural for a Russian-speaking developer.\n- Preserve common technical terms in English when used in Russian tech speech.\n- Do not add explanations, examples, summaries, or context.\n- If noise/filler/fewer than 3 meaningful words: output [пропуск].";

#[derive(Clone)]
struct PendingSegment {
    id: String,
    text: String,
}

pub struct TranslationBatcher {
    tx: Option<mpsc::UnboundedSender<PendingSegment>>,
}
pub type TranslationObserver = Arc<dyn Fn(&LiveTranslationSegmentDto) + Send + Sync>;

impl TranslationBatcher {
    pub fn start(
        app: tauri::AppHandle,
        settings: AppSettings,
        llm_base_url: String,
        llm_model: String,
        llm_api_key: Option<String>,
        observer: Option<TranslationObserver>,
    ) -> Self {
        if !settings.live_translation_enabled {
            return Self { tx: None };
        }
        let debounce_ms = settings.translation_debounce_ms.clamp(300, 1500) as u64;
        let min_words = settings.translation_min_word_count.max(1);
        let translator = MicroTranslator::new(
            settings.selected_model_preset,
            llm_base_url,
            llm_model,
            llm_api_key,
        );
        let (tx, rx) = mpsc::unbounded_channel::<PendingSegment>();
        tokio::spawn(run_batch_loop(rx, debounce_ms, move |batch| {
            let app = app.clone();
            let translator = translator.clone();
            let observer = observer.clone();
            async move {
                process_batch(&app, &translator, min_words, batch, observer).await;
            }
        }));
        Self { tx: Some(tx) }
    }

    pub fn enqueue_final(&self, segment: &LiveTranscriptSegmentDto) {
        if !segment.finalized {
            return;
        }
        let Some(tx) = &self.tx else { return };
        let _ = tx.send(PendingSegment {
            id: segment.segment_id.clone(),
            text: segment.text.clone(),
        });
    }
}

async fn run_batch_loop<F, Fut>(
    mut rx: mpsc::UnboundedReceiver<PendingSegment>,
    debounce_ms: u64,
    mut on_batch: F,
) where
    F: FnMut(Vec<PendingSegment>) -> Fut,
    Fut: std::future::Future<Output = ()>,
{
    let mut pending: Vec<PendingSegment> = Vec::new();
    loop {
        if pending.is_empty() {
            let Some(next) = rx.recv().await else { break };
            pending.push(next);
            continue;
        }
        match tokio::time::timeout(Duration::from_millis(debounce_ms), rx.recv()).await {
            Ok(Some(next)) => pending.push(next),
            Ok(None) => {
                let batch = std::mem::take(&mut pending);
                on_batch(batch).await;
                break;
            }
            Err(_) => {
                let batch = std::mem::take(&mut pending);
                on_batch(batch).await;
            }
        }
    }
}

async fn process_batch(
    app: &tauri::AppHandle,
    translator: &MicroTranslator,
    min_words: u8,
    batch: Vec<PendingSegment>,
    observer: Option<TranslationObserver>,
) {
    if batch.is_empty() {
        return;
    }
    let started = Instant::now();
    let source_text = batch_source_text(&batch);
    let word_count = meaningful_word_count(&source_text);
    let (translated_text, is_fallback) = if word_count < min_words as usize {
        ("[пропуск]".to_string(), true)
    } else {
        match translator.translate(&source_text).await {
            Ok(text) => (text, false),
            Err(_) => (TRANSLATION_FALLBACK_TEXT.to_string(), true),
        }
    };
    emit_bilingual_translation_latency(app, started.elapsed().as_millis() as u64);
    let dto = build_translation_dto(
        &batch,
        source_text,
        translated_text,
        is_fallback,
        started.elapsed().as_millis() as u64,
    );
    if let Some(observer) = observer {
        observer(&dto);
    }
    emit_bilingual_translation_segment(app, &dto);
}

fn batch_source_text(batch: &[PendingSegment]) -> String {
    batch
        .iter()
        .map(|item| item.text.as_str())
        .collect::<Vec<_>>()
        .join(" ")
}

fn build_translation_dto(
    batch: &[PendingSegment],
    source_text: String,
    translated_text: String,
    is_fallback: bool,
    latency_ms: u64,
) -> LiveTranslationSegmentDto {
    let ids = batch
        .iter()
        .map(|item| item.id.clone())
        .collect::<Vec<String>>();
    let primary_id = ids
        .first()
        .cloned()
        .unwrap_or_else(|| "unknown".to_string());
    LiveTranslationSegmentDto {
        segment_id: format!("tr-{}", chrono::Utc::now().timestamp_millis()),
        source_segment_ids: ids,
        primary_source_segment_id: primary_id,
        timestamp: chrono::Utc::now().to_rfc3339(),
        source_text,
        translated_text,
        source_language: "en".to_string(),
        target_language: "ru".to_string(),
        is_final: true,
        latency_ms,
        is_fallback,
        strategy: TranslationStrategy::LlmMicro,
        batch_size: batch.len(),
    }
}

#[derive(Clone)]
struct MicroTranslator {
    fallback_models: Vec<&'static str>,
    base_url: String,
    model: String,
    api_key: Option<String>,
}

impl MicroTranslator {
    fn new(preset_id: String, base_url: String, model: String, api_key: Option<String>) -> Self {
        let preset = resolve_model_preset(&preset_id);
        let fallback_models = if preset.provider_kind == ProviderKind::OpenRouter {
            preset.fallback_models.to_vec()
        } else {
            vec![]
        };
        Self {
            fallback_models,
            base_url,
            model,
            api_key,
        }
    }

    async fn translate(&self, source_text: &str) -> Result<String, String> {
        if self.base_url.trim().is_empty() || self.model.trim().is_empty() {
            return Err("LLM_ROUTE_MISSING".to_string());
        }
        let user_prompt = format!("Translate to Russian:\n\n{source_text}");
        for attempt in 0..=MAX_TRANSLATION_RETRIES {
            let policy = LlmRequestPolicy {
                total_budget_ms: DEFAULT_TIMEOUT_MS,
                per_attempt_timeout_ms: DEFAULT_TIMEOUT_MS,
                max_retries: 0,
                retry_base_ms: 0,
                retry_max_backoff_ms: 0,
                enable_fast_fallback: true,
            };
            let result = tokio::time::timeout(
                Duration::from_millis(DEFAULT_TIMEOUT_MS),
                openai_compatible::request_card_raw_text_with_temperature(
                    None,
                    false,
                    &self.base_url,
                    &self.model,
                    &self.fallback_models,
                    self.api_key.as_deref(),
                    SYSTEM_PROMPT,
                    &user_prompt,
                    0.1,
                    200,
                    policy,
                ),
            )
            .await;
            match result {
                Ok(Ok((raw, _, _))) => return Ok(raw.trim().to_string()),
                Ok(Err(err)) => {
                    if attempt == MAX_TRANSLATION_RETRIES {
                        return Err(err);
                    }
                }
                Err(_) => {
                    if attempt == MAX_TRANSLATION_RETRIES {
                        return Err("TIMEOUT".to_string());
                    }
                }
            }
            tokio::time::sleep(Duration::from_millis(TRANSLATION_RETRY_BACKOFF_MS)).await;
        }
        Err("TIMEOUT".to_string())
    }
}

fn meaningful_word_count(input: &str) -> usize {
    input
        .split_whitespace()
        .filter(|token| token.chars().any(|c| c.is_alphabetic()))
        .count()
}

#[cfg(test)]
mod tests {
    use super::{batch_source_text, build_translation_dto, meaningful_word_count, PendingSegment};
    use std::sync::{Arc, Mutex};
    use std::time::Duration;
    use tokio::sync::mpsc;

    #[test]
    fn skips_short_or_noise_input() {
        assert_eq!(meaningful_word_count("uh"), 1);
        assert_eq!(meaningful_word_count("... ??"), 0);
        assert!(meaningful_word_count("let us start now") >= 3);
    }

    #[test]
    fn batch_contract_keeps_all_source_segment_ids() {
        let batch = vec![
            PendingSegment {
                id: "seg-1".to_string(),
                text: "first final".to_string(),
            },
            PendingSegment {
                id: "seg-2".to_string(),
                text: "second final".to_string(),
            },
        ];
        let dto = build_translation_dto(
            &batch,
            batch_source_text(&batch),
            "перевод".to_string(),
            false,
            42,
        );
        assert_eq!(
            dto.source_segment_ids,
            vec!["seg-1".to_string(), "seg-2".to_string()]
        );
        assert_eq!(dto.primary_source_segment_id, "seg-1");
        assert_eq!(dto.batch_size, 2);
    }

    #[test]
    fn short_batch_uses_fallback_marker() {
        let batch = vec![PendingSegment {
            id: "seg-1".to_string(),
            text: "hmm".to_string(),
        }];
        let source = batch_source_text(&batch);
        let dto = build_translation_dto(&batch, source, "[пропуск]".to_string(), true, 1);
        assert!(dto.is_fallback);
        assert_eq!(dto.translated_text, "[пропуск]");
    }

    #[test]
    fn timeout_path_uses_fallback() {
        let batch = vec![PendingSegment {
            id: "seg-1".to_string(),
            text: "please summarize architecture tradeoffs".to_string(),
        }];
        let dto = build_translation_dto(
            &batch,
            batch_source_text(&batch),
            "[перевод недоступен]".to_string(),
            true,
            2_000,
        );
        assert!(dto.is_fallback);
        assert_eq!(dto.translated_text, "[перевод недоступен]");
    }

    #[tokio::test]
    async fn two_finals_within_debounce_produce_one_batch() {
        let (tx, rx) = mpsc::unbounded_channel::<PendingSegment>();
        let collected: Arc<Mutex<Vec<Vec<String>>>> = Arc::new(Mutex::new(Vec::new()));
        let collected_ref = Arc::clone(&collected);
        let loop_task = tokio::spawn(super::run_batch_loop(rx, 50, move |batch| {
            let collected_inner = Arc::clone(&collected_ref);
            async move {
                let ids = batch.into_iter().map(|item| item.id).collect::<Vec<_>>();
                collected_inner.lock().expect("lock").push(ids);
            }
        }));

        tx.send(PendingSegment {
            id: "seg-1".to_string(),
            text: "first final".to_string(),
        })
        .expect("send 1");
        tokio::time::sleep(Duration::from_millis(20)).await;
        tx.send(PendingSegment {
            id: "seg-2".to_string(),
            text: "second final".to_string(),
        })
        .expect("send 2");
        drop(tx);
        tokio::time::sleep(Duration::from_millis(80)).await;
        loop_task.await.expect("loop done");

        let batches = collected.lock().expect("lock").clone();
        assert_eq!(batches.len(), 1);
        assert_eq!(batches[0], vec!["seg-1".to_string(), "seg-2".to_string()]);
    }
}
