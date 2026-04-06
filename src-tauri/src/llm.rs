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

const SYSTEM_PROMPT: &str = r#"Ты — краткий помощник для сложных рабочих разговоров.
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

Верни ТОЛЬКО JSON без markdown:
{"gist":"...","say_now":"...","next_move":"..."}

Ограничения:
- gist: до 110 символов
- say_now: до 220 символов
- next_move: до 110 символов"#;

pub async fn analyze_transcript(
    settings: &AppSettings,
    api_key: Option<&str>,
    transcript: &str,
    context: &str,
) -> Result<AnalysisCardDto, String> {
    let prompt = build_user_prompt(transcript, context);
    let request = ChatRequest {
        model: settings.llm_model.trim(),
        messages: vec![
            ChatMessage {
                role: "system",
                content: SYSTEM_PROMPT,
            },
            ChatMessage {
                role: "user",
                content: &prompt,
            },
        ],
        temperature: 0.25,
        max_tokens: 160,
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|err| format!("LLM client: {err}"))?;

    let endpoint = format!("{}/chat/completions", settings.llm_base_url.trim_end_matches('/'));
    let mut builder = client.post(endpoint).json(&request);
    if let Some(token) = api_key.filter(|value| !value.trim().is_empty()) {
        builder = builder.bearer_auth(token);
    }

    let response = builder
        .send()
        .await
        .map_err(|err| format!("LLM request failed: {err}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("LLM error {status}: {body}"));
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
    Ok(AnalysisCardDto {
        gist: trim_line(&card.gist, 110),
        say_now: trim_line(&card.say_now, 220),
        next_move: trim_line(&card.next_move, 110),
    })
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
        return serde_json::from_str::<RawCard>(candidate)
            .map_err(|err| format!("Card JSON parse failed: {err}. Raw: {trimmed}"));
    }

    Err(format!("LLM returned invalid JSON: {trimmed}"))
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
    use super::parse_card_json;

    #[test]
    fn parses_json_inside_markdown_wrapper() {
        let raw = "```json\n{\"gist\":\"g\",\"say_now\":\"s\",\"next_move\":\"n\"}\n```";
        let parsed = parse_card_json(raw).expect("must parse");
        assert_eq!(parsed.gist, "g");
        assert_eq!(parsed.say_now, "s");
        assert_eq!(parsed.next_move, "n");
    }
}
