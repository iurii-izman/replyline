use std::fs;
use std::path::PathBuf;

use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::candidate_pack;
use crate::fs_atomic;
use crate::interview_card_v1::InterviewCardDto;
use crate::types::{
    InterviewQuestionReportDto, InterviewReportDto, InterviewReportFeedbackDto,
    InterviewReportScoresDto,
};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct InterviewSessionState {
    pub active: bool,
    pub session_id: String,
    pub started_at: String,
    pub language: String,
    pub questions: Vec<InterviewQuestionReportDto>,
}

pub fn start_session(state: &mut InterviewSessionState, language: &str) -> InterviewSessionState {
    state.active = true;
    state.session_id = format!("is-{}", Utc::now().timestamp_millis());
    state.started_at = Utc::now().to_rfc3339();
    state.language = language.to_string();
    state.questions.clear();
    state.clone()
}

pub fn append_question(
    state: &mut InterviewSessionState,
    transcript: &str,
    interview: &InterviewCardDto,
) {
    if !state.active {
        return;
    }
    state.questions.push(InterviewQuestionReportDto {
        timestamp: Utc::now().to_rfc3339(),
        raw_transcript: transcript.to_string(),
        clean_question: interview.question.clean_question.clone(),
        question_type: format!("{:?}", interview.question.question_type),
        answer_main: interview.answer.main.clone(),
        hints: vec![interview.risks.safe_reframe.clone()],
        signals: interview.signals.must_mention.clone(),
    });
}

pub fn end_session(
    state: &mut InterviewSessionState,
) -> Result<Option<InterviewReportDto>, String> {
    if !state.active {
        return Ok(None);
    }
    let ended_at = Utc::now().to_rfc3339();
    let report = build_report(state, &ended_at)?;
    save_report(&report)?;
    state.active = false;
    state.session_id.clear();
    state.started_at.clear();
    state.language.clear();
    state.questions.clear();
    Ok(Some(report))
}

fn build_report(
    state: &InterviewSessionState,
    ended_at: &str,
) -> Result<InterviewReportDto, String> {
    let full_transcript = state
        .questions
        .iter()
        .map(|q| format!("[{}] {}", q.timestamp, q.raw_transcript))
        .collect::<Vec<_>>()
        .join("\n");
    let has_pack = candidate_pack::load().ok().flatten().is_some();
    let scores = score(&state.questions, has_pack);
    let feedback = feedback(&state.questions, &scores);
    Ok(InterviewReportDto {
        session_id: state.session_id.clone(),
        started_at: state.started_at.clone(),
        ended_at: ended_at.to_string(),
        language: state.language.clone(),
        questions: state.questions.clone(),
        full_transcript,
        scores,
        feedback,
    })
}

fn score(questions: &[InterviewQuestionReportDto], has_pack: bool) -> InterviewReportScoresDto {
    if questions.is_empty() {
        return InterviewReportScoresDto {
            clarity: 0,
            relevance: 0,
            accuracy: if has_pack { 20 } else { 10 },
        };
    }
    let mut clarity_sum = 0u32;
    let mut relevance_sum = 0u32;
    let mut accuracy_sum = 0u32;
    for q in questions {
        let words = q.answer_main.split_whitespace().count();
        let sentence_bonus = if q.answer_main.contains('.') { 15 } else { 0 };
        let clarity = (40 + (words.min(45) as u32) + sentence_bonus).min(100);
        let q_tokens = token_set(&q.clean_question);
        let a_tokens = token_set(&q.answer_main);
        let overlap = q_tokens.iter().filter(|t| a_tokens.contains(*t)).count() as u32;
        let relevance = (35 + overlap * 10).min(100);
        let mut accuracy: u32 = if has_pack { 75 } else { 60 };
        if q.answer_main.chars().any(|c| c.is_ascii_digit())
            && !q.raw_transcript.chars().any(|c| c.is_ascii_digit())
        {
            accuracy = accuracy.saturating_sub(15);
        }
        clarity_sum += clarity;
        relevance_sum += relevance;
        accuracy_sum += accuracy;
    }
    let len = questions.len() as u32;
    InterviewReportScoresDto {
        clarity: ((clarity_sum / len).min(100)) as u8,
        relevance: ((relevance_sum / len).min(100)) as u8,
        accuracy: ((accuracy_sum / len).min(100)) as u8,
    }
}

fn feedback(
    questions: &[InterviewQuestionReportDto],
    scores: &InterviewReportScoresDto,
) -> InterviewReportFeedbackDto {
    let mut strengths = vec![];
    let mut improvements = vec![];
    let mut missing_examples = vec![];
    if scores.clarity >= 70 {
        strengths.push("Answers are structured and speakable.".to_string());
    } else {
        improvements.push("Use 2-4 sentence answers with explicit action and outcome.".to_string());
    }
    if scores.relevance >= 70 {
        strengths.push("Answers stay close to interviewer intent.".to_string());
    } else {
        improvements
            .push("Mirror key words from the question before giving the answer.".to_string());
    }
    if scores.accuracy < 70 {
        improvements.push("Avoid unsupported claims and add evidence anchors.".to_string());
    }
    for q in questions {
        if q.signals.is_empty() && q.hints.is_empty() {
            missing_examples.push(format!(
                "Question at {} lacks explicit signal anchors.",
                q.timestamp
            ));
        }
    }
    InterviewReportFeedbackDto {
        strengths,
        improvements,
        missing_examples,
    }
}

fn token_set(value: &str) -> std::collections::HashSet<String> {
    value
        .to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|v| v.len() >= 4)
        .map(|v| v.to_string())
        .collect()
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
struct ReportsStore {
    reports: Vec<InterviewReportDto>,
}

pub fn get_latest_report() -> Result<Option<InterviewReportDto>, String> {
    Ok(load_store()?.reports.into_iter().last())
}

pub fn clear_reports() -> Result<(), String> {
    let path = reports_path()?;
    if path.is_file() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn export_latest_report_markdown() -> Result<Option<String>, String> {
    let report = match get_latest_report()? {
        Some(value) => value,
        None => return Ok(None),
    };
    let path = reports_dir()?.join(format!("interview-report-{}.md", report.session_id));
    let markdown = to_markdown(&report);
    fs_atomic::write_bytes_atomically(&path, markdown.as_bytes()).map_err(|e| e.to_string())?;
    Ok(Some(path.display().to_string()))
}

fn to_markdown(report: &InterviewReportDto) -> String {
    let mut out = vec![
        format!("# Post-Interview Report {}", report.session_id),
        format!("Started: {}", report.started_at),
        format!("Ended: {}", report.ended_at),
        format!("Language: {}", report.language),
        String::new(),
        "## Scores".to_string(),
        format!("- Clarity: {}", report.scores.clarity),
        format!("- Relevance: {}", report.scores.relevance),
        format!("- Accuracy: {}", report.scores.accuracy),
        String::new(),
        "## Questions".to_string(),
    ];
    for (idx, q) in report.questions.iter().enumerate() {
        out.push(format!("### {}. {}", idx + 1, q.clean_question));
        out.push(format!("- Timestamp: {}", q.timestamp));
        out.push(format!("- Raw transcript: {}", q.raw_transcript));
        out.push(format!("- Question type: {}", q.question_type));
        out.push(format!("- Answer: {}", q.answer_main));
    }
    out.join("\n")
}

fn save_report(report: &InterviewReportDto) -> Result<(), String> {
    let mut store = load_store()?;
    store.reports.push(report.clone());
    let path = reports_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs_atomic::write_json_atomically(&path, &store).map_err(|e| e.to_string())
}

fn load_store() -> Result<ReportsStore, String> {
    let path = reports_path()?;
    if !path.is_file() {
        return Ok(ReportsStore::default());
    }
    let raw = fs::read(path).map_err(|e| e.to_string())?;
    serde_json::from_slice(&raw).map_err(|e| e.to_string())
}

fn reports_dir() -> Result<PathBuf, String> {
    let base = if let Ok(value) = std::env::var("REPLYLINE_TEST_DATA_DIR") {
        PathBuf::from(value)
    } else {
        dirs::data_local_dir().ok_or_else(|| "local_data_dir_unavailable".to_string())?
    };
    Ok(base.join("com.replyline.app").join("reports"))
}

fn reports_path() -> Result<PathBuf, String> {
    Ok(reports_dir()?.join("interview-reports.json"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::interview_card_v1::{
        InterviewAnswer, InterviewAnswerStructure, InterviewClarifier, InterviewConfidence,
        InterviewMode, InterviewQuestion, InterviewQuestionType, InterviewRisks, InterviewSignals,
    };

    #[test]
    fn score_is_bounded() {
        let scores = score(
            &[InterviewQuestionReportDto {
                timestamp: "2026-05-18T12:00:00Z".to_string(),
                raw_transcript: "Tell me about ownership".to_string(),
                clean_question: "Tell me about ownership".to_string(),
                question_type: "behavioral".to_string(),
                answer_main: "I owned this work and delivered outcome.".to_string(),
                hints: vec![],
                signals: vec![],
            }],
            false,
        );
        assert!(scores.clarity <= 100);
        assert!(scores.relevance <= 100);
        assert!(scores.accuracy <= 100);
    }

    #[test]
    fn report_flow_generates_markdown_and_clears() {
        let temp = std::env::temp_dir().join(format!(
            "replyline-report-test-{}",
            Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ));
        fs::create_dir_all(&temp).expect("create temp");
        std::env::set_var("REPLYLINE_TEST_DATA_DIR", temp.display().to_string());
        let mut session = InterviewSessionState::default();
        let started = start_session(&mut session, "en");
        assert!(started.active);
        append_question(
            &mut session,
            "Tell me about ownership and deadline",
            &InterviewCardDto {
                mode: InterviewMode::Interview,
                answer: InterviewAnswer {
                    main: "I owned the delivery and sent status today.".to_string(),
                    short: "owned delivery".to_string(),
                    strong: "Situation task action result with owner and deadline.".to_string(),
                    structure: InterviewAnswerStructure::Star,
                },
                question: InterviewQuestion {
                    raw_transcript: "Tell me about ownership and deadline".to_string(),
                    clean_question: "Tell me about ownership and deadline".to_string(),
                    interviewer_intent: "Ownership".to_string(),
                    question_type: InterviewQuestionType::Behavioral,
                    confidence: InterviewConfidence::High,
                },
                signals: InterviewSignals {
                    must_mention: vec!["ownership".to_string()],
                    keywords: vec!["deadline".to_string()],
                    metrics: vec![],
                    resume_anchors: vec![],
                },
                risks: InterviewRisks {
                    weak_points: vec![],
                    avoid: vec![],
                    safe_reframe: "confirm scope".to_string(),
                },
                follow_ups: vec![],
                clarifier: InterviewClarifier::default(),
            },
        );
        let report = end_session(&mut session).expect("end").expect("has report");
        assert_eq!(report.questions.len(), 1);
        let markdown_path = export_latest_report_markdown()
            .expect("export")
            .expect("path");
        let raw = fs::read_to_string(markdown_path).expect("read md");
        assert!(raw.contains("Tell me about ownership"));
        assert!(raw.contains("I owned the delivery"));
        clear_reports().expect("clear");
        assert!(get_latest_report().expect("get").is_none());
        let _ = fs::remove_dir_all(temp);
        std::env::remove_var("REPLYLINE_TEST_DATA_DIR");
    }

    fn sample_interview_card() -> InterviewCardDto {
        InterviewCardDto {
            mode: InterviewMode::Interview,
            answer: InterviewAnswer {
                main: "I owned the delivery and sent status today.".to_string(),
                short: "owned delivery".to_string(),
                strong: "Situation task action result with owner and deadline.".to_string(),
                structure: InterviewAnswerStructure::Star,
            },
            question: InterviewQuestion {
                raw_transcript: "Tell me about ownership and deadline".to_string(),
                clean_question: "Tell me about ownership and deadline".to_string(),
                interviewer_intent: "Ownership".to_string(),
                question_type: InterviewQuestionType::Behavioral,
                confidence: InterviewConfidence::High,
            },
            signals: InterviewSignals {
                must_mention: vec!["ownership".to_string()],
                keywords: vec!["deadline".to_string()],
                metrics: vec![],
                resume_anchors: vec![],
            },
            risks: InterviewRisks {
                weak_points: vec![],
                avoid: vec![],
                safe_reframe: "confirm scope".to_string(),
            },
            follow_ups: vec![],
            clarifier: InterviewClarifier::default(),
        }
    }

    #[test]
    fn append_question_ignores_inactive_session() {
        let mut session = InterviewSessionState::default();
        append_question(&mut session, "question", &sample_interview_card());
        assert!(session.questions.is_empty());
    }

    #[test]
    fn append_question_adds_entry_for_active_session() {
        let mut session = InterviewSessionState::default();
        start_session(&mut session, "en");
        append_question(&mut session, "question", &sample_interview_card());
        assert_eq!(session.questions.len(), 1);
        assert_eq!(
            session.questions[0].clean_question,
            "Tell me about ownership and deadline"
        );
    }
}
