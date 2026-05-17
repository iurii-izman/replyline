#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::future::Future;
use std::time::Instant;

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

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InterviewQualityFailureReason {
    InvalidJsonAfterRepair,
    AnswerMainTooShort,
    AnswerMainTooGeneric,
    MissingDirectAnswer,
    BehavioralMissingStar,
    HallucinatedMetricDetected,
    MandatoryClarifierNotNeeded,
    EmptySignals,
}

#[derive(Debug, Clone)]
pub struct InterviewQualityGate {
    pub passed: bool,
    pub score: u8,
    pub failed_reasons: Vec<InterviewQualityFailureReason>,
    pub repairable: bool,
}

#[derive(Debug, Clone, Default)]
pub struct InterviewGenerationTelemetry {
    pub interview_generation_attempts: u8,
    pub interview_repair_attempted: bool,
    pub interview_repair_success: bool,
    pub duration_ms_per_attempt: Vec<u128>,
}

#[derive(Debug, Clone)]
pub struct InterviewGenerationOutcome {
    pub card: InterviewCardDto,
    pub quality_gate: InterviewQualityGate,
    pub telemetry: InterviewGenerationTelemetry,
    pub risk_note: Option<String>,
}

const INTERVIEW_PRIMARY_MAX_TOKENS: u16 = 700;
const INTERVIEW_REPAIR_MAX_TOKENS: u16 = 700;
const INTERVIEW_REPAIR_MAX_ATTEMPTS: u8 = 1;

pub fn parse_and_normalize_interview_card(
    raw_text: &str,
    input_context: &str,
) -> Result<InterviewCardDto, String> {
    let parsed = parse_interview_card_json(raw_text)?;
    normalize_and_validate(parsed, input_context, InterviewWordLimits::default())
}

pub async fn generate_interview_card_with_conditional_repair<F, Fut>(
    transcript: &str,
    context: &str,
    language: &str,
    mut request_fn: F,
) -> Result<InterviewGenerationOutcome, String>
where
    F: FnMut(String, String, u16) -> Fut,
    Fut: Future<Output = Result<(String, String), String>>,
{
    let system_prompt = build_interview_system_prompt(language);
    let primary_prompt = build_interview_user_prompt(transcript, context, language);
    let mut telemetry = InterviewGenerationTelemetry::default();

    let start_first = Instant::now();
    let (first_raw, _first_parse_prefix) = request_fn(
        system_prompt.to_string(),
        primary_prompt.clone(),
        INTERVIEW_PRIMARY_MAX_TOKENS,
    )
    .await?;
    telemetry.interview_generation_attempts = 1;
    telemetry
        .duration_ms_per_attempt
        .push(start_first.elapsed().as_millis());

    let first_attempt = parse_and_normalize_interview_card(&first_raw, transcript);
    let first_gate = evaluate_quality_gate(first_attempt.as_ref(), transcript);
    if first_gate.passed {
        let card = first_attempt?;
        return Ok(InterviewGenerationOutcome {
            card,
            quality_gate: first_gate,
            telemetry,
            risk_note: None,
        });
    }

    if !first_gate.repairable || INTERVIEW_REPAIR_MAX_ATTEMPTS == 0 {
        let fallback = build_safe_fallback_card(transcript, first_gate.failed_reasons.as_slice());
        return Ok(InterviewGenerationOutcome {
            card: fallback,
            quality_gate: first_gate,
            telemetry,
            risk_note: Some(
                "Quality gate failed; returned safe fallback with low confidence".to_string(),
            ),
        });
    }

    telemetry.interview_repair_attempted = true;
    let repair_prompt = build_interview_repair_user_prompt(
        transcript,
        context,
        language,
        &first_gate,
        first_attempt.as_ref().ok(),
    );

    let start_second = Instant::now();
    let (second_raw, _second_parse_prefix) = request_fn(
        system_prompt.to_string(),
        repair_prompt,
        INTERVIEW_REPAIR_MAX_TOKENS,
    )
    .await?;
    telemetry.interview_generation_attempts = 2;
    telemetry
        .duration_ms_per_attempt
        .push(start_second.elapsed().as_millis());

    let second_attempt = parse_and_normalize_interview_card(&second_raw, transcript);
    let second_gate = evaluate_quality_gate(second_attempt.as_ref(), transcript);
    if second_gate.passed {
        telemetry.interview_repair_success = true;
        return Ok(InterviewGenerationOutcome {
            card: second_attempt?,
            quality_gate: second_gate,
            telemetry,
            risk_note: None,
        });
    }

    let fallback = build_safe_fallback_card(transcript, second_gate.failed_reasons.as_slice());
    Ok(InterviewGenerationOutcome {
        card: fallback,
        quality_gate: second_gate,
        telemetry,
        risk_note: Some(
            "Repair attempt failed; returned safe fallback with low confidence".to_string(),
        ),
    })
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

fn evaluate_quality_gate(
    normalized_attempt: Result<&InterviewCardDto, &String>,
    transcript: &str,
) -> InterviewQualityGate {
    let mut failed_reasons = Vec::new();
    match normalized_attempt {
        Ok(card) => {
            if word_count(&card.answer.main) < InterviewWordLimits::default().main_min {
                failed_reasons.push(InterviewQualityFailureReason::AnswerMainTooShort);
            }
            if ensure_no_generic_filler(&card.answer).is_err() {
                failed_reasons.push(InterviewQualityFailureReason::AnswerMainTooGeneric);
            }
            if !has_direct_answer(&card.answer.main) {
                failed_reasons.push(InterviewQualityFailureReason::MissingDirectAnswer);
            }
            if card.question.question_type == InterviewQuestionType::Behavioral
                && !has_star_structure(card)
            {
                failed_reasons.push(InterviewQualityFailureReason::BehavioralMissingStar);
            }
            if ensure_no_fabricated_metrics(card, transcript).is_err() {
                failed_reasons.push(InterviewQualityFailureReason::HallucinatedMetricDetected);
            }
            if card.clarifier.needed && !clarifier_is_needed(transcript) {
                failed_reasons.push(InterviewQualityFailureReason::MandatoryClarifierNotNeeded);
            }
            if card.signals.must_mention.is_empty()
                && card.signals.keywords.is_empty()
                && card.signals.metrics.is_empty()
                && card.signals.resume_anchors.is_empty()
            {
                failed_reasons.push(InterviewQualityFailureReason::EmptySignals);
            }
        }
        Err(err) => {
            let lower = err.to_lowercase();
            if lower.contains("answer.main word count") {
                failed_reasons.push(InterviewQualityFailureReason::AnswerMainTooShort);
            } else if lower.contains("generic filler") {
                failed_reasons.push(InterviewQualityFailureReason::AnswerMainTooGeneric);
            } else if lower.contains("metric") {
                failed_reasons.push(InterviewQualityFailureReason::HallucinatedMetricDetected);
            } else if lower.contains("clarifier") {
                failed_reasons.push(InterviewQualityFailureReason::MandatoryClarifierNotNeeded);
            } else if lower.contains("required fields are empty") {
                failed_reasons.push(InterviewQualityFailureReason::EmptySignals);
            } else {
                failed_reasons.push(InterviewQualityFailureReason::InvalidJsonAfterRepair);
            }
        }
    }
    let score = (100_i32 - (failed_reasons.len() as i32 * 15)).clamp(0, 100) as u8;
    InterviewQualityGate {
        passed: failed_reasons.is_empty(),
        score,
        failed_reasons,
        repairable: true,
    }
}

fn has_direct_answer(main: &str) -> bool {
    let lower = main.to_lowercase();
    lower.contains(" i ")
        || lower.starts_with("i ")
        || lower.contains(" my ")
        || lower.contains(" we ")
        || lower.contains(" would ")
        || lower.contains(" я ")
        || lower.starts_with("я ")
        || lower.contains(" мы ")
}

fn has_star_structure(card: &InterviewCardDto) -> bool {
    let combined = format!("{} {}", card.answer.main, card.answer.strong).to_lowercase();
    let en = ["situation", "task", "action", "result"];
    let ru = ["ситуац", "задач", "действ", "результ"];
    en.iter().all(|token| combined.contains(token))
        || ru.iter().all(|token| combined.contains(token))
}

fn clarifier_is_needed(transcript: &str) -> bool {
    let lower = transcript.to_lowercase();
    [
        "unclear",
        "ambiguous",
        "not sure",
        "уточни",
        "непонятно",
        "ambigu",
    ]
    .iter()
    .any(|token| lower.contains(token))
}

fn build_interview_repair_user_prompt(
    transcript: &str,
    context: &str,
    language: &str,
    gate: &InterviewQualityGate,
    first_card: Option<&InterviewCardDto>,
) -> String {
    let failed = gate
        .failed_reasons
        .iter()
        .map(|reason| format!("{reason:?}"))
        .collect::<Vec<_>>()
        .join(", ");
    let first_summary = first_card
        .map(|card| {
            format!(
                "question_type={:?}; confidence={:?}; main_words={}; clarifier_needed={}; metrics_count={}",
                card.question.question_type,
                card.question.confidence,
                word_count(&card.answer.main),
                card.clarifier.needed,
                card.signals.metrics.len()
            )
        })
        .unwrap_or_else(|| "first_output=unparseable".to_string());
    let base = build_interview_user_prompt(transcript, context, language);
    format!(
        "{base}\n\nREPAIR PASS (max 1): Fix only failed fields. Keep question classification stable unless clearly wrong.\nFailed checks: {failed}\nFirst output summary: {first_summary}\nDo not invent facts or metrics. Keep same transcript/context/candidate pack scope."
    )
}

fn build_safe_fallback_card(
    transcript: &str,
    failed_reasons: &[InterviewQualityFailureReason],
) -> InterviewCardDto {
    let risk_reason = if failed_reasons.is_empty() {
        "quality gate fallback"
    } else {
        "quality gate failed"
    };
    InterviewCardDto {
        mode: InterviewMode::Interview,
        question: InterviewQuestion {
            raw_transcript: normalize_whitespace(transcript),
            clean_question: "Please restate the question goal and constraints briefly.".to_string(),
            question_type: InterviewQuestionType::Unknown,
            interviewer_intent: "Clarify what the interviewer wants and answer directly without fabricated details."
                .to_string(),
            confidence: InterviewConfidence::Low,
        },
        answer: InterviewAnswer {
            main: "I want to answer this directly and stay factual. I would first confirm the exact scope, then give a concise response based only on what we know from the interview context. I would avoid inventing metrics and keep claims tied to concrete actions, ownership, and expected outcomes. If details are missing, I would state the uncertainty, propose a practical next step, and align on what evidence the interviewer wants.".to_string(),
            short: "I would answer directly, stay factual, avoid invented metrics, and confirm scope first.".to_string(),
            strong: "Situation: the question requires a precise and credible answer. Task: provide a direct response without inventing facts. Action: clarify scope, anchor claims to known context, state uncertainty where needed, and commit to a concrete next action with owner and timeline. Result: the answer remains consistent, safe, and useful while preserving trust and interview signal quality.".to_string(),
            structure: InterviewAnswerStructure::Direct,
        },
        signals: InterviewSignals {
            must_mention: vec!["scope".to_string(), "evidence".to_string()],
            keywords: vec!["ownership".to_string(), "timeline".to_string()],
            metrics: vec![],
            resume_anchors: vec![],
        },
        risks: InterviewRisks {
            weak_points: vec!["low confidence fallback".to_string()],
            avoid: vec!["inventing metrics".to_string(), "generic filler".to_string()],
            safe_reframe: format!("Low confidence: {risk_reason}. Keep response factual and constrained."),
        },
        follow_ups: vec![InterviewFollowUp {
            question: "What evidence would make this answer stronger?".to_string(),
            bridge_answer: "I can add concrete examples once we confirm the exact scope and available facts."
                .to_string(),
        }],
        clarifier: InterviewClarifier::default(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    };

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
            main = format!("I {}", words("main", 99)),
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

    #[tokio::test]
    async fn valid_card_does_not_trigger_second_pass() {
        let response = base_json("technical", r#"{"needed":false,"text":null}"#, "[]", "[]");
        let calls = Arc::new(AtomicUsize::new(0));
        let calls_ref = calls.clone();
        let outcome = generate_interview_card_with_conditional_repair(
            "conflict with colleague",
            "interview context",
            "en",
            move |_system, _user, _max_tokens| {
                let value = response.clone();
                let calls = calls_ref.clone();
                async move {
                    calls.fetch_add(1, Ordering::SeqCst);
                    Ok((value, String::new()))
                }
            },
        )
        .await
        .expect("must pass");
        assert!(outcome.quality_gate.passed);
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        assert!(!outcome.telemetry.interview_repair_attempted);
    }

    #[tokio::test]
    async fn too_short_answer_triggers_second_pass() {
        let mut short = base_json("technical", r#"{"needed":false,"text":null}"#, "[]", "[]");
        short = short.replace(
            &format!("I {}", words("main", 99)),
            "I would answer directly.",
        );
        let valid = base_json("technical", r#"{"needed":false,"text":null}"#, "[]", "[]");
        let calls = Arc::new(AtomicUsize::new(0));
        let calls_ref = calls.clone();
        let outcome = generate_interview_card_with_conditional_repair(
            "conflict with colleague",
            "interview context",
            "en",
            move |_system, _user, _max_tokens| {
                let first = short.clone();
                let second = valid.clone();
                let calls = calls_ref.clone();
                async move {
                    let idx = calls.fetch_add(1, Ordering::SeqCst);
                    Ok((if idx == 0 { first } else { second }, String::new()))
                }
            },
        )
        .await
        .expect("must pass");
        assert!(outcome.quality_gate.passed);
        assert!(outcome.telemetry.interview_repair_attempted);
        assert!(outcome.telemetry.interview_repair_success);
        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }

    #[tokio::test]
    async fn hallucinated_metric_triggers_repair_and_can_fallback() {
        let bad = base_json(
            "behavioral",
            r#"{"needed":false,"text":null}"#,
            "[\"improved conversion by 73%\"]",
            "[]",
        );
        let calls = Arc::new(AtomicUsize::new(0));
        let calls_ref = calls.clone();
        let outcome = generate_interview_card_with_conditional_repair(
            "no numbers in transcript",
            "interview context",
            "en",
            move |_system, _user, _max_tokens| {
                let value = bad.clone();
                let calls = calls_ref.clone();
                async move {
                    calls.fetch_add(1, Ordering::SeqCst);
                    Ok((value, String::new()))
                }
            },
        )
        .await
        .expect("fallback is returned");
        assert!(outcome.telemetry.interview_repair_attempted);
        assert!(!outcome.telemetry.interview_repair_success);
        assert_eq!(outcome.card.question.confidence, InterviewConfidence::Low);
        assert!(outcome.risk_note.is_some());
    }

    #[tokio::test]
    async fn second_pass_is_max_once() {
        let invalid = "not json".to_string();
        let calls = Arc::new(AtomicUsize::new(0));
        let calls_ref = calls.clone();
        let _ = generate_interview_card_with_conditional_repair(
            "ambiguous transcript",
            "context",
            "en",
            move |_system, _user, _max_tokens| {
                let value = invalid.clone();
                let calls = calls_ref.clone();
                async move {
                    calls.fetch_add(1, Ordering::SeqCst);
                    Ok((value, String::new()))
                }
            },
        )
        .await
        .expect("fallback");
        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }

    #[tokio::test]
    async fn fallback_card_generated_if_repair_fails() {
        let invalid = "```json\n{\"mode\":\"interview\"\n```".to_string();
        let outcome = generate_interview_card_with_conditional_repair(
            "ambiguous transcript",
            "context",
            "en",
            move |_system, _user, _max_tokens| {
                let value = invalid.clone();
                async move { Ok((value, String::new())) }
            },
        )
        .await
        .expect("fallback");
        assert_eq!(outcome.card.question.confidence, InterviewConfidence::Low);
        assert!(outcome.risk_note.unwrap_or_default().contains("fallback"));
    }
}
