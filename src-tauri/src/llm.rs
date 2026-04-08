use serde::{Deserialize, Serialize};

use crate::types::{AnalysisCardDto, AppSettings};

#[derive(Debug, Serialize)]
struct ChatRequest<'a> {
    model: &'a str,
    messages: Vec<ChatMessage<'a>>,
    temperature: f32,
    max_tokens: u16,
}

#[derive(Debug, Serialize)]
struct ChatMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: ResponseMessage,
}

#[derive(Debug, Deserialize)]
struct ResponseMessage {
    content: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct RawCard {
    gist: String,
    say_now: String,
    next_move: String,
}

const SYSTEM_PROMPT_RU: &str = r#"Ты — краткий помощник для сложных рабочих разговоров.
Твоя задача: по короткому аудиофрагменту помочь человеку не растеряться и быстро ответить.

Правила:
- не пиши длинно
- не пересказывай весь фрагмент
- не давай терапевтические советы
- не оценивай эмоции и тональность
- не пиши про уверенность, язык тела, харизму или coaching
- не делай вид, что точно знаешь, кто говорил
- если фрагмент неоднозначный, предложи безопасную уточняющую фразу
- все формулировки должны быть на русском и звучать как реальные слова, которые можно произнести вслух
- say_now должен звучать как ближайшие слова в рабочем разговоре, а не как обзор ситуации
- если уместно, называй владельца, срок, следующий артефакт или контрольную точку
- избегай apology-only ответов и расплывчатых фраз вроде "посмотрим", "как-нибудь", "в целом"
- next_move должен быть конкретным: письмо, чат, тикет, слот, чекпоинт, документ или явная фиксация владельца

Верни ТОЛЬКО JSON без markdown:
{"gist":"...","say_now":"...","next_move":"..."}

Ограничения:
- gist: до 110 символов
- say_now: до 220 символов
- next_move: до 110 символов"#;

const SYSTEM_PROMPT_EN: &str = r#"You are a concise assistant for difficult work conversations.
Your task: given a short audio transcript, help the person respond quickly and clearly.

Rules:
- be brief
- do not retell the entire fragment
- do not give therapeutic advice
- do not evaluate emotions or tone
- do not mention confidence, body language, charisma, or coaching
- do not pretend you know who was speaking
- if the fragment is ambiguous, suggest a safe clarifying phrase
- say_now must sound like real words someone would actually say in a work conversation
- when relevant, name the owner, deadline, next artifact, or checkpoint
- avoid apology-only responses and vague phrases like "we'll see", "somehow", "in general"
- next_move must be concrete: email, chat, ticket, slot, checkpoint, document, or explicit owner assignment

Return ONLY JSON without markdown:
{"gist":"...","say_now":"...","next_move":"..."}

Limits:
- gist: up to 110 characters
- say_now: up to 220 characters
- next_move: up to 110 characters"#;

fn system_prompt_for_language(language: &str) -> &'static str {
    match language {
        "en" => SYSTEM_PROMPT_EN,
        _ => SYSTEM_PROMPT_RU,
    }
}

pub async fn analyze_transcript(
    settings: &AppSettings,
    api_key: Option<&str>,
    transcript: &str,
    context: &str,
) -> Result<AnalysisCardDto, String> {
    let prompt = build_user_prompt(transcript, context);
    let system_prompt = settings
        .custom_system_prompt
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| system_prompt_for_language(settings.primary_language.trim()));
    let request = ChatRequest {
        model: settings.llm_model.trim(),
        messages: vec![
            ChatMessage {
                role: "system",
                content: system_prompt,
            },
            ChatMessage {
                role: "user",
                content: &prompt,
            },
        ],
        temperature: settings.llm_temperature.clamp(0.0, 2.0),
        max_tokens: 160,
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|err| format!("LLM client: {err}"))?;

    let endpoint = format!(
        "{}/chat/completions",
        settings.llm_base_url.trim_end_matches('/')
    );

    let response = {
        let max_retries = 2u32;
        let mut last_err = String::new();
        let mut resolved = None;
        for attempt in 0..=max_retries {
            if attempt > 0 {
                tokio::time::sleep(std::time::Duration::from_millis(
                    500 * 2u64.pow(attempt - 1),
                ))
                .await;
            }
            let mut req = client.post(&endpoint).json(&request);
            if let Some(token) = api_key.filter(|value| !value.trim().is_empty()) {
                req = req.bearer_auth(token);
            }
            match req.send().await {
                Ok(resp) if resp.status().is_server_error() && attempt < max_retries => {
                    last_err = format!("LLM server error {}", resp.status());
                    continue;
                }
                Ok(resp) => {
                    resolved = Some(resp);
                    break;
                }
                Err(err) if (err.is_timeout() || err.is_connect()) && attempt < max_retries => {
                    last_err = format!("LLM request failed: {err}");
                    continue;
                }
                Err(err) => return Err(format!("LLM request failed: {err}")),
            }
        }
        resolved.ok_or(last_err)?
    };

    if !response.status().is_success() {
        let status = response.status();
        let _ = response.text().await;
        return Err(format!("LLM error {status}"));
    }

    let payload: ChatResponse = response
        .json()
        .await
        .map_err(|err| format!("LLM response parse failed: {err}"))?;
    let content = payload
        .choices
        .first()
        .ok_or_else(|| "LLM returned no choices.".to_string())?
        .message
        .content
        .clone();

    let raw_text = match content {
        serde_json::Value::String(value) => value,
        serde_json::Value::Array(items) => items
            .iter()
            .filter_map(|item| item.get("text").and_then(|value| value.as_str()))
            .collect::<Vec<_>>()
            .join("\n"),
        other => other.to_string(),
    };

    let card = parse_card_json(&raw_text)?;
    normalize_card(card)
}

fn build_user_prompt(transcript: &str, context: &str) -> String {
    let clean_context = if context.trim().is_empty() {
        "(empty)".to_string()
    } else {
        context.to_string()
    };

    format!(
        "Контекст последних коротких фрагментов беседы:\n{clean_context}\n\nТекущий фрагмент:\n{transcript}\n\nНужно помочь человеку быстро понять, что сказать сейчас и куда двинуть разговор дальше."
    )
}

fn parse_card_json(raw_text: &str) -> Result<RawCard, String> {
    let trimmed = raw_text.trim();
    if let Ok(card) = serde_json::from_str::<RawCard>(trimmed) {
        return Ok(card);
    }

    if let (Some(start), Some(end)) = (trimmed.find('{'), trimmed.rfind('}')) {
        let candidate = &trimmed[start..=end];
        if let Ok(card) = serde_json::from_str::<RawCard>(candidate) {
            return Ok(card);
        }
    }

    if let Some(card) = try_partial_extract(trimmed) {
        return Ok(card);
    }

    Err(format!("LLM returned invalid JSON: {trimmed}"))
}

fn try_partial_extract(text: &str) -> Option<RawCard> {
    fn extract_field<'a>(text: &'a str, key: &str) -> Option<&'a str> {
        let pattern = format!("\"{key}\"");
        let idx = text.find(&pattern)?;
        let after_key = &text[idx + pattern.len()..];
        let colon_idx = after_key.find(':')?;
        let after_colon = after_key[colon_idx + 1..].trim_start();
        if let Some(inner) = after_colon.strip_prefix('"') {
            let end = inner.find('"')?;
            Some(&inner[..end])
        } else {
            None
        }
    }

    let gist = extract_field(text, "gist")?;
    let say_now = extract_field(text, "say_now")?;
    let next_move = extract_field(text, "next_move")?;

    if gist.is_empty() || say_now.is_empty() || next_move.is_empty() {
        return None;
    }

    Some(RawCard {
        gist: format!("[partial] {gist}"),
        say_now: say_now.to_string(),
        next_move: next_move.to_string(),
    })
}

fn normalize_card(card: RawCard) -> Result<AnalysisCardDto, String> {
    let gist = trim_line(&card.gist, 110);
    let say_now = trim_line(&card.say_now, 220);
    let next_move = trim_line(&card.next_move, 110);

    if gist.is_empty() {
        return Err("Card output invalid: gist is empty.".to_string());
    }
    if say_now.is_empty() {
        return Err("Card output invalid: say_now is empty.".to_string());
    }
    if next_move.is_empty() {
        return Err("Card output invalid: next_move is empty.".to_string());
    }

    validate_say_now(&say_now)?;
    validate_next_move(&next_move)?;

    Ok(AnalysisCardDto {
        gist,
        say_now,
        next_move,
    })
}

fn validate_say_now(value: &str) -> Result<(), String> {
    let lower = value.to_lowercase();
    let word_count = value
        .split_whitespace()
        .filter(|part| !part.is_empty())
        .count();
    let apology_only = ["простите", "извините", "сожалею"]
        .iter()
        .any(|token| lower.starts_with(token));

    if apology_only
        && !contains_any(
            &lower,
            &[
                "сегодня",
                "завтра",
                "до ",
                "пришлю",
                "сделаю",
                "даю",
                "закрываю",
            ],
        )
    {
        return Err("Card output invalid: say_now is apology-only.".to_string());
    }
    if word_count < 4 {
        return Err("Card output invalid: say_now is too short.".to_string());
    }
    if contains_any(
        &lower,
        &["как-нибудь", "посмотрим", "подумаем", "в целом", "в общем"],
    ) {
        return Err("Card output invalid: say_now is too generic.".to_string());
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
            "что именно",
            "?",
        ],
    ) {
        return Err(
            "Card output invalid: say_now has no concrete action or clarification.".to_string(),
        );
    }

    Ok(())
}

fn validate_next_move(value: &str) -> Result<(), String> {
    let lower = value.to_lowercase();
    let word_count = value
        .split_whitespace()
        .filter(|part| !part.is_empty())
        .count();

    if word_count < 3 {
        return Err("Card output invalid: next_move is too short.".to_string());
    }
    if contains_any(&lower, &["потом", "как-нибудь", "посмотрим", "ок", "позже"])
    {
        return Err("Card output invalid: next_move is too vague.".to_string());
    }
    if !contains_any(
        &lower,
        &[
            "письм",
            "чат",
            "тикет",
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
        ],
    ) {
        return Err(
            "Card output invalid: next_move has no concrete coordination artifact.".to_string(),
        );
    }

    Ok(())
}

fn contains_any(haystack: &str, tokens: &[&str]) -> bool {
    tokens.iter().any(|token| haystack.contains(token))
}

fn trim_line(value: &str, max_chars: usize) -> String {
    let clean = value.replace('\n', " ").trim().to_string();
    if clean.chars().count() <= max_chars {
        return clean;
    }
    clean.chars().take(max_chars).collect()
}

#[cfg(test)]
mod tests {
    use super::{normalize_card, parse_card_json, try_partial_extract, RawCard};

    #[test]
    fn parses_json_inside_markdown_wrapper() {
        let raw = "```json\n{\"gist\":\"g\",\"say_now\":\"s\",\"next_move\":\"n\"}\n```";
        let parsed = parse_card_json(raw).expect("must parse");
        assert_eq!(parsed.gist, "g");
        assert_eq!(parsed.say_now, "s");
        assert_eq!(parsed.next_move, "n");
    }

    #[test]
    fn rejects_apology_only_card_output() {
        let err = normalize_card(RawCard {
            gist: "Нужно ответить клиенту".to_string(),
            say_now: "Извините.".to_string(),
            next_move: "Письмо позже.".to_string(),
        })
        .expect_err("must reject");

        assert!(err.contains("apology-only"));
    }

    #[test]
    fn accepts_concrete_card_output() {
        let card = normalize_card(RawCard {
            gist: "Нужно подтвердить владельца и срок.".to_string(),
            say_now:
                "Давайте сейчас зафиксируем владельца и срок: я пришлю обновление сегодня до 17:00."
                    .to_string(),
            next_move: "Отправлю письмо с владельцем и чекпоинтом на завтра.".to_string(),
        })
        .expect("must accept");

        assert!(card.say_now.contains("сегодня"));
        assert!(card.next_move.contains("письмо"));
    }

    #[test]
    fn partial_extract_recovers_broken_json() {
        let broken = r#"Sure! Here is the analysis: {"gist": "Risk delay", "say_now": "Test value", "next_move": "Send email"} hope this helps"#;
        let card = try_partial_extract(broken).expect("must extract");
        assert!(card.gist.starts_with("[partial]"));
        assert_eq!(card.say_now, "Test value");
        assert_eq!(card.next_move, "Send email");
    }

    #[test]
    fn partial_extract_returns_none_for_missing_fields() {
        let incomplete = r#"{"gist": "Only gist"}"#;
        assert!(try_partial_extract(incomplete).is_none());
    }

    #[test]
    fn parse_card_json_falls_back_to_partial() {
        let garbled = r#"Here is my analysis. "gist": "Delay risk", then "say_now": "Check status", and "next_move": "Plan update". Hope it helps!"#;
        let card = parse_card_json(garbled).expect("should fall back to partial");
        assert!(card.gist.starts_with("[partial]"));
        assert_eq!(card.say_now, "Check status");
    }
}
