use serde::{Deserialize, Serialize};

pub const INTERVIEW_PROMPT_VERSION: &str = "interview-v1";
pub const INTERVIEW_SCHEMA_VERSION: &str = "InterviewCardSchemaV1";
pub const DEFAULT_ANSWER_PROFILE_ID: &str = "work_default";

/// Backward-compatible alias mapping: old interview_* ids → current work_* ids.
const PROFILE_ALIASES: &[(&str, &str)] = &[
    ("interview_default", "work_default"),
    ("interview_concise", "work_concise"),
    ("interview_star", "work_structured"),
    ("interview_executive", "work_executive"),
    ("interview_technical", "work_technical"),
    ("interview_product", "work_product"),
    ("interview_hr", "work_people"),
];

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AnswerProfileMode {
    WorkConversation,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StructurePreference {
    Star,
    Case,
    Direct,
    Technical,
    Executive,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ClarifierPolicy {
    OnlyWhenBlocked,
    AllowWhenAmbiguous,
    NeverDefault,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AntiHallucinationLevel {
    Strict,
    High,
    Standard,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AnswerProfileConfig {
    pub id: &'static str,
    pub title: &'static str,
    pub description: &'static str,
    pub mode: AnswerProfileMode,
    pub prompt_version: &'static str,
    pub schema_version: &'static str,
    pub answer_word_min: usize,
    pub answer_word_max: usize,
    pub short_word_max: usize,
    pub strong_word_max: usize,
    pub tone: &'static str,
    pub structure_preference: StructurePreference,
    pub clarifier_policy: ClarifierPolicy,
    pub anti_hallucination_level: AntiHallucinationLevel,
}

const PROFILES: [AnswerProfileConfig; 7] = [
    AnswerProfileConfig {
        id: "work_default",
        title: "Work Default",
        description: "Balanced answer: speakable reply with reasoning, concrete next step.",
        mode: AnswerProfileMode::WorkConversation,
        prompt_version: INTERVIEW_PROMPT_VERSION,
        schema_version: INTERVIEW_SCHEMA_VERSION,
        answer_word_min: 18,
        answer_word_max: 180,
        short_word_max: 56,
        strong_word_max: 90,
        tone: "clear, calm, confident",
        structure_preference: StructurePreference::Direct,
        clarifier_policy: ClarifierPolicy::AllowWhenAmbiguous,
        anti_hallucination_level: AntiHallucinationLevel::High,
    },
    AnswerProfileConfig {
        id: "work_concise",
        title: "Work Concise",
        description: "Short answer first, then one concrete action.",
        mode: AnswerProfileMode::WorkConversation,
        prompt_version: INTERVIEW_PROMPT_VERSION,
        schema_version: INTERVIEW_SCHEMA_VERSION,
        answer_word_min: 12,
        answer_word_max: 80,
        short_word_max: 42,
        strong_word_max: 56,
        tone: "brief, direct, practical",
        structure_preference: StructurePreference::Direct,
        clarifier_policy: ClarifierPolicy::OnlyWhenBlocked,
        anti_hallucination_level: AntiHallucinationLevel::Strict,
    },
    AnswerProfileConfig {
        id: "work_structured",
        title: "Work Structured",
        description: "Structured answer with explicit situation-action-result logic.",
        mode: AnswerProfileMode::WorkConversation,
        prompt_version: INTERVIEW_PROMPT_VERSION,
        schema_version: INTERVIEW_SCHEMA_VERSION,
        answer_word_min: 24,
        answer_word_max: 180,
        short_word_max: 60,
        strong_word_max: 100,
        tone: "structured, concrete, outcome-oriented",
        structure_preference: StructurePreference::Star,
        clarifier_policy: ClarifierPolicy::AllowWhenAmbiguous,
        anti_hallucination_level: AntiHallucinationLevel::High,
    },
    AnswerProfileConfig {
        id: "work_executive",
        title: "Work Executive",
        description: "Executive tone: crisp recommendation, risk framing, accountable next step.",
        mode: AnswerProfileMode::WorkConversation,
        prompt_version: INTERVIEW_PROMPT_VERSION,
        schema_version: INTERVIEW_SCHEMA_VERSION,
        answer_word_min: 20,
        answer_word_max: 140,
        short_word_max: 54,
        strong_word_max: 84,
        tone: "confident, concise, accountable",
        structure_preference: StructurePreference::Executive,
        clarifier_policy: ClarifierPolicy::OnlyWhenBlocked,
        anti_hallucination_level: AntiHallucinationLevel::Strict,
    },
    AnswerProfileConfig {
        id: "work_technical",
        title: "Work Technical",
        description: "Technical explanation with assumptions, mechanism, and tradeoffs.",
        mode: AnswerProfileMode::WorkConversation,
        prompt_version: INTERVIEW_PROMPT_VERSION,
        schema_version: INTERVIEW_SCHEMA_VERSION,
        answer_word_min: 24,
        answer_word_max: 180,
        short_word_max: 64,
        strong_word_max: 100,
        tone: "technical, precise, direct",
        structure_preference: StructurePreference::Technical,
        clarifier_policy: ClarifierPolicy::AllowWhenAmbiguous,
        anti_hallucination_level: AntiHallucinationLevel::Strict,
    },
    AnswerProfileConfig {
        id: "work_product",
        title: "Work Product",
        description: "Product framing with user impact, tradeoff, and decision path.",
        mode: AnswerProfileMode::WorkConversation,
        prompt_version: INTERVIEW_PROMPT_VERSION,
        schema_version: INTERVIEW_SCHEMA_VERSION,
        answer_word_min: 22,
        answer_word_max: 160,
        short_word_max: 58,
        strong_word_max: 92,
        tone: "product-minded, pragmatic, user-focused",
        structure_preference: StructurePreference::Case,
        clarifier_policy: ClarifierPolicy::AllowWhenAmbiguous,
        anti_hallucination_level: AntiHallucinationLevel::High,
    },
    AnswerProfileConfig {
        id: "work_people",
        title: "Work People",
        description: "Professional people-oriented framing with policy-safe wording.",
        mode: AnswerProfileMode::WorkConversation,
        prompt_version: INTERVIEW_PROMPT_VERSION,
        schema_version: INTERVIEW_SCHEMA_VERSION,
        answer_word_min: 18,
        answer_word_max: 140,
        short_word_max: 52,
        strong_word_max: 82,
        tone: "professional, respectful, policy-aware",
        structure_preference: StructurePreference::Direct,
        clarifier_policy: ClarifierPolicy::OnlyWhenBlocked,
        anti_hallucination_level: AntiHallucinationLevel::Strict,
    },
];

#[allow(dead_code)]
pub fn all_profiles() -> &'static [AnswerProfileConfig] {
    &PROFILES
}

/// Resolves a profile id to its config, accepting both current `work_*` ids
/// and legacy `interview_*` aliases for backward compatibility.
pub fn resolve_answer_profile(profile_id: &str) -> &'static AnswerProfileConfig {
    let resolved_id = resolve_alias(profile_id);
    PROFILES
        .iter()
        .find(|profile| profile.id == resolved_id)
        .unwrap_or_else(|| default_answer_profile())
}

pub fn default_answer_profile() -> &'static AnswerProfileConfig {
    PROFILES
        .iter()
        .find(|profile| profile.id == DEFAULT_ANSWER_PROFILE_ID)
        .expect("default answer profile must exist")
}

fn resolve_alias(id: &str) -> &str {
    for (alias, target) in PROFILE_ALIASES {
        if *alias == id {
            return target;
        }
    }
    id
}

#[cfg(test)]
mod tests {
    use super::{
        default_answer_profile, resolve_answer_profile, StructurePreference,
        DEFAULT_ANSWER_PROFILE_ID,
    };

    #[test]
    fn default_profile_is_selected() {
        assert_eq!(default_answer_profile().id, "work_default");
    }

    #[test]
    fn concise_profile_has_shorter_limits() {
        let concise = resolve_answer_profile("work_concise");
        let default = resolve_answer_profile("work_default");
        assert!(concise.answer_word_max < default.answer_word_max);
    }

    #[test]
    fn structured_profile_prefers_star_structure() {
        let profile = resolve_answer_profile("work_structured");
        assert_eq!(profile.structure_preference, StructurePreference::Star);
    }

    #[test]
    fn technical_profile_prefers_technical_structure() {
        let profile = resolve_answer_profile("work_technical");
        assert_eq!(profile.structure_preference, StructurePreference::Technical);
    }

    #[test]
    fn unknown_profile_falls_back_to_default() {
        let fallback = resolve_answer_profile("unknown_profile");
        assert_eq!(fallback.id, DEFAULT_ANSWER_PROFILE_ID);
    }

    // ── Backward compatibility aliases ──

    #[test]
    fn alias_interview_default_resolves_to_work_default() {
        let profile = resolve_answer_profile("interview_default");
        assert_eq!(profile.id, "work_default");
    }

    #[test]
    fn alias_interview_concise_resolves_to_work_concise() {
        let profile = resolve_answer_profile("interview_concise");
        assert_eq!(profile.id, "work_concise");
    }

    #[test]
    fn alias_interview_star_resolves_to_work_structured() {
        let profile = resolve_answer_profile("interview_star");
        assert_eq!(profile.id, "work_structured");
    }

    #[test]
    fn alias_interview_executive_resolves_to_work_executive() {
        let profile = resolve_answer_profile("interview_executive");
        assert_eq!(profile.id, "work_executive");
    }

    #[test]
    fn alias_interview_technical_resolves_to_work_technical() {
        let profile = resolve_answer_profile("interview_technical");
        assert_eq!(profile.id, "work_technical");
    }

    #[test]
    fn alias_interview_product_resolves_to_work_product() {
        let profile = resolve_answer_profile("interview_product");
        assert_eq!(profile.id, "work_product");
    }

    #[test]
    fn alias_interview_hr_resolves_to_work_people() {
        let profile = resolve_answer_profile("interview_hr");
        assert_eq!(profile.id, "work_people");
    }
}
