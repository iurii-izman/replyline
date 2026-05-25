import { describe, expect, it, vi } from "vitest";
import { createSettingsActions } from "./controller/settingsActions";
import { ui_ru } from "./locale";

describe("createSettingsActions", () => {
  it("refreshSetupStatus marks runtime ready", async () => {
    const invoke = vi.fn(async () => ({
      deepgramKeyPresent: true,
      llmKeyPresent: true,
      llmRouteConfigured: true,
      runtimePathReady: true,
    }));
    const setSetupReadinessState = vi.fn();
    const setPhase = vi.fn();

    const actions = createSettingsActions({
      platform: { invoke } as never,
      strings: () => ui_ru,
      setupRequired: () => false,
      panel: () => "main",
      settings: {} as never,
      setSettings: vi.fn() as never,
      draftSecrets: { deepgramApiKey: "", llmApiKey: "" },
      setDraftSecrets: vi.fn() as never,
      setError: vi.fn() as never,
      setPhase: setPhase as never,
      setPanel: vi.fn() as never,
      setDeepgramSaved: vi.fn() as never,
      setLlmKeySaved: vi.fn() as never,
      setLlmRouteConfigured: vi.fn() as never,
      setContextActive: vi.fn() as never,
      setContextEntryCount: vi.fn() as never,
      setLastTranscriptPreview: vi.fn() as never,
      setPersistenceDiagnostics: vi.fn() as never,
      setPersistenceDiagnosticsError: vi.fn() as never,
      setSaving: vi.fn() as never,
      setSettingsFormHint: vi.fn() as never,
      setHotkeyFailed: vi.fn() as never,
      setLastCommandErrorKind: vi.fn() as never,
      setupReadinessState: () => "checking",
      setSetupReadinessState: setSetupReadinessState as never,
      startupPanelDecisionPending: () => false,
      setStartupPanelDecisionPending: vi.fn() as never,
      userSelectedPanel: () => false,
      notices: { pushNotice: vi.fn(), dismissNotice: vi.fn(), clearNoticeTimer: vi.fn() },
      hotkeys: { registerCurrentHotkey: vi.fn(), captureHotkeyInput: vi.fn() },
      loadCandidatePack: vi.fn(async () => undefined),
    });

    await actions.refreshSetupStatus();
    expect(setSetupReadinessState).toHaveBeenCalledWith("ready");
    expect(setPhase).toHaveBeenCalledWith("idle");
  });
});
