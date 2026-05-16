//! Privacy redaction helpers — v1 baseline.
//!
//! These helpers are applied **before** any string reaches `app_log::append_event`,
//! `log_diag`, or error detail that may contain secrets, transcript content, or
//! raw LLM/STT response bodies.
//!
//! # Redaction tiers
//!
//! | Tier   | Helper                        | Covers                                  |
//! |--------|-------------------------------|-----------------------------------------|
//! | R1     | `redact_secrets`              | API keys, bearer tokens, secret=, etc. |
//! | R2     | `redact_transcript_like`      | Full transcript, full LLM prompt       |
//! | R3     | `safe_preview`                | Structural log-safe truncation         |
//! | R4     | `redact_url_credentials`      | URL userinfo, token query params       |
//!
//! R1 runs inside `app_log::sanitize` by default. R2-R4 must be called explicitly
//! by the call site when the detail argument could contain sensitive content.

const PREVIEW_DEFAULT_MAX_CHARS: usize = 160;

/// Mask known secret patterns: API keys, bearer tokens, secret=, password=, etc.
///
/// This is a **defense-in-depth** layer. The primary protection is that secrets
/// are stored via OS keyring (`credentials.rs`) and never passed to log calls
/// directly. This helper catches accidental leaks through error messages or
/// raw provider responses.
pub fn redact_secrets(value: &str) -> String {
    let mut out = value.to_string();

    // --- header-style secrets ---
    // Note: "key=" is intentionally omitted — too broad (false positives on "hotkey=").
    // Order matters: "x-api-key: " (with trailing space) must precede "x-api-key:"
    // so the more specific marker catches the value before the generic one inserts at
    // the whitespace position.
    const MARKERS: &[&str] = &[
        "x-api-key: ",
        "authorization:",
        "authorization=",
        "bearer ",
        "api_key=",
        "apikey=",
        "token=",
        "password=",
        "secret=",
        "x-api-key:",
        "x-api-key=",
    ];
    for marker in MARKERS {
        out = redact_after_marker(&out, marker);
    }

    // --- JSON field secrets ---
    const JSON_SECRET_FIELDS: &[&str] = &[
        "authorization",
        "auth_token",
        "apiKey",
        "api_key",
        "apikey",
        "token",
        "access_token",
        "refresh_token",
        "password",
        "secret",
        "client_secret",
        "api_secret",
    ];
    for field in JSON_SECRET_FIELDS {
        out = redact_json_secret_field(&out, field);
    }

    // --- url credentials ---
    out = redact_url_credentials(&out);

    out
}

/// Truncate and mask content that looks like a full transcript or LLM prompt.
///
/// Keeps a short structural preview for diagnostics (char band, length) while
/// removing the actual conversational content.
#[allow(dead_code)]
pub fn redact_transcript_like(value: &str) -> String {
    let preview = safe_preview(value, PREVIEW_DEFAULT_MAX_CHARS);
    format!(
        "transcript_like(len={},chars_band={}) {}",
        value.chars().count(),
        chars_band_label(value),
        preview
    )
}

/// Return a length-bounded safe preview of any string.
///
/// The preview is further sanitized through `redact_secrets`. If the input
/// is longer than `max_chars`, it is truncated with a trailing marker.
pub fn safe_preview(value: &str, max_chars: usize) -> String {
    let redacted = redact_secrets(value);
    let single_line = redacted.replace(['\r', '\n'], " ");
    if single_line.chars().count() <= max_chars {
        single_line
    } else {
        let truncated: String = single_line.chars().take(max_chars).collect();
        format!("{truncated}…[truncated]")
    }
}

/// Strip credentials from URLs: userinfo (`user:pass@`), `token=`, `api_key=`
/// and similar query parameters.
pub fn redact_url_credentials(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for token in value.split_whitespace() {
        // Find URLs with userinfo
        if let Some(rest) = token.strip_prefix("http://") {
            out.push_str("http://");
            out.push_str(&redact_userinfo(rest));
        } else if let Some(rest) = token.strip_prefix("https://") {
            out.push_str("https://");
            out.push_str(&redact_userinfo(rest));
        } else {
            out.push_str(token);
        }
        out.push(' ');
    }
    out.trim_end().to_string()
}

/// Remove userinfo (`user:pass@`) from a URL authority part.
fn redact_userinfo(url_after_scheme: &str) -> String {
    if let Some(at_pos) = url_after_scheme.find('@') {
        let before_at = &url_after_scheme[..at_pos];
        // Only redact if it looks like userinfo (contains ':' or looks like a user part)
        if before_at.contains(':') || !before_at.contains('/') {
            return format!("[redacted_credentials]@{}", &url_after_scheme[at_pos + 1..]);
        }
    }
    url_after_scheme.to_string()
}

/// Redact the value after a case-insensitive marker.
///
/// Starts scanning immediately after the marker. The first character after the
/// marker (which may be whitespace) marks the beginning of the redaction range.
/// Redacts up to the next whitespace, semicolon, comma, quote, ampersand, or
/// question mark — or end-of-string.
fn redact_after_marker(input: &str, marker: &str) -> String {
    let mut result = input.to_string();
    let mut offset = 0usize;
    loop {
        let lower_tail = result[offset..].to_lowercase();
        let Some(rel_pos) = lower_tail.find(&marker.to_lowercase()) else {
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
            if ch.is_whitespace()
                || ch == ';'
                || ch == ','
                || ch == '"'
                || ch == '\''
                || ch == '&'
                || ch == '?'
            {
                end = start + idx;
                break;
            }
        }
        result.replace_range(start..end, "[redacted]");
        offset = start + "[redacted]".len();
    }
    result
}

/// Redact the value of a JSON field with the given key.
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

#[allow(dead_code)]
fn chars_band_label(value: &str) -> &'static str {
    let count = value.chars().count();
    if count == 0 {
        return "empty";
    }
    if count < 128 {
        "short"
    } else if count < 512 {
        "medium"
    } else if count < 1024 {
        "long"
    } else {
        "xlong"
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // --- redact_secrets ---

    #[test]
    fn redact_secrets_masks_bearer_token() {
        let value = "Authorization: Bearer sk-secret-key-12345";
        let result = redact_secrets(value);
        assert!(!result.contains("sk-secret-key-12345"));
        assert!(result.contains("[redacted]"));
    }

    #[test]
    fn redact_secrets_masks_api_key_param() {
        let value = "api_key=sk-abcdefg&model=gpt-4";
        let result = redact_secrets(value);
        assert!(!result.contains("sk-abcdefg"));
        assert!(result.contains("[redacted]"));
        // After redaction, non-secret parts after & survive
        assert!(result.contains("model=gpt-4"));
    }

    #[test]
    fn redact_secrets_masks_json_api_key() {
        let value = r#"{"apiKey":"sk-xyz-999","model":"gpt-4o"}"#;
        let result = redact_secrets(value);
        assert!(!result.contains("sk-xyz-999"));
        assert!(result.contains("[redacted]"));
        assert!(result.contains("gpt-4o"));
    }

    #[test]
    fn redact_secrets_masks_json_authorization() {
        let value = r#"{"authorization":"Bearer deadbeef","prompt":"hello"}"#;
        let result = redact_secrets(value);
        assert!(!result.contains("deadbeef"));
        assert!(result.contains("[redacted]"));
    }

    #[test]
    fn redact_secrets_masks_url_with_token() {
        let value = "https://api.example.com/v1?token=secret123&user=test";
        let result = redact_secrets(value);
        assert!(!result.contains("secret123"));
        assert!(result.contains("[redacted]"));
        // Non-secret query params survive
        assert!(result.contains("user=test"));
    }

    #[test]
    fn redact_secrets_masks_multiple_markers() {
        let value = "bearer tok1 api_key=tok2 secret=tok3 password=tok4";
        let result = redact_secrets(value);
        assert!(!result.contains("tok1"));
        assert!(!result.contains("tok2"));
        assert!(!result.contains("tok3"));
        assert!(!result.contains("tok4"));
    }

    #[test]
    fn redact_secrets_preserves_non_secret_content() {
        // "hotkey=..." must NOT be redacted — "key=" is too broad a marker.
        let value = "Settings saved hotkey=Ctrl+Alt+Space model=gpt-4o-mini";
        let result = redact_secrets(value);
        assert!(result.contains("Ctrl+Alt+Space"));
        assert!(result.contains("gpt-4o-mini"));
    }

    // --- redact_transcript_like ---

    #[test]
    fn redact_transcript_like_never_outputs_full_content() {
        let transcript = "Alice: Hello, how are you?\nBob: I'm fine, thank you.\nAlice: Can we discuss the Q3 report?\nBob: Sure, let me pull it up.\nAlice: Great, I think we need to revise the projections.\nBob: Agreed. The numbers are off by about 15%.\nAlice: That's what I was thinking too.";
        let result = redact_transcript_like(transcript);
        // Must contain structural metadata
        assert!(result.starts_with("transcript_like(len="));
        assert!(result.contains("chars_band="));
        // Must NOT contain late portions of the transcript (should be beyond 160 chars)
        let tail = "The numbers are off by about 15%";
        assert!(
            !result.contains(tail),
            "late transcript content leaked: {result}"
        );
        // Should contain a redacted preview
        assert!(result.contains("…[truncated]") || result.len() < transcript.len());
    }

    #[test]
    fn redact_transcript_like_handles_short_input() {
        let short = "Hello world";
        let result = redact_transcript_like(short);
        assert!(result.starts_with("transcript_like(len=11,"));
        assert!(result.contains("Hello world"));
    }

    #[test]
    fn redact_transcript_like_redacts_secrets_inside() {
        let leaky = "Transcript: user said api_key=sk-leaked-horribly\n Then continued talking.";
        let result = redact_transcript_like(leaky);
        assert!(!result.contains("sk-leaked-horribly"));
        assert!(result.contains("[redacted]"));
    }

    // --- safe_preview ---

    #[test]
    fn safe_preview_truncates_long_string() {
        let long = "a".repeat(300);
        let result = safe_preview(&long, 100);
        assert!(result.ends_with("…[truncated]"));
        assert!(result.chars().count() <= 120); // 100 + marker
    }

    #[test]
    fn safe_preview_preserves_short_string() {
        let short = "ok";
        let result = safe_preview(&short, 100);
        assert_eq!(result, "ok");
    }

    #[test]
    fn safe_preview_redacts_secrets() {
        let value = "Error: api_key=sk-deadbeef happened";
        let result = safe_preview(value, 200);
        assert!(!result.contains("sk-deadbeef"));
        assert!(result.contains("[redacted]"));
    }

    // --- redact_url_credentials ---

    #[test]
    fn redact_url_credentials_strips_userinfo() {
        let value = "https://user:pass@api.example.com/v1";
        let result = redact_url_credentials(value);
        assert!(!result.contains("user:pass"));
        assert!(result.contains("[redacted_credentials]"));
        assert!(result.contains("api.example.com/v1"));
    }

    #[test]
    fn redact_url_credentials_preserves_clean_url() {
        let value = "https://api.example.com/v1/chat";
        let result = redact_url_credentials(value);
        assert_eq!(result, value);
    }

    #[test]
    fn redact_url_credentials_handles_query_secrets_via_redact_secrets() {
        let value = "Request to https://api.example.com/v1?api_key=leaked";
        let result = redact_secrets(value);
        assert!(!result.contains("leaked"));
        assert!(result.contains("[redacted]"));
    }

    // --- edge cases ---

    #[test]
    fn redact_secrets_handles_empty_string() {
        assert_eq!(redact_secrets(""), "");
    }

    #[test]
    fn redact_secrets_handles_already_redacted() {
        let value = "token=[redacted] again";
        let result = redact_secrets(value);
        // Should not double-redact
        let count = result.matches("[redacted]").count();
        assert_eq!(count, 1, "unexpected redacted count in: {result}");
    }

    #[test]
    fn safe_preview_handles_empty() {
        assert_eq!(safe_preview("", 50), "");
    }

    #[test]
    fn redact_secrets_handles_x_api_key_header() {
        // "x-api-key: " (with trailing space) is a specific marker placed before
        // the generic "x-api-key:" to catch the value when a space follows the colon.
        let value = "x-api-key: sk-custom-header-leak";
        let result = redact_secrets(value);
        assert!(!result.contains("sk-custom-header-leak"));
        assert!(result.contains("[redacted]"));
    }

    #[test]
    fn redact_secrets_masks_access_token() {
        let value = r#"{"access_token":"ya29.a0AfH6S...","token_type":"Bearer"}"#;
        let result = redact_secrets(value);
        assert!(!result.contains("ya29.a0AfH6S"));
        assert!(result.contains("[redacted]"));
    }
}
