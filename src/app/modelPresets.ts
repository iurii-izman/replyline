export type ModelPresetProviderKind = "openrouter" | "openai_compatible" | "custom";
export type CostTier = "free" | "low" | "standard" | "premium";
export type LatencyTier = "fast" | "balanced" | "quality";

export type ModelPreset = {
  id: string;
  title: string;
  providerKind: ModelPresetProviderKind;
  baseUrl: string;
  primaryModel: string;
  fallbackModels: string[];
  costTier: CostTier;
  latencyTier: LatencyTier;
  supportsStructuredOutputs: boolean;
  requiresCredits: boolean;
  freeTierCaveats: string;
  lastReviewedAt: string;
  notes: string;
};

export const MODEL_PRESETS: readonly ModelPreset[] = [
  {
    id: "openrouter_free_dev",
    title: "OpenRouter Free / Dev",
    providerKind: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    primaryModel: "openai/gpt-4o-mini",
    fallbackModels: ["google/gemini-2.0-flash-exp:free", "meta-llama/llama-3.3-70b-instruct:free"],
    costTier: "free",
    latencyTier: "fast",
    supportsStructuredOutputs: true,
    requiresCredits: false,
    freeTierCaveats: "Free models can be rate-limited and availability may vary.",
    lastReviewedAt: "2026-05-17",
    notes: "Good for development checks. Validate output quality before production use.",
  },
  {
    id: "openrouter_fast_budget",
    title: "OpenRouter Fast / Budget",
    providerKind: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    primaryModel: "openai/gpt-4o-mini",
    fallbackModels: ["anthropic/claude-3.5-haiku", "google/gemini-2.0-flash-001"],
    costTier: "low",
    latencyTier: "fast",
    supportsStructuredOutputs: true,
    requiresCredits: true,
    freeTierCaveats: "",
    lastReviewedAt: "2026-05-17",
    notes: "Lower cost profile for steady throughput.",
  },
  {
    id: "openrouter_balanced_paid",
    title: "OpenRouter Balanced Paid",
    providerKind: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    primaryModel: "openai/gpt-4.1-mini",
    fallbackModels: ["anthropic/claude-3.7-sonnet", "google/gemini-2.5-flash"],
    costTier: "standard",
    latencyTier: "balanced",
    supportsStructuredOutputs: true,
    requiresCredits: true,
    freeTierCaveats: "",
    lastReviewedAt: "2026-05-17",
    notes: "Balanced quality/cost for daily interview sessions.",
  },
  {
    id: "openrouter_quality_paid",
    title: "OpenRouter Quality Paid",
    providerKind: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    primaryModel: "anthropic/claude-3.7-sonnet",
    fallbackModels: ["openai/gpt-4.1", "google/gemini-2.5-pro"],
    costTier: "premium",
    latencyTier: "quality",
    supportsStructuredOutputs: true,
    requiresCredits: true,
    freeTierCaveats: "",
    lastReviewedAt: "2026-05-17",
    notes: "Higher quality profile. Validate against golden dataset before rollout.",
  },
  {
    id: "custom_openai_compatible",
    title: "Custom OpenAI-compatible",
    providerKind: "custom",
    baseUrl: "",
    primaryModel: "",
    fallbackModels: [],
    costTier: "standard",
    latencyTier: "balanced",
    supportsStructuredOutputs: true,
    requiresCredits: false,
    freeTierCaveats: "",
    lastReviewedAt: "2026-05-17",
    notes: "Manual route. Use your own base URL and model.",
  },
] as const;

export const DEFAULT_MODEL_PRESET_ID = "custom_openai_compatible";

export function resolveModelPreset(presetId: string): ModelPreset {
  return (
    MODEL_PRESETS.find((preset) => preset.id === presetId) ??
    MODEL_PRESETS.find((preset) => preset.id === DEFAULT_MODEL_PRESET_ID)!
  );
}
