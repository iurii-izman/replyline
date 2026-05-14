use serde::{Deserialize, Serialize};

/// IPC-facing error envelope: serialized as `{"kind":"Pipeline","message":"..."}` for the webview.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", content = "message")]
pub enum CommandError {
    Settings(String),
    Credential(String),
    Capture(String),
    Pipeline(String),
    Memory(String),
    Internal(String),
}

impl std::fmt::Display for CommandError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Settings(m)
            | Self::Credential(m)
            | Self::Capture(m)
            | Self::Pipeline(m)
            | Self::Memory(m)
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
    pub primary_language: String,
    pub deepgram_model: String,
    pub capture_max_seconds: u16,
    #[serde(default = "default_llm_temperature")]
    pub llm_temperature: f32,
    #[serde(default)]
    pub use_streaming_stt: bool,
    #[serde(default)]
    pub custom_system_prompt: Option<String>,
    #[serde(default)]
    pub show_advanced: bool,
    /// After user acknowledges tray/hide behavior; enables tray-first startup when setup is complete.
    /// Missing in legacy `settings.json` defaults to true so existing installs are not nagged once.
    #[serde(default = "tray_intro_seen_legacy_default")]
    pub tray_intro_seen: bool,
}

fn default_llm_temperature() -> f32 {
    0.25
}

fn tray_intro_seen_legacy_default() -> bool {
    true
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            schema_version: 2,
            hotkey: "Ctrl+Alt+Space".to_string(),
            llm_base_url: "".to_string(),
            llm_model: "gpt-4o-mini".to_string(),
            primary_language: "ru".to_string(),
            deepgram_model: "nova-3".to_string(),
            capture_max_seconds: 30,
            llm_temperature: default_llm_temperature(),
            use_streaming_stt: false,
            custom_system_prompt: None,
            show_advanced: false,
            tray_intro_seen: false,
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
pub struct DiagnosticBundleDto {
    pub bundle_path: String,
    pub manifest_path: String,
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

/// Compact readiness snapshot for UI/support (no raw transcript text).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeReadinessDto {
    pub app_version: String,
    pub settings_schema_version: u32,
    pub deepgram_key_present: bool,
    pub llm_key_present: bool,
    pub runtime_ready: bool,
    pub context_active: bool,
    pub context_entry_count: usize,
    pub can_retry_last_transcript: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_transcript_char_count: Option<usize>,
    /// Bumps with system prompt changes; for support / regression tracking.
    pub prompt_contract_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthCheckResult {
    pub deepgram_ok: bool,
    pub llm_ok: bool,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisCardDto {
    pub gist: String,
    pub say_now: String,
    pub next_move: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusEventDto {
    pub phase: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
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
    use super::{AppSettings, LogStatusDto};

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
}
