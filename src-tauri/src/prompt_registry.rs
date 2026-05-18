use serde::{Deserialize, Serialize};

pub const INTERVIEW_PROMPT_VERSION: &str = "interview-v1";
pub const INTERVIEW_SCHEMA_VERSION: &str = "InterviewCardSchemaV1";
pub const DEFAULT_ANSWER_PROFILE_ID: &str = "interview_default";

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AnswerProfileMode {
    Interview,
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
        id: "interview_default",
        title: "Interview Default",
        description: "Balanced interview answer with clear action and concrete next step.",
        mode: AnswerProfileMode::Interview,
        prompt_version: INTERVIEW_PROMPT_VERSION,
        schema_version: INTERVIEW_SCHEMA_VERSION,
        answer_word_min: 14,
        answer_word_max: 90,
        short_word_max: 56,
        strong_word_max: 90,
        tone: "clear, calm, confident",
        structure_preference: StructurePreference::Direct,
        clarifier_policy: ClarifierPolicy::AllowWhenAmbiguous,
        anti_hallucination_level: AntiHallucinationLevel::High,
    },
    AnswerProfileConfig {
        id: "interview_concise",
        title: "Interview Concise",
        description: "Short answer first, then one concrete action.",
        mode: AnswerProfileMode::Interview,
        prompt_version: INTERVIEW_PROMPT_VERSION,
        schema_version: INTERVIEW_SCHEMA_VERSION,
        answer_word_min: 10,
        answer_word_max: 56,
        short_word_max: 42,
        strong_word_max: 56,
        tone: "brief, direct, practical",
        structure_preference: StructurePreference::Direct,
        clarifier_policy: ClarifierPolicy::OnlyWhenBlocked,
        anti_hallucination_level: AntiHallucinationLevel::Strict,
    },
    AnswerProfileConfig {
        id: "interview_star",
        title: "Interview STAR",
        description: "Bias to STAR framing with explicit situation-task-action-result logic.",
        mode: AnswerProfileMode::Interview,
        prompt_version: INTERVIEW_PROMPT_VERSION,
        schema_version: INTERVIEW_SCHEMA_VERSION,
        answer_word_min: 16,
        answer_word_max: 100,
        short_word_max: 60,
        strong_word_max: 100,
        tone: "structured, concrete, outcome-oriented",
        structure_preference: StructurePreference::Star,
        clarifier_policy: ClarifierPolicy::AllowWhenAmbiguous,
        anti_hallucination_level: AntiHallucinationLevel::High,
    },
    AnswerProfileConfig {
        id: "interview_executive",
        title: "Interview Executive",
        description: "Executive tone: crisp recommendation, risk framing, accountable next step.",
        mode: AnswerProfileMode::Interview,
        prompt_version: INTERVIEW_PROMPT_VERSION,
        schema_version: INTERVIEW_SCHEMA_VERSION,
        answer_word_min: 14,
        answer_word_max: 84,
        short_word_max: 54,
        strong_word_max: 84,
        tone: "confident, concise, accountable",
        structure_preference: StructurePreference::Executive,
        clarifier_policy: ClarifierPolicy::OnlyWhenBlocked,
        anti_hallucination_level: AntiHallucinationLevel::Strict,
    },
    AnswerProfileConfig {
        id: "interview_technical",
        title: "Interview Technical",
        description: "Technical explanation with assumptions, mechanism, and tradeoffs.",
        mode: AnswerProfileMode::Interview,
        prompt_version: INTERVIEW_PROMPT_VERSION,
        schema_version: INTERVIEW_SCHEMA_VERSION,
        answer_word_min: 16,
        answer_word_max: 100,
        short_word_max: 64,
        strong_word_max: 100,
        tone: "technical, precise, direct",
        structure_preference: StructurePreference::Technical,
        clarifier_policy: ClarifierPolicy::AllowWhenAmbiguous,
        anti_hallucination_level: AntiHallucinationLevel::Strict,
    },
    AnswerProfileConfig {
        id: "interview_product",
        title: "Interview Product",
        description: "Product framing with user impact, tradeoff, and decision path.",
        mode: AnswerProfileMode::Interview,
        prompt_version: INTERVIEW_PROMPT_VERSION,
        schema_version: INTERVIEW_SCHEMA_VERSION,
        answer_word_min: 14,
        answer_word_max: 92,
        short_word_max: 58,
        strong_word_max: 92,
        tone: "product-minded, pragmatic, user-focused",
        structure_preference: StructurePreference::Case,
        clarifier_policy: ClarifierPolicy::AllowWhenAmbiguous,
        anti_hallucination_level: AntiHallucinationLevel::High,
    },
    AnswerProfileConfig {
        id: "interview_hr",
        title: "Interview HR",
        description: "Professional people-oriented framing with policy-safe wording.",
        mode: AnswerProfileMode::Interview,
        prompt_version: INTERVIEW_PROMPT_VERSION,
        schema_version: INTERVIEW_SCHEMA_VERSION,
        answer_word_min: 12,
        answer_word_max: 82,
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

pub fn resolve_answer_profile(profile_id: &str) -> &'static AnswerProfileConfig {
    PROFILES
        .iter()
        .find(|profile| profile.id == profile_id)
        .unwrap_or_else(|| default_answer_profile())
}

pub fn default_answer_profile() -> &'static AnswerProfileConfig {
    PROFILES
        .iter()
        .find(|profile| profile.id == DEFAULT_ANSWER_PROFILE_ID)
        .expect("default interview profile must exist")
}

#[cfg(test)]
mod tests {
    use super::{
        default_answer_profile, resolve_answer_profile, StructurePreference,
        DEFAULT_ANSWER_PROFILE_ID,
    };

    #[test]
    fn default_profile_is_selected() {
        assert_eq!(default_answer_profile().id, "interview_default");
    }

    #[test]
    fn concise_profile_has_shorter_limits() {
        let concise = resolve_answer_profile("interview_concise");
        let default = resolve_answer_profile("interview_default");
        assert!(concise.answer_word_max < default.answer_word_max);
        assert!(concise.strong_word_max < default.strong_word_max);
    }

    #[test]
    fn star_profile_prefers_star_structure() {
        let profile = resolve_answer_profile("interview_star");
        assert_eq!(profile.structure_preference, StructurePreference::Star);
    }

    #[test]
    fn technical_profile_prefers_technical_structure() {
        let profile = resolve_answer_profile("interview_technical");
        assert_eq!(profile.structure_preference, StructurePreference::Technical);
    }

    #[test]
    fn unknown_profile_falls_back_to_default() {
        let fallback = resolve_answer_profile("unknown_profile");
        assert_eq!(fallback.id, DEFAULT_ANSWER_PROFILE_ID);
    }
}
