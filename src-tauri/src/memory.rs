use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

const SETTINGS_DIR: &str = "com.replyline.app";
const MEMORY_DIR: &str = "memory";
const SPACE_INDEX_FILE: &str = "spaces.json";

#[derive(Debug, thiserror::Error)]
pub enum MemoryError {
    #[error("IO: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON: {0}")]
    Json(#[from] serde_json::Error),
    #[error("VALIDATION: {0}")]
    Validation(String),
    #[error("NOT_FOUND: {0}")]
    NotFound(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MemorySpaceKind {
    Team,
    Thread,
    Contact,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MemorySpaceStatus {
    Active,
    Archived,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MemoryFactCategory {
    Goal,
    Constraint,
    Term,
    Preference,
    Context,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MemoryFactSourceKind {
    Manual,
    PostCallSummary,
    SavedCard,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MemoryCommitmentStatus {
    Open,
    Done,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MemorySpace {
    pub id: String,
    pub kind: MemorySpaceKind,
    pub label: String,
    pub status: MemorySpaceStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MemoryFact {
    pub id: String,
    pub text: String,
    pub category: MemoryFactCategory,
    pub source_kind: MemoryFactSourceKind,
    pub confidence: f32,
    pub confirmed_by_user: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MemoryCommitment {
    pub id: String,
    pub text: String,
    pub owner: String,
    pub due_hint: Option<String>,
    pub status: MemoryCommitmentStatus,
    pub confirmed_by_user: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MemoryTerm {
    pub id: String,
    pub term: String,
    pub preferred_text: String,
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MemorySpaceRecord {
    pub space: MemorySpace,
    pub facts: Vec<MemoryFact>,
    pub commitments: Vec<MemoryCommitment>,
    pub terms: Vec<MemoryTerm>,
}

pub struct JsonMemoryStore {
    root: PathBuf,
}

impl JsonMemoryStore {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    pub fn default() -> Result<Self, MemoryError> {
        Ok(Self::new(default_memory_root()?))
    }

    pub fn list_spaces(&self) -> Result<Vec<MemorySpace>, MemoryError> {
        let path = self.space_index_path();
        if !path.exists() {
            return Ok(Vec::new());
        }
        let raw = fs::read(path)?;
        let spaces: Vec<MemorySpace> = serde_json::from_slice(&raw)?;
        for space in &spaces {
            validate_space(space)?;
        }
        Ok(spaces)
    }

    pub fn save_space(&self, space: &MemorySpace) -> Result<(), MemoryError> {
        validate_space(space)?;
        self.ensure_dirs()?;
        let mut spaces = self.list_spaces()?;
        if let Some(index) = spaces.iter().position(|value| value.id == space.id) {
            spaces[index] = space.clone();
        } else {
            spaces.push(space.clone());
        }
        write_json_atomically(&self.space_index_path(), &spaces)?;
        Ok(())
    }

    pub fn load_record(&self, space_id: &str) -> Result<MemorySpaceRecord, MemoryError> {
        validate_id(space_id, "space_id")?;
        let path = self.space_record_path(space_id);
        if !path.exists() {
            return Err(MemoryError::NotFound(format!(
                "memory space record missing: {space_id}"
            )));
        }
        let raw = fs::read(path)?;
        let record: MemorySpaceRecord = serde_json::from_slice(&raw)?;
        validate_record(&record)?;
        Ok(record)
    }

    pub fn save_record(&self, record: &MemorySpaceRecord) -> Result<(), MemoryError> {
        validate_record(record)?;
        self.ensure_dirs()?;
        self.save_space(&record.space)?;
        write_json_atomically(&self.space_record_path(&record.space.id), record)?;
        Ok(())
    }

    fn ensure_dirs(&self) -> Result<(), MemoryError> {
        fs::create_dir_all(&self.root)?;
        Ok(())
    }

    fn space_index_path(&self) -> PathBuf {
        self.root.join(SPACE_INDEX_FILE)
    }

    fn space_record_path(&self, space_id: &str) -> PathBuf {
        self.root
            .join(format!("{}.json", encode_space_id_for_file(space_id)))
    }
}

pub fn default_memory_root() -> Result<PathBuf, MemoryError> {
    let base = dirs::config_dir()
        .ok_or_else(|| std::io::Error::new(ErrorKind::NotFound, "config_dir_unavailable"))?;
    Ok(base.join(SETTINGS_DIR).join(MEMORY_DIR))
}

fn write_json_atomically<T: Serialize>(path: &Path, payload: &T) -> Result<(), MemoryError> {
    crate::fs_atomic::write_json_atomically(path, payload)?;
    Ok(())
}

fn encode_space_id_for_file(space_id: &str) -> String {
    space_id
        .chars()
        .map(|ch| match ch {
            ':' => '_',
            other => other,
        })
        .collect()
}

fn validate_id(value: &str, field: &str) -> Result<(), MemoryError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(MemoryError::Validation(format!("{field} is empty")));
    }
    let is_valid = trimmed
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == ':');
    if !is_valid {
        return Err(MemoryError::Validation(format!(
            "{field} contains unsupported characters"
        )));
    }
    Ok(())
}

fn validate_text(value: &str, field: &str, max_chars: usize) -> Result<(), MemoryError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(MemoryError::Validation(format!("{field} is empty")));
    }
    if trimmed.chars().count() > max_chars {
        return Err(MemoryError::Validation(format!(
            "{field} exceeds {max_chars} chars"
        )));
    }
    Ok(())
}

fn validate_space(space: &MemorySpace) -> Result<(), MemoryError> {
    validate_id(&space.id, "space.id")?;
    validate_text(&space.label, "space.label", 120)?;
    Ok(())
}

fn validate_fact(fact: &MemoryFact) -> Result<(), MemoryError> {
    validate_id(&fact.id, "fact.id")?;
    validate_text(&fact.text, "fact.text", 500)?;
    if !(0.0..=1.0).contains(&fact.confidence) {
        return Err(MemoryError::Validation(
            "fact.confidence must be between 0 and 1".to_string(),
        ));
    }
    Ok(())
}

fn validate_commitment(commitment: &MemoryCommitment) -> Result<(), MemoryError> {
    validate_id(&commitment.id, "commitment.id")?;
    validate_text(&commitment.text, "commitment.text", 500)?;
    validate_text(&commitment.owner, "commitment.owner", 120)?;
    if let Some(due_hint) = &commitment.due_hint {
        validate_text(due_hint, "commitment.due_hint", 80)?;
    }
    Ok(())
}

fn validate_term(term: &MemoryTerm) -> Result<(), MemoryError> {
    validate_id(&term.id, "term.id")?;
    validate_text(&term.term, "term.term", 80)?;
    validate_text(&term.preferred_text, "term.preferred_text", 160)?;
    if let Some(note) = &term.note {
        validate_text(note, "term.note", 200)?;
    }
    Ok(())
}

fn ensure_unique_ids<T, F>(items: &[T], extract_id: F, field_name: &str) -> Result<(), MemoryError>
where
    F: Fn(&T) -> &str,
{
    let mut ids = std::collections::HashSet::new();
    for item in items {
        let id = extract_id(item);
        if !ids.insert(id.to_string()) {
            return Err(MemoryError::Validation(format!(
                "duplicate {field_name} id: {id}"
            )));
        }
    }
    Ok(())
}

fn validate_record(record: &MemorySpaceRecord) -> Result<(), MemoryError> {
    validate_space(&record.space)?;
    ensure_unique_ids(&record.facts, |value| &value.id, "fact")?;
    ensure_unique_ids(&record.commitments, |value| &value.id, "commitment")?;
    ensure_unique_ids(&record.terms, |value| &value.id, "term")?;

    for fact in &record.facts {
        validate_fact(fact)?;
    }
    for commitment in &record.commitments {
        validate_commitment(commitment)?;
    }
    for term in &record.terms {
        validate_term(term)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn temp_store() -> JsonMemoryStore {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("replyline-memory-test-{unique}"));
        JsonMemoryStore::new(root)
    }

    fn sample_record() -> MemorySpaceRecord {
        let ts = now();
        MemorySpaceRecord {
            space: MemorySpace {
                id: "team:backend".to_string(),
                kind: MemorySpaceKind::Team,
                label: "Backend team".to_string(),
                status: MemorySpaceStatus::Active,
                created_at: ts,
                updated_at: ts,
            },
            facts: vec![MemoryFact {
                id: "fact-1".to_string(),
                text: "Release date is fixed for Friday.".to_string(),
                category: MemoryFactCategory::Constraint,
                source_kind: MemoryFactSourceKind::Manual,
                confidence: 1.0,
                confirmed_by_user: true,
                created_at: ts,
                updated_at: ts,
            }],
            commitments: vec![MemoryCommitment {
                id: "commitment-1".to_string(),
                text: "Send updated rollout plan.".to_string(),
                owner: "alex".to_string(),
                due_hint: Some("before friday standup".to_string()),
                status: MemoryCommitmentStatus::Open,
                confirmed_by_user: true,
                created_at: ts,
                updated_at: ts,
            }],
            terms: vec![MemoryTerm {
                id: "term-1".to_string(),
                term: "RFC".to_string(),
                preferred_text: "change note".to_string(),
                note: None,
                created_at: ts,
                updated_at: ts,
            }],
        }
    }

    #[test]
    fn serializes_and_deserializes_record() {
        let record = sample_record();
        let raw = serde_json::to_vec(&record).expect("serialize");
        let parsed: MemorySpaceRecord = serde_json::from_slice(&raw).expect("deserialize");
        assert_eq!(parsed.space.id, "team:backend");
        assert_eq!(parsed.facts.len(), 1);
        assert_eq!(parsed.commitments.len(), 1);
        assert_eq!(parsed.terms.len(), 1);
    }

    #[test]
    fn rejects_invalid_fact_confidence() {
        let mut record = sample_record();
        record.facts[0].confidence = 2.0;
        let result = validate_record(&record);
        assert!(matches!(result, Err(MemoryError::Validation(_))));
    }

    #[test]
    fn persists_and_loads_record() {
        let store = temp_store();
        let record = sample_record();
        store.save_record(&record).expect("save");

        let loaded = store.load_record("team:backend").expect("load");
        assert_eq!(loaded.space.label, "Backend team");
        assert_eq!(loaded.facts[0].text, "Release date is fixed for Friday.");

        let spaces = store.list_spaces().expect("list");
        assert_eq!(spaces.len(), 1);
        assert_eq!(spaces[0].id, "team:backend");
    }

    #[test]
    fn lists_empty_when_store_is_new() {
        let store = temp_store();
        let spaces = store.list_spaces().expect("list");
        assert!(spaces.is_empty());
    }

    #[test]
    fn rejects_duplicate_fact_ids() {
        let mut record = sample_record();
        let duplicate = MemoryFact {
            id: "fact-1".to_string(),
            text: "Duplicate id".to_string(),
            category: MemoryFactCategory::Context,
            source_kind: MemoryFactSourceKind::Manual,
            confidence: 0.7,
            confirmed_by_user: true,
            created_at: now(),
            updated_at: now(),
        };
        record.facts.push(duplicate);
        let result = validate_record(&record);
        assert!(matches!(result, Err(MemoryError::Validation(_))));
    }
}
