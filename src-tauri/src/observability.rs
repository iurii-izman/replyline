use std::collections::BTreeMap;

use crate::app_log;

pub const SCHEMA_VERSION: u8 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[allow(dead_code)]
pub enum PrivacyClass {
    SafeMetadata,
    RedactedContent,
    SensitiveContent,
    Secret,
}

impl PrivacyClass {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::SafeMetadata => "safe_metadata",
            Self::RedactedContent => "redacted_content",
            Self::SensitiveContent => "sensitive_content",
            Self::Secret => "secret",
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct Fields {
    values: BTreeMap<String, String>,
}

impl Fields {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with(mut self, key: impl Into<String>, value: impl ToString) -> Self {
        let value = value.to_string();
        if !value.trim().is_empty() {
            self.values.insert(key.into(), value);
        }
        self
    }

    #[allow(dead_code)]
    pub fn maybe_with(mut self, key: impl Into<String>, value: Option<impl ToString>) -> Self {
        if let Some(value) = value {
            let value = value.to_string();
            if !value.trim().is_empty() {
                self.values.insert(key.into(), value);
            }
        }
        self
    }

    fn into_values(self) -> BTreeMap<String, String> {
        self.values
    }
}

pub fn log_audit(event: &str, fields: Fields) -> Result<(), String> {
    log("audit", event, fields)
}

#[allow(dead_code)]
pub fn log_debug(event: &str, fields: Fields) -> Result<(), String> {
    log("debug", event, fields)
}

pub fn log_error(event: &str, fields: Fields) -> Result<(), String> {
    log("error", event, fields)
}

fn log(level: &str, event: &str, fields: Fields) -> Result<(), String> {
    let mut merged = BTreeMap::<String, String>::new();
    merged.insert("schema".to_string(), SCHEMA_VERSION.to_string());
    merged.insert("level".to_string(), level.to_string());

    for (k, v) in fields.into_values() {
        merged.insert(k, v);
    }

    let detail = merged
        .into_iter()
        .map(|(k, v)| format!("{k}={}", sanitize_value(&v)))
        .collect::<Vec<_>>()
        .join(" ");

    app_log::append_event(event, detail)
}

fn sanitize_value(input: &str) -> String {
    let cleaned = input.trim().replace(['\r', '\n', '\t'], " ");
    if cleaned.is_empty() {
        return "-".to_string();
    }
    if cleaned.chars().any(|c| c.is_whitespace() || c == '=') {
        format!("\"{}\"", cleaned.replace('"', "'"))
    } else {
        cleaned
    }
}

#[cfg(test)]
mod tests {
    use super::{sanitize_value, Fields};

    #[test]
    fn fields_serialization_is_stable_order() {
        let fields = Fields::new()
            .with("provider", "custom")
            .with("model", "gpt-5.4-mini")
            .with("run_id", "r1");
        let map = fields.into_values();
        let keys: Vec<_> = map.keys().cloned().collect();
        assert_eq!(keys, vec!["model", "provider", "run_id"]);
    }

    #[test]
    fn sanitize_quotes_values_with_spaces() {
        assert_eq!(sanitize_value("hello world"), "\"hello world\"");
        assert_eq!(sanitize_value("k=v"), "\"k=v\"");
        assert_eq!(sanitize_value("token"), "token");
    }
}
