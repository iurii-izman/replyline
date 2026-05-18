import { describe, expect, it } from "vitest";

import { DEFAULT_MODEL_PRESET_ID, MODEL_PRESETS, resolveModelPreset } from "./modelPresets";

describe("model preset contract", () => {
  it("keeps known preset ids stable", () => {
    expect(MODEL_PRESETS.map((preset) => preset.id)).toEqual([
      "openrouter_free_dev",
      "openrouter_fast_budget",
      "openrouter_balanced_paid",
      "openrouter_quality_paid",
      "custom_openai_compatible",
    ]);
  });

  it("enforces OpenRouter fallback ladder and custom compatibility", () => {
    for (const preset of MODEL_PRESETS) {
      if (preset.id.startsWith("openrouter_")) {
        expect(preset.providerKind).toBe("openrouter");
        expect(preset.fallbackModels.length).toBeGreaterThan(0);
      }
    }

    const custom = resolveModelPreset("custom_openai_compatible");
    expect(custom.providerKind).toBe("custom");
    expect(custom.fallbackModels).toEqual([]);
  });

  it("falls back safely on unknown preset id", () => {
    const fallback = resolveModelPreset("unknown_preset_id");
    expect(fallback.id).toBe(DEFAULT_MODEL_PRESET_ID);
    expect(fallback.providerKind).toBe("custom");
  });
});
