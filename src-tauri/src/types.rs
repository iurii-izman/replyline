use serde::{Deserialize, Serialize};

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
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            schema_version: 1,
            hotkey: "Ctrl+Shift+Space".to_string(),
            llm_base_url: "http://127.0.0.1:4000/v1".to_string(),
            llm_model: "gpt-4o-mini".to_string(),
            primary_language: "ru".to_string(),
            deepgram_model: "nova-3".to_string(),
            capture_max_seconds: 30,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapDto {
    pub settings: AppSettings,
    pub deepgram_key_present: bool,
    pub llm_key_present: bool,
    pub context_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextStatusDto {
    pub context_active: bool,
    pub entry_count: usize,
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
