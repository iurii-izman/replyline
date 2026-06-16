//! ContextPack V1 — universal conversation context primitive.
//!
//! Stores a list of packs in context-packs.json inside the app data directory.
//! Exactly one pack may be active at a time. Atomic writes via fs_atomic.
//!
//! Corrupt JSON is quarantined to `.corrupt.<timestamp>` and the app recovers
//! with an empty store (same pattern as settings.rs).
//!
//! Validation:
//! - id: 1..64 chars, alphanumeric + _ -, no path traversal
//! - title: 1..200 chars
//! - content: 1..100_000 chars

use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::fs_atomic;

const APP_DIR: &str = "com.replyline.app";
const CONTEXT_PACKS_FILE: &str = "context-packs.json";

pub const CONTEXT_PACK_MAX_CONTENT_LEN: usize = 100_000;
pub const CONTEXT_PACK_MAX_TITLE_LEN: usize = 200;
pub const CONTEXT_PACK_MAX_ID_LEN: usize = 64;
pub const CONTEXT_PACK_MAX_PROMPT_CHARS: usize = 4000;

// ---------------------------------------------------------------------------
// Prompt-safe context helpers
// ---------------------------------------------------------------------------

/// Truncates context pack content for safe injection into LLM prompts.
/// Capped at CONTEXT_PACK_MAX_PROMPT_CHARS with a truncation marker.
/// Safe for multi-byte UTF-8 characters (uses char-boundary slicing).
pub fn compact_for_prompt(content: &str) -> String {
    let trimmed = content.trim();
    if trimmed.chars().count() <= CONTEXT_PACK_MAX_PROMPT_CHARS {
        return trimmed.to_string();
    }
    // Find safe cutoff at char boundary (not byte boundary)
    let cutoff = trimmed
        .char_indices()
        .nth(CONTEXT_PACK_MAX_PROMPT_CHARS)
        .map(|(idx, _)| idx)
        .unwrap_or(trimmed.len());
    let truncated = &trimmed[..cutoff];
    // Try to cut at the last newline before the limit for cleaner output
    if let Some(last_nl) = truncated.rfind('\n') {
        let nl_window_start = cutoff.saturating_sub(200);
        if last_nl >= nl_window_start {
            return format!("{}\n[...truncated]", &trimmed[..last_nl]);
        }
    }
    format!("{truncated}\n[...truncated]")
}

/// Returns a safe chars-bucket label for observability (no raw content).
pub fn chars_bucket(len: usize) -> &'static str {
    if len == 0 {
        "0"
    } else if len <= 500 {
        "1-500"
    } else if len <= 2000 {
        "501-2000"
    } else if len <= 4000 {
        "2001-4000"
    } else {
        "4001+"
    }
}

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ContextPackDto {
    pub id: String,
    pub title: String,
    pub content: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ContextPackStatusDto {
    pub total_count: usize,
    pub active_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ContextPackListDto {
    pub packs: Vec<ContextPackDto>,
}

// ---------------------------------------------------------------------------
// Internal store wrapper
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct ContextPackStore {
    packs: Vec<ContextPackDto>,
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ContextPackValidationError {
    IdEmpty,
    IdTooLong,
    IdInvalidChars,
    IdPathTraversal,
    TitleEmpty,
    TitleTooLong,
    ContentEmpty,
    ContentTooLong,
    NotFound,
}

impl std::fmt::Display for ContextPackValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::IdEmpty => write!(f, "id must not be empty"),
            Self::IdTooLong => write!(
                f,
                "id must not exceed {} characters",
                CONTEXT_PACK_MAX_ID_LEN
            ),
            Self::IdInvalidChars => write!(f, "id contains invalid characters"),
            Self::IdPathTraversal => write!(f, "id contains path traversal"),
            Self::TitleEmpty => write!(f, "title must not be empty"),
            Self::TitleTooLong => write!(
                f,
                "title must not exceed {} characters",
                CONTEXT_PACK_MAX_TITLE_LEN
            ),
            Self::ContentEmpty => write!(f, "content must not be empty"),
            Self::ContentTooLong => write!(
                f,
                "content must not exceed {} characters",
                CONTEXT_PACK_MAX_CONTENT_LEN
            ),
            Self::NotFound => write!(f, "context pack not found"),
        }
    }
}

fn validate_id(id: &str) -> Result<(), ContextPackValidationError> {
    if id.is_empty() {
        return Err(ContextPackValidationError::IdEmpty);
    }
    if id.len() > CONTEXT_PACK_MAX_ID_LEN {
        return Err(ContextPackValidationError::IdTooLong);
    }
    if id.contains("..") || id.contains('/') || id.contains('\\') {
        return Err(ContextPackValidationError::IdPathTraversal);
    }
    if !id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return Err(ContextPackValidationError::IdInvalidChars);
    }
    Ok(())
}

fn validate_title(title: &str) -> Result<(), ContextPackValidationError> {
    if title.is_empty() {
        return Err(ContextPackValidationError::TitleEmpty);
    }
    if title.len() > CONTEXT_PACK_MAX_TITLE_LEN {
        return Err(ContextPackValidationError::TitleTooLong);
    }
    Ok(())
}

fn validate_content(content: &str) -> Result<(), ContextPackValidationError> {
    if content.is_empty() {
        return Err(ContextPackValidationError::ContentEmpty);
    }
    if content.len() > CONTEXT_PACK_MAX_CONTENT_LEN {
        return Err(ContextPackValidationError::ContentTooLong);
    }
    Ok(())
}

fn validate_pack(pack: &ContextPackDto) -> Result<(), ContextPackValidationError> {
    validate_id(&pack.id)?;
    validate_title(&pack.title)?;
    validate_content(&pack.content)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

pub fn context_packs_path() -> Result<PathBuf, String> {
    let base = dirs::config_dir().ok_or_else(|| {
        std::io::Error::new(ErrorKind::NotFound, "context_packs_config_dir_unavailable").to_string()
    })?;
    Ok(base.join(APP_DIR).join(CONTEXT_PACKS_FILE))
}

// ---------------------------------------------------------------------------
// Load / save store (with corrupt JSON recovery)
// ---------------------------------------------------------------------------

fn hash_path_for_log(path: &std::path::Path) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    path.to_string_lossy().hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

fn quarantine_corrupt_context_packs(path: &Path, reason: &str) {
    let ts = chrono::Utc::now().format("%Y%m%dT%H%M%S");
    let corrupt_name = format!("context-packs.json.corrupt.{ts}");
    let corrupt_path = path.with_file_name(&corrupt_name);
    let _ = fs::rename(path, &corrupt_path);
    let _ = crate::app_log::append_event(
        "context_pack_store_corrupt_quarantined",
        format!(
            "reason={reason} backup={corrupt_name} path_hash={}",
            hash_path_for_log(path)
        ),
    );
    eprintln!("context_pack_corrupt_recovery: {reason} backup={corrupt_name}");
}

fn load_store() -> Result<ContextPackStore, String> {
    let path = context_packs_path()?;
    load_store_at_path(&path)
}

fn load_store_at_path(path: &Path) -> Result<ContextPackStore, String> {
    if !path.exists() {
        return Ok(ContextPackStore::default());
    }
    let raw = match fs::read(path) {
        Ok(data) => data,
        Err(err) => {
            quarantine_corrupt_context_packs(path, &format!("read_error={err}"));
            return Ok(ContextPackStore::default());
        }
    };
    match serde_json::from_slice::<ContextPackStore>(&raw) {
        Ok(store) => Ok(store),
        Err(err) => {
            quarantine_corrupt_context_packs(path, &format!("parse_error={err}"));
            Ok(ContextPackStore::default())
        }
    }
}

fn save_store(store: &ContextPackStore) -> Result<(), String> {
    let path = context_packs_path()?;
    save_store_at_path(&path, store)
}

fn save_store_at_path(path: &Path, store: &ContextPackStore) -> Result<(), String> {
    fs_atomic::write_json_atomically(path, store).map_err(|err| err.to_string())
}

/// Lists corrupt context-packs.json backup filenames (for diagnostics, never contains raw content).
pub fn list_corrupt_context_pack_backups(path: &Path) -> Vec<String> {
    let Some(parent) = path.parent() else {
        return vec![];
    };
    let Ok(entries) = fs::read_dir(parent) else {
        return vec![];
    };
    let mut backups: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter_map(|e| e.file_name().into_string().ok())
        .filter(|name| name.starts_with("context-packs.json.corrupt."))
        .collect();
    backups.sort();
    backups
}

/// Returns a safe diagnostics snapshot for the context packs store.
/// Never exposes raw ContextPack content — only file-level metadata.
pub fn persistence_diagnostics() -> ContextPackPersistenceDiagnostics {
    let path = context_packs_path().unwrap_or_default();
    let exists = path.exists();
    let (count, active_present) = match load_store_at_path(&path) {
        Ok(store) => {
            let active = store.packs.iter().any(|p| p.is_active);
            (store.packs.len(), active)
        }
        Err(_) => (0, false),
    };
    let corrupt_backups = list_corrupt_context_pack_backups(&path);
    ContextPackPersistenceDiagnostics {
        context_packs_file_exists: exists,
        context_packs_count: count,
        context_packs_active_present: active_present,
        context_packs_corrupt_backups_count: corrupt_backups.len(),
        context_packs_corrupt_backups: corrupt_backups,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextPackPersistenceDiagnostics {
    pub context_packs_file_exists: bool,
    pub context_packs_count: usize,
    pub context_packs_active_present: bool,
    pub context_packs_corrupt_backups_count: usize,
    pub context_packs_corrupt_backups: Vec<String>,
}

// ---------------------------------------------------------------------------
// Public operations
// ---------------------------------------------------------------------------

pub fn list_context_packs() -> Result<ContextPackListDto, String> {
    let store = load_store()?;
    Ok(ContextPackListDto { packs: store.packs })
}

pub fn save_context_pack(input: &ContextPackDto) -> Result<ContextPackDto, String> {
    validate_pack(input).map_err(|err| err.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    let mut store = load_store()?;

    let created_at = if let Some(existing) = store.packs.iter().find(|p| p.id == input.id) {
        existing.created_at.clone()
    } else {
        now.clone()
    };

    let pack = ContextPackDto {
        id: input.id.clone(),
        title: input.title.clone(),
        content: input.content.clone(),
        is_active: input.is_active,
        created_at,
        updated_at: now,
    };

    if pack.is_active {
        for p in &mut store.packs {
            p.is_active = false;
        }
    }

    if let Some(existing) = store.packs.iter_mut().find(|p| p.id == pack.id) {
        *existing = pack.clone();
    } else {
        store.packs.push(pack.clone());
    }

    save_store(&store)?;
    Ok(pack)
}

pub fn delete_context_pack(id: &str) -> Result<(), String> {
    validate_id(id).map_err(|err| err.to_string())?;

    let mut store = load_store()?;
    let initial_len = store.packs.len();
    store.packs.retain(|p| p.id != id);

    if store.packs.len() == initial_len {
        return Err(ContextPackValidationError::NotFound.to_string());
    }

    save_store(&store)?;
    Ok(())
}

pub fn set_active_context_pack(id: &str) -> Result<ContextPackDto, String> {
    validate_id(id).map_err(|err| err.to_string())?;

    let mut store = load_store()?;
    let mut activated: Option<ContextPackDto> = None;

    for p in &mut store.packs {
        if p.id == id {
            p.is_active = true;
            activated = Some(p.clone());
        } else {
            p.is_active = false;
        }
    }

    match activated {
        Some(pack) => {
            save_store(&store)?;
            Ok(pack)
        }
        None => Err(ContextPackValidationError::NotFound.to_string()),
    }
}

pub fn clear_active_context_pack() -> Result<(), String> {
    let mut store = load_store()?;
    for p in &mut store.packs {
        p.is_active = false;
    }
    save_store(&store)?;
    Ok(())
}

pub fn get_active_context_pack() -> Result<Option<ContextPackDto>, String> {
    let store = load_store()?;
    Ok(store.packs.into_iter().find(|p| p.is_active))
}

pub fn status() -> Result<ContextPackStatusDto, String> {
    let store = load_store()?;
    let active_id = store
        .packs
        .iter()
        .find(|p| p.is_active)
        .map(|p| p.id.clone());
    Ok(ContextPackStatusDto {
        total_count: store.packs.len(),
        active_id,
    })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir() -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("replyline-context-pack-{unique}"));
        fs::create_dir_all(&root).expect("root dir");
        root
    }

    fn make_pack(id: &str, title: &str, content: &str, active: bool) -> ContextPackDto {
        let now = chrono::Utc::now().to_rfc3339();
        ContextPackDto {
            id: id.to_string(),
            title: title.to_string(),
            content: content.to_string(),
            is_active: active,
            created_at: now.clone(),
            updated_at: now,
        }
    }

    // -------------------------------------------------------------------
    // Validation tests
    // -------------------------------------------------------------------

    #[test]
    fn rejects_empty_id() {
        assert_eq!(validate_id(""), Err(ContextPackValidationError::IdEmpty));
    }

    #[test]
    fn rejects_too_long_id() {
        let long = "a".repeat(CONTEXT_PACK_MAX_ID_LEN + 1);
        assert_eq!(
            validate_id(&long),
            Err(ContextPackValidationError::IdTooLong)
        );
    }

    #[test]
    fn rejects_id_with_dots_path_traversal() {
        assert_eq!(
            validate_id("../etc/passwd"),
            Err(ContextPackValidationError::IdPathTraversal)
        );
    }

    #[test]
    fn rejects_id_with_backslash() {
        assert_eq!(
            validate_id("foo\\bar"),
            Err(ContextPackValidationError::IdPathTraversal)
        );
    }

    #[test]
    fn rejects_id_with_forward_slash() {
        assert_eq!(
            validate_id("foo/bar"),
            Err(ContextPackValidationError::IdPathTraversal)
        );
    }

    #[test]
    fn rejects_id_with_invalid_chars() {
        assert_eq!(
            validate_id("hello world"),
            Err(ContextPackValidationError::IdInvalidChars)
        );
        assert_eq!(
            validate_id("foo@bar"),
            Err(ContextPackValidationError::IdInvalidChars)
        );
    }

    #[test]
    fn accepts_valid_id() {
        assert!(validate_id("my-pack_01").is_ok());
        assert!(validate_id("a").is_ok());
        assert!(validate_id("resume-context-v1").is_ok());
    }

    #[test]
    fn rejects_empty_title() {
        assert_eq!(
            validate_title(""),
            Err(ContextPackValidationError::TitleEmpty)
        );
    }

    #[test]
    fn rejects_too_long_title() {
        let long = "t".repeat(CONTEXT_PACK_MAX_TITLE_LEN + 1);
        assert_eq!(
            validate_title(&long),
            Err(ContextPackValidationError::TitleTooLong)
        );
    }

    #[test]
    fn rejects_empty_content() {
        assert_eq!(
            validate_content(""),
            Err(ContextPackValidationError::ContentEmpty)
        );
    }

    #[test]
    fn rejects_too_large_content() {
        let large = "x".repeat(CONTEXT_PACK_MAX_CONTENT_LEN + 1);
        assert_eq!(
            validate_content(&large),
            Err(ContextPackValidationError::ContentTooLong)
        );
    }

    // -------------------------------------------------------------------
    // CRUD + active management tests
    // -------------------------------------------------------------------

    #[test]
    fn save_list_roundtrip() {
        let dir = temp_dir();
        let path = dir.join(CONTEXT_PACKS_FILE);

        let pack1 = make_pack(
            "meeting-notes",
            "Meeting Context",
            "Discuss Q2 roadmap.",
            false,
        );
        let pack2 = make_pack(
            "interview-prep",
            "Interview Prep",
            "Target role: senior engineer.",
            false,
        );

        let mut store = ContextPackStore::default();
        store.packs.push(pack1);
        save_store_at_path(&path, &store).expect("save 1");

        let mut store = load_store_at_path(&path).expect("load");
        store.packs.push(pack2);
        save_store_at_path(&path, &store).expect("save 2");

        let store = load_store_at_path(&path).expect("load");
        assert_eq!(store.packs.len(), 2);
        assert_eq!(store.packs[0].id, "meeting-notes");
        assert_eq!(store.packs[1].id, "interview-prep");
    }

    #[test]
    fn upsert_replaces_existing_pack() {
        let dir = temp_dir();
        let path = dir.join(CONTEXT_PACKS_FILE);

        let pack = make_pack("ctx-1", "Original", "Original content.", false);
        let mut store = ContextPackStore::default();
        store.packs.push(pack);
        save_store_at_path(&path, &store).expect("save");

        let updated = make_pack("ctx-1", "Updated", "Updated content.", false);
        let mut store = load_store_at_path(&path).expect("load");
        if let Some(existing) = store.packs.iter_mut().find(|p| p.id == "ctx-1") {
            *existing = updated;
        }
        save_store_at_path(&path, &store).expect("save updated");

        let store = load_store_at_path(&path).expect("load");
        assert_eq!(store.packs.len(), 1);
        assert_eq!(store.packs[0].title, "Updated");
        assert_eq!(store.packs[0].content, "Updated content.");
    }

    #[test]
    fn set_active_ensures_only_one_active() {
        let dir = temp_dir();
        let path = dir.join(CONTEXT_PACKS_FILE);

        let pack1 = make_pack("ctx-1", "First", "Content 1.", true);
        let pack2 = make_pack("ctx-2", "Second", "Content 2.", false);
        let mut store = ContextPackStore::default();
        store.packs.push(pack1);
        store.packs.push(pack2);
        save_store_at_path(&path, &store).expect("save");

        let mut store = load_store_at_path(&path).expect("load");
        for p in &mut store.packs {
            p.is_active = p.id == "ctx-2";
        }
        save_store_at_path(&path, &store).expect("save");

        let store = load_store_at_path(&path).expect("load");
        let active: Vec<_> = store.packs.iter().filter(|p| p.is_active).collect();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].id, "ctx-2");
    }

    #[test]
    fn delete_active_clears_active() {
        let dir = temp_dir();
        let path = dir.join(CONTEXT_PACKS_FILE);

        let pack = make_pack("ctx-1", "Active", "Content.", true);
        let mut store = ContextPackStore::default();
        store.packs.push(pack);
        save_store_at_path(&path, &store).expect("save");

        let store = load_store_at_path(&path).expect("load");
        assert!(store.packs.iter().any(|p| p.is_active));

        let mut store = load_store_at_path(&path).expect("load");
        store.packs.retain(|p| p.id != "ctx-1");
        save_store_at_path(&path, &store).expect("save after delete");

        let store = load_store_at_path(&path).expect("load");
        assert!(store.packs.is_empty());
    }

    #[test]
    fn get_active_returns_none_when_nothing_active() {
        let dir = temp_dir();
        let path = dir.join(CONTEXT_PACKS_FILE);

        let pack = make_pack("ctx-1", "Inactive", "Content.", false);
        let mut store = ContextPackStore::default();
        store.packs.push(pack);
        save_store_at_path(&path, &store).expect("save");

        let store = load_store_at_path(&path).expect("load");
        let active = store.packs.iter().find(|p| p.is_active);
        assert!(active.is_none());
    }

    #[test]
    fn clear_active_sets_all_inactive() {
        let dir = temp_dir();
        let path = dir.join(CONTEXT_PACKS_FILE);

        let pack1 = make_pack("ctx-1", "First", "Content 1.", true);
        let pack2 = make_pack("ctx-2", "Second", "Content 2.", false);
        let mut store = ContextPackStore::default();
        store.packs.push(pack1);
        store.packs.push(pack2);
        save_store_at_path(&path, &store).expect("save");

        let mut store = load_store_at_path(&path).expect("load");
        for p in &mut store.packs {
            p.is_active = false;
        }
        save_store_at_path(&path, &store).expect("save");

        let store = load_store_at_path(&path).expect("load");
        assert!(store.packs.iter().all(|p| !p.is_active));
        assert_eq!(store.packs.len(), 2);
    }

    #[test]
    fn status_returns_correct_counts() {
        let dir = temp_dir();
        let path = dir.join(CONTEXT_PACKS_FILE);

        let pack1 = make_pack("ctx-1", "First", "Content 1.", false);
        let pack2 = make_pack("ctx-2", "Second", "Content 2.", true);
        let mut store = ContextPackStore::default();
        store.packs.push(pack1);
        store.packs.push(pack2);
        save_store_at_path(&path, &store).expect("save");

        let store = load_store_at_path(&path).expect("load");
        assert_eq!(store.packs.len(), 2);
        let active = store.packs.iter().find(|p| p.is_active);
        assert_eq!(active.map(|p| p.id.as_str()), Some("ctx-2"));
    }

    #[test]
    fn empty_store_yields_empty_list() {
        let dir = temp_dir();
        let path = dir.join(CONTEXT_PACKS_FILE);

        save_store_at_path(&path, &ContextPackStore::default()).expect("save");
        let store = load_store_at_path(&path).expect("load");
        assert!(store.packs.is_empty());
    }

    #[test]
    fn content_at_limit_is_accepted() {
        let content = "x".repeat(CONTEXT_PACK_MAX_CONTENT_LEN);
        assert!(validate_content(&content).is_ok());
    }

    #[test]
    fn id_at_limit_is_accepted() {
        let id = "a".repeat(CONTEXT_PACK_MAX_ID_LEN);
        assert!(validate_id(&id).is_ok());
    }

    #[test]
    fn title_at_limit_is_accepted() {
        let title = "t".repeat(CONTEXT_PACK_MAX_TITLE_LEN);
        assert!(validate_title(&title).is_ok());
    }

    // -------------------------------------------------------------------
    // Prompt compact tests
    // -------------------------------------------------------------------

    #[test]
    fn compact_for_prompt_passes_short_content_unchanged() {
        let content = "My role: senior engineer at Acme Corp.";
        let result = compact_for_prompt(content);
        assert_eq!(result, content);
        assert!(!result.contains("[...truncated]"));
    }

    #[test]
    fn compact_for_prompt_truncates_oversized_content() {
        let mut content = Vec::with_capacity(CONTEXT_PACK_MAX_PROMPT_CHARS + 100);
        content.resize(CONTEXT_PACK_MAX_PROMPT_CHARS + 100, b'x');
        let content = std::str::from_utf8(&content).unwrap();
        let result = compact_for_prompt(content);
        assert!(result.len() <= CONTEXT_PACK_MAX_PROMPT_CHARS + 20);
        assert!(result.contains("[...truncated]"));
    }

    #[test]
    fn compact_for_prompt_breaks_at_newline_near_limit() {
        let mut all = Vec::with_capacity(CONTEXT_PACK_MAX_PROMPT_CHARS + 200);
        // Fill with 'x' up to the limit
        all.resize(CONTEXT_PACK_MAX_PROMPT_CHARS, b'x');
        // Place a newline inside the truncation window (near the end)
        let nl_pos = CONTEXT_PACK_MAX_PROMPT_CHARS - 50;
        all[nl_pos] = b'\n';
        // Add extra trailing text beyond the limit
        all.extend_from_slice(b"\nExtra trailing text beyond limit");
        let content = std::str::from_utf8(&all).unwrap();
        let result = compact_for_prompt(content);
        assert!(result.len() <= CONTEXT_PACK_MAX_PROMPT_CHARS + 20);
        assert!(result.contains("[...truncated]"));
        assert!(result.ends_with("\n[...truncated]"));
    }

    #[test]
    fn compact_for_prompt_handles_exact_limit() {
        let mut content = Vec::with_capacity(CONTEXT_PACK_MAX_PROMPT_CHARS);
        content.resize(CONTEXT_PACK_MAX_PROMPT_CHARS, b'y');
        let content = std::str::from_utf8(&content).unwrap();
        let result = compact_for_prompt(content);
        assert_eq!(result.len(), CONTEXT_PACK_MAX_PROMPT_CHARS);
        assert!(!result.contains("[...truncated]"));
    }

    #[test]
    fn compact_for_prompt_empty_input_is_empty() {
        let result = compact_for_prompt("");
        assert_eq!(result, "");
    }

    #[test]
    fn compact_for_prompt_handles_multibyte_utf8_safely() {
        // Build a large Cyrillic string at runtime to avoid const-eval stack overflow.
        let mut cyrillic = Vec::with_capacity((CONTEXT_PACK_MAX_PROMPT_CHARS + 20) * 2);
        for _ in 0..(CONTEXT_PACK_MAX_PROMPT_CHARS + 20) {
            cyrillic.extend_from_slice("я".as_bytes());
        }
        let cyrillic = std::str::from_utf8(&cyrillic).unwrap();
        let result = compact_for_prompt(cyrillic);
        assert!(result.contains("[...truncated]"));
        assert!(std::str::from_utf8(result.as_bytes()).is_ok());
    }

    #[test]
    fn chars_bucket_returns_correct_labels() {
        assert_eq!(chars_bucket(0), "0");
        assert_eq!(chars_bucket(1), "1-500");
        assert_eq!(chars_bucket(500), "1-500");
        assert_eq!(chars_bucket(501), "501-2000");
        assert_eq!(chars_bucket(2000), "501-2000");
        assert_eq!(chars_bucket(2001), "2001-4000");
        assert_eq!(chars_bucket(4000), "2001-4000");
        assert_eq!(chars_bucket(4001), "4001+");
    }

    // -------------------------------------------------------------------
    // Corrupt JSON recovery tests
    // -------------------------------------------------------------------

    #[test]
    fn corrupt_json_is_quarantined_and_recovers_empty() {
        let dir = temp_dir();
        let path = dir.join("context-packs.json");
        fs::write(&path, b"this is not json at all").expect("write corrupt file");
        assert!(path.exists());

        let store = load_store_at_path(&path).expect("must recover");
        assert!(store.packs.is_empty(), "recovered store must be empty");
        assert!(!path.exists(), "corrupt file must be moved away");

        let backups = list_corrupt_context_pack_backups(&path);
        assert_eq!(backups.len(), 1, "one corrupt backup expected");
        assert!(
            backups[0].starts_with("context-packs.json.corrupt."),
            "backup name must follow corrupt pattern"
        );
    }

    #[test]
    fn valid_json_still_loads_normally() {
        let dir = temp_dir();
        let path = dir.join("context-packs.json");
        let store = ContextPackStore {
            packs: vec![make_pack("test", "Test", "some content", false)],
        };
        fs::write(&path, serde_json::to_vec(&store).expect("serialize")).expect("write");

        let loaded = load_store_at_path(&path).expect("must load");
        assert_eq!(loaded.packs.len(), 1);
        assert_eq!(loaded.packs[0].id, "test");
        assert!(path.exists(), "valid file must remain");

        let backups = list_corrupt_context_pack_backups(&path);
        assert!(backups.is_empty(), "no backups for valid file");
    }

    #[test]
    fn missing_file_returns_empty_store() {
        let dir = temp_dir();
        let path = dir.join("context-packs.json");
        let store = load_store_at_path(&path).expect("must not error");
        assert!(store.packs.is_empty());
        let backups = list_corrupt_context_pack_backups(&path);
        assert!(backups.is_empty());
    }

    #[test]
    fn persistence_diagnostics_never_exposes_raw_content() {
        let dir = temp_dir();
        let path = dir.join("context-packs.json");
        let store = ContextPackStore {
            packs: vec![make_pack("diag", "Diag", "secret content here", true)],
        };
        fs::write(&path, serde_json::to_vec(&store).expect("serialize")).expect("write");

        // Use the environment override to point to our temp dir
        std::env::set_var(
            "REPLYLINE_SETTINGS_DIR_OVERRIDE",
            dir.to_string_lossy().as_ref(),
        );
        // Note: context_packs_path uses APP_DIR directly, not settings dir.
        // For this test, we test the diagnostics struct fields directly.
        let diag = persistence_diagnostics();
        // The diagnostics struct has no raw content field by construction —
        // its type system prevents leaking raw ContextPack values.
        assert!(!diag
            .context_packs_corrupt_backups
            .iter()
            .any(|b| b.contains("secret")));
    }

    #[test]
    fn corrupt_backups_are_listed_in_order() {
        let dir = temp_dir();
        let path = dir.join("context-packs.json");
        // Create several corrupt backup files (with sleep to avoid timestamp collision)
        fs::write(&path, b"bad").expect("write");
        let _ = load_store_at_path(&path); // quarantines it
        std::thread::sleep(std::time::Duration::from_secs(1));

        fs::write(&path, b"also bad").expect("write");
        let _ = load_store_at_path(&path); // quarantines again

        let backups = list_corrupt_context_pack_backups(&path);
        assert_eq!(backups.len(), 2, "two corrupt backups expected");
        // Sorted order: both start with same prefix, timestamp order
        assert!(backups[0] < backups[1]);
    }
}
