use crate::card_v3::{self, CardQualityFlags};
use crate::prompt_registry::{
    default_answer_profile, AnswerProfileConfig, ClarifierPolicy, StructurePreference,
};
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
- если фрагмент реально неоднозначный и это мешает ответу, предложи безопасную уточняющую фразу
- все формулировки на русском, как реальная речь в рабочем разговоре
- answer_now: абзац из 2-4 предложений (что сказать сейчас + конкретика, без длинного эссе)
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
- if ambiguity truly blocks a direct answer, suggest a safe clarifying phrase
- answer_now: 2-4 sentence paragraph (what to say now + specifics, keep it concise)
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

#[allow(dead_code)]
pub fn system_prompt_for_language(language: &str) -> &'static str {
    system_prompt_for_profile(default_answer_profile(), language)
}

pub fn system_prompt_for_profile(profile: &AnswerProfileConfig, language: &str) -> &'static str {
    let _ = profile;
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
    profile: &AnswerProfileConfig,
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
    prompt.push_str("\n\n");
    prompt.push_str(&build_profile_prompt_suffix(profile, language));
    prompt
}

fn build_profile_prompt_suffix(profile: &AnswerProfileConfig, language: &str) -> String {
    let structure = match profile.structure_preference {
        StructurePreference::Star => "STAR",
        StructurePreference::Case => "CASE",
        StructurePreference::Direct => "DIRECT",
        StructurePreference::Technical => "TECHNICAL",
        StructurePreference::Executive => "EXECUTIVE",
    };
    let clarifier = match profile.clarifier_policy {
        ClarifierPolicy::OnlyWhenBlocked => "only when blocked",
        ClarifierPolicy::AllowWhenAmbiguous => "allow when ambiguous",
        ClarifierPolicy::NeverDefault => "never default",
    };
    if language == "en" {
        format!(
            "Active answer profile: {id}\nTone: {tone}\nStructure preference: {structure}\nClarifier policy: {clarifier}\nAnswer now target words: {min}-{max}\nDo not fabricate facts. If detail is unknown, state uncertainty and keep claims anchored to transcript/context only.",
            id = profile.id,
            tone = profile.tone,
            min = profile.answer_word_min,
            max = profile.answer_word_max
        )
    } else {
        format!(
            "Активный профиль ответа: {id}\nТон: {tone}\nСтруктура ответа: {structure}\nПравило уточнений: {clarifier}\nЦелевой размер answer_now: {min}-{max} слов\nНе выдумывай факты. Если данных не хватает, явно укажи неопределенность и опирайся только на фрагмент/контекст.",
            id = profile.id,
            tone = profile.tone,
            min = profile.answer_word_min,
            max = profile.answer_word_max
        )
    }
}

// ---------------------------------------------------------------------------
// Card normalization — card_v3 integration (future CardQualityGate boundary)
// ---------------------------------------------------------------------------

pub fn normalize_from_raw(
    raw_text: &str,
    transcript: &str,
    profile: &AnswerProfileConfig,
) -> Result<(AnalysisCardDto, CardQualityFlags), String> {
    card_v3::normalize_parsed_card(raw_text, transcript, profile)
}

// ---------------------------------------------------------------------------
// Transcript length band — not provider-specific
// ---------------------------------------------------------------------------

pub fn chars_band(transcript: &str) -> &'static str {
    card_v3::chars_band(transcript)
}

#[cfg(test)]
mod tests {
    use super::build_user_prompt;
    use crate::prompt_registry::resolve_answer_profile;

    #[test]
    fn executive_profile_includes_no_fabrication_rule() {
        let profile = resolve_answer_profile("interview_executive");
        let prompt = build_user_prompt("fragment", "", "en", profile, None);
        assert!(prompt.contains("Do not fabricate facts"));
        assert!(prompt.contains("confident"));
    }

    #[test]
    fn technical_profile_requests_technical_structure() {
        let profile = resolve_answer_profile("interview_technical");
        let prompt = build_user_prompt("fragment", "", "en", profile, None);
        assert!(prompt.contains("Structure preference: TECHNICAL"));
        assert!(prompt.contains("technical"));
    }
}
