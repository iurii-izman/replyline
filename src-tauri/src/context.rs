use std::time::{Duration, Instant};

use crate::types::{AnalysisCardDto, ContextStatusDto};

const CONTEXT_TTL: Duration = Duration::from_secs(20 * 60);
const CONTEXT_MAX_ENTRIES: usize = 3;
const CONTEXT_MAX_CHARS: usize = 1500;
const TRANSCRIPT_PREVIEW_MAX_CHARS: usize = 360;

#[derive(Debug, Default)]
pub struct ConversationContext {
    entries: Vec<String>,
    last_touched: Option<Instant>,
    last_transcript: Option<String>,
    last_card: Option<AnalysisCardDto>,
}

impl ConversationContext {
    pub fn clear_if_expired(&mut self) {
        let Some(last_touched) = self.last_touched else {
            return;
        };
        if last_touched.elapsed() > CONTEXT_TTL {
            self.clear();
        }
    }

    pub fn clear(&mut self) {
        self.entries.clear();
        self.last_touched = None;
        self.last_transcript = None;
        self.last_card = None;
    }

    pub fn remember_transcript(&mut self, transcript: &str) {
        let value = transcript.trim();
        if value.is_empty() {
            return;
        }
        self.last_touched = Some(Instant::now());
        self.last_transcript = Some(value.to_string());
    }

    pub fn commit_transcript(&mut self, transcript: &str) {
        let value = transcript.trim();
        self.remember_transcript(value);
        if value.split_whitespace().count() < 2 {
            return;
        }
        self.entries.push(value.to_string());
        if self.entries.len() > CONTEXT_MAX_ENTRIES {
            let overflow = self.entries.len() - CONTEXT_MAX_ENTRIES;
            self.entries.drain(0..overflow);
        }
        while self.total_chars() > CONTEXT_MAX_CHARS && self.entries.len() > 1 {
            self.entries.remove(0);
        }
    }

    pub fn remember_card(&mut self, card: AnalysisCardDto) {
        self.last_touched = Some(Instant::now());
        self.last_card = Some(card);
    }

    pub fn last_card(&mut self) -> Option<AnalysisCardDto> {
        self.clear_if_expired();
        self.last_card.clone()
    }

    pub fn formatted_context(&mut self) -> String {
        self.clear_if_expired();
        self.entries
            .iter()
            .enumerate()
            .map(|(index, item)| format!("{}: {}", index + 1, item))
            .collect::<Vec<_>>()
            .join("\n")
    }

    pub fn last_transcript(&mut self) -> Option<String> {
        self.clear_if_expired();
        self.last_transcript.clone()
    }

    pub fn status(&mut self) -> ContextStatusDto {
        self.clear_if_expired();
        let last = self.last_transcript();
        let preview = last
            .as_ref()
            .map(|text| truncate_preview(text, TRANSCRIPT_PREVIEW_MAX_CHARS));
        ContextStatusDto {
            context_active: !self.entries.is_empty(),
            entry_count: self.entries.len(),
            last_transcript_preview: preview,
            can_retry_last_transcript: last.is_some(),
        }
    }

    fn total_chars(&self) -> usize {
        self.entries.iter().map(|value| value.chars().count()).sum()
    }
}

fn truncate_preview(text: &str, max_chars: usize) -> String {
    let count = text.chars().count();
    if count <= max_chars {
        return text.to_string();
    }
    let head: String = text.chars().take(max_chars).collect();
    format!("{head}…")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trims_context_to_recent_entries() {
        let mut ctx = ConversationContext::default();
        ctx.commit_transcript("entry one");
        ctx.commit_transcript("entry two");
        ctx.commit_transcript("entry three");
        ctx.commit_transcript("entry four");
        let text = ctx.formatted_context();
        assert!(!text.contains("1: entry one"));
        assert!(text.contains("1: entry two"));
        assert!(text.contains("3: entry four"));
    }

    #[test]
    fn status_exposes_transcript_preview_and_retry_flag() {
        let mut ctx = ConversationContext::default();
        ctx.commit_transcript("hello transcript");
        let s = ctx.status();
        assert!(s.can_retry_last_transcript);
        assert_eq!(s.entry_count, 1);
        assert!(s
            .last_transcript_preview
            .as_ref()
            .expect("preview")
            .contains("hello transcript"));
    }

    #[test]
    fn remembered_transcript_enables_retry_without_adding_context_entry() {
        let mut ctx = ConversationContext::default();
        ctx.remember_transcript("short complete question");
        let status = ctx.status();
        assert!(status.can_retry_last_transcript);
        assert!(!status.context_active);
        assert_eq!(status.entry_count, 0);
    }

    #[test]
    fn commit_keeps_single_word_out_of_rolling_context() {
        let mut ctx = ConversationContext::default();
        ctx.commit_transcript("Прыгать.");
        let status = ctx.status();
        assert!(status.can_retry_last_transcript);
        assert_eq!(status.entry_count, 0);

        ctx.commit_transcript("Кто владелец?");
        assert_eq!(ctx.status().entry_count, 1);
    }
}
