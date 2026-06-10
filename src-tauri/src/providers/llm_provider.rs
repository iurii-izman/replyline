use crate::card_v3::CardQualityFlags;
use crate::diag_contract::{RL_CARD_NORM_TIMED, RL_LLM_REQUEST_TIMED};
use crate::interview_card_v1;
use crate::llm;
use crate::model_presets::{resolve_model_preset, ProviderKind};
use crate::pipeline_timing::{PipelineTimer, StageTiming};
use crate::prompt_registry::resolve_answer_profile;
use crate::trace_manifest;
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
    pub llm_transport_retries: u32,
    pub llm_fast_fallback_used: bool,
    pub llm_fast_fallback_reason: Option<&'static str>,
}

/// Analyze a transcript using the configured LLM provider and return a
/// card generation outcome.
///
/// This is the LLM provider boundary — the pipeline calls this function
/// without knowing which concrete LLM implementation is behind it.
pub async fn analyze_transcript(
    run_id: Option<&str>,
    include_content: bool,
    settings: &AppSettings,
    api_key: Option<&str>,
    transcript: &str,
    context: &str,
    mode: AnalysisMode,
) -> Result<CardGenerationOutcome, String> {
    match mode {
        AnalysisMode::WorkConversation => {
            analyze_work_conversation(
                run_id,
                include_content,
                settings,
                api_key,
                transcript,
                context,
            )
            .await
        }
        AnalysisMode::Interview => {
            analyze_interview(
                run_id,
                include_content,
                settings,
                api_key,
                transcript,
                context,
            )
            .await
        }
    }
}

async fn analyze_work_conversation(
    run_id: Option<&str>,
    include_content: bool,
    settings: &AppSettings,
    api_key: Option<&str>,
    transcript: &str,
    context: &str,
) -> Result<CardGenerationOutcome, String> {
    let language = crate::language_profile::llm_language().to_string();
    let profile = resolve_answer_profile(&settings.active_answer_profile);
    let mut all_timings: Vec<StageTiming> = Vec::new();
    let llm_timer = PipelineTimer::start();
    let (raw_text, parse_or_request_err, llm_telemetry) = request_card_with_prompt(
        run_id,
        include_content,
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
            write_card_trace(run_id, include_content, &card, true);
            let norm_timing = norm_timer.measure("card_normalization", "ok", RL_CARD_NORM_TIMED);
            Ok(CardGenerationOutcome {
                card,
                retry_attempted: false,
                retry_success: false,
                quality,
                llm_stage_timings: all_timings,
                card_norm_timing: Some(norm_timing),
                llm_transport_retries: llm_telemetry.retry_count,
                llm_fast_fallback_used: llm_telemetry.fallback_used,
                llm_fast_fallback_reason: llm_telemetry.fallback_reason,
            })
        }
        Err(err) if err.contains("Card output invalid:") && MAX_CARD_RETRY_ATTEMPTS > 0 => {
            let _ = norm_timer.measure("card_normalization", "fail", RL_CARD_NORM_TIMED);
            let retry_llm_timer = PipelineTimer::start();
            let (retry_raw_text, _parse_or_request_err, retry_llm_telemetry) = request_card_with_prompt(
                run_id,
                include_content,
                settings,
                api_key,
                transcript,
                context,
                &language,
                profile,
                Some(
                    "RETRY MODE: stricter CardSchemaV3. answer_now must be a concise 2-4 sentence paragraph with a direct response. Use a concrete action for work questions and a direct factual answer for knowledge questions. For a 1-2 word fragment without a clear question, do not infer meaning; ask one concrete clarifying question. Never invent names, owners, dates, or deadlines. Use a clarifier only when ambiguity blocks a direct response. next_step must stay relevant to the actual question.",
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
            write_card_trace(run_id, include_content, &card, true);
            Ok(CardGenerationOutcome {
                card,
                retry_attempted: true,
                retry_success: true,
                quality,
                llm_stage_timings: all_timings,
                card_norm_timing: Some(retry_norm_timing),
                llm_transport_retries: llm_telemetry.retry_count + retry_llm_telemetry.retry_count,
                llm_fast_fallback_used: llm_telemetry.fallback_used
                    || retry_llm_telemetry.fallback_used,
                llm_fast_fallback_reason: llm_telemetry
                    .fallback_reason
                    .or(retry_llm_telemetry.fallback_reason),
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
    run_id: Option<&str>,
    include_content: bool,
    settings: &AppSettings,
    api_key: Option<&str>,
    transcript: &str,
    context: &str,
) -> Result<CardGenerationOutcome, String> {
    let language = crate::language_profile::llm_language().to_string();
    let profile = resolve_answer_profile(&settings.active_answer_profile);
    let mut all_timings: Vec<StageTiming> = Vec::new();

    let base_llm_timer = PipelineTimer::start();
    let (base_raw_text, parse_or_request_err, base_llm_telemetry) = request_card_with_prompt(
        run_id,
        include_content,
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
            let (raw, prefix, _telemetry) = request_raw_with_prompts(
                run_id,
                include_content,
                settings,
                api_key,
                &system_prompt,
                &user_prompt,
                max_tokens,
            )
            .await?;
            Ok((raw, prefix))
        },
    )
    .await?;

    card.say_now = interview_outcome.card.answer.main.clone();
    card.interview_card_schema_v1 = Some(interview_outcome.card);
    write_card_trace(run_id, include_content, &card, true);

    Ok(CardGenerationOutcome {
        card,
        retry_attempted: interview_outcome.telemetry.interview_repair_attempted,
        retry_success: interview_outcome.telemetry.interview_repair_success,
        quality,
        llm_stage_timings: all_timings,
        card_norm_timing: Some(base_norm_timing),
        llm_transport_retries: base_llm_telemetry.retry_count,
        llm_fast_fallback_used: base_llm_telemetry.fallback_used,
        llm_fast_fallback_reason: base_llm_telemetry.fallback_reason,
    })
}

/// Build the full prompt and call the OpenAI-compatible provider.
#[allow(clippy::too_many_arguments)]
async fn request_card_with_prompt(
    run_id: Option<&str>,
    include_content: bool,
    settings: &AppSettings,
    api_key: Option<&str>,
    transcript: &str,
    context: &str,
    language: &str,
    profile: &crate::prompt_registry::AnswerProfileConfig,
    extra_suffix: Option<&str>,
    max_tokens: u16,
) -> Result<(String, String, openai_compatible::LlmRequestTelemetry), String> {
    let user_prompt = llm::build_user_prompt(transcript, context, language, profile, extra_suffix);
    let system_prompt = llm::system_prompt_for_profile(profile, language);
    if include_content {
        if let Some(rid) = run_id {
            let _ = trace_manifest::write_run_text(rid, "transcript.full.txt", transcript);
            let _ = trace_manifest::write_run_text(rid, "context.full.txt", context);
            let _ =
                trace_manifest::write_run_text(rid, "llm-system-prompt.full.txt", system_prompt);
            let _ = trace_manifest::write_run_text(rid, "llm-user-prompt.full.txt", &user_prompt);
        }
    }
    let fallback_models = fallback_models_for_selected_preset(&settings.selected_model_preset);

    openai_compatible::request_card_raw_text(
        run_id,
        include_content,
        &settings.llm_base_url,
        &settings.llm_model,
        fallback_models,
        api_key,
        system_prompt,
        &user_prompt,
        max_tokens,
        openai_compatible::LlmRequestPolicy::default(),
    )
    .await
}

async fn request_raw_with_prompts(
    run_id: Option<&str>,
    include_content: bool,
    settings: &AppSettings,
    api_key: Option<&str>,
    system_prompt: &str,
    user_prompt: &str,
    max_tokens: u16,
) -> Result<(String, String, openai_compatible::LlmRequestTelemetry), String> {
    if include_content {
        if let Some(rid) = run_id {
            let _ =
                trace_manifest::write_run_text(rid, "llm-system-prompt.full.txt", system_prompt);
            let _ = trace_manifest::write_run_text(rid, "llm-user-prompt.full.txt", user_prompt);
        }
    }
    let fallback_models = fallback_models_for_selected_preset(&settings.selected_model_preset);

    openai_compatible::request_card_raw_text(
        run_id,
        include_content,
        &settings.llm_base_url,
        &settings.llm_model,
        fallback_models,
        api_key,
        system_prompt,
        user_prompt,
        max_tokens,
        openai_compatible::LlmRequestPolicy::default(),
    )
    .await
}

fn write_card_trace(
    run_id: Option<&str>,
    include_content: bool,
    card: &AnalysisCardDto,
    schema_valid: bool,
) {
    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct CardField {
        chars: usize,
        hash: String,
    }
    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct CardSnapshot {
        schema_version: u8,
        gist: CardField,
        say_now: CardField,
        next_move: CardField,
        gist_preview: String,
        say_now_preview: String,
        next_move_preview: String,
        repair_used: bool,
        fallback_used: bool,
        chars_band: String,
        card_schema_validity: bool,
        interview_schema_present: bool,
    }
    if let Some(rid) = run_id {
        let snapshot = CardSnapshot {
            schema_version: 1,
            gist: CardField {
                chars: card.gist.chars().count(),
                hash: trace_manifest::sha256_hex(&card.gist),
            },
            say_now: CardField {
                chars: card.say_now.chars().count(),
                hash: trace_manifest::sha256_hex(&card.say_now),
            },
            next_move: CardField {
                chars: card.next_move.chars().count(),
                hash: trace_manifest::sha256_hex(&card.next_move),
            },
            gist_preview: if include_content {
                card.gist.clone()
            } else {
                "[redacted]".to_string()
            },
            say_now_preview: if include_content {
                card.say_now.clone()
            } else {
                "[redacted]".to_string()
            },
            next_move_preview: if include_content {
                card.next_move.clone()
            } else {
                "[redacted]".to_string()
            },
            repair_used: card.repair_used,
            fallback_used: card.fallback_used,
            chars_band: card.chars_band.clone(),
            card_schema_validity: schema_valid,
            interview_schema_present: card.interview_card_schema_v1.is_some(),
        };
        let _ = trace_manifest::write_run_json(rid, "card.redacted.json", &snapshot);
        if include_content {
            let _ = trace_manifest::write_run_json(rid, "card.full.json", card);
        }
    }
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
