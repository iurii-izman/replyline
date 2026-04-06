use std::time::{Duration, Instant};

use crate::types::{AnalysisCardDto, ContextStatusDto};

const CONTEXT_TTL: Duration = Duration::from_secs(20 * 60);
const CONTEXT_MAX_ENTRIES: usize = 3;
const CONTEXT_MAX_CHARS: usize = 1500;

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

    pub fn push_transcript(&mut self, transcript: &str) {
        let value = transcript.trim();
        if value.is_empty() {
            return;
        }
        self.last_touched = Some(Instant::now());
        self.last_transcript = Some(value.to_string());
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
        ContextStatusDto {
            context_active: !self.entries.is_empty(),
            entry_count: self.entries.len(),
        }
    }

    fn total_chars(&self) -> usize {
        self.entries.iter().map(|value| value.chars().count()).sum()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trims_context_to_recent_entries() {
        let mut ctx = ConversationContext::default();
        ctx.push_transcript("one");
        ctx.push_transcript("two");
        ctx.push_transcript("three");
        ctx.push_transcript("four");
        let text = ctx.formatted_context();
        assert!(!text.contains("1: one"));
        assert!(text.contains("1: two"));
        assert!(text.contains("3: four"));
    }
}
