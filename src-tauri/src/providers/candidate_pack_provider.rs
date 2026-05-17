use crate::candidate_pack;
use crate::types::{AppSettings, CandidatePackDraftDto};

use super::openai_compatible;

pub async fn prepare_candidate_pack(
    settings: &AppSettings,
    api_key: Option<&str>,
    raw_resume: &str,
    job_description: &str,
    company_values_text: &str,
) -> Result<CandidatePackDraftDto, String> {
    let user_prompt =
        candidate_pack::build_prepare_prompt(raw_resume, job_description, company_values_text);
    let (raw_text, _prefix) = openai_compatible::request_card_raw_text(
        &settings.llm_base_url,
        &settings.llm_model,
        &[],
        api_key,
        candidate_pack::system_prompt(),
        &user_prompt,
        candidate_pack::max_tokens(),
    )
    .await?;
    candidate_pack::normalize_from_raw(&raw_text)
}
