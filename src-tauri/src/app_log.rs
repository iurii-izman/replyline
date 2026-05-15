//! Minimal local app log for internal alpha support.

use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;

use crate::capture_debug;
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
    redact_known_secrets(trimmed)
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

fn redact_known_secrets(value: &str) -> String {
    let mut out = value.to_string();
    const MARKERS: [&str; 8] = [
        "authorization:",
        "bearer ",
        "api_key=",
        "apikey=",
        "token=",
        "password=",
        "secret=",
        "key=",
    ];
    for marker in MARKERS {
        out = redact_after_marker(&out, marker);
    }
    out = redact_json_secret_field(&out, "authorization");
    out = redact_json_secret_field(&out, "apiKey");
    out = redact_json_secret_field(&out, "api_key");
    out = redact_json_secret_field(&out, "token");
    out = redact_json_secret_field(&out, "password");
    out = redact_json_secret_field(&out, "secret");
    out
}

fn redact_json_secret_field(input: &str, key: &str) -> String {
    let mut result = input.to_string();
    let mut offset = 0usize;
    let needle = format!("\"{key}\"");
    loop {
        let lower_tail = result[offset..].to_lowercase();
        let Some(rel_pos) = lower_tail.find(&needle.to_lowercase()) else {
            break;
        };
        let key_pos = offset + rel_pos;
        let Some(colon_pos) = result[key_pos..].find(':') else {
            break;
        };
        let value_start = key_pos + colon_pos + 1;
        let Some(first_quote_rel) = result[value_start..].find('"') else {
            offset = value_start;
            continue;
        };
        let quote_start = value_start + first_quote_rel + 1;
        let Some(second_quote_rel) = result[quote_start..].find('"') else {
            break;
        };
        let quote_end = quote_start + second_quote_rel;
        result.replace_range(quote_start..quote_end, "[redacted]");
        offset = quote_start + "[redacted]".len();
    }
    result
}

fn redact_after_marker(input: &str, marker: &str) -> String {
    let mut result = input.to_string();
    let mut offset = 0usize;
    loop {
        let lower_tail = result[offset..].to_lowercase();
        let Some(rel_pos) = lower_tail.find(marker) else {
            break;
        };
        let pos = offset + rel_pos;
        let start = pos + marker.len();
        if result[start..].starts_with("[redacted]") {
            offset = start + "[redacted]".len();
            continue;
        }
        let mut end = result.len();
        for (idx, ch) in result[start..].char_indices() {
            if ch.is_whitespace() || ch == ';' || ch == ',' {
                end = start + idx;
                break;
            }
        }
        result.replace_range(start..end, "[redacted]");
        offset = start + "[redacted]".len();
    }
    result
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
        let value = "Authorization: Bearer abc123 token=xyz password=qwe key=api";
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
}
