use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::bilingual::session::{BilingualAnswerRecord, BilingualSessionExportSnapshot};
use crate::fs_atomic;
use crate::trace_manifest::sha256_hex;
use crate::types::{ExportSummary, ExportType};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FullExportSegment<'a> {
    segment_id: &'a str,
    timestamp: &'a str,
    text: &'a str,
    finalized: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FullExportTranslation<'a> {
    segment_id: &'a str,
    source_segment_ids: &'a [String],
    timestamp: &'a str,
    translated_text: &'a str,
    latency_ms: u64,
    status: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FullExportAnswer<'a> {
    timestamp: &'a str,
    latency_ms: u64,
    source_segment_ids: &'a [String],
    answer_main: &'a str,
    answer_short: &'a str,
    answer_strong: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RedactedExportSegment<'a> {
    segment_id: &'a str,
    timestamp: &'a str,
    word_count: usize,
    text_hash: String,
    status: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RedactedExportTranslation<'a> {
    segment_id: &'a str,
    source_segment_ids: &'a [String],
    timestamp: &'a str,
    word_count: usize,
    translated_text_hash: String,
    latency_ms: u64,
    status: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RedactedExportAnswer<'a> {
    timestamp: &'a str,
    source_segment_ids: &'a [String],
    answer_hash: String,
    answer_word_count: usize,
    latency_ms: u64,
    status: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RedactedExportPayload<'a> {
    schema_version: u8,
    export_type: &'a str,
    session_id: &'a str,
    started_at: &'a str,
    ended_at: &'a str,
    duration_ms: u64,
    transcript_segments: Vec<RedactedExportSegment<'a>>,
    translations: Vec<RedactedExportTranslation<'a>>,
    generated_answers: Vec<RedactedExportAnswer<'a>>,
    latency_samples_ms: &'a [u64],
}

pub fn export_session_report(
    snapshot: &BilingualSessionExportSnapshot,
    export_type: ExportType,
    output_path: Option<String>,
) -> Result<ExportSummary, String> {
    let path = resolve_output_path(snapshot, &export_type, output_path)?;
    let payload = match export_type {
        ExportType::Full => serde_json::to_vec_pretty(&build_full_payload(snapshot))
            .map_err(|err| err.to_string())?,
        ExportType::Redacted => serde_json::to_vec_pretty(&build_redacted_payload(snapshot))
            .map_err(|err| err.to_string())?,
    };
    fs_atomic::write_bytes_atomically(&path, &payload).map_err(|err| err.to_string())?;
    Ok(ExportSummary {
        export_type,
        session_id: snapshot.session_id.clone(),
        path: path.display().to_string(),
        questions_count: snapshot.generated_answers.len(),
        transcript_segments_count: snapshot.finalized_segments.len(),
    })
}

fn build_full_payload(snapshot: &BilingualSessionExportSnapshot) -> serde_json::Value {
    let transcript_segments = snapshot
        .finalized_segments
        .iter()
        .map(|segment| FullExportSegment {
            segment_id: &segment.segment_id,
            timestamp: &segment.timestamp,
            text: &segment.text,
            finalized: segment.finalized,
        })
        .collect::<Vec<_>>();
    let translations = snapshot
        .translation_segments
        .iter()
        .map(|segment| FullExportTranslation {
            segment_id: &segment.segment_id,
            source_segment_ids: &segment.source_segment_ids,
            timestamp: &segment.timestamp,
            translated_text: &segment.translated_text,
            latency_ms: segment.latency_ms,
            status: if segment.is_fallback {
                "fallback"
            } else {
                "translated"
            },
        })
        .collect::<Vec<_>>();
    let generated_answers = snapshot
        .generated_answers
        .iter()
        .map(|record| FullExportAnswer {
            timestamp: &record.timestamp,
            latency_ms: record.latency_ms,
            source_segment_ids: &record.source_segment_ids,
            answer_main: &record.answer_main,
            answer_short: &record.answer_short,
            answer_strong: &record.answer_strong,
        })
        .collect::<Vec<_>>();
    serde_json::json!({
        "schemaVersion": 1,
        "exportType": "full",
        "sessionId": snapshot.session_id,
        "startedAt": snapshot.started_at,
        "endedAt": snapshot.ended_at,
        "durationMs": snapshot.duration_ms(),
        "transcriptSegments": transcript_segments,
        "translations": translations,
        "generatedAnswers": generated_answers,
        "latencySamplesMs": snapshot.latency_samples_ms,
    })
}

fn build_redacted_payload(snapshot: &BilingualSessionExportSnapshot) -> RedactedExportPayload<'_> {
    let transcript_segments = snapshot
        .finalized_segments
        .iter()
        .map(|segment| RedactedExportSegment {
            segment_id: &segment.segment_id,
            timestamp: &segment.timestamp,
            word_count: word_count(&segment.text),
            text_hash: sha256_hex(&segment.text),
            status: if segment.finalized {
                "finalized"
            } else {
                "partial"
            },
        })
        .collect::<Vec<_>>();
    let translations = snapshot
        .translation_segments
        .iter()
        .map(|segment| RedactedExportTranslation {
            segment_id: &segment.segment_id,
            source_segment_ids: &segment.source_segment_ids,
            timestamp: &segment.timestamp,
            word_count: word_count(&segment.translated_text),
            translated_text_hash: sha256_hex(&segment.translated_text),
            latency_ms: segment.latency_ms,
            status: if segment.is_fallback {
                "fallback"
            } else {
                "translated"
            },
        })
        .collect::<Vec<_>>();
    let generated_answers = snapshot
        .generated_answers
        .iter()
        .map(|record| to_redacted_answer(record))
        .collect::<Vec<_>>();
    RedactedExportPayload {
        schema_version: 1,
        export_type: "redacted",
        session_id: &snapshot.session_id,
        started_at: &snapshot.started_at,
        ended_at: &snapshot.ended_at,
        duration_ms: snapshot.duration_ms(),
        transcript_segments,
        translations,
        generated_answers,
        latency_samples_ms: &snapshot.latency_samples_ms,
    }
}

fn to_redacted_answer(record: &BilingualAnswerRecord) -> RedactedExportAnswer<'_> {
    let combined = format!(
        "{}\n{}\n{}",
        record.answer_main, record.answer_short, record.answer_strong
    );
    RedactedExportAnswer {
        timestamp: &record.timestamp,
        source_segment_ids: &record.source_segment_ids,
        answer_hash: sha256_hex(&combined),
        answer_word_count: word_count(&combined),
        latency_ms: record.latency_ms,
        status: "generated",
    }
}

fn resolve_output_path(
    snapshot: &BilingualSessionExportSnapshot,
    export_type: &ExportType,
    output_path: Option<String>,
) -> Result<PathBuf, String> {
    let path = if let Some(output_path) = output_path {
        let trimmed = output_path.trim();
        if trimmed.is_empty() {
            return Err("export_output_path_empty".to_string());
        }
        PathBuf::from(trimmed)
    } else {
        let base =
            dirs::data_local_dir().ok_or_else(|| "local_data_dir_unavailable".to_string())?;
        let suffix = match export_type {
            ExportType::Full => "full",
            ExportType::Redacted => "redacted",
        };
        base.join("com.replyline.app").join("reports").join(format!(
            "bilingual-interview-report-{suffix}-{}.json",
            snapshot.session_id
        ))
    };
    ensure_parent_dir(&path)?;
    Ok(path)
}

fn ensure_parent_dir(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    Ok(())
}

fn word_count(value: &str) -> usize {
    value
        .split_whitespace()
        .filter(|token| !token.trim().is_empty())
        .count()
}

#[cfg(test)]
mod tests {
    use super::{build_redacted_payload, export_session_report};
    use crate::bilingual::session::{BilingualAnswerRecord, BilingualSessionExportSnapshot};
    use crate::types::{
        ExportType, LiveTranscriptSegmentDto, LiveTranslationSegmentDto, TranslationStrategy,
    };
    use std::fs;

    #[test]
    fn redacted_export_never_contains_raw_text_fields() {
        let snapshot = BilingualSessionExportSnapshot {
            session_id: "bs-1".to_string(),
            started_at: "2026-05-31T12:00:00Z".to_string(),
            ended_at: "2026-05-31T12:01:00Z".to_string(),
            finalized_segments: vec![LiveTranscriptSegmentDto {
                segment_id: "seg-1".to_string(),
                timestamp: "2026-05-31T12:00:10Z".to_string(),
                text: "RAW_EN_TRANSCRIPT".to_string(),
                finalized: true,
            }],
            translation_segments: vec![LiveTranslationSegmentDto {
                segment_id: "tr-1".to_string(),
                source_segment_ids: vec!["seg-1".to_string()],
                primary_source_segment_id: "seg-1".to_string(),
                timestamp: "2026-05-31T12:00:11Z".to_string(),
                source_text: "RAW_EN_TRANSCRIPT".to_string(),
                translated_text: "RAW_RU_TRANSLATION".to_string(),
                source_language: "en".to_string(),
                target_language: "ru".to_string(),
                is_final: true,
                latency_ms: 101,
                is_fallback: false,
                strategy: TranslationStrategy::LlmMicro,
                batch_size: 1,
            }],
            generated_answers: vec![BilingualAnswerRecord {
                timestamp: "2026-05-31T12:00:30Z".to_string(),
                latency_ms: 220,
                source_segment_ids: vec!["seg-1".to_string()],
                answer_main: "RAW_ANSWER_MAIN".to_string(),
                answer_short: "RAW_ANSWER_SHORT".to_string(),
                answer_strong: "RAW_ANSWER_STRONG".to_string(),
            }],
            latency_samples_ms: vec![33, 40],
        };
        let payload = build_redacted_payload(&snapshot);
        let raw = serde_json::to_string(&payload).expect("serialize");
        assert!(!raw.contains("RAW_EN_TRANSCRIPT"));
        assert!(!raw.contains("RAW_RU_TRANSLATION"));
        assert!(!raw.contains("RAW_ANSWER_MAIN"));
        assert!(!raw.contains("\"translatedText\":"));
        assert!(!raw.contains("\"sourceText\":"));
        assert!(!raw.contains("\"answerMain\":"));
    }

    #[test]
    fn full_export_happens_only_when_command_calls_export() {
        let temp = std::env::temp_dir().join(format!(
            "replyline-bilingual-export-{}",
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ));
        fs::create_dir_all(&temp).expect("create temp");
        let output = temp.join("full-export.json");
        assert!(!output.is_file(), "file must not exist before export call");

        let snapshot = BilingualSessionExportSnapshot {
            session_id: "bs-2".to_string(),
            started_at: "2026-05-31T12:00:00Z".to_string(),
            ended_at: "2026-05-31T12:01:00Z".to_string(),
            finalized_segments: vec![],
            translation_segments: vec![],
            generated_answers: vec![],
            latency_samples_ms: vec![],
        };
        let summary = export_session_report(
            &snapshot,
            ExportType::Full,
            Some(output.display().to_string()),
        )
        .expect("export");
        assert!(
            output.is_file(),
            "export file must be created by explicit call"
        );
        assert!(matches!(summary.export_type, ExportType::Full));
        assert_eq!(summary.session_id, "bs-2");
        assert_eq!(summary.path, output.display().to_string());

        let _ = fs::remove_dir_all(temp);
    }

    #[test]
    fn export_rejects_empty_output_path() {
        let snapshot = BilingualSessionExportSnapshot {
            session_id: "bs-3".to_string(),
            started_at: "2026-05-31T12:00:00Z".to_string(),
            ended_at: "2026-05-31T12:01:00Z".to_string(),
            finalized_segments: vec![],
            translation_segments: vec![],
            generated_answers: vec![],
            latency_samples_ms: vec![],
        };
        let err = export_session_report(&snapshot, ExportType::Redacted, Some("  ".to_string()))
            .expect_err("empty path must fail");
        assert!(err.contains("export_output_path_empty"));
    }
}
