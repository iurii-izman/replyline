use serde::{Deserialize, Serialize};

use crate::card_v3::{self, CardQualityFlags};
use crate::types::{AnalysisCardDto, AppSettings};

const HTTP_TIMEOUT_SECS: u64 = 20;
const MAX_RETRIES: u32 = 2;
const RETRY_BASE_MS: u64 = 500;
const MAX_CARD_RETRY_ATTEMPTS: usize = 1;
const PRIMARY_MAX_TOKENS: u16 = 420;
const RETRY_MAX_TOKENS: u16 = 300;

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

#[derive(Debug, Clone)]
pub struct CardGenerationOutcome {
    pub card: AnalysisCardDto,
    pub retry_attempted: bool,
    pub retry_success: bool,
    #[allow(dead_code)]
    pub quality: CardQualityFlags,
}

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
) -> Result<CardGenerationOutcome, String> {
    let language = "ru".to_string();
    let (raw_text, parse_or_request_err) = request_card_raw_text(
        settings,
        api_key,
        transcript,
        context,
        &language,
        None,
        PRIMARY_MAX_TOKENS,
    )
    .await?;
    match normalize_from_raw(&raw_text, transcript) {
        Ok((card, quality)) => Ok(CardGenerationOutcome {
            card,
            retry_attempted: false,
            retry_success: false,
            quality,
        }),
        Err(err) if err.contains("Card output invalid:") && MAX_CARD_RETRY_ATTEMPTS > 0 => {
            let (retry_raw_text, _parse_or_request_err) = request_card_raw_text(
                settings,
                api_key,
                transcript,
                context,
                &language,
                Some(
                    "RETRY MODE: stricter CardSchemaV3. answer_now must be a 2-sentence paragraph with owner/deadline or clarifier. next_step must name artifact+owner+deadline.",
                ),
                RETRY_MAX_TOKENS,
            )
            .await?;
            let (card, quality) = normalize_from_raw(&retry_raw_text, transcript)
                .map_err(|retry_err| format!("{err} | retry_failed: {retry_err}"))?;
            Ok(CardGenerationOutcome {
                card,
                retry_attempted: true,
                retry_success: true,
                quality,
            })
        }
        Err(err) if err.contains("LLM returned invalid JSON") => {
            Err(format!("{parse_or_request_err}{err}"))
        }
        Err(err) => Err(err),
    }
}

fn normalize_from_raw(
    raw_text: &str,
    transcript: &str,
) -> Result<(AnalysisCardDto, CardQualityFlags), String> {
    card_v3::normalize_parsed_card(raw_text, transcript)
}

async fn request_card_raw_text(
    settings: &AppSettings,
    api_key: Option<&str>,
    transcript: &str,
    context: &str,
    language: &str,
    extra_suffix: Option<&str>,
    max_tokens: u16,
) -> Result<(String, String), String> {
    let prompt = build_user_prompt(transcript, context, language, extra_suffix);
    let system_prompt = system_prompt_for_language(language);
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
        temperature: 0.25,
        max_tokens,
    };
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(HTTP_TIMEOUT_SECS))
        .build()
        .map_err(|err| format!("LLM client: {err}"))?;

    let endpoint = format!(
        "{}/chat/completions",
        settings.llm_base_url.trim_end_matches('/')
    );

    let response = {
        let mut last_err = String::new();
        let mut resolved = None;
        for attempt in 0..=MAX_RETRIES {
            if attempt > 0 {
                tokio::time::sleep(std::time::Duration::from_millis(
                    RETRY_BASE_MS * 2u64.pow(attempt - 1),
                ))
                .await;
            }
            let mut req = client.post(&endpoint).json(&request);
            if let Some(token) = api_key.filter(|value| !value.trim().is_empty()) {
                req = req.bearer_auth(token);
            }
            match req.send().await {
                Ok(resp) if resp.status().is_server_error() && attempt < MAX_RETRIES => {
                    last_err = format!("LLM_HTTP_5XX: LLM server error {}", resp.status());
                    continue;
                }
                Ok(resp) => {
                    resolved = Some(resp);
                    break;
                }
                Err(err) if (err.is_timeout() || err.is_connect()) && attempt < MAX_RETRIES => {
                    last_err = format!("LLM_RETRYABLE: LLM request failed: {err}");
                    continue;
                }
                Err(err) => return Err(format!("LLM_REQUEST_FAILED: LLM request failed: {err}")),
            }
        }
        resolved.ok_or(last_err)?
    };

    if !response.status().is_success() {
        let status = response.status();
        let _ = response.text().await;
        return Err(format!("LLM_HTTP_ERROR: LLM error {status}"));
    }

    let payload: ChatResponse = response
        .json()
        .await
        .map_err(|err| format!("LLM_PARSE_FAILED: LLM response parse failed: {err}"))?;
    let content = payload
        .choices
        .first()
        .ok_or_else(|| "LLM_EMPTY: LLM returned no choices.".to_string())?
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

    Ok((raw_text, "LLM returned invalid JSON: ".to_string()))
}

fn build_user_prompt(
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

pub fn chars_band(transcript: &str) -> &'static str {
    card_v3::chars_band(transcript)
}
