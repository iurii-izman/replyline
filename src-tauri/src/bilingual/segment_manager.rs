use std::time::Duration;

use crate::bilingual::context_buffer::{FinalTranscriptSegment, QuestionContextBuffer};
use crate::providers::deepgram_streaming::StreamingSttEvent;
use crate::types::LiveTranscriptSegmentDto;

const PARTIAL_THROTTLE_MS: u64 = 120;

#[derive(Default)]
pub struct SegmentManager {
    seq: u64,
    last_partial_text: Option<String>,
    last_partial_emit_at_ms: Option<u64>,
}

impl SegmentManager {
    pub fn handle_event<F>(
        &mut self,
        event: StreamingSttEvent,
        now_ms: u64,
        context_buffer: &mut QuestionContextBuffer,
        mut on_final: F,
    ) -> Option<LiveTranscriptSegmentDto>
    where
        F: FnMut(&LiveTranscriptSegmentDto),
    {
        match event {
            StreamingSttEvent::Partial { text, .. } => self.handle_partial(text, now_ms),
            StreamingSttEvent::Final { text, ended_at, .. } => {
                let dto = self.build_segment(text, true, now_ms);
                let ended_at_ms = ended_at
                    .map(|sec| Duration::from_secs_f64(sec).as_millis() as u64)
                    .unwrap_or(now_ms);
                context_buffer.push_final(FinalTranscriptSegment {
                    segment_id: dto.segment_id.clone(),
                    text: dto.text.clone(),
                    ended_at_ms,
                });
                on_final(&dto);
                Some(dto)
            }
            StreamingSttEvent::Error { .. } => None,
        }
    }

    fn handle_partial(&mut self, text: String, now_ms: u64) -> Option<LiveTranscriptSegmentDto> {
        if self.last_partial_text.as_deref() == Some(text.as_str()) {
            return None;
        }
        if let Some(last_emit_at) = self.last_partial_emit_at_ms {
            if now_ms.saturating_sub(last_emit_at) < PARTIAL_THROTTLE_MS {
                self.last_partial_text = Some(text);
                return None;
            }
        }
        self.last_partial_text = Some(text.clone());
        self.last_partial_emit_at_ms = Some(now_ms);
        Some(self.build_segment(text, false, now_ms))
    }

    fn build_segment(
        &mut self,
        text: String,
        finalized: bool,
        now_ms: u64,
    ) -> LiveTranscriptSegmentDto {
        self.seq = self.seq.saturating_add(1);
        LiveTranscriptSegmentDto {
            segment_id: format!("seg-{}", self.seq),
            timestamp: chrono::DateTime::from_timestamp_millis(now_ms as i64)
                .unwrap_or_else(chrono::Utc::now)
                .to_rfc3339(),
            text,
            finalized,
        }
    }
}

#[cfg(test)]
fn safe_segment_metrics(segment: &LiveTranscriptSegmentDto) -> String {
    format!(
        "segment_id={} finalized={} chars={}",
        segment.segment_id,
        segment.finalized,
        segment.text.chars().count()
    )
}

#[cfg(test)]
mod tests {
    use crate::bilingual::context_buffer::QuestionContextBuffer;
    use crate::providers::deepgram_streaming::StreamingSttEvent;

    use super::SegmentManager;

    #[test]
    fn partial_is_throttled_and_skips_unchanged() {
        let mut manager = SegmentManager::default();
        let mut context = QuestionContextBuffer::default();
        let mut final_called = 0usize;

        let first = manager.handle_event(
            StreamingSttEvent::Partial {
                text: "hello".to_string(),
                confidence: None,
                started_at: None,
                stable: false,
            },
            1_000,
            &mut context,
            |_| final_called += 1,
        );
        assert!(first.is_some());

        let throttled = manager.handle_event(
            StreamingSttEvent::Partial {
                text: "hello 2".to_string(),
                confidence: None,
                started_at: None,
                stable: false,
            },
            1_050,
            &mut context,
            |_| final_called += 1,
        );
        assert!(throttled.is_none());

        let unchanged = manager.handle_event(
            StreamingSttEvent::Partial {
                text: "hello 2".to_string(),
                confidence: None,
                started_at: None,
                stable: false,
            },
            1_300,
            &mut context,
            |_| final_called += 1,
        );
        assert!(unchanged.is_none());
        assert_eq!(final_called, 0);
    }

    #[test]
    fn final_always_emitted_and_pushed_to_context() {
        let mut manager = SegmentManager::default();
        let mut context = QuestionContextBuffer::default();
        let mut final_segments = Vec::new();

        let one = manager.handle_event(
            StreamingSttEvent::Final {
                text: "same".to_string(),
                confidence: None,
                started_at: None,
                ended_at: Some(2.1),
                speech_final: true,
            },
            2_000,
            &mut context,
            |segment| final_segments.push(segment.segment_id.clone()),
        );
        let two = manager.handle_event(
            StreamingSttEvent::Final {
                text: "same".to_string(),
                confidence: None,
                started_at: None,
                ended_at: Some(2.2),
                speech_final: true,
            },
            2_100,
            &mut context,
            |segment| final_segments.push(segment.segment_id.clone()),
        );

        assert!(one.is_some());
        assert!(two.is_some());
        assert_eq!(final_segments.len(), 2);
        assert_eq!(context.snapshot_for_answer().len(), 2);
    }

    #[test]
    fn source_text_not_logged_in_metrics() {
        let mut manager = SegmentManager::default();
        let mut context = QuestionContextBuffer::default();
        let segment = manager
            .handle_event(
                StreamingSttEvent::Final {
                    text: "sensitive transcript".to_string(),
                    confidence: None,
                    started_at: None,
                    ended_at: Some(1.0),
                    speech_final: true,
                },
                1_000,
                &mut context,
                |_| {},
            )
            .expect("segment");
        let metrics = super::safe_segment_metrics(&segment);
        assert!(metrics.contains("chars="));
        assert!(!metrics.contains("sensitive transcript"));
    }
}
