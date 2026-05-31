use serde::{Deserialize, Serialize};

/// IPC-facing error envelope: serialized as `{"kind":"Pipeline","message":"..."}` for the webview.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", content = "message")]
pub enum CommandError {
    Settings(String),
    Credential(String),
    Capture(String),
    Pipeline(String),
    Internal(String),
}

impl std::fmt::Display for CommandError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Settings(m)
            | Self::Credential(m)
            | Self::Capture(m)
            | Self::Pipeline(m)
            | Self::Internal(m) => f.write_str(m),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum DebugTraceMode {
    Off,
    #[default]
    Redacted,
    FullLocal,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum SpeakerSource {
    #[default]
    SystemAudio,
    Microphone,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum TranslationStrategy {
    #[default]
    DebouncedBatch,
    LlmMicro,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum ExportType {
    #[default]
    Full,
    Redacted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub schema_version: u32,
    pub hotkey: String,
    pub llm_base_url: String,
    pub llm_model: String,
    pub selected_model_preset: String,
    pub capture_max_seconds: u16,
    pub active_answer_profile: String,
    pub window_opacity: u8,
    pub hide_to_tray_on_close: bool,
    pub keep_on_top_during_capture: bool,
    pub interview_compact_mode: bool,
    pub interview_report_retention_days: u16,
    pub debug_trace_mode: DebugTraceMode,
    pub debug_trace_retention_days: u16,
    pub bilingual_interview_enabled: bool,
    pub interview_input_language: String,
    pub translation_language: String,
    pub live_translation_enabled: bool,
    pub translation_debounce_ms: u16,
    pub translation_min_word_count: u8,
    pub bilingual_retention_behavior: String,
    pub bilingual_answer_style: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            schema_version: 10,
            hotkey: "Ctrl+Alt+Space".to_string(),
            llm_base_url: "".to_string(),
            llm_model: "gpt-4o-mini".to_string(),
            selected_model_preset: "custom_openai_compatible".to_string(),
            capture_max_seconds: 45,
            active_answer_profile: crate::prompt_registry::DEFAULT_ANSWER_PROFILE_ID.to_string(),
            window_opacity: 100,
            hide_to_tray_on_close: true,
            keep_on_top_during_capture: false,
            interview_compact_mode: false,
            interview_report_retention_days: 0,
            debug_trace_mode: DebugTraceMode::Redacted,
            debug_trace_retention_days: 3,
            bilingual_interview_enabled: false,
            interview_input_language: "en".to_string(),
            translation_language: "ru".to_string(),
            live_translation_enabled: true,
            translation_debounce_ms: 600,
            translation_min_word_count: 3,
            bilingual_retention_behavior: "session_only".to_string(),
            bilingual_answer_style: "b2_conversational".to_string(),
        }
    }
}

impl AppSettings {
    pub fn debug_trace_redacted_enabled(&self) -> bool {
        matches!(
            self.debug_trace_mode,
            DebugTraceMode::Redacted | DebugTraceMode::FullLocal
        )
    }

    pub fn debug_trace_full_enabled(&self) -> bool {
        matches!(self.debug_trace_mode, DebugTraceMode::FullLocal)
    }

    fn has_placeholder_llm_route(&self) -> bool {
        self.llm_base_url.trim() == "http://127.0.0.1:4000/v1"
            || (self.llm_base_url.trim() == "" && self.llm_model.trim() == "gpt-4o-mini")
    }

    /// True when saved secrets and a non-placeholder LLM route are present.
    pub fn runtime_path_configured(&self, deepgram_key_present: bool) -> bool {
        deepgram_key_present
            && !self.llm_base_url.trim().is_empty()
            && !self.llm_model.trim().is_empty()
            && !self.has_placeholder_llm_route()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogStatusDto {
    pub log_path: String,
    pub last_line: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_debug_wav_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapDto {
    pub settings: AppSettings,
    pub deepgram_key_present: bool,
    pub llm_key_present: bool,
    pub context_active: bool,
    pub context_entry_count: usize,
    /// Provider path is configured enough to attempt capture (not a guarantee STT/LLM succeed).
    pub runtime_ready: bool,
    pub log_status: LogStatusDto,
    /// Truncated text from the last successful STT pass (for local debugging / «Пересобрать карточку»).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_transcript_preview: Option<String>,
    pub can_retry_last_transcript: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextStatusDto {
    pub context_active: bool,
    pub entry_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_transcript_preview: Option<String>,
    pub can_retry_last_transcript: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisCardDto {
    pub gist: String,
    pub say_now: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub star_evidence: Option<String>,
    pub next_move: String,
    pub chars_band: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interview_card_schema_v1: Option<crate::interview_card_v1::InterviewCardDto>,
    #[serde(skip)]
    pub repair_used: bool,
    #[serde(skip)]
    pub fallback_used: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewQuestionReportDto {
    pub timestamp: String,
    pub raw_transcript: String,
    pub clean_question: String,
    pub question_type: String,
    pub answer_main: String,
    #[serde(default)]
    pub hints: Vec<String>,
    #[serde(default)]
    pub signals: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewReportScoresDto {
    pub clarity: u8,
    pub relevance: u8,
    pub accuracy: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewReportFeedbackDto {
    #[serde(default)]
    pub strengths: Vec<String>,
    #[serde(default)]
    pub improvements: Vec<String>,
    #[serde(default)]
    pub missing_examples: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewReportDto {
    pub session_id: String,
    pub started_at: String,
    pub ended_at: String,
    pub language: String,
    #[serde(default)]
    pub questions: Vec<InterviewQuestionReportDto>,
    pub full_transcript: String,
    pub scores: InterviewReportScoresDto,
    pub feedback: InterviewReportFeedbackDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusEventDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub run_id: Option<String>,
    pub phase: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

/// Single check result for preflight diagnostics.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckItemDto {
    pub ok: bool,
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub action: Option<String>,
}

/// Aggregated runtime preflight check result for the setup wizard.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeCheckDto {
    pub stt: CheckItemDto,
    pub llm: CheckItemDto,
    pub settings: CheckItemDto,
    pub runtime_ready: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupStatusDto {
    pub deepgram_key_present: bool,
    pub llm_key_present: bool,
    pub llm_route_configured: bool,
    pub runtime_path_ready: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TraceStatusDto {
    pub mode: DebugTraceMode,
    pub retention_days: u16,
    pub traces_dir: String,
    pub total_runs: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistenceDiagnosticsDto {
    pub settings_path: String,
    pub settings_path_hash: String,
    pub settings_file_exists: bool,
    pub settings_file_size: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub settings_file_modified_at: Option<String>,
    pub settings_parse_ok: bool,
    pub settings_validation_ok: bool,
    pub settings_schema_version: u32,
    pub llm_base_url_present: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub llm_base_url_host: Option<String>,
    pub llm_model_present: bool,
    pub selected_model_preset: String,
    pub active_answer_profile: String,
    pub hotkey: String,
    pub capture_max_seconds: u16,
    pub corrupt_backups: Vec<String>,
    pub corrupt_backups_count: usize,
    pub keyring_service_name: String,
    pub deepgram_key_present: bool,
    pub llm_key_present: bool,
    pub runtime_path_ready: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub app_log_path: Option<String>,
    pub app_log_exists: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_log_event_time: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BilingualSessionSettings {
    pub speaker_source: SpeakerSource,
    pub interview_input_language: String,
    pub translation_language: String,
    pub translation_strategy: TranslationStrategy,
    pub live_translation_enabled: bool,
    pub translation_debounce_ms: u16,
    pub translation_min_word_count: u8,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveTranscriptSegmentDto {
    pub segment_id: String,
    pub timestamp: String,
    pub text: String,
    pub finalized: bool,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveTranslationSegmentDto {
    pub segment_id: String,
    pub source_segment_ids: Vec<String>,
    pub primary_source_segment_id: String,
    pub timestamp: String,
    pub source_text: String,
    pub translated_text: String,
    pub source_language: String,
    pub target_language: String,
    pub is_final: bool,
    pub latency_ms: u64,
    pub is_fallback: bool,
    pub strategy: TranslationStrategy,
    pub batch_size: usize,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BilingualErrorDto {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recoverable: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BilingualAnswerReadyDto {
    pub answer_card: crate::interview_card_v1::InterviewCardDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BilingualAnswerChunkDto {
    pub session_id: String,
    pub text: String,
    pub is_final: bool,
    pub chunk_index: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BilingualExportInputDto {
    pub export_type: ExportType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_path: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSummary {
    pub export_type: ExportType,
    pub session_id: String,
    pub path: String,
    pub questions_count: usize,
    pub transcript_segments_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CandidateFactDto {
    pub fact: String,
    pub evidence: String,
    pub strength: String,
    #[serde(default)]
    pub metrics: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CandidatePackDraftDto {
    pub pack_quality_score: u8,
    #[serde(default)]
    pub missing_data_warnings: Vec<String>,
    #[serde(default)]
    pub suggested_missing_info: Vec<String>,
    #[serde(default)]
    pub candidate_facts: Vec<CandidateFactDto>,
    #[serde(default)]
    pub role_keywords: Vec<String>,
    #[serde(default)]
    pub company_values: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrepareCandidatePackInputDto {
    pub raw_resume: String,
    pub job_description: String,
    #[serde(default)]
    pub company_values_text: String,
    #[serde(default)]
    pub output_language: String,
}

#[derive(Debug, Clone, Copy)]
pub enum SecretSlot {
    DeepgramApiKey,
    LlmApiKey,
}

impl SecretSlot {
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "deepgramApiKey" => Some(Self::DeepgramApiKey),
            "llmApiKey" => Some(Self::LlmApiKey),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        AppSettings, CheckItemDto, LiveTranslationSegmentDto, LogStatusDto, RuntimeCheckDto,
        StatusEventDto,
    };

    #[test]
    fn runtime_path_is_not_ready_for_placeholder_route() {
        let settings = AppSettings::default();
        assert!(!settings.runtime_path_configured(true));
    }

    #[test]
    fn runtime_path_requires_deepgram_key() {
        let settings = AppSettings {
            llm_base_url: "https://gateway.example/v1".to_string(),
            llm_model: "gpt-4.1-mini".to_string(),
            ..AppSettings::default()
        };
        assert!(!settings.runtime_path_configured(false));
    }

    #[test]
    fn runtime_path_is_ready_for_non_placeholder_route_with_key() {
        let settings = AppSettings {
            llm_base_url: "https://gateway.example/v1".to_string(),
            llm_model: "gpt-4.1-mini".to_string(),
            ..AppSettings::default()
        };
        assert!(settings.runtime_path_configured(true));
    }

    #[test]
    fn default_hotkey_is_canonical() {
        let settings = AppSettings::default();
        assert_eq!(settings.hotkey, "Ctrl+Alt+Space");
    }

    #[test]
    fn log_status_round_trips_through_json() {
        let dto = LogStatusDto {
            log_path: r"C:\Users\tester\AppData\Local\com.replyline.app\logs\app.log".to_string(),
            last_line: Some("2026-04-07T12:00:00 [analysis_ok] card_ready".to_string()),
            last_debug_wav_path: Some(
                r"C:\Users\tester\AppData\Local\com.replyline.app\capture-debug\stt-empty-20260407-120000.wav"
                    .to_string(),
            ),
        };

        let raw = serde_json::to_vec(&dto).expect("serialize");
        let parsed: LogStatusDto = serde_json::from_slice(&raw).expect("deserialize");

        assert_eq!(parsed.log_path, dto.log_path);
        assert_eq!(parsed.last_line, dto.last_line);
    }

    #[test]
    fn status_event_includes_run_id_when_present() {
        let dto = StatusEventDto {
            run_id: Some("1712345678901-0".to_string()),
            phase: "capturing".to_string(),
            detail: None,
        };
        let raw = serde_json::to_string(&dto).expect("serialize");
        assert!(raw.contains("runId"));
        assert!(raw.contains("1712345678901-0"));
    }

    #[test]
    fn status_event_omits_run_id_when_none() {
        let dto = StatusEventDto {
            run_id: None,
            phase: "ready".to_string(),
            detail: None,
        };
        let raw = serde_json::to_string(&dto).expect("serialize");
        assert!(!raw.contains("runId"));
    }

    // ── CheckItemDto / RuntimeCheckDto ───────────────────────────

    #[test]
    fn check_item_dto_round_trips() {
        let dto = CheckItemDto {
            ok: true,
            code: "ok".to_string(),
            message: "Deepgram key found".to_string(),
            action: None,
        };
        let raw = serde_json::to_string(&dto).expect("serialize");
        let parsed: CheckItemDto = serde_json::from_str(&raw).expect("deserialize");
        assert!(parsed.ok);
        assert_eq!(parsed.code, "ok");
        assert_eq!(parsed.message, "Deepgram key found");
        assert!(parsed.action.is_none());
        // CheckItemDto without action must not serialize "action" field.
        assert!(!raw.contains("action"));
    }

    #[test]
    fn check_item_dto_with_action_round_trips() {
        let dto = CheckItemDto {
            ok: false,
            code: "config_error".to_string(),
            message: "LLM base URL is empty".to_string(),
            action: Some("Set the LLM gateway URL in settings".to_string()),
        };
        let raw = serde_json::to_string(&dto).expect("serialize");
        let parsed: CheckItemDto = serde_json::from_str(&raw).expect("deserialize");
        assert!(!parsed.ok);
        assert_eq!(parsed.code, "config_error");
        assert!(parsed.action.is_some());
        assert!(raw.contains("action"));
    }

    #[test]
    fn runtime_check_dto_round_trips() {
        let dto = RuntimeCheckDto {
            stt: CheckItemDto {
                ok: true,
                code: "ok".to_string(),
                message: "Deepgram key configured".to_string(),
                action: None,
            },
            llm: CheckItemDto {
                ok: true,
                code: "ok".to_string(),
                message: "LLM endpoint reachable".to_string(),
                action: None,
            },
            settings: CheckItemDto {
                ok: true,
                code: "ok".to_string(),
                message: "Settings valid".to_string(),
                action: None,
            },
            runtime_ready: true,
        };
        let raw = serde_json::to_string(&dto).expect("serialize");
        let parsed: RuntimeCheckDto = serde_json::from_str(&raw).expect("deserialize");
        assert!(parsed.runtime_ready);
        assert!(parsed.stt.ok);
        assert!(parsed.llm.ok);
        assert!(parsed.settings.ok);
        assert!(!raw.contains("action"));
    }

    #[test]
    fn runtime_check_dto_not_ready_when_stt_missing() {
        let dto = RuntimeCheckDto {
            stt: CheckItemDto {
                ok: false,
                code: "missing_key".to_string(),
                message: "Deepgram API key not configured".to_string(),
                action: Some("Add Deepgram API key in settings".to_string()),
            },
            llm: CheckItemDto {
                ok: false,
                code: "skipped".to_string(),
                message: "Skipped: STT not ready".to_string(),
                action: None,
            },
            settings: CheckItemDto {
                ok: true,
                code: "ok".to_string(),
                message: "Settings valid".to_string(),
                action: None,
            },
            runtime_ready: false,
        };
        let raw = serde_json::to_string(&dto).expect("serialize");
        let parsed: RuntimeCheckDto = serde_json::from_str(&raw).expect("deserialize");
        assert!(!parsed.runtime_ready);
        assert!(!parsed.stt.ok);
        assert!(parsed.stt.action.is_some());
        assert!(!parsed.llm.ok);
    }

    #[test]
    fn bilingual_translation_segment_uses_camel_case_source_segment_ids() {
        let dto = LiveTranslationSegmentDto {
            segment_id: "tr-1".to_string(),
            source_segment_ids: vec!["en-1".to_string(), "en-2".to_string()],
            primary_source_segment_id: "en-1".to_string(),
            timestamp: "2026-05-30T10:00:00Z".to_string(),
            source_text: "hello world".to_string(),
            translated_text: "Привет".to_string(),
            source_language: "en".to_string(),
            target_language: "ru".to_string(),
            is_final: true,
            latency_ms: 100,
            is_fallback: false,
            strategy: super::TranslationStrategy::LlmMicro,
            batch_size: 2,
        };
        let raw = serde_json::to_string(&dto).expect("serialize");
        assert!(raw.contains("sourceSegmentIds"));
        assert!(raw.contains("primarySourceSegmentId"));
        let parsed: LiveTranslationSegmentDto = serde_json::from_str(&raw).expect("deserialize");
        assert_eq!(parsed.source_segment_ids.len(), 2);
    }
}
