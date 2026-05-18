//! Minimal local app log for internal alpha support.

use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;

use crate::capture_debug;
use crate::privacy;
use crate::types::LogStatusDto;
use chrono::Local;

pub fn append_event(event: &str, detail: impl AsRef<str>) -> Result<(), String> {
    let path = log_file_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let _ = maybe_rotate(&path);
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|err| err.to_string())?;
    let ts = Local::now().format("%Y-%m-%dT%H:%M:%S");
    let event = sanitize_event(event);
    let detail = sanitize(detail.as_ref());
    writeln!(file, "{ts} [{event}] {detail}").map_err(|err| err.to_string())
}

pub fn status() -> Result<LogStatusDto, String> {
    let path = log_file_path()?;
    let last_line = read_last_line(&path)?;
    Ok(LogStatusDto {
        log_path: path.display().to_string(),
        last_line,
        last_debug_wav_path: capture_debug::latest_debug_wav_path()?
            .map(|value| value.display().to_string()),
    })
}

pub fn log_file_path() -> Result<PathBuf, String> {
    let base = dirs::data_local_dir().ok_or_else(|| "local_data_dir_unavailable".to_string())?;
    Ok(base.join("com.replyline.app").join("logs").join("app.log"))
}

fn read_last_line(path: &PathBuf) -> Result<Option<String>, String> {
    if !path.is_file() {
        return Ok(None);
    }
    let file = OpenOptions::new()
        .read(true)
        .open(path)
        .map_err(|err| err.to_string())?;
    let mut last = None;
    for line in BufReader::new(file).lines() {
        let line = line.map_err(|err| err.to_string())?;
        if !line.trim().is_empty() {
            last = Some(line);
        }
    }
    Ok(last)
}

fn sanitize(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return "-".to_string();
    }
    // R1: privacy::redact_secrets replaces the legacy redact_known_secrets
    // and covers bearer tokens, api_key=, JSON secret fields, URL credentials.
    privacy::redact_secrets(trimmed)
        .pipe(redact_potential_email)
        .pipe(redact_long_numeric_ids)
        .pipe(strip_url_query_values)
        .replace(['\r', '\n'], " ")
        .chars()
        .take(400)
        .collect()
}

fn sanitize_event(value: &str) -> String {
    let candidate: String = value
        .trim()
        .to_lowercase()
        .chars()
        .filter(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || *ch == '_' || *ch == '-')
        .take(64)
        .collect();
    if candidate.is_empty() {
        "client_event_invalid".to_string()
    } else {
        candidate
    }
}

fn redact_potential_email(input: String) -> String {
    let mut out = String::with_capacity(input.len());
    for token in input.split_whitespace() {
        let trimmed = token
            .trim_matches(|ch: char| ch == ',' || ch == ';' || ch == '.' || ch == ')' || ch == '(');
        let is_email_like = trimmed.contains('@')
            && trimmed.contains('.')
            && !trimmed.starts_with('@')
            && !trimmed.ends_with('@');
        if is_email_like {
            out.push_str("[redacted_email]");
        } else {
            out.push_str(token);
        }
        out.push(' ');
    }
    out.trim_end().to_string()
}

fn redact_long_numeric_ids(input: String) -> String {
    let mut out = String::with_capacity(input.len());
    for token in input.split_whitespace() {
        let digits_only: String = token.chars().filter(|c| c.is_ascii_digit()).collect();
        let looks_sensitive = (13..=19).contains(&digits_only.len());
        if looks_sensitive {
            out.push_str("[redacted_number]");
        } else {
            out.push_str(token);
        }
        out.push(' ');
    }
    out.trim_end().to_string()
}

fn strip_url_query_values(input: String) -> String {
    let mut out = String::with_capacity(input.len());
    for token in input.split_whitespace() {
        if let Some((base, _query)) = token.split_once('?') {
            if base.starts_with("http://") || base.starts_with("https://") {
                out.push_str(base);
                out.push_str("?[redacted_query]");
                out.push(' ');
                continue;
            }
        }
        out.push_str(token);
        out.push(' ');
    }
    out.trim_end().to_string()
}

const MAX_LOG_BYTES: u64 = 5 * 1024 * 1024;

fn maybe_rotate(path: &std::path::Path) -> Result<(), String> {
    if !path.is_file() {
        return Ok(());
    }
    let meta = fs::metadata(path).map_err(|err| err.to_string())?;
    if meta.len() < MAX_LOG_BYTES {
        return Ok(());
    }
    let rotated = path.with_extension("1.log");
    if rotated.is_file() {
        let _ = fs::remove_file(&rotated);
    }
    fs::rename(path, &rotated).map_err(|err| err.to_string())
}

trait Pipe: Sized {
    fn pipe<F: FnOnce(Self) -> T, T>(self, f: F) -> T {
        f(self)
    }
}

impl<T> Pipe for T {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_redacts_common_secret_markers() {
        // Note: "key=" is intentionally NOT in MARKERS (too broad — false positives on "hotkey=").
        // Use "secret=" instead to test redaction coverage.
        let value = "Authorization: Bearer abc123 token=xyz password=qwe secret=api";
        let sanitized = sanitize(value);
        assert!(!sanitized.contains("abc123"));
        assert!(!sanitized.contains("xyz"));
        assert!(!sanitized.contains("qwe"));
        assert!(!sanitized.contains("api"));
        assert!(sanitized.contains("[redacted]"));
    }

    #[test]
    fn sanitize_redacts_json_secret_fields_and_email() {
        let value = r#"{"apiKey":"secret-key-123","authorization":"Bearer tok","contact":"alice@example.com"}"#;
        let sanitized = sanitize(value);
        assert!(!sanitized.contains("secret-key-123"));
        assert!(!sanitized.contains("Bearer tok"));
        assert!(!sanitized.contains("alice@example.com"));
        assert!(sanitized.contains("[redacted_email]"));
    }

    #[test]
    fn sanitize_redacts_long_numeric_and_url_query() {
        let value = "card=4242424242424242 https://api.example/v1?token=abcdef&user=one";
        let sanitized = sanitize(value);
        assert!(!sanitized.contains("4242424242424242"));
        assert!(!sanitized.contains("token=abcdef"));
        assert!(sanitized.contains("[redacted_number]"));
        assert!(sanitized.contains("?[redacted_query]"));
    }

    #[test]
    fn sanitize_redacts_prompt_and_api_key_markers() {
        let value = "raw prompt=Please use token=sk-test-123 api_key=live-secret";
        let sanitized = sanitize(value);
        assert!(!sanitized.contains("sk-test-123"));
        assert!(!sanitized.contains("live-secret"));
    }
}
