use crate::card_v3::CardQualityFlags;
use crate::diag_contract::{RL_CARD_NORM_TIMED, RL_LLM_REQUEST_TIMED};
use crate::interview_card_v1;
use crate::llm;
use crate::model_presets::{resolve_model_preset, ProviderKind};
use crate::pipeline_timing::{PipelineTimer, StageTiming};
use crate::prompt_registry::resolve_answer_profile;
use crate::types::{AnalysisCardDto, AppSettings};

use super::openai_compatible;

const MAX_CARD_RETRY_ATTEMPTS: usize = 1;

fn fallback_models_for_selected_preset(preset_id: &str) -> &'static [&'static str] {
    let preset = resolve_model_preset(preset_id);
    if preset.provider_kind == ProviderKind::OpenRouter {
        preset.fallback_models
    } else {
        &[]
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AnalysisMode {
    WorkConversation,
    Interview,
}

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
    mode: AnalysisMode,
) -> Result<CardGenerationOutcome, String> {
    match mode {
        AnalysisMode::WorkConversation => {
            analyze_work_conversation(settings, api_key, transcript, context).await
        }
        AnalysisMode::Interview => analyze_interview(settings, api_key, transcript, context).await,
    }
}

async fn analyze_work_conversation(
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
                    "RETRY MODE: stricter CardSchemaV3. answer_now must be a concise 2-4 sentence paragraph with a direct response and concrete action (owner/deadline when possible). Use clarifier only when ambiguity blocks a direct response. next_step must name artifact+owner+deadline.",
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

async fn analyze_interview(
    settings: &AppSettings,
    api_key: Option<&str>,
    transcript: &str,
    context: &str,
) -> Result<CardGenerationOutcome, String> {
    let language = crate::language_profile::llm_language().to_string();
    let profile = resolve_answer_profile(&settings.active_answer_profile);
    let mut all_timings: Vec<StageTiming> = Vec::new();

    let base_llm_timer = PipelineTimer::start();
    let (base_raw_text, parse_or_request_err) = request_card_with_prompt(
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
    all_timings.push(base_llm_timer.measure("llm_request", "ok", RL_LLM_REQUEST_TIMED));

    let base_norm_timer = PipelineTimer::start();
    let (mut card, quality) = llm::normalize_from_raw(&base_raw_text, transcript, profile)
        .map_err(|err| format!("{parse_or_request_err}{err}"))?;
    let base_norm_timing = base_norm_timer.measure("card_normalization", "ok", RL_CARD_NORM_TIMED);

    let interview_outcome = interview_card_v1::generate_interview_card_with_conditional_repair(
        transcript,
        context,
        &language,
        profile,
        |system_prompt, user_prompt, max_tokens| async move {
            request_raw_with_prompts(settings, api_key, &system_prompt, &user_prompt, max_tokens)
                .await
        },
    )
    .await?;

    card.say_now = interview_outcome.card.answer.main.clone();
    card.interview_card_schema_v1 = Some(interview_outcome.card);

    Ok(CardGenerationOutcome {
        card,
        retry_attempted: interview_outcome.telemetry.interview_repair_attempted,
        retry_success: interview_outcome.telemetry.interview_repair_success,
        quality,
        llm_stage_timings: all_timings,
        card_norm_timing: Some(base_norm_timing),
    })
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
    let fallback_models = fallback_models_for_selected_preset(&settings.selected_model_preset);

    openai_compatible::request_card_raw_text(
        &settings.llm_base_url,
        &settings.llm_model,
        fallback_models,
        api_key,
        system_prompt,
        &user_prompt,
        max_tokens,
    )
    .await
}

async fn request_raw_with_prompts(
    settings: &AppSettings,
    api_key: Option<&str>,
    system_prompt: &str,
    user_prompt: &str,
    max_tokens: u16,
) -> Result<(String, String), String> {
    let fallback_models = fallback_models_for_selected_preset(&settings.selected_model_preset);

    openai_compatible::request_card_raw_text(
        &settings.llm_base_url,
        &settings.llm_model,
        fallback_models,
        api_key,
        system_prompt,
        user_prompt,
        max_tokens,
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::fallback_models_for_selected_preset;

    #[test]
    fn openrouter_preset_has_fallbacks() {
        let models = fallback_models_for_selected_preset("openrouter_free_dev");
        assert!(!models.is_empty());
    }

    #[test]
    fn custom_preset_has_no_fallbacks() {
        let models = fallback_models_for_selected_preset("custom_openai_compatible");
        assert!(models.is_empty());
    }

    #[test]
    fn unknown_preset_has_safe_empty_fallback() {
        let models = fallback_models_for_selected_preset("unknown_preset_id");
        assert!(models.is_empty());
    }
}
