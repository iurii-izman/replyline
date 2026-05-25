import { describe, expect, it, vi } from "vitest";
import { createHotkeys } from "./controller/hotkeys";
import { ui_ru } from "./locale";

describe("createHotkeys", () => {
  it("captureHotkeyInput writes normalized chord", () => {
    const setSettings = vi.fn();
    const hotkeys = createHotkeys({
      platform: {} as never,
      phase: () => "idle",
      pipelineActive: () => false,
      setupRequired: () => false,
      strings: () => ui_ru,
      setError: vi.fn() as never,
      setPhase: vi.fn() as never,
      setPanel: vi.fn() as never,
      setCard: vi.fn(),
      setCaptureQuality: vi.fn() as never,
      setContextActive: vi.fn() as never,
      settings: () => ({ keepOnTopDuringCapture: false } as never),
      setSettings: setSettings as never,
      setHotkeyFailed: vi.fn() as never,
      setDeepgramSaved: vi.fn() as never,
      setLlmKeySaved: vi.fn() as never,
      setLlmRouteConfigured: vi.fn() as never,
      setLastCommandErrorKind: vi.fn() as never,
      setActiveRunId: vi.fn() as never,
      notices: { pushNotice: vi.fn(), dismissNotice: vi.fn(), clearNoticeTimer: vi.fn() },
      showWindow: vi.fn(async () => undefined),
      applyContextStatus: vi.fn(),
    });

    const ev = {
      key: "k",
      ctrlKey: true,
      altKey: true,
      shiftKey: false,
      metaKey: false,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    hotkeys.captureHotkeyInput(ev);
    expect(setSettings).toHaveBeenCalledWith("hotkey", "Ctrl+Alt+K");
  });
});
