use std::collections::VecDeque;

const MAX_WINDOW_SECS: u64 = 60;
const MAX_SEGMENTS: usize = 20;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FinalTranscriptSegment {
    pub segment_id: String,
    pub text: String,
    pub ended_at_ms: u64,
}

#[derive(Debug, Default)]
pub struct QuestionContextBuffer {
    segments: VecDeque<FinalTranscriptSegment>,
}

impl QuestionContextBuffer {
    pub fn push_final(&mut self, segment: FinalTranscriptSegment) {
        self.segments.push_back(segment);
        self.prune();
    }

    #[allow(dead_code)]
    pub fn snapshot_for_answer(&self) -> Vec<FinalTranscriptSegment> {
        self.segments.iter().cloned().collect()
    }

    fn prune(&mut self) {
        while self.segments.len() > MAX_SEGMENTS {
            let _ = self.segments.pop_front();
        }

        let Some(latest) = self.segments.back() else {
            return;
        };
        let min_ms = latest.ended_at_ms.saturating_sub(MAX_WINDOW_SECS * 1000);
        while let Some(front) = self.segments.front() {
            if front.ended_at_ms >= min_ms {
                break;
            }
            let _ = self.segments.pop_front();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{FinalTranscriptSegment, QuestionContextBuffer};

    #[test]
    fn prunes_old_segments_by_window() {
        let mut buffer = QuestionContextBuffer::default();
        for idx in 0..4 {
            buffer.push_final(FinalTranscriptSegment {
                segment_id: format!("seg-{idx}"),
                text: "safe".to_string(),
                ended_at_ms: idx * 30_000,
            });
        }
        let snapshot = buffer.snapshot_for_answer();
        assert_eq!(snapshot.len(), 3);
        assert_eq!(snapshot[0].segment_id, "seg-1");
        assert_eq!(snapshot[2].segment_id, "seg-3");
    }

    #[test]
    fn prunes_by_max_segment_count() {
        let mut buffer = QuestionContextBuffer::default();
        for idx in 0..25 {
            buffer.push_final(FinalTranscriptSegment {
                segment_id: format!("seg-{idx}"),
                text: "safe".to_string(),
                ended_at_ms: idx * 1_000,
            });
        }
        let snapshot = buffer.snapshot_for_answer();
        assert_eq!(snapshot.len(), 20);
        assert_eq!(snapshot.first().expect("first").segment_id, "seg-5");
        assert_eq!(snapshot.last().expect("last").segment_id, "seg-24");
    }
}
