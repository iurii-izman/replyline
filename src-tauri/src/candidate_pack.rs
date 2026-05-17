use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::fs_atomic;
use crate::types::{CandidateFactDto as CandidateDraftFactDto, CandidatePackDraftDto};

const APP_DIR: &str = "com.replyline.app";
const CANDIDATE_PACK_FILE: &str = "candidate-pack.v1.json";
const CANDIDATE_PACK_PREP_MAX_TOKENS: u16 = 1200;

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

const PREP_SYSTEM_PROMPT: &str = r#"You prepare a Candidate Pack draft from provided text only.
Rules:
- Extract only facts present in provided documents.
- Do not invent companies, dates, metrics, roles, titles, results.
- If metrics are absent, metrics must be [].
- Every fact must include evidence excerpt or evidence summary.
- Mark fact strength as: strong, medium, or weak.
- Build reusable answer anchors.
- Extract role keywords from the job description.
- Extract company values only from provided company values text.
- Add missing data warnings:
  - add metrics
  - add conflict example
  - add leadership example
  - add failure example
  - add system design/product examples, if relevant
Return JSON only, no markdown:
{
  "packQualityScore": 0..100,
  "missingDataWarnings": ["..."],
  "suggestedMissingInfo": ["..."],
  "candidateFacts": [
    {"fact":"...","evidence":"...","strength":"strong|medium|weak","metrics":["..."]}
  ],
  "roleKeywords": ["..."],
  "companyValues": ["..."]
}"#;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawPreparedCandidateFact {
    fact: String,
    evidence: String,
    strength: String,
    #[serde(default)]
    metrics: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawPreparedCandidatePack {
    pack_quality_score: i64,
    #[serde(default)]
    missing_data_warnings: Vec<String>,
    #[serde(default)]
    suggested_missing_info: Vec<String>,
    #[serde(default)]
    candidate_facts: Vec<RawPreparedCandidateFact>,
    #[serde(default)]
    role_keywords: Vec<String>,
    #[serde(default)]
    company_values: Vec<String>,
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

pub fn build_prepare_prompt(
    raw_resume: &str,
    job_description: &str,
    company_values: &str,
) -> String {
    format!(
        "Resume:\n{}\n\nJob description:\n{}\n\nCompany values/about text:\n{}",
        raw_resume.trim(),
        job_description.trim(),
        company_values.trim()
    )
}

pub fn system_prompt() -> &'static str {
    PREP_SYSTEM_PROMPT
}

pub fn max_tokens() -> u16 {
    CANDIDATE_PACK_PREP_MAX_TOKENS
}

pub fn normalize_from_raw(raw_text: &str) -> Result<CandidatePackDraftDto, String> {
    let parsed = parse_prepared_candidate_pack_json(raw_text)?;
    normalize_prepared_candidate_pack(parsed)
}

fn parse_prepared_candidate_pack_json(raw_text: &str) -> Result<RawPreparedCandidatePack, String> {
    let trimmed = raw_text.trim();
    if let Ok(pack) = serde_json::from_str::<RawPreparedCandidatePack>(trimmed) {
        return Ok(pack);
    }
    if let (Some(start), Some(end)) = (trimmed.find('{'), trimmed.rfind('}')) {
        let candidate = &trimmed[start..=end];
        if let Ok(pack) = serde_json::from_str::<RawPreparedCandidatePack>(candidate) {
            return Ok(pack);
        }
    }
    if let Some(repaired) = try_repair_minimal_prepared_pack(trimmed) {
        return Ok(repaired);
    }
    Err("Candidate pack JSON parse failed".to_string())
}

fn try_repair_minimal_prepared_pack(text: &str) -> Option<RawPreparedCandidatePack> {
    let score = extract_prepared_field(text, "packQualityScore")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(0);
    let fact = extract_prepared_field(text, "fact")?;
    let evidence = extract_prepared_field(text, "evidence")?;
    let strength = extract_prepared_field(text, "strength").unwrap_or_else(|| "weak".to_string());
    Some(RawPreparedCandidatePack {
        pack_quality_score: score,
        missing_data_warnings: vec![],
        suggested_missing_info: vec![],
        candidate_facts: vec![RawPreparedCandidateFact {
            fact,
            evidence,
            strength,
            metrics: vec![],
        }],
        role_keywords: vec![],
        company_values: vec![],
    })
}

fn extract_prepared_field(text: &str, key: &str) -> Option<String> {
    let pattern = format!("\"{key}\"");
    let idx = text.find(&pattern)?;
    let after_key = &text[idx + pattern.len()..];
    let colon_idx = after_key.find(':')?;
    let after_colon = after_key[colon_idx + 1..].trim_start();
    if let Some(inner) = after_colon.strip_prefix('"') {
        let end = inner.find('"')?;
        Some(inner[..end].to_string())
    } else {
        None
    }
}

fn normalize_prepared_candidate_pack(
    raw: RawPreparedCandidatePack,
) -> Result<CandidatePackDraftDto, String> {
    let mut candidate_facts = Vec::new();
    for fact in raw.candidate_facts {
        let fact_text = fact.fact.trim().to_string();
        let evidence_text = fact.evidence.trim().to_string();
        if fact_text.is_empty() || evidence_text.is_empty() {
            continue;
        }
        let strength = normalize_prepared_strength(&fact.strength);
        let metrics = fact
            .metrics
            .into_iter()
            .map(|m| m.trim().to_string())
            .filter(|m| !m.is_empty())
            .collect::<Vec<_>>();
        if !metrics.is_empty() && evidence_text.is_empty() {
            return Err("Metric without evidence is rejected".to_string());
        }
        candidate_facts.push(CandidateDraftFactDto {
            fact: fact_text,
            evidence: evidence_text,
            strength,
            metrics,
        });
    }

    Ok(CandidatePackDraftDto {
        pack_quality_score: raw.pack_quality_score.clamp(0, 100) as u8,
        missing_data_warnings: normalize_text_items(raw.missing_data_warnings),
        suggested_missing_info: normalize_text_items(raw.suggested_missing_info),
        candidate_facts,
        role_keywords: normalize_text_items(raw.role_keywords),
        company_values: normalize_text_items(raw.company_values),
    })
}

fn normalize_prepared_strength(value: &str) -> String {
    match value.trim().to_lowercase().as_str() {
        "strong" => "strong".to_string(),
        "medium" => "medium".to_string(),
        _ => "weak".to_string(),
    }
}

pub fn build_prepare_log_detail(
    raw_resume: &str,
    job_description: &str,
    company_values: &str,
) -> String {
    format!(
        "resume_chars={} jd_chars={} company_values_chars={}",
        raw_resume.chars().count(),
        job_description.chars().count(),
        company_values.chars().count()
    )
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

    #[test]
    fn prepared_pack_resume_with_metrics_extracts_metrics() {
        let raw = r#"{
          "packQualityScore": 88,
          "candidateFacts": [{"fact":"Improved conversion","evidence":"Resume says conversion +17%","strength":"strong","metrics":["+17%"]}]
        }"#;
        let dto = normalize_from_raw(raw).expect("normalize");
        assert_eq!(dto.candidate_facts.len(), 1);
        assert_eq!(dto.candidate_facts[0].metrics, vec!["+17%"]);
    }

    #[test]
    fn prepared_pack_resume_without_metrics_keeps_metrics_empty() {
        let raw = r#"{
          "packQualityScore": 71,
          "candidateFacts": [{"fact":"Led onboarding","evidence":"Resume says led onboarding","strength":"medium"}]
        }"#;
        let dto = normalize_from_raw(raw).expect("normalize");
        assert!(dto.candidate_facts[0].metrics.is_empty());
    }

    #[test]
    fn prepared_pack_extracts_jd_keywords_and_company_values() {
        let raw = r#"{
          "packQualityScore": 65,
          "candidateFacts": [{"fact":"Built services","evidence":"Resume includes backend services","strength":"medium"}],
          "roleKeywords": ["distributed systems","ownership"],
          "companyValues": ["customer obsession","bias for action"]
        }"#;
        let dto = normalize_from_raw(raw).expect("normalize");
        assert_eq!(dto.role_keywords.len(), 2);
        assert_eq!(dto.company_values.len(), 2);
    }

    #[test]
    fn prepared_pack_malformed_json_is_repaired_or_rejected_safely() {
        let malformed = r#"noise {"packQualityScore": 50, "candidateFacts": [{"fact":"X","evidence":"Y","strength":"weak"}]} tail"#;
        let ok = normalize_from_raw(malformed).expect("repair");
        assert_eq!(ok.pack_quality_score, 50);
        let bad = "not-json-at-all";
        assert!(normalize_from_raw(bad).is_err());
    }

    #[test]
    fn prepared_pack_log_detail_has_no_raw_resume_or_jd() {
        let raw = "Alice at Example Corp";
        let jd = "Need Rust engineer";
        let detail = build_prepare_log_detail(raw, jd, "");
        assert!(!detail.contains(raw));
        assert!(!detail.contains(jd));
        assert!(detail.contains("resume_chars="));
    }
}
