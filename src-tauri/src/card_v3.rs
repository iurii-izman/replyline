//! CardSchemaV3: parse, per-section repair, legacy mapping, and quality metadata.

use serde::Deserialize;

use crate::types::AnalysisCardDto;

const SHORT_TRANSCRIPT_MAX: usize = 40;
const MEDIUM_TRANSCRIPT_MAX: usize = 120;

#[derive(Debug, Clone, Deserialize)]
struct RawCardV3 {
    question_brief: String,
    answer_now: String,
    star_evidence: String,
    next_step: String,
    #[serde(default)]
    risk_or_clarifier: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct RawCardLegacy {
    gist: String,
    say_now: String,
    next_move: String,
}

#[derive(Debug, Clone)]
enum ParsedCard {
    V3(RawCardV3),
    Legacy(RawCardLegacy),
}

#[derive(Debug, Clone, Copy)]
struct CardLimits {
    question_brief: usize,
    answer_now: usize,
    star_evidence: usize,
    next_step: usize,
    answer_min_words: usize,
}

#[derive(Debug, Clone, Default)]
pub struct CardQualityFlags {
    pub repair_used: bool,
    pub fallback_used: bool,
}

pub fn chars_band(transcript: &str) -> &'static str {
    let count = transcript.chars().count();
    if count <= SHORT_TRANSCRIPT_MAX {
        "short"
    } else if count <= MEDIUM_TRANSCRIPT_MAX {
        "medium"
    } else {
        "long"
    }
}

pub fn normalize_parsed_card(
    raw_text: &str,
    transcript: &str,
) -> Result<(AnalysisCardDto, CardQualityFlags), String> {
    let parsed = parse_card_json(raw_text)?;
    normalize_card(parsed, transcript)
}

fn parse_card_json(raw_text: &str) -> Result<ParsedCard, String> {
    let trimmed = raw_text.trim();
    if let Ok(card) = serde_json::from_str::<RawCardV3>(trimmed) {
        return Ok(ParsedCard::V3(card));
    }
    if let Ok(card) = serde_json::from_str::<RawCardLegacy>(trimmed) {
        return Ok(ParsedCard::Legacy(card));
    }

    if let (Some(start), Some(end)) = (trimmed.find('{'), trimmed.rfind('}')) {
        let candidate = &trimmed[start..=end];
        if let Ok(card) = serde_json::from_str::<RawCardV3>(candidate) {
            return Ok(ParsedCard::V3(card));
        }
        if let Ok(card) = serde_json::from_str::<RawCardLegacy>(candidate) {
            return Ok(ParsedCard::Legacy(card));
        }
    }

    if let Some(card) = try_partial_extract_v3(trimmed) {
        return Ok(ParsedCard::V3(card));
    }
    if let Some(card) = try_partial_extract_legacy(trimmed) {
        return Ok(ParsedCard::Legacy(card));
    }

    Err(format!("LLM returned invalid JSON: {trimmed}"))
}

fn try_partial_extract_v3(text: &str) -> Option<RawCardV3> {
    let question_brief = extract_field(text, "question_brief")?;
    let answer_now = extract_field(text, "answer_now")?;
    let star_evidence = extract_field(text, "star_evidence").unwrap_or_default();
    let next_step = extract_field(text, "next_step")?;
    if question_brief.is_empty() || answer_now.is_empty() || next_step.is_empty() {
        return None;
    }
    Some(RawCardV3 {
        question_brief: format!("[partial] {question_brief}"),
        answer_now,
        star_evidence,
        next_step,
        risk_or_clarifier: extract_field(text, "risk_or_clarifier"),
    })
}

fn try_partial_extract_legacy(text: &str) -> Option<RawCardLegacy> {
    let gist = extract_field(text, "gist")?;
    let say_now = extract_field(text, "say_now")?;
    let next_move = extract_field(text, "next_move")?;
    if gist.is_empty() || say_now.is_empty() || next_move.is_empty() {
        return None;
    }
    Some(RawCardLegacy {
        gist: format!("[partial] {gist}"),
        say_now,
        next_move,
    })
}

fn extract_field(text: &str, key: &str) -> Option<String> {
    let pattern = format!("\"{key}\"");
    let idx = text.find(&pattern)?;
    let after_key = &text[idx + pattern.len()..];
    let colon_idx = after_key.find(':')?;
    let after_colon = after_key[colon_idx + 1..].trim_start();
    if let Some(inner) = after_colon.strip_prefix('"') {
        let end = inner.find('"')?;
        Some(inner[..end].to_string())
    } else {
        None
    }
}

fn normalize_card(
    parsed: ParsedCard,
    transcript: &str,
) -> Result<(AnalysisCardDto, CardQualityFlags), String> {
    let limits = limits_for_transcript(transcript);
    let band = chars_band(transcript).to_string();
    let mut quality = CardQualityFlags::default();

    let (mut gist, mut say_now, mut next_move, star_evidence) = match parsed {
        ParsedCard::V3(card) => map_v3_fields(card, limits),
        ParsedCard::Legacy(card) => (
            trim_line(&card.gist, limits.question_brief),
            trim_line(&card.say_now, limits.answer_now),
            trim_line(&card.next_move, limits.next_step),
            None,
        ),
    };

    gist = repair_section(
        &gist,
        transcript,
        Section::QuestionBrief,
        limits,
        &mut quality,
    )?;
    say_now = repair_section(
        &say_now,
        transcript,
        Section::AnswerNow,
        limits,
        &mut quality,
    )?;
    next_move = repair_section(
        &next_move,
        transcript,
        Section::NextStep,
        limits,
        &mut quality,
    )?;

    Ok((
        AnalysisCardDto {
            gist,
            say_now,
            next_move,
            star_evidence,
            chars_band: band,
            repair_used: quality.repair_used,
            fallback_used: quality.fallback_used,
        },
        quality,
    ))
}

fn map_v3_fields(card: RawCardV3, limits: CardLimits) -> (String, String, String, Option<String>) {
    let question_brief = trim_line(&card.question_brief, limits.question_brief);
    let mut answer_now = trim_line(&card.answer_now, limits.answer_now);
    let star = trim_line(&card.star_evidence, limits.star_evidence);
    if !star.is_empty() && !normalize_cmp(&answer_now).contains(&normalize_cmp(&star)) {
        let glue = if answer_now.ends_with('.') || answer_now.ends_with('?') {
            " "
        } else {
            ". "
        };
        let combined = format!("{answer_now}{glue}Опора: {star}");
        answer_now = trim_line(&combined, limits.answer_now);
    }
    if let Some(risk) = card.risk_or_clarifier.filter(|v| !v.trim().is_empty()) {
        let risk = trim_line(&risk, 120);
        if !normalize_cmp(&answer_now).contains(&normalize_cmp(&risk)) {
            let combined = format!("{answer_now} Риск/уточнение: {risk}");
            answer_now = trim_line(&combined, limits.answer_now);
        }
    }
    let next_step = trim_line(&card.next_step, limits.next_step);
    let star_evidence = if star.is_empty() { None } else { Some(star) };
    (question_brief, answer_now, next_step, star_evidence)
}

#[derive(Clone, Copy)]
enum Section {
    QuestionBrief,
    AnswerNow,
    NextStep,
}

fn repair_section(
    value: &str,
    transcript: &str,
    section: Section,
    limits: CardLimits,
    quality: &mut CardQualityFlags,
) -> Result<String, String> {
    let max = match section {
        Section::QuestionBrief => limits.question_brief,
        Section::AnswerNow => limits.answer_now,
        Section::NextStep => limits.next_step,
    };
    let mut current = trim_line(value, max);
    let initial_err = validate_section(&current, section, limits);

    if initial_err.is_ok() {
        return Ok(current);
    }

    let reason = initial_err.unwrap_err();
    if matches!(section, Section::AnswerNow) && reason.contains("apology-only") {
        return Err(format!("Card output invalid: {reason}"));
    }
    let repaired = match section {
        Section::QuestionBrief => {
            quality.repair_used = true;
            repair_question_brief(&current, transcript, limits)
        }
        Section::AnswerNow => {
            quality.repair_used = true;
            repair_answer_now(&current, transcript, limits)
        }
        Section::NextStep => {
            quality.fallback_used = true;
            build_fallback_next_step(&current, transcript)
        }
    };
    current = trim_line(&repaired, max);

    if let Err(retry_err) = validate_section(&current, section, limits) {
        return Err(format!(
            "Card output invalid: {reason} | repair_failed: {retry_err}"
        ));
    }

    Ok(current)
}

fn validate_section(value: &str, section: Section, limits: CardLimits) -> Result<(), String> {
    match section {
        Section::QuestionBrief => validate_question_brief(value),
        Section::AnswerNow => validate_answer_now(value, limits.answer_min_words),
        Section::NextStep => validate_next_step(value),
    }
}

fn validate_question_brief(value: &str) -> Result<(), String> {
    if value.is_empty() {
        return Err("question_brief is empty.".to_string());
    }
    let words = word_count(value);
    if words < 4 {
        return Err("question_brief is too short.".to_string());
    }
    Ok(())
}

fn validate_answer_now(value: &str, min_words: usize) -> Result<(), String> {
    let lower = value.to_lowercase();
    let words = word_count(value);

    if value.is_empty() {
        return Err("answer_now is empty.".to_string());
    }
    if apology_only(&lower) {
        return Err("answer_now is apology-only.".to_string());
    }
    if words < min_words {
        return Err("answer_now is too short for paragraph guidance.".to_string());
    }
    if contains_any(
        &lower,
        &["как-нибудь", "посмотрим", "подумаем", "в целом", "в общем"],
    ) {
        return Err("answer_now is too generic.".to_string());
    }
    if !has_paragraph_shape(value) {
        return Err("answer_now is not paragraph-shaped.".to_string());
    }
    if !contains_any(
        &lower,
        &[
            "давайте",
            "беру",
            "делаю",
            "закрываю",
            "отправлю",
            "пришлю",
            "фиксируем",
            "уточню",
            "проверю",
            "согласуем",
            "назначу",
            "подтверждаю",
            "предлагаю",
            "что именно",
            "?",
        ],
    ) {
        return Err("answer_now has no concrete action or clarification.".to_string());
    }
    Ok(())
}

fn validate_next_step(value: &str) -> Result<(), String> {
    let lower = value.to_lowercase();
    let words = word_count(value);

    if value.is_empty() {
        return Err("next_step is empty.".to_string());
    }
    if words < 3 {
        return Err("next_step is too short.".to_string());
    }
    if contains_any(&lower, &["потом", "как-нибудь", "посмотрим", "позже"])
        || contains_standalone_word(&lower, "ок")
    {
        return Err("next_step is too vague.".to_string());
    }
    if !contains_any(
        &lower,
        &[
            "письм",
            "email",
            "чат",
            "тикет",
            "jira",
            "issue",
            "слот",
            "чекпоинт",
            "документ",
            "план",
            "созвон",
            "встреч",
            "владел",
            "срок",
            "список",
            "черновик",
            "согласован",
            "апрув",
            "sign-off",
            "блокер",
            "риск",
        ],
    ) {
        return Err("next_step has no concrete coordination artifact.".to_string());
    }
    Ok(())
}

fn has_paragraph_shape(value: &str) -> bool {
    let sentences = value
        .split(['.', '!', '?'])
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .count();
    sentences >= 2 || word_count(value) >= 18
}

fn repair_question_brief_text(value: &str, transcript: &str) -> String {
    let clean = value.trim().trim_end_matches('.');
    if !clean.is_empty() && word_count(clean) >= 4 {
        return format!("{clean}.");
    }
    let snippet = trim_line(transcript, 90);
    if snippet.is_empty() {
        "Собеседник поднимает рабочий вопрос, нужен ясный ответ и следующий шаг.".to_string()
    } else {
        format!("Ключевой вопрос по фрагменту: {snippet}")
    }
}

fn repair_question_brief(value: &str, transcript: &str, limits: CardLimits) -> String {
    trim_line(
        &repair_question_brief_text(value, transcript),
        limits.question_brief,
    )
}

fn repair_answer_now(value: &str, transcript: &str, limits: CardLimits) -> String {
    let repaired = repair_answer_now_inner(value, transcript);
    trim_line(&repaired, limits.answer_now)
}

fn repair_answer_now_inner(value: &str, transcript: &str) -> String {
    let clean = value.trim().trim_end_matches('.').trim();
    if clean.ends_with('?') {
        return format!(
            "{clean} После уточнения сразу зафиксирую решение, владельца и ближайший срок в рабочем канале."
        );
    }
    let lower = format!("{clean}\n{transcript}").to_lowercase();
    let variant = transcript
        .chars()
        .fold(0usize, |acc, ch| acc.wrapping_add(ch as usize))
        % 3;
    if contains_any(&lower, &["когда", "срок", "deadline", "дедлайн", "дата"]) {
        match variant {
            0 => "Предлагаю зафиксировать срок прямо сейчас: назовите финальную дату и владельца подтверждения. Если дата сдвигается, сразу обозначим новый дедлайн и формат апдейта до конца дня.".to_string(),
            1 => "Давайте сверим дедлайн в этом треде: какая финальная дата и кто дает письменное подтверждение сегодня. После согласования отправлю краткий итог с владельцем и контрольной точкой.".to_string(),
            _ => "Нужна конкретика по сроку: какую дату берем и кто фиксирует решение. Я подготовлю короткий итог с датой, владельцем и следующим чекпоинтом.".to_string(),
        }
    } else if contains_any(&lower, &["кто", "владел", "owner", "ответствен"]) {
        match variant {
            0 => "Давайте назначим владельца шага и время статус-апдейта. Я зафиксирую ответственного, срок и формат следующего контроля в одном сообщении.".to_string(),
            1 => "Предлагаю прямо сейчас определить ответственного и дедлайн. После этого отправлю краткий итог: кто ведет, что сдаем и когда сверяемся.".to_string(),
            _ => "Нужно прояснить владельца и срок. Я оформлю это письменно: ответственный, следующий шаг и контрольная дата.".to_string(),
        }
    } else {
        match variant {
            0 => format!(
                "{clean}. Предлагаю зафиксировать один конкретный шаг, владельца и срок до конца дня. После согласования отправлю короткий итог в рабочий канал."
            ),
            1 => format!(
                "{clean}. Давайте уточним следующий артефакт и время проверки сегодня. Я подготовлю краткий follow-up с решением и ответственным."
            ),
            _ => format!(
                "{clean}. Сверим владельца, дедлайн и формат апдейта в этом обсуждении. Затем зафиксирую итог письменно, чтобы не потерять договоренность."
            ),
        }
    }
}

#[derive(Clone, Copy)]
enum FallbackIntent {
    Email,
    Chat,
    Ticket,
    Meeting,
    Blocker,
    Approval,
    Owner,
    Document,
    Plan,
    Default,
}

fn detect_fallback_intent(transcript_lower: &str, combined_lower: &str) -> FallbackIntent {
    let pick = |transcript_tokens: &[&str], combined_tokens: &[&str]| -> bool {
        contains_any(transcript_lower, transcript_tokens)
            || contains_any(combined_lower, combined_tokens)
    };

    for (intent, transcript_tokens, combined_tokens) in [
        (
            FallbackIntent::Email,
            &["email", "e-mail", "письм", "почт"][..],
            &["email", "e-mail", "письм", "почт"][..],
        ),
        (
            FallbackIntent::Blocker,
            &["блокер", "blocker", "риск", "эскалац"][..],
            &["блокер", "blocker", "риск", "эскалац"][..],
        ),
        (
            FallbackIntent::Plan,
            &["план", "список", "приоритет", "roadmap"][..],
            &["план", "список", "приоритет", "roadmap"][..],
        ),
        (
            FallbackIntent::Ticket,
            &["тикет", "ticket", "jira", "задач", "таск"][..],
            &["тикет", "ticket", "jira", "задач", "таск"][..],
        ),
        (
            FallbackIntent::Meeting,
            &[
                "созвон",
                "встреч",
                "meeting",
                "слот",
                "календар",
                "чекпоинт",
                "checkpoint",
            ][..],
            &[
                "созвон",
                "встреч",
                "meeting",
                "слот",
                "календар",
                "чекпоинт",
                "checkpoint",
            ][..],
        ),
        (
            FallbackIntent::Approval,
            &["согласован", "апрув", "approve", "sign-off", "подпис"][..],
            &["согласован", "апрув", "approve", "sign-off", "подпис"][..],
        ),
        (
            FallbackIntent::Owner,
            &[
                "владел",
                "owner",
                "ответствен",
                "срок",
                "дедлайн",
                "deadline",
            ][..],
            &[
                "владел",
                "owner",
                "ответствен",
                "срок",
                "дедлайн",
                "deadline",
                "до ",
            ][..],
        ),
        (
            FallbackIntent::Document,
            &[
                "документ",
                "doc",
                "summary",
                "резюме",
                "протокол",
                "спек",
                "правк",
                "черновик",
            ][..],
            &[
                "документ",
                "doc",
                "summary",
                "резюме",
                "протокол",
                "спек",
                "правк",
                "черновик",
            ][..],
        ),
        (
            FallbackIntent::Chat,
            &["чат", "slack", "teams", "канал"][..],
            &["чат", "slack", "teams", "канал", "сообщен"][..],
        ),
    ] {
        if pick(transcript_tokens, combined_tokens) {
            return intent;
        }
    }

    FallbackIntent::Default
}

pub fn build_fallback_next_step(say_now: &str, transcript: &str) -> String {
    let transcript_lower = transcript.to_lowercase();
    let combined_lower = format!("{say_now}\n{transcript}").to_lowercase();
    let variant = transcript
        .chars()
        .fold(0usize, |acc, ch| acc.wrapping_add(ch as usize))
        % 3;
    let intent = detect_fallback_intent(&transcript_lower, &combined_lower);
    match intent {
        FallbackIntent::Email => match variant {
            0 => "Отправлю письмо с итогом, владельцем и дедлайном ответа до конца дня.",
            1 => "Подготовлю email-резюме: решение, владелец и срок следующего апдейта.",
            _ => "Зафиксирую договоренности письмом с владельцем и контрольной датой.",
        },
        FallbackIntent::Chat => match variant {
            0 => "Зафиксирую в чате решение, владельца и время контрольного апдейта.",
            1 => "Опубликую в канале краткий итог: владелец, срок и следующий чекпоинт.",
            _ => "Отправлю в чат статус с владельцем и дедлайном проверки.",
        },
        FallbackIntent::Ticket => match variant {
            0 => "Обновлю тикет: приоритет, владелец, срок и критерий готовности.",
            1 => "Перенесу договоренности в Jira: владелец, срок и критерий готовности.",
            _ => "Создам или обновлю тикет с владельцем, сроком и статусом проверки.",
        },
        FallbackIntent::Meeting => match variant {
            0 => "Поставлю 15-минутный слот и чекпоинт с решением в календаре.",
            1 => "Назначу короткий созвон: решение, владелец, дедлайн.",
            _ => "Забронирую встречу-чекпоинт и зафиксирую итог в чате.",
        },
        FallbackIntent::Blocker => match variant {
            0 => "Зафиксирую блокер, владельца разблокировки и время следующего статуса.",
            1 => "Подниму риск в треде с владельцем, impact и сроком решения.",
            _ => "Оформлю эскалацию: что блокирует, кто решает и когда апдейт.",
        },
        FallbackIntent::Approval => match variant {
            0 => "Запрошу явный sign-off: критерий, владелец и срок финального апрува.",
            1 => "Зафиксирую согласование в письме с владельцем и датой подтверждения.",
            _ => "Оформлю чеклист апрува и назначу владельца финального решения.",
        },
        FallbackIntent::Owner => match variant {
            0 => "Зафиксирую владельца, дедлайн и контрольную дату в чате команды.",
            1 => "Оформлю владельца и дедлайн в одном сообщении с временем апдейта.",
            _ => "Назначу ответственного и срок проверки в рабочем треде.",
        },
        FallbackIntent::Document => match variant {
            0 => "Обновлю документ: решение, правки и план проверки с владельцем.",
            1 => "Внесу правки в summary и отправлю на review с дедлайном.",
            _ => "Подготовлю черновик протокола с владельцем и датой согласования.",
        },
        FallbackIntent::Plan => match variant {
            0 => "Соберу план: шаги, владелец каждого шага и время следующей сверки.",
            1 => "Оформлю список приоритетов с владельцем и чекпоинтом на этой неделе.",
            _ => "Зафиксирую roadmap-шаги с ответственными и сроками проверки.",
        },
        FallbackIntent::Default => match variant {
            0 => "Уточню в чате один блокер, назначу владельца и время следующего апдейта.",
            1 => "Зафиксирую следующий шаг, владельца и контрольную дату в рабочем канале.",
            _ => "Отправлю короткий follow-up: решение, ответственный и дедлайн проверки.",
        },
    }
    .to_string()
}

fn limits_for_transcript(transcript: &str) -> CardLimits {
    match chars_band(transcript) {
        "short" => CardLimits {
            question_brief: 120,
            answer_now: 420,
            star_evidence: 160,
            next_step: 140,
            answer_min_words: 10,
        },
        "medium" => CardLimits {
            question_brief: 140,
            answer_now: 480,
            star_evidence: 220,
            next_step: 180,
            answer_min_words: 14,
        },
        _ => CardLimits {
            question_brief: 160,
            answer_now: 560,
            star_evidence: 260,
            next_step: 200,
            answer_min_words: 16,
        },
    }
}

fn apology_only(lower: &str) -> bool {
    ["простите", "извините", "сожалею"]
        .iter()
        .any(|token| lower.starts_with(token))
        && !contains_any(
            lower,
            &[
                "сегодня",
                "завтра",
                "до ",
                "пришлю",
                "сделаю",
                "даю",
                "закрываю",
                "давайте",
            ],
        )
}

fn word_count(value: &str) -> usize {
    value
        .split_whitespace()
        .filter(|part| !part.is_empty())
        .count()
}

fn contains_any(haystack: &str, tokens: &[&str]) -> bool {
    tokens.iter().any(|token| contains_token(haystack, token))
}

fn contains_token(haystack: &str, token: &str) -> bool {
    if token.chars().all(|ch| ch.is_ascii_alphabetic()) && token.len() <= 7 {
        return contains_standalone_word(haystack, token);
    }
    haystack.contains(token)
}

fn contains_standalone_word(haystack: &str, token: &str) -> bool {
    haystack
        .split(|ch: char| !ch.is_alphanumeric())
        .any(|part| part == token)
}

fn trim_line(value: &str, max_chars: usize) -> String {
    let clean = value.replace('\n', " ").trim().to_string();
    if clean.chars().count() <= max_chars {
        return clean;
    }
    clean.chars().take(max_chars).collect()
}

fn normalize_cmp(value: &str) -> String {
    value.to_lowercase().replace(['\n', '\r'], " ")
}

#[cfg(test)]
mod tests {
    use super::{
        build_fallback_next_step, normalize_parsed_card, parse_card_json, validate_next_step,
        ParsedCard,
    };

    fn legacy_json(gist: &str, say_now: &str, next_move: &str) -> String {
        format!(r#"{{"gist":"{gist}","say_now":"{say_now}","next_move":"{next_move}"}}"#)
    }

    fn v3_json(question: &str, answer: &str, star: &str, next: &str) -> String {
        format!(
            r#"{{"question_brief":"{question}","answer_now":"{answer}","star_evidence":"{star}","next_step":"{next}"}}"#
        )
    }

    fn fallback_card_for(answer: &str, transcript: &str) -> crate::types::AnalysisCardDto {
        let raw = legacy_json(
            "Нужно согласовать следующий рабочий шаг.",
            answer,
            "Потом посмотрим.",
        );
        normalize_parsed_card(&raw, transcript)
            .expect("fallback card must normalize")
            .0
    }

    #[test]
    fn parses_v3_json() {
        let raw = v3_json("q", "a", "s", "n");
        let parsed = parse_card_json(&raw).expect("must parse v3");
        assert!(matches!(parsed, ParsedCard::V3(_)));
    }

    #[test]
    fn parses_legacy_json() {
        let raw = legacy_json("g", "s", "n");
        let parsed = parse_card_json(&raw).expect("must parse legacy");
        assert!(matches!(parsed, ParsedCard::Legacy(_)));
    }

    #[test]
    fn maps_v3_to_legacy_fields() {
        let raw = v3_json(
            "Клиент спрашивает про срок релиза.",
            "Давайте зафиксируем владельца и срок: я пришлю обновление сегодня до 17:00. После согласования отправлю краткий итог в чат.",
            "В фрагменте прозвучал запрос на дату.",
            "Отправлю письмо с владельцем и чекпоинтом на завтра.",
        );
        let (card, quality) =
            normalize_parsed_card(&raw, "medium length transcript for band").expect("must map");
        assert!(card.gist.contains("срок"));
        assert!(card.say_now.contains("17:00"));
        assert!(card.next_move.contains("письмо"));
        assert!(!quality.fallback_used);
    }

    #[test]
    fn rejects_apology_only_answer() {
        let raw = legacy_json(
            "Нужно ответить клиенту",
            "Извините.",
            "Письмо позже с владельцем и сроком.",
        );
        let err = normalize_parsed_card(&raw, "").expect_err("must reject");
        assert!(err.contains("apology-only") || err.contains("repair_failed"));
    }

    #[test]
    fn repairs_vague_next_step() {
        let raw = legacy_json(
            "Есть риск сдвига срока.",
            "Давайте согласуем приоритеты и срок сегодня до 17:00. Я подготовлю короткий итог и отправлю его в чат до конца дня.",
            "Потом посмотрим.",
        );
        let (card, quality) = normalize_parsed_card(&raw, "").expect("must repair");
        assert!(quality.fallback_used || quality.repair_used);
        validate_next_step(&card.next_move).expect("fallback must pass");
    }

    #[test]
    fn fallback_email() {
        let card = fallback_card_for(
            "Давайте я отправлю письмо с решением сегодня. Подтвержу владельца и срок в том же письме до конца дня.",
            "Клиент просит email с итогами.",
        );
        assert!(card.next_move.contains("письм"));
    }

    #[test]
    fn fallback_chat() {
        let card = fallback_card_for(
            "Давайте зафиксируем решение в чате сейчас. Я оформлю owner и дедлайн в одном сообщении до конца дня.",
            "Команда просит написать в общий канал.",
        );
        assert!(card.next_move.contains("чат"));
    }

    #[test]
    fn fallback_ticket() {
        let card = fallback_card_for(
            "Беру задачу и уточню срок сегодня. После согласования обновлю статус в Jira и критерии готовности.",
            "Нужно обновить тикет Jira по дефекту.",
        );
        assert!(card.next_move.contains("тикет") || card.next_move.contains("Jira"));
    }

    #[test]
    fn fallback_meeting() {
        let card = fallback_card_for(
            "Давайте назначу короткий созвон сегодня. Зафиксирую agenda, owner и checkpoint в календаре.",
            "Нужен слот встречи для checkpoint.",
        );
        assert!(card.next_move.contains("слот") || card.next_move.contains("созвон"));
    }

    #[test]
    fn fallback_owner_deadline() {
        let card = fallback_card_for(
            "Давайте согласуем владельца и срок сегодня. Я отправлю статус в чат с owner и дедлайном до конца дня.",
            "Ответственный пока не назван.",
        );
        assert!(card.next_move.contains("владел"));
    }

    #[test]
    fn fallback_document() {
        let card = fallback_card_for(
            "Проверю документ и пришлю правку сегодня. Укажу owner review и срок согласования.",
            "Нужно поправить summary и черновик.",
        );
        assert!(card.next_move.contains("документ") || card.next_move.contains("summary"));
    }

    #[test]
    fn fallback_plan() {
        let card = fallback_card_for(
            "Давайте согласуем приоритеты и первый шаг сейчас. Я оформлю план с владельцами и отправлю список шагов в чат до конца дня.",
            "Нужен список задач и план решения без summary.",
        );
        assert!(card.next_move.contains("план") || card.next_move.contains("список"));
    }

    #[test]
    fn fallback_blocker() {
        let next = build_fallback_next_step(
            "Давайте разберем блокер и назначим owner сегодня.",
            "Есть критичный blocker по интеграции.",
        );
        assert!(
            next.contains("блокер")
                || next.contains("риск")
                || next.contains("эскалац")
                || next.contains("разблокир")
                || next.contains("blocker"),
            "unexpected fallback: {next}"
        );
    }

    #[test]
    fn fallback_approval() {
        let next = build_fallback_next_step(
            "Нужен sign-off от вас по решению.",
            "Ждем approve от legal.",
        );
        assert!(next.contains("sign-off") || next.contains("согласован") || next.contains("апрув"));
    }

    #[test]
    fn malformed_json_fails() {
        let err = normalize_parsed_card("not json at all", "").expect_err("must fail");
        assert!(err.contains("invalid JSON"));
    }

    #[test]
    fn partial_v3_extract() {
        let broken = r#"Here: {"question_brief": "Risk", "answer_now": "Test value paragraph one. Test value paragraph two action today.", "star_evidence": "heard risk", "next_step": "Send email with owner"}"#;
        let card = parse_card_json(broken).expect("must extract v3");
        assert!(matches!(card, ParsedCard::V3(_)));
    }

    #[test]
    fn legacy_regression_accepts_concrete_card() {
        let raw = legacy_json(
            "Нужно подтвердить владельца и срок.",
            "Давайте сейчас зафиксируем владельца и срок: я пришлю обновление сегодня до 17:00. После этого отправлю краткий итог в чат.",
            "Отправлю письмо с владельцем и чекпоинтом на завтра.",
        );
        let (card, _) = normalize_parsed_card(&raw, "").expect("legacy must work");
        assert!(card.say_now.contains("сегодня"));
    }

    #[test]
    fn accepts_direct_answer_without_mandatory_clarifier() {
        let raw = legacy_json(
            "Нужен ответ по сроку релиза.",
            "Да, укладываемся: сегодня до 17:00 закрываю проверку и подтверждаю финальную дату. После этого отправлю короткий итог в чат с владельцем и контрольной точкой.",
            "Отправлю письмо с владельцем и сроком сегодня.",
        );
        let (card, _) = normalize_parsed_card(&raw, "Успеваете к пятнице или нет?")
            .expect("direct answer must pass");
        assert!(card.say_now.contains("укладываемся"));
        assert!(!card.say_now.contains("Риск/уточнение:"));
    }

    #[test]
    fn allows_clarifier_when_ambiguity_blocks_direct_response() {
        let raw = legacy_json(
            "Запрос расплывчатый.",
            "Чтобы не промахнуться, уточню: вы ждете закрытия по сроку, по качеству или по владельцу? После ответа сразу зафиксирую решение и дедлайн в чате.",
            "Зафиксирую в чате критерий, владельца и срок после уточнения.",
        );
        let (card, _) = normalize_parsed_card(&raw, "Нужно закрыть это нормально.")
            .expect("clarifier should pass when ambiguity is real");
        assert!(card.say_now.contains("?"));
    }

    #[test]
    fn repairs_generic_filler_answer_into_concrete_paragraph() {
        let raw = legacy_json(
            "Нужен конкретный ответ по следующему шагу.",
            "В целом много факторов и как-нибудь решим, посмотрим.",
            "Отправлю письмо с владельцем и сроком завтра.",
        );
        let (card, quality) = normalize_parsed_card(&raw, "").expect("generic filler must repair");
        assert!(quality.repair_used);
        let say_now_lower = card.say_now.to_lowercase();
        assert!(!say_now_lower.contains("как-нибудь"));
        assert!(!say_now_lower.contains("посмотрим"));
        assert!(!say_now_lower.contains("в целом"));
    }
}
