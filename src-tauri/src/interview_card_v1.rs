#![allow(dead_code)]

use serde::{Deserialize, Serialize};

use crate::privacy;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(deny_unknown_fields)]
pub struct InterviewCardDto {
    pub mode: InterviewMode,
    pub question: InterviewQuestion,
    pub answer: InterviewAnswer,
    pub signals: InterviewSignals,
    pub risks: InterviewRisks,
    pub follow_ups: Vec<InterviewFollowUp>,
    #[serde(default)]
    pub clarifier: InterviewClarifier,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum InterviewMode {
    Interview,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(deny_unknown_fields)]
pub struct InterviewQuestion {
    pub raw_transcript: String,
    pub clean_question: String,
    pub question_type: InterviewQuestionType,
    pub interviewer_intent: String,
    pub confidence: InterviewConfidence,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InterviewQuestionType {
    Behavioral,
    Technical,
    Product,
    SystemDesign,
    Management,
    Hr,
    Salary,
    CultureFit,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum InterviewConfidence {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(deny_unknown_fields)]
pub struct InterviewAnswer {
    pub main: String,
    pub short: String,
    pub strong: String,
    pub structure: InterviewAnswerStructure,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InterviewAnswerStructure {
    Star,
    Case,
    Direct,
    Clarify,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
#[serde(deny_unknown_fields)]
pub struct InterviewSignals {
    #[serde(default)]
    pub must_mention: Vec<String>,
    #[serde(default)]
    pub keywords: Vec<String>,
    #[serde(default)]
    pub metrics: Vec<String>,
    #[serde(default)]
    pub resume_anchors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
#[serde(deny_unknown_fields)]
pub struct InterviewRisks {
    #[serde(default)]
    pub weak_points: Vec<String>,
    #[serde(default)]
    pub avoid: Vec<String>,
    pub safe_reframe: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(deny_unknown_fields)]
pub struct InterviewFollowUp {
    pub question: String,
    pub bridge_answer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
#[serde(deny_unknown_fields)]
pub struct InterviewClarifier {
    #[serde(default)]
    pub needed: bool,
    #[serde(default)]
    pub text: Option<String>,
}

#[derive(Debug, Clone, Copy)]
pub struct InterviewWordLimits {
    pub main_min: usize,
    pub main_max: usize,
    pub short_max: usize,
    pub strong_min: usize,
    pub strong_max: usize,
}

impl Default for InterviewWordLimits {
    fn default() -> Self {
        Self {
            main_min: 90,
            main_max: 170,
            short_max: 55,
            strong_min: 140,
            strong_max: 190,
        }
    }
}

pub fn parse_and_normalize_interview_card(
    raw_text: &str,
    input_context: &str,
) -> Result<InterviewCardDto, String> {
    let parsed = parse_interview_card_json(raw_text)?;
    normalize_and_validate(parsed, input_context, InterviewWordLimits::default())
}

pub fn parse_interview_card_json(raw_text: &str) -> Result<InterviewCardDto, String> {
    let trimmed = raw_text.trim();
    if let Ok(card) = serde_json::from_str::<InterviewCardDto>(trimmed) {
        return Ok(card);
    }

    if let Some(candidate) = extract_json_object(trimmed) {
        if let Ok(card) = serde_json::from_str::<InterviewCardDto>(&candidate) {
            return Ok(card);
        }
    }

    Err(format!(
        "Interview card parse failed: invalid JSON payload [{}]",
        privacy::safe_preview(trimmed, 120)
    ))
}

pub fn normalize_and_validate(
    mut card: InterviewCardDto,
    input_context: &str,
    limits: InterviewWordLimits,
) -> Result<InterviewCardDto, String> {
    normalize_whitespace_card(&mut card);
    ensure_non_empty(&card)?;
    ensure_word_limits(&card.answer, limits)?;
    ensure_no_generic_filler(&card.answer)?;
    ensure_no_fabricated_metrics(&card, input_context)?;
    ensure_no_fabricated_resume_anchors(&card, input_context)?;
    normalize_clarifier(&mut card)?;

    Ok(card)
}

pub fn build_interview_system_prompt(language: &str) -> &'static str {
    if language == "en" {
        "You generate InterviewCardSchemaV1 JSON only. No markdown. Keep facts anchored to transcript/context and never fabricate metrics or resume facts."
    } else {
        "Сгенерируй только JSON InterviewCardSchemaV1 без markdown. Факты опирай на transcript/context, не выдумывай метрики и резюме-факты."
    }
}

pub fn build_interview_user_prompt(transcript: &str, context: &str, language: &str) -> String {
    if language == "en" {
        format!(
            "Context:\n{}\n\nInterview transcript:\n{}\n\nReturn InterviewCardSchemaV1 JSON.",
            if context.trim().is_empty() {
                "(empty)"
            } else {
                context
            },
            transcript
        )
    } else {
        format!(
            "Контекст:\n{}\n\nТранскрипт интервью:\n{}\n\nВерни JSON InterviewCardSchemaV1.",
            if context.trim().is_empty() {
                "(пусто)"
            } else {
                context
            },
            transcript
        )
    }
}

fn extract_json_object(input: &str) -> Option<String> {
    let start = input.find('{')?;
    let bytes = input.as_bytes();
    let mut depth = 0usize;
    let mut in_string = false;
    let mut escaped = false;

    for (idx, b) in bytes.iter().enumerate().skip(start) {
        if in_string {
            if escaped {
                escaped = false;
                continue;
            }
            if *b == b'\\' {
                escaped = true;
            } else if *b == b'"' {
                in_string = false;
            }
            continue;
        }

        match *b {
            b'"' => in_string = true,
            b'{' => depth += 1,
            b'}' => {
                if depth == 0 {
                    return None;
                }
                depth -= 1;
                if depth == 0 {
                    return Some(input[start..=idx].to_string());
                }
            }
            _ => {}
        }
    }

    None
}

fn normalize_whitespace_card(card: &mut InterviewCardDto) {
    card.question.raw_transcript = normalize_whitespace(&card.question.raw_transcript);
    card.question.clean_question = normalize_whitespace(&card.question.clean_question);
    card.question.interviewer_intent = normalize_whitespace(&card.question.interviewer_intent);
    card.answer.main = normalize_whitespace(&card.answer.main);
    card.answer.short = normalize_whitespace(&card.answer.short);
    card.answer.strong = normalize_whitespace(&card.answer.strong);
    card.signals.must_mention = normalize_vec(&card.signals.must_mention);
    card.signals.keywords = normalize_vec(&card.signals.keywords);
    card.signals.metrics = normalize_vec(&card.signals.metrics);
    card.signals.resume_anchors = normalize_vec(&card.signals.resume_anchors);
    card.risks.weak_points = normalize_vec(&card.risks.weak_points);
    card.risks.avoid = normalize_vec(&card.risks.avoid);
    card.risks.safe_reframe = normalize_whitespace(&card.risks.safe_reframe);
    for item in &mut card.follow_ups {
        item.question = normalize_whitespace(&item.question);
        item.bridge_answer = normalize_whitespace(&item.bridge_answer);
    }
    card.clarifier.text = card
        .clarifier
        .text
        .as_ref()
        .map(|v| normalize_whitespace(v))
        .filter(|v| !v.is_empty());
}

fn normalize_vec(values: &[String]) -> Vec<String> {
    values
        .iter()
        .map(|v| normalize_whitespace(v))
        .filter(|v| !v.is_empty())
        .collect()
}

fn normalize_whitespace(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn ensure_non_empty(card: &InterviewCardDto) -> Result<(), String> {
    if card.mode != InterviewMode::Interview {
        return Err("Interview card validation failed: mode must be interview".to_string());
    }

    if card.question.raw_transcript.is_empty()
        || card.question.clean_question.is_empty()
        || card.question.interviewer_intent.is_empty()
        || card.answer.main.is_empty()
        || card.answer.short.is_empty()
        || card.answer.strong.is_empty()
        || card.risks.safe_reframe.is_empty()
    {
        return Err("Interview card validation failed: required fields are empty".to_string());
    }

    Ok(())
}

fn ensure_word_limits(answer: &InterviewAnswer, limits: InterviewWordLimits) -> Result<(), String> {
    let main_words = word_count(&answer.main);
    if main_words < limits.main_min || main_words > limits.main_max {
        return Err(format!(
            "Interview card validation failed: answer.main word count {main_words} out of range {}-{}",
            limits.main_min, limits.main_max
        ));
    }

    let short_words = word_count(&answer.short);
    if short_words > limits.short_max {
        return Err(format!(
            "Interview card validation failed: answer.short word count {short_words} exceeds {}",
            limits.short_max
        ));
    }

    let strong_words = word_count(&answer.strong);
    if strong_words < limits.strong_min || strong_words > limits.strong_max {
        return Err(format!(
            "Interview card validation failed: answer.strong word count {strong_words} out of range {}-{}",
            limits.strong_min, limits.strong_max
        ));
    }

    Ok(())
}

fn ensure_no_generic_filler(answer: &InterviewAnswer) -> Result<(), String> {
    const FORBIDDEN: &[&str] = &[
        "it depends",
        "as needed",
        "somehow",
        "in general",
        "как-нибудь",
        "посмотрим",
        "в целом",
        "наверное",
        "может быть",
    ];

    let combined = format!("{} {} {}", answer.main, answer.short, answer.strong).to_lowercase();
    if FORBIDDEN.iter().any(|token| combined.contains(token)) {
        return Err("Interview card validation failed: generic filler detected".to_string());
    }

    Ok(())
}

fn ensure_no_fabricated_metrics(
    card: &InterviewCardDto,
    input_context: &str,
) -> Result<(), String> {
    let source = input_context.to_lowercase();
    for metric in &card.signals.metrics {
        let normalized = metric.to_lowercase();
        if normalized.is_empty() {
            continue;
        }
        if !source.contains(&normalized) {
            return Err(format!(
                "Interview card validation failed: metric '{}' is not grounded in input/context",
                privacy::safe_preview(metric, 60)
            ));
        }
    }

    Ok(())
}

fn ensure_no_fabricated_resume_anchors(
    card: &InterviewCardDto,
    input_context: &str,
) -> Result<(), String> {
    let source = input_context.to_lowercase();
    for anchor in &card.signals.resume_anchors {
        let normalized = anchor.to_lowercase();
        if normalized.is_empty() {
            continue;
        }
        if !source.contains(&normalized) {
            return Err(format!(
                "Interview card validation failed: resume anchor '{}' is not grounded in input/context",
                privacy::safe_preview(anchor, 60)
            ));
        }
    }

    Ok(())
}

fn normalize_clarifier(card: &mut InterviewCardDto) -> Result<(), String> {
    if !card.clarifier.needed {
        card.clarifier.text = None;
        return Ok(());
    }

    let Some(text) = card.clarifier.text.as_ref() else {
        return Err(
            "Interview card validation failed: clarifier.needed=true requires clarifier.text"
                .to_string(),
        );
    };
    if text.is_empty() {
        return Err(
            "Interview card validation failed: clarifier.text must be non-empty".to_string(),
        );
    }

    Ok(())
}

fn word_count(value: &str) -> usize {
    value.split_whitespace().count()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn words(prefix: &str, count: usize) -> String {
        (0..count)
            .map(|idx| format!("{prefix}{idx}"))
            .collect::<Vec<_>>()
            .join(" ")
    }

    fn base_json(
        question_type: &str,
        clarifier: &str,
        metrics: &str,
        resume_anchors: &str,
    ) -> String {
        format!(
            r#"{{
  "mode":"interview",
  "question":{{
    "rawTranscript":"Can you walk me through this?",
    "cleanQuestion":"Walk me through your approach",
    "questionType":"{question_type}",
    "interviewerIntent":"Assess execution and communication",
    "confidence":"high"
  }},
  "answer":{{
    "main":"{main}",
    "short":"{short}",
    "strong":"{strong}",
    "structure":"STAR"
  }},
  "signals":{{
    "mustMention":["ownership","deadline"],
    "keywords":["tradeoff","scope"],
    "metrics":{metrics},
    "resumeAnchors":{resume_anchors}
  }},
  "risks":{{
    "weakPoints":["rambling"],
    "avoid":["blaming peers"],
    "safeReframe":"I focus on facts, decision criteria, and next actions."
  }},
  "followUps":[{{"question":"What was the result?","bridgeAnswer":"Result was measurable and tied to timeline."}}],
  "clarifier":{clarifier}
}}"#,
            main = words("main", 100),
            short = words("short", 30),
            strong = words("strong", 150),
        )
    }

    #[test]
    fn behavioral_deadline_question_passes() {
        let raw = base_json(
            "behavioral",
            r#"{"needed":false,"text":null}"#,
            "[\"reduced backlog by 20%\"]",
            "[\"migration project\"]",
        );
        let source = "deadline migration project reduced backlog by 20%";
        let card = parse_and_normalize_interview_card(&raw, source).expect("must pass");
        assert_eq!(
            card.question.question_type,
            InterviewQuestionType::Behavioral
        );
        assert!(!card.clarifier.needed);
        assert!(card.clarifier.text.is_none());
    }

    #[test]
    fn conflict_with_colleague_passes() {
        let raw = base_json(
            "behavioral",
            r#"{"needed":false,"text":"please clarify"}"#,
            "[]",
            "[]",
        );
        let card =
            parse_and_normalize_interview_card(&raw, "conflict with colleague").expect("must pass");
        assert!(card.clarifier.text.is_none());
    }

    #[test]
    fn technical_unknown_passes() {
        let raw = base_json("unknown", r#"{"needed":false,"text":null}"#, "[]", "[]");
        let card =
            parse_and_normalize_interview_card(&raw, "unknown technical area").expect("must pass");
        assert_eq!(card.question.question_type, InterviewQuestionType::Unknown);
    }

    #[test]
    fn salary_expectation_passes() {
        let raw = base_json("salary", r#"{"needed":false,"text":null}"#, "[]", "[]");
        let card = parse_and_normalize_interview_card(&raw, "salary expectation context")
            .expect("must pass");
        assert_eq!(card.question.question_type, InterviewQuestionType::Salary);
    }

    #[test]
    fn culture_fit_passes() {
        let raw = base_json("culture_fit", r#"{"needed":false,"text":null}"#, "[]", "[]");
        let card =
            parse_and_normalize_interview_card(&raw, "culture fit context").expect("must pass");
        assert_eq!(
            card.question.question_type,
            InterviewQuestionType::CultureFit
        );
    }

    #[test]
    fn ambiguous_question_with_clarifier_passes() {
        let raw = base_json(
            "behavioral",
            r#"{"needed":true,"text":"Do you mean timeline risk or role ownership?"}"#,
            "[]",
            "[]",
        );
        let card = parse_and_normalize_interview_card(&raw, "ambiguous interview question")
            .expect("must pass");
        assert!(card.clarifier.needed);
        assert!(card.clarifier.text.is_some());
    }

    #[test]
    fn noisy_transcript_markdown_json_extracts() {
        let raw = format!(
            "LLM answer:\n```json\n{}\n```",
            base_json("technical", r#"{"needed":false,"text":null}"#, "[]", "[]")
        );
        let card =
            parse_and_normalize_interview_card(&raw, "technical context").expect("must parse");
        assert_eq!(
            card.question.question_type,
            InterviewQuestionType::Technical
        );
    }

    #[test]
    fn hallucinated_metric_rejected() {
        let raw = base_json(
            "behavioral",
            r#"{"needed":false,"text":null}"#,
            "[\"improved conversion by 73%\"]",
            "[]",
        );
        let err = parse_and_normalize_interview_card(&raw, "no numbers in transcript")
            .expect_err("must reject");
        assert!(err.contains("metric"));
    }

    #[test]
    fn malformed_json_extraction_fails() {
        let raw = "```json\n{\"mode\":\"interview\"\n```";
        let err = parse_interview_card_json(raw).expect_err("must fail");
        assert!(err.contains("invalid JSON payload"));
    }
}
