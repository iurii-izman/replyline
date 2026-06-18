use crate::card_v3::{self, CardQualityFlags};
use crate::prompt_registry::{
    default_answer_profile, AnswerProfileConfig, ClarifierPolicy, StructurePreference,
};
use crate::types::{AnalysisCardDto, AnswerRewriteStyle};

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
- если это обычный фактический вопрос, ответь прямо и не превращай его в рабочий проект
- если фрагмент состоит из 1-2 слов и не содержит ясного вопроса, не додумывай смысл; задай конкретный уточняющий вопрос
- не выдумывай имена, владельцев, даты и дедлайны; неизвестные детали явно оставляй неизвестными
- если не хватает политики компании, цифр, цены, владельца или исходного документа, не заполняй пробелы; естественно скажи, что данных не хватает
- для неоднозначных ссылок вроде «это», «тот вариант», «та цена» сначала уточни объект, вариант или цену, а не выбирай за пользователя
- когда контекста не хватает, answer_short и answer_full должны оставаться полезными: осторожный ответ + что нужно уточнить + безопасная формулировка, которую можно сказать сейчас
- все формулировки на русском, как реальная речь в рабочем разговоре
- answer_short: 1 готовая фраза (1-2 предложения, что сказать прямо сейчас)
- answer_full: 1-2 абзаца (80-180 слов для сложных вопросов, короче для простых фактических), объяснение и контекст
- follow_up_line: следующая фраза/ход, если нужно продолжить разговор
- evidence: 1 короткая опора из фрагмента (факт/цитата-смысл, без пересказа всего)
- next_step: релевантное продолжение; для рабочего вопроса — артефакт/владелец/срок, для фактического — проверка источника или уточнение
- risk_or_clarifier: только если есть реальный риск или нужное уточнение (иначе omit)

Верни ТОЛЬКО JSON без markdown (CardSchemaV4):
{"question_brief":"...","answer_short":"...","answer_full":"...","follow_up_line":"...","evidence":"...","next_step":"...","risk_or_clarifier":"..."}

Ограничения (ориентиры, сервер подрежет по длине фрагмента):
- question_brief: до 160 символов
- answer_short: до 280 символов, 1-2 предложения
- answer_full: до 560 символов, абзацный стиль
- follow_up_line: до 200 символов
- evidence: до 260 символов
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
- if this is a factual question, answer it directly instead of turning it into a work project
- if the fragment is only 1-2 words without a clear question, do not infer a hidden meaning; ask one concrete clarifying question
- never invent names, owners, dates, or deadlines; leave unknown details explicitly unknown
- when company policy, numbers, price, owner, or source document are missing, do not fill the gap; say naturally that the data is missing
- for ambiguous references like "this", "that option", or "that price", clarify the object, option, or price before choosing for the user
- when context is missing, answer_short and answer_full must remain useful: cautious answer + what to clarify + a safe line the user can say now
- answer_short: 1 ready-to-speak phrase (1-2 sentences, what to say right now)
- answer_full: 1-2 paragraphs (80-180 words for complex questions, shorter for simple factual ones), explanation and context
- follow_up_line: next phrase/move if the conversation needs to continue
- evidence: one short anchor from the fragment (fact/meaning, not full retell)
- next_step: relevant continuation; use an artifact/owner/deadline for work questions, or source verification/clarification for factual questions
- risk_or_clarifier: only when there is a real risk or needed clarification (else omit)

Return ONLY JSON without markdown (CardSchemaV4):
{"question_brief":"...","answer_short":"...","answer_full":"...","follow_up_line":"...","evidence":"...","next_step":"...","risk_or_clarifier":"..."}

Limits (server clamps by fragment length):
- question_brief: up to 160 chars
- answer_short: up to 280 chars, 1-2 sentences
- answer_full: up to 560 chars, paragraph style
- follow_up_line: up to 200 chars
- evidence: up to 260 chars
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
                "(no recent context)"
            } else {
                context
            },
            "{combined_context}\n\nCurrent fragment:\n{transcript}\n\nHelp the person understand the question, what to say now (paragraph), evidence anchor, and the next step.\n\nImportant:\n- Active conversation context is user-provided background, not a transcript. Use it only when relevant to the current fragment.\n- Do not treat active context as a continuation of the conversation transcript.\n- Do not fabricate facts based on context. If active context conflicts with the current fragment, prioritize the current fragment and state uncertainty explicitly.\n- If transcript plus active context still do not contain the requested policy, number, price, owner, or source, state the missing data and offer one safe clarifying line."
        )
    } else {
        (
            if context.trim().is_empty() {
                "(нет недавнего контекста)"
            } else {
                context
            },
            "{combined_context}\n\nТекущий фрагмент:\n{transcript}\n\nНужны: суть вопроса, абзац ответа сейчас, опора из фрагмента и конкретный следующий шаг.\n\nВажно:\n- Активный контекст разговора — это пользовательские вводные, а не расшифровка. Используй его, только когда он релевантен текущему фрагменту.\n- Не воспринимай активный контекст как продолжение расшифровки разговора.\n- Не выдумывай факты на основе контекста. Если активный контекст противоречит текущему фрагменту, приоритет у текущего фрагмента и явно укажи неопределённость.\n- Если в transcript и active context всё ещё нет нужной политики, цифры, цены, владельца или источника, назови недостающие данные и предложи одну безопасную уточняющую фразу."
        )
    };

    let mut prompt = prompt_template
        .replace("{combined_context}", clean_context)
        .replace("{transcript}", transcript);
    if let Some(suffix) = extra_suffix.filter(|v| !v.trim().is_empty()) {
        prompt.push_str("\n\n");
        prompt.push_str(suffix.trim());
    }
    prompt.push_str("\n\n");
    prompt.push_str(&build_profile_prompt_suffix(profile, language));
    prompt
}

pub fn build_rewrite_style_override(style: AnswerRewriteStyle, language: &str) -> &'static str {
    match (language, style) {
        ("en", AnswerRewriteStyle::Shorter) => {
            "Temporary rewrite style override for this rebuild only: make answer_short and answer_full shorter. Keep the same facts, transcript grounding, and active context rules. Do not save this as a standing preference."
        }
        ("en", AnswerRewriteStyle::MoreDetailed) => {
            "Temporary rewrite style override for this rebuild only: make answer_full more detailed while keeping answer_short concise enough to say aloud. Keep the same facts, transcript grounding, and active context rules. Do not save this as a standing preference."
        }
        ("en", AnswerRewriteStyle::MoreDirect) => {
            "Temporary rewrite style override for this rebuild only: make answer_short more direct and decisive. Keep the same facts, transcript grounding, and active context rules. Do not save this as a standing preference."
        }
        ("en", AnswerRewriteStyle::Softer) => {
            "Temporary rewrite style override for this rebuild only: make answer_short softer and more diplomatic without becoming vague. Keep the same facts, transcript grounding, and active context rules. Do not save this as a standing preference."
        }
        (_, AnswerRewriteStyle::Shorter) => {
            "Временный style override только для этой пересборки: сделай answer_short и answer_full короче. Сохрани те же факты, привязку к transcript и правила active context. Не сохраняй это как постоянное предпочтение."
        }
        (_, AnswerRewriteStyle::MoreDetailed) => {
            "Временный style override только для этой пересборки: сделай answer_full подробнее, но answer_short оставь коротким для устной реплики. Сохрани те же факты, привязку к transcript и правила active context. Не сохраняй это как постоянное предпочтение."
        }
        (_, AnswerRewriteStyle::MoreDirect) => {
            "Временный style override только для этой пересборки: сделай answer_short прямее и решительнее. Сохрани те же факты, привязку к transcript и правила active context. Не сохраняй это как постоянное предпочтение."
        }
        (_, AnswerRewriteStyle::Softer) => {
            "Временный style override только для этой пересборки: сделай answer_short мягче и дипломатичнее, но не расплывчато. Сохрани те же факты, привязку к transcript и правила active context. Не сохраняй это как постоянное предпочтение."
        }
    }
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
            "Answer style: {id}\nTone: {tone}\nStructure preference: {structure}\nClarifier policy: {clarifier}\nAnswer full target words: {min}-{max}\nDo not fabricate facts. If detail is unknown, state uncertainty and keep claims anchored to transcript/context only.",
            id = profile.id,
            tone = profile.tone,
            min = profile.answer_word_min,
            max = profile.answer_word_max
        )
    } else {
        format!(
            "Стиль ответа: {id}\nТон: {tone}\nСтруктура ответа: {structure}\nПравило уточнений: {clarifier}\nЦелевой размер answer_full: {min}-{max} слов\nНе выдумывай факты. Если данных не хватает, явно укажи неопределенность и опирайся только на фрагмент/контекст.",
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
    use super::{build_rewrite_style_override, build_user_prompt, system_prompt_for_profile};
    use crate::prompt_registry::resolve_answer_profile;
    use crate::types::AnswerRewriteStyle;

    #[test]
    fn executive_profile_includes_no_fabrication_rule() {
        let profile = resolve_answer_profile("work_executive");
        let prompt = build_user_prompt("fragment", "", "en", profile, None);
        assert!(prompt.contains("Do not fabricate facts"));
    }

    #[test]
    fn technical_profile_requests_technical_structure() {
        let profile = resolve_answer_profile("work_technical");
        let prompt = build_user_prompt("fragment", "", "en", profile, None);
        assert!(prompt.contains("Structure preference: TECHNICAL"));
        assert!(prompt.contains("technical"));
    }

    #[test]
    fn work_prompt_forbids_invented_coordination_details() {
        let profile = resolve_answer_profile("work_default");
        let prompt = system_prompt_for_profile(profile, "ru");
        assert!(prompt.contains("не превращай его в рабочий проект"));
        assert!(prompt.contains("не выдумывай имена, владельцев, даты и дедлайны"));
    }

    #[test]
    fn work_prompt_requires_clarification_for_ambiguous_short_fragment() {
        let profile = resolve_answer_profile("work_default");
        let prompt = system_prompt_for_profile(profile, "ru");
        assert!(prompt.contains("не додумывай смысл"));
        assert!(prompt.contains("задай конкретный уточняющий вопрос"));
    }

    #[test]
    fn work_prompt_requires_useful_uncertainty_when_context_missing() {
        let profile = resolve_answer_profile("work_default");
        let prompt = system_prompt_for_profile(profile, "ru");
        assert!(prompt.contains("политики компании, цифр, цены, владельца"));
        assert!(prompt.contains("не заполняй пробелы"));
        assert!(prompt.contains("осторожный ответ + что нужно уточнить + безопасная формулировка"));
    }

    #[test]
    fn work_prompt_handles_ambiguous_references_without_guessing() {
        let profile = resolve_answer_profile("work_default");
        let prompt = system_prompt_for_profile(profile, "en");
        assert!(prompt.contains("\"this\", \"that option\", or \"that price\""));
        assert!(prompt.contains("clarify the object, option, or price"));
        assert!(prompt.contains("before choosing for the user"));
    }

    // --- ContextPack-aware prompt contract tests ---

    #[test]
    fn prompt_distinguishes_context_types_en() {
        let profile = resolve_answer_profile("work_default");
        // When combined_context carries the structured headings from build_combined_context,
        // the prompt template must not re-wrap them under a single generic heading.
        let combined =
            "Recent conversation context:\nrolling\n\nActive conversation context:\npack";
        let prompt = build_user_prompt("fragment", combined, "en", profile, None);
        // The old template heading must be gone.
        assert!(!prompt.contains("Context of recent short conversation fragments"));
        // Structured headings from build_combined_context pass through.
        assert!(prompt.contains("Recent conversation context:"));
        assert!(prompt.contains("Active conversation context:"));
    }

    #[test]
    fn prompt_distinguishes_context_types_ru() {
        let profile = resolve_answer_profile("work_default");
        let combined =
            "Контекст последних фрагментов разговора:\nrolling\n\nАктивный контекст разговора:\npack";
        let prompt = build_user_prompt("фрагмент", combined, "ru", profile, None);
        // Old generic heading must be gone.
        assert!(!prompt.contains("Контекст последних коротких фрагментов беседы"));
        // Structured headings pass through.
        assert!(prompt.contains("Контекст последних фрагментов разговора:"));
        assert!(prompt.contains("Активный контекст разговора:"));
    }

    #[test]
    fn prompt_includes_active_context_guardrails_en() {
        let profile = resolve_answer_profile("work_default");
        let combined =
            "Recent conversation context:\nrolling\n\nActive conversation context:\npack";
        let prompt = build_user_prompt("fragment", combined, "en", profile, None);
        assert!(prompt.contains("not a transcript"));
        assert!(prompt.contains("Do not treat active context as a continuation"));
        assert!(prompt.contains("Do not fabricate facts based on context"));
        assert!(prompt.contains("prioritize the current fragment"));
        assert!(prompt.contains("requested policy, number, price, owner, or source"));
        assert!(prompt.contains("one safe clarifying line"));
    }

    #[test]
    fn prompt_includes_active_context_guardrails_ru() {
        let profile = resolve_answer_profile("work_default");
        let combined =
            "Контекст последних фрагментов разговора:\nrolling\n\nАктивный контекст разговора:\npack";
        let prompt = build_user_prompt("фрагмент", combined, "ru", profile, None);
        assert!(prompt.contains("не расшифровка"));
        assert!(prompt.contains("Не воспринимай активный контекст как продолжение"));
        assert!(prompt.contains("Не выдумывай факты на основе контекста"));
        assert!(prompt.contains("приоритет у текущего фрагмента"));
        assert!(prompt.contains("политики, цифры, цены, владельца или источника"));
        assert!(prompt.contains("безопасную уточняющую фразу"));
    }

    #[test]
    fn guardrails_present_even_when_context_empty() {
        let profile = resolve_answer_profile("work_default");
        let prompt = build_user_prompt("fragment", "", "en", profile, None);
        // Guardrails are always injected, regardless of context content.
        assert!(prompt.contains("not a transcript"));
        assert!(prompt.contains("Do not fabricate facts based on context"));
        // Empty placeholder is shown.
        assert!(prompt.contains("(no recent context)"));
    }

    #[test]
    fn guardrails_present_even_when_context_empty_ru() {
        let profile = resolve_answer_profile("work_default");
        let prompt = build_user_prompt("фрагмент", "", "ru", profile, None);
        assert!(prompt.contains("не расшифровка"));
        assert!(prompt.contains("Не выдумывай факты на основе контекста"));
        assert!(prompt.contains("(нет недавнего контекста)"));
    }

    #[test]
    fn extra_suffix_appended_after_context_and_transcript() {
        let profile = resolve_answer_profile("work_default");
        let prompt = build_user_prompt(
            "fragment",
            "Recent conversation context:\nrolling",
            "en",
            profile,
            Some("RETRY MODE: stricter output"),
        );
        assert!(prompt.contains("RETRY MODE: stricter output"));
        // Retry suffix appears after transcript and guardrails.
        let retry_pos = prompt.find("RETRY MODE").unwrap();
        let fragment_pos = prompt.find("Current fragment:").unwrap();
        assert!(retry_pos > fragment_pos);
    }

    #[test]
    fn rewrite_style_override_is_ephemeral_not_profile_system() {
        let suffix = build_rewrite_style_override(AnswerRewriteStyle::MoreDirect, "en");
        assert!(suffix.contains("Temporary rewrite style override"));
        assert!(suffix.contains("this rebuild only"));
        assert!(suffix.contains("Do not save"));
        assert!(!suffix.to_lowercase().contains("profile"));
    }

    #[test]
    fn prompt_contains_rewrite_style_override_when_supplied() {
        let profile = resolve_answer_profile("work_default");
        let suffix = build_rewrite_style_override(AnswerRewriteStyle::Shorter, "ru");
        let prompt = build_user_prompt("фрагмент", "", "ru", profile, Some(suffix));
        assert!(prompt.contains("style override"));
        assert!(prompt.contains("короче"));
        assert!(prompt.contains("только для этой пересборки"));
        assert!(!prompt.contains("profile system"));
    }
}
