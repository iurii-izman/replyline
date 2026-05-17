use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::fs_atomic;

const APP_DIR: &str = "com.replyline.app";
const CANDIDATE_PACK_FILE: &str = "candidate-pack.v1.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CandidateFact {
    pub id: String,
    pub title: String,
    pub claim: String,
    pub description: String,
    pub evidence: String,
    pub skills: Vec<String>,
    pub metrics: Vec<String>,
    pub strength: CandidateFactStrength,
    pub suitable_for_questions: Vec<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CandidateFactStrength {
    Strong,
    Medium,
    Weak,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CandidateJobDescription {
    pub title: String,
    pub company: String,
    pub requirements: Vec<String>,
    pub responsibilities: Vec<String>,
    pub keywords: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CandidateAnswerConstraints {
    pub avoid_claims: Vec<String>,
    pub preferred_examples: Vec<String>,
    pub language: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CandidatePackDto {
    pub candidate_summary: String,
    pub target_role: String,
    pub resume_facts: Vec<CandidateFact>,
    pub job_description: CandidateJobDescription,
    pub company_values: Vec<String>,
    pub answer_constraints: CandidateAnswerConstraints,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CandidatePackStatusDto {
    pub exists: bool,
    pub fact_count: usize,
    pub weak_fact_count: usize,
}

pub fn candidate_pack_path() -> Result<PathBuf, String> {
    let base = dirs::config_dir().ok_or_else(|| {
        std::io::Error::new(ErrorKind::NotFound, "candidate_pack_config_dir_unavailable")
            .to_string()
    })?;
    Ok(base.join(APP_DIR).join(CANDIDATE_PACK_FILE))
}

pub fn load() -> Result<Option<CandidatePackDto>, String> {
    let path = candidate_pack_path()?;
    load_at_path(&path)
}

fn load_at_path(path: &Path) -> Result<Option<CandidatePackDto>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read(path).map_err(|err| err.to_string())?;
    let pack: CandidatePackDto = serde_json::from_slice(&raw).map_err(|err| err.to_string())?;
    Ok(Some(normalize_pack(pack)))
}

pub fn save(input: &CandidatePackDto) -> Result<CandidatePackDto, String> {
    let pack = normalize_pack(input.clone());
    let path = candidate_pack_path()?;
    save_at_path(&path, &pack)?;
    Ok(pack)
}

fn save_at_path(path: &Path, pack: &CandidatePackDto) -> Result<(), String> {
    fs_atomic::write_json_atomically(path, &pack).map_err(|err| err.to_string())?;
    Ok(())
}

pub fn clear() -> Result<(), String> {
    let path = candidate_pack_path()?;
    clear_at_path(&path)
}

fn clear_at_path(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    fs::remove_file(path).map_err(|err| err.to_string())
}

pub fn status() -> Result<CandidatePackStatusDto, String> {
    let pack = load()?;
    match pack {
        Some(pack) => Ok(CandidatePackStatusDto {
            exists: true,
            fact_count: pack.resume_facts.len(),
            weak_fact_count: pack
                .resume_facts
                .iter()
                .filter(|fact| fact.strength == CandidateFactStrength::Weak)
                .count(),
        }),
        None => Ok(CandidatePackStatusDto {
            exists: false,
            fact_count: 0,
            weak_fact_count: 0,
        }),
    }
}

pub fn compact_context(pack: &CandidatePackDto) -> String {
    let mut lines: Vec<String> = Vec::new();
    if !pack.candidate_summary.trim().is_empty() {
        lines.push(format!(
            "Candidate summary: {}",
            pack.candidate_summary.trim()
        ));
    }
    if !pack.target_role.trim().is_empty() {
        lines.push(format!("Target role: {}", pack.target_role.trim()));
    }
    if !pack.job_description.title.trim().is_empty()
        || !pack.job_description.company.trim().is_empty()
    {
        lines.push(format!(
            "Job target: {} @ {}",
            pack.job_description.title.trim(),
            pack.job_description.company.trim()
        ));
    }
    for fact in &pack.resume_facts {
        let mut chunk = format!(
            "Fact {} [{}]: {}",
            fact.id.trim(),
            match fact.strength {
                CandidateFactStrength::Strong => "strong",
                CandidateFactStrength::Medium => "medium",
                CandidateFactStrength::Weak => "weak",
            },
            fact.claim.trim()
        );
        if !fact.evidence.trim().is_empty() {
            chunk.push_str(&format!(" | evidence: {}", fact.evidence.trim()));
        }
        let metric_anchors = metric_anchors_for_fact(fact);
        if !metric_anchors.is_empty() {
            chunk.push_str(&format!(" | metrics: {}", metric_anchors.join(", ")));
        }
        lines.push(chunk);
    }
    lines.join("\n")
}

pub fn metric_anchors_for_fact(fact: &CandidateFact) -> Vec<String> {
    if fact.evidence.trim().is_empty() || fact.strength == CandidateFactStrength::Weak {
        return Vec::new();
    }
    fact.metrics
        .iter()
        .map(|v| v.trim())
        .filter(|v| !v.is_empty())
        .map(|v| v.to_string())
        .collect()
}

fn normalize_pack(mut input: CandidatePackDto) -> CandidatePackDto {
    input.candidate_summary = input.candidate_summary.trim().to_string();
    input.target_role = input.target_role.trim().to_string();
    input.company_values = normalize_text_items(input.company_values);
    input.job_description.title = input.job_description.title.trim().to_string();
    input.job_description.company = input.job_description.company.trim().to_string();
    input.job_description.requirements = normalize_text_items(input.job_description.requirements);
    input.job_description.responsibilities =
        normalize_text_items(input.job_description.responsibilities);
    input.job_description.keywords = normalize_text_items(input.job_description.keywords);
    input.answer_constraints.avoid_claims =
        normalize_text_items(input.answer_constraints.avoid_claims);
    input.answer_constraints.preferred_examples =
        normalize_text_items(input.answer_constraints.preferred_examples);
    input.answer_constraints.language = input.answer_constraints.language.trim().to_string();
    input.resume_facts = input.resume_facts.into_iter().map(normalize_fact).collect();
    input
}

fn normalize_fact(mut fact: CandidateFact) -> CandidateFact {
    fact.id = fact.id.trim().to_string();
    fact.title = fact.title.trim().to_string();
    fact.claim = fact.claim.trim().to_string();
    fact.description = fact.description.trim().to_string();
    fact.evidence = fact.evidence.trim().to_string();
    fact.skills = normalize_text_items(fact.skills);
    fact.metrics = normalize_text_items(fact.metrics);
    fact.suitable_for_questions = normalize_text_items(fact.suitable_for_questions);
    if fact.evidence.is_empty() {
        fact.strength = CandidateFactStrength::Weak;
    }
    fact
}

fn normalize_text_items(values: Vec<String>) -> Vec<String> {
    values
        .into_iter()
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn candidate_pack_roundtrip_json() {
        let dto = CandidatePackDto {
            candidate_summary: "Backend engineer".to_string(),
            target_role: "Senior Rust Engineer".to_string(),
            resume_facts: vec![CandidateFact {
                id: "fact-1".to_string(),
                title: "Latency".to_string(),
                claim: "Cut p95 latency".to_string(),
                description: "Optimized query paths".to_string(),
                evidence: "Dashboard snapshot 2025-Q4".to_string(),
                skills: vec!["Rust".to_string()],
                metrics: vec!["p95 -42%".to_string()],
                strength: CandidateFactStrength::Strong,
                suitable_for_questions: vec!["performance".to_string()],
            }],
            job_description: CandidateJobDescription {
                title: "Senior Rust Engineer".to_string(),
                company: "Replyline".to_string(),
                requirements: vec!["Rust".to_string()],
                responsibilities: vec!["Ship features".to_string()],
                keywords: vec!["ownership".to_string()],
            },
            company_values: vec!["Ownership".to_string()],
            answer_constraints: CandidateAnswerConstraints {
                avoid_claims: vec!["managed 50 people".to_string()],
                preferred_examples: vec!["latency project".to_string()],
                language: "ru".to_string(),
            },
        };
        let raw = serde_json::to_vec(&dto).expect("serialize");
        let parsed: CandidatePackDto = serde_json::from_slice(&raw).expect("deserialize");
        assert_eq!(dto, parsed);
    }

    #[test]
    fn weak_fact_or_missing_evidence_cannot_produce_metric_anchors() {
        let weak = CandidateFact {
            id: "fact-2".to_string(),
            title: "Impact".to_string(),
            claim: "Improved conversion".to_string(),
            description: String::new(),
            evidence: " ".to_string(),
            skills: vec![],
            metrics: vec!["+12%".to_string()],
            strength: CandidateFactStrength::Strong,
            suitable_for_questions: vec![],
        };
        let normalized = normalize_fact(weak);
        assert_eq!(normalized.strength, CandidateFactStrength::Weak);
        assert!(metric_anchors_for_fact(&normalized).is_empty());
    }

    #[test]
    fn compact_context_empty_pack_is_empty() {
        let pack = CandidatePackDto {
            candidate_summary: String::new(),
            target_role: String::new(),
            resume_facts: vec![],
            job_description: CandidateJobDescription {
                title: String::new(),
                company: String::new(),
                requirements: vec![],
                responsibilities: vec![],
                keywords: vec![],
            },
            company_values: vec![],
            answer_constraints: CandidateAnswerConstraints {
                avoid_claims: vec![],
                preferred_examples: vec![],
                language: String::new(),
            },
        };
        assert_eq!(compact_context(&pack), "");
    }

    #[test]
    fn save_load_clear_cycle_works() {
        let temp = std::env::temp_dir().join(format!(
            "replyline-candidate-pack-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("time")
                .as_nanos()
        ));
        fs::create_dir_all(&temp).expect("mkdir");
        let path = temp.join("candidate-pack.v1.json");
        let dto = CandidatePackDto {
            candidate_summary: "Engineer".to_string(),
            target_role: "Staff Engineer".to_string(),
            resume_facts: vec![],
            job_description: CandidateJobDescription {
                title: String::new(),
                company: String::new(),
                requirements: vec![],
                responsibilities: vec![],
                keywords: vec![],
            },
            company_values: vec![],
            answer_constraints: CandidateAnswerConstraints {
                avoid_claims: vec![],
                preferred_examples: vec![],
                language: "ru".to_string(),
            },
        };
        save_at_path(&path, &dto).expect("save");
        let loaded = load_at_path(&path).expect("load").expect("some");
        assert_eq!(loaded.target_role, "Staff Engineer");
        clear_at_path(&path).expect("clear");
        assert!(load_at_path(&path).expect("load none").is_none());
        let _ = fs::remove_dir_all(&temp);
    }
}
