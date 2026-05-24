use crate::candidate_pack;
use crate::types::{AppSettings, CandidatePackDraftDto};

use super::openai_compatible;

fn candidate_pack_request_policy() -> openai_compatible::LlmRequestPolicy {
    // Candidate Pack prompts are significantly larger than runtime answer prompts.
    // Use a wider budget to reduce false timeouts on long resume/JD inputs.
    openai_compatible::LlmRequestPolicy {
        total_budget_ms: 45_000,
        per_attempt_timeout_ms: 25_000,
        max_retries: 1,
        retry_base_ms: 500,
        retry_max_backoff_ms: 1_500,
        enable_fast_fallback: true,
    }
}

pub async fn prepare_candidate_pack(
    settings: &AppSettings,
    api_key: Option<&str>,
    raw_resume: &str,
    job_description: &str,
    company_values_text: &str,
) -> Result<CandidatePackDraftDto, String> {
    let user_prompt =
        candidate_pack::build_prepare_prompt(raw_resume, job_description, company_values_text);
    let (raw_text, _prefix, _telemetry) = openai_compatible::request_card_raw_text(
        None,
        settings.debug_trace_full_enabled(),
        &settings.llm_base_url,
        &settings.llm_model,
        &[],
        api_key,
        candidate_pack::system_prompt(),
        &user_prompt,
        candidate_pack::max_tokens(),
        candidate_pack_request_policy(),
    )
    .await?;
    candidate_pack::normalize_from_raw(&raw_text)
}
