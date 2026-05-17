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
    pub interview_compact_mode: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            schema_version: 5,
            hotkey: "Ctrl+Alt+Space".to_string(),
            llm_base_url: "".to_string(),
            llm_model: "gpt-4o-mini".to_string(),
            selected_model_preset: "custom_openai_compatible".to_string(),
            capture_max_seconds: 45,
            active_answer_profile: crate::prompt_registry::DEFAULT_ANSWER_PROFILE_ID.to_string(),
            window_opacity: 100,
            interview_compact_mode: false,
        }
    }
}

impl AppSettings {
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
    #[serde(skip)]
    pub repair_used: bool,
    #[serde(skip)]
    pub fallback_used: bool,
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
    use super::{AppSettings, CheckItemDto, LogStatusDto, RuntimeCheckDto, StatusEventDto};

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
}
