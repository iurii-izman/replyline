#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProviderKind {
    OpenRouter,
    OpenAiCompatible,
    Custom,
}

#[derive(Debug, Clone)]
pub struct ModelPreset {
    pub provider_kind: ProviderKind,
    pub fallback_models: &'static [&'static str],
}

const OPENROUTER_FREE_FALLBACKS: &[&str] = &[
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free",
];
const OPENROUTER_FAST_FALLBACKS: &[&str] =
    &["anthropic/claude-3.5-haiku", "google/gemini-2.0-flash-001"];
const OPENROUTER_BALANCED_FALLBACKS: &[&str] =
    &["anthropic/claude-3.7-sonnet", "google/gemini-2.5-flash"];
const OPENROUTER_QUALITY_FALLBACKS: &[&str] = &["openai/gpt-4.1", "google/gemini-2.5-pro"];

pub fn resolve_model_preset(id: &str) -> ModelPreset {
    match id.trim() {
        "openrouter_free_dev" => ModelPreset {
            provider_kind: ProviderKind::OpenRouter,
            fallback_models: OPENROUTER_FREE_FALLBACKS,
        },
        "openrouter_fast_budget" => ModelPreset {
            provider_kind: ProviderKind::OpenRouter,
            fallback_models: OPENROUTER_FAST_FALLBACKS,
        },
        "openrouter_balanced_paid" => ModelPreset {
            provider_kind: ProviderKind::OpenRouter,
            fallback_models: OPENROUTER_BALANCED_FALLBACKS,
        },
        "openrouter_quality_paid" => ModelPreset {
            provider_kind: ProviderKind::OpenRouter,
            fallback_models: OPENROUTER_QUALITY_FALLBACKS,
        },
        "custom_openai_compatible" => ModelPreset {
            provider_kind: ProviderKind::Custom,
            fallback_models: &[],
        },
        _ => ModelPreset {
            provider_kind: ProviderKind::OpenAiCompatible,
            fallback_models: &[],
        },
    }
}

#[cfg(test)]
mod tests {
    use super::{resolve_model_preset, ProviderKind};

    #[test]
    fn openrouter_preset_contains_fallback_models() {
        let preset = resolve_model_preset("openrouter_free_dev");
        assert_eq!(preset.provider_kind, ProviderKind::OpenRouter);
        assert!(!preset.fallback_models.is_empty());
    }

    #[test]
    fn custom_preset_has_no_fallback_models() {
        let preset = resolve_model_preset("custom_openai_compatible");
        assert_eq!(preset.provider_kind, ProviderKind::Custom);
        assert!(preset.fallback_models.is_empty());
    }
}
