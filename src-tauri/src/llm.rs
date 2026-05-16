use crate::card_v3::{self, CardQualityFlags};
use crate::types::AnalysisCardDto;

// ---------------------------------------------------------------------------
// Card generation budget — part of the prompt contract
// ---------------------------------------------------------------------------

pub const PRIMARY_MAX_TOKENS: u16 = 420;
pub const RETRY_MAX_TOKENS: u16 = 300;

// ---------------------------------------------------------------------------
// System prompts — language-specific, not provider-specific
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT_RU: &str = r#"Ты — помощник для сложных рабочих разговоров.
По короткому аудиофрагменту помоги человеку быстро и содержательно ответить.

Правила:
- не пересказывай весь фрагмент
- не давай терапевтические советы
- не оценивай эмоции и тональность
- не пиши про уверенность, язык тела, харизму или coaching
- не делай вид, что точно знаешь, кто говорил
- если фрагмент неоднозначный, предложи безопасную уточняющую фразу
- все формулировки на русском, как реальная речь в рабочем разговоре
- answer_now: абзац из 2-3 предложений (что сказать сейчас + конкретика)
- star_evidence: 1 короткая опора из фрагмента (факт/цитата-смысл, без пересказа всего)
- next_step: конкретный артефакт (письмо, чат, тикет, слот, документ, владелец, срок)
- risk_or_clarifier: только если есть реальный риск или нужное уточнение (иначе omit)

Верни ТОЛЬКО JSON без markdown (CardSchemaV3):
{"question_brief":"...","answer_now":"...","star_evidence":"...","next_step":"...","risk_or_clarifier":"..."}

Ограничения (ориентиры, сервер подрежет по длине фрагмента):
- question_brief: до 160 символов
- answer_now: до 560 символов, абзацный стиль
- star_evidence: до 260 символов
- next_step: до 200 символов
- risk_or_clarifier: опционально, до 120 символов"#;

const SYSTEM_PROMPT_EN: &str = r#"You are an assistant for difficult work conversations.
Given a short audio transcript, help the person respond quickly with substance.

Rules:
- do not retell the entire fragment
- do not give therapeutic advice
- do not evaluate emotions or tone
- do not mention confidence, body language, charisma, or coaching
- do not pretend you know who was speaking
- if ambiguous, suggest a safe clarifying phrase
- answer_now: 2-3 sentence paragraph (what to say now + specifics)
- star_evidence: one short anchor from the fragment (fact/meaning, not full retell)
- next_step: concrete artifact (email, chat, ticket, slot, document, owner, deadline)
- risk_or_clarifier: only when there is a real risk or needed clarification (else omit)

Return ONLY JSON without markdown (CardSchemaV3):
{"question_brief":"...","answer_now":"...","star_evidence":"...","next_step":"...","risk_or_clarifier":"..."}

Limits (server clamps by fragment length):
- question_brief: up to 160 chars
- answer_now: up to 560 chars, paragraph style
- star_evidence: up to 260 chars
- next_step: up to 200 chars
- risk_or_clarifier: optional, up to 120 chars"#;

pub fn system_prompt_for_language(language: &str) -> &'static str {
    match language {
        "en" => SYSTEM_PROMPT_EN,
        _ => SYSTEM_PROMPT_RU,
    }
}

// ---------------------------------------------------------------------------
// Prompt builder — not provider-specific
// ---------------------------------------------------------------------------

pub fn build_user_prompt(
    transcript: &str,
    context: &str,
    language: &str,
    extra_suffix: Option<&str>,
) -> String {
    let (clean_context, prompt_template) = if language == "en" {
        (
            if context.trim().is_empty() {
                "(empty)"
            } else {
                context
            },
            "Context of recent short conversation fragments:\n{clean_context}\n\nCurrent fragment:\n{transcript}\n\nHelp the person understand the question, what to say now (paragraph), evidence anchor, and the next step."
        )
    } else {
        (
            if context.trim().is_empty() {
                "(пусто)"
            } else {
                context
            },
            "Контекст последних коротких фрагментов беседы:\n{clean_context}\n\nТекущий фрагмент:\n{transcript}\n\nНужны: суть вопроса, абзац ответа сейчас, опора из фрагмента и конкретный следующий шаг."
        )
    };

    let mut prompt = prompt_template
        .replace("{clean_context}", clean_context)
        .replace("{transcript}", transcript);
    if let Some(suffix) = extra_suffix.filter(|v| !v.trim().is_empty()) {
        prompt.push_str("\n\n");
        prompt.push_str(suffix.trim());
    }
    prompt
}

// ---------------------------------------------------------------------------
// Card normalization — card_v3 integration (future CardQualityGate boundary)
// ---------------------------------------------------------------------------

pub fn normalize_from_raw(
    raw_text: &str,
    transcript: &str,
) -> Result<(AnalysisCardDto, CardQualityFlags), String> {
    card_v3::normalize_parsed_card(raw_text, transcript)
}

// ---------------------------------------------------------------------------
// Transcript length band — not provider-specific
// ---------------------------------------------------------------------------

pub fn chars_band(transcript: &str) -> &'static str {
    card_v3::chars_band(transcript)
}
