use crate::card_v3::CardQualityFlags;
use crate::diag_contract::{RL_CARD_NORM_TIMED, RL_LLM_REQUEST_TIMED};
use crate::llm;
use crate::pipeline_timing::{PipelineTimer, StageTiming};
use crate::prompt_registry::resolve_answer_profile;
use crate::types::{AnalysisCardDto, AppSettings};

use super::openai_compatible;

const MAX_CARD_RETRY_ATTEMPTS: usize = 1;

#[derive(Debug, Clone)]
pub struct CardGenerationOutcome {
    pub card: AnalysisCardDto,
    pub retry_attempted: bool,
    pub retry_success: bool,
    #[allow(dead_code)]
    pub quality: CardQualityFlags,
    pub llm_stage_timings: Vec<StageTiming>,
    pub card_norm_timing: Option<StageTiming>,
}

/// Analyze a transcript using the configured LLM provider and return a
/// card generation outcome.
///
/// This is the LLM provider boundary — the pipeline calls this function
/// without knowing which concrete LLM implementation is behind it.
pub async fn analyze_transcript(
    settings: &AppSettings,
    api_key: Option<&str>,
    transcript: &str,
    context: &str,
) -> Result<CardGenerationOutcome, String> {
    let language = crate::language_profile::llm_language().to_string();
    let profile = resolve_answer_profile(&settings.active_answer_profile);
    let mut all_timings: Vec<StageTiming> = Vec::new();
    let llm_timer = PipelineTimer::start();
    let (raw_text, parse_or_request_err) = request_card_with_prompt(
        settings,
        api_key,
        transcript,
        context,
        &language,
        profile,
        None,
        llm::PRIMARY_MAX_TOKENS,
    )
    .await?;
    all_timings.push(llm_timer.measure("llm_request", "ok", RL_LLM_REQUEST_TIMED));
    let norm_timer = PipelineTimer::start();
    match llm::normalize_from_raw(&raw_text, transcript, profile) {
        Ok((card, quality)) => {
            let norm_timing = norm_timer.measure("card_normalization", "ok", RL_CARD_NORM_TIMED);
            Ok(CardGenerationOutcome {
                card,
                retry_attempted: false,
                retry_success: false,
                quality,
                llm_stage_timings: all_timings,
                card_norm_timing: Some(norm_timing),
            })
        }
        Err(err) if err.contains("Card output invalid:") && MAX_CARD_RETRY_ATTEMPTS > 0 => {
            let _ = norm_timer.measure("card_normalization", "fail", RL_CARD_NORM_TIMED);
            let retry_llm_timer = PipelineTimer::start();
            let (retry_raw_text, _parse_or_request_err) = request_card_with_prompt(
                settings,
                api_key,
                transcript,
                context,
                &language,
                profile,
                Some(
                    "RETRY MODE: stricter CardSchemaV3. answer_now must be a 2-sentence paragraph with owner/deadline or clarifier. next_step must name artifact+owner+deadline.",
                ),
                llm::RETRY_MAX_TOKENS,
            )
            .await?;
            all_timings.push(retry_llm_timer.measure(
                "llm_request_retry",
                "ok",
                RL_LLM_REQUEST_TIMED,
            ));
            let retry_norm_timer = PipelineTimer::start();
            let (card, quality) = llm::normalize_from_raw(&retry_raw_text, transcript, profile)
                .map_err(|retry_err| format!("{err} | retry_failed: {retry_err}"))?;
            let retry_norm_timing =
                retry_norm_timer.measure("card_normalization_retry", "ok", RL_CARD_NORM_TIMED);
            Ok(CardGenerationOutcome {
                card,
                retry_attempted: true,
                retry_success: true,
                quality,
                llm_stage_timings: all_timings,
                card_norm_timing: Some(retry_norm_timing),
            })
        }
        Err(err) if err.contains("LLM returned invalid JSON") => {
            let _ = norm_timer.measure("card_normalization", "fail", RL_CARD_NORM_TIMED);
            Err(format!("{parse_or_request_err}{err}"))
        }
        Err(err) => {
            let _ = norm_timer.measure("card_normalization", "fail", RL_CARD_NORM_TIMED);
            Err(err)
        }
    }
}

/// Build the full prompt and call the OpenAI-compatible provider.
#[allow(clippy::too_many_arguments)]
async fn request_card_with_prompt(
    settings: &AppSettings,
    api_key: Option<&str>,
    transcript: &str,
    context: &str,
    language: &str,
    profile: &crate::prompt_registry::AnswerProfileConfig,
    extra_suffix: Option<&str>,
    max_tokens: u16,
) -> Result<(String, String), String> {
    let user_prompt = llm::build_user_prompt(transcript, context, language, profile, extra_suffix);
    let system_prompt = llm::system_prompt_for_profile(profile, language);

    openai_compatible::request_card_raw_text(
        &settings.llm_base_url,
        &settings.llm_model,
        api_key,
        system_prompt,
        &user_prompt,
        max_tokens,
    )
    .await
}
