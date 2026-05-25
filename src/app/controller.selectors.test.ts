import { describe, expect, it } from "vitest";
import { createRoot } from "solid-js";
import { createSignal } from "solid-js";
import { createSelectors } from "./controller/selectors";
import { ui_ru } from "./locale";

describe("createSelectors", () => {
  it("derives ready state and action enablement", () => {
    createRoot((dispose) => {
      const [phase] = createSignal<"ready">("ready");
      const [card] = createSignal({ mode: "work", sayNow: "reply", gist: "g", nextMove: "n", charsBand: "normal" } as never);
      const [error] = createSignal<string | null>(null);
      const [deepgramSaved] = createSignal(true);
      const [hotkeyFailed] = createSignal(false);
      const [contextActive] = createSignal(true);
      const [llmRouteConfigured] = createSignal(true);
      const [setupReadinessState] = createSignal<"ready">("ready");
      const [strings] = createSignal(ui_ru);

      const selectors = createSelectors({
        phase,
        card,
        error,
        deepgramSaved,
        hotkeyFailed,
        contextActive,
        llmRouteConfigured,
        setupReadinessState,
        strings,
      });

      expect(selectors.mainUiState()).toBe("ready");
      expect(selectors.canCopySayNow()).toBe(true);
      expect(selectors.canRetry()).toBe(true);
      expect(selectors.canClear()).toBe(true);
      dispose();
    });
  });

  it("exposes setup required when readiness is missing", () => {
    createRoot((dispose) => {
      const [phase] = createSignal<"idle">("idle");
      const [card] = createSignal(null);
      const [error] = createSignal<string | null>(null);
      const [deepgramSaved] = createSignal(false);
      const [hotkeyFailed] = createSignal(false);
      const [contextActive] = createSignal(false);
      const [llmRouteConfigured] = createSignal(false);
      const [setupReadinessState] = createSignal<"missing">("missing");
      const [strings] = createSignal(ui_ru);

      const selectors = createSelectors({
        phase,
        card,
        error,
        deepgramSaved,
        hotkeyFailed,
        contextActive,
        llmRouteConfigured,
        setupReadinessState,
        strings,
      });

      expect(selectors.setupRequired()).toBe(true);
      expect(selectors.allSetupReady()).toBe(false);
      expect(selectors.mainUiState()).toBe("idle");
      dispose();
    });
  });
});
