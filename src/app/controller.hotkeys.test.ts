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
      isBilingualHotkeyMode: () => false,
      isBilingualDegraded: () => false,
      triggerBilingualHotkeyAnswer: vi.fn(async () => undefined),
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

  it("routes release to bilingual answer when bilingual mode is active", async () => {
    const triggerBilingualHotkeyAnswer = vi.fn(async () => undefined);
    let handler: ((event: { state: "Pressed" | "Released" }) => Promise<void> | void) | null = null;
    const hotkeys = createHotkeys({
      platform: {
        invoke: vi.fn(async (cmd: string) => {
          if (cmd === "get_setup_status") {
            return {
              deepgramKeyPresent: true,
              llmKeyPresent: true,
              llmRouteConfigured: true,
              runtimePathReady: true,
            };
          }
          return null;
        }),
        shortcuts: {
          unregisterAll: vi.fn(async () => undefined),
          isRegistered: vi.fn(async () => false),
          register: vi.fn(async (_hotkey, fn) => {
            handler = fn as typeof handler;
          }),
        },
        window: {},
      } as never,
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
      setSettings: vi.fn() as never,
      setHotkeyFailed: vi.fn() as never,
      setDeepgramSaved: vi.fn() as never,
      setLlmKeySaved: vi.fn() as never,
      setLlmRouteConfigured: vi.fn() as never,
      setLastCommandErrorKind: vi.fn() as never,
      setActiveRunId: vi.fn() as never,
      isBilingualHotkeyMode: () => true,
      isBilingualDegraded: () => false,
      triggerBilingualHotkeyAnswer,
      notices: { pushNotice: vi.fn(), dismissNotice: vi.fn(), clearNoticeTimer: vi.fn() },
      showWindow: vi.fn(async () => undefined),
      applyContextStatus: vi.fn(),
    });
    await hotkeys.registerCurrentHotkey("Ctrl+Alt+Space");
    await handler?.({ state: "Pressed" });
    await handler?.({ state: "Released" });
    expect(triggerBilingualHotkeyAnswer).toHaveBeenCalledTimes(1);
  });

  it("keeps capture_start/capture_stop route when bilingual mode is inactive", async () => {
    let handler: ((event: { state: "Pressed" | "Released" }) => Promise<void> | void) | null = null;
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === "get_setup_status") {
        return {
          deepgramKeyPresent: true,
          llmKeyPresent: true,
          llmRouteConfigured: true,
          runtimePathReady: true,
        };
      }
      if (cmd === "capture_start") return "run-1";
      if (cmd === "capture_stop_and_analyze") {
        return { gist: "g", sayNow: "a", nextMove: "n", charsBand: "normal" };
      }
      if (cmd === "get_context_status") {
        return { contextActive: true, entryCount: 1, canRetryLastTranscript: true };
      }
      return null;
    });
    const hotkeys = createHotkeys({
      platform: {
        invoke,
        shortcuts: {
          unregisterAll: vi.fn(async () => undefined),
          isRegistered: vi.fn(async () => false),
          register: vi.fn(async (_hotkey, fn) => {
            handler = fn as typeof handler;
          }),
        },
        window: {},
      } as never,
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
      setSettings: vi.fn() as never,
      setHotkeyFailed: vi.fn() as never,
      setDeepgramSaved: vi.fn() as never,
      setLlmKeySaved: vi.fn() as never,
      setLlmRouteConfigured: vi.fn() as never,
      setLastCommandErrorKind: vi.fn() as never,
      setActiveRunId: vi.fn() as never,
      isBilingualHotkeyMode: () => false,
      isBilingualDegraded: () => false,
      triggerBilingualHotkeyAnswer: vi.fn(async () => undefined),
      notices: { pushNotice: vi.fn(), dismissNotice: vi.fn(), clearNoticeTimer: vi.fn() },
      showWindow: vi.fn(async () => undefined),
      applyContextStatus: vi.fn(),
    });
    await hotkeys.registerCurrentHotkey("Ctrl+Alt+Space");
    await handler?.({ state: "Pressed" });
    await handler?.({ state: "Released" });
    expect(invoke).toHaveBeenCalledWith("capture_start");
    expect(invoke).toHaveBeenCalledWith("capture_stop_and_analyze");
  });

  it("falls back to batch capture when bilingual mode is degraded", async () => {
    let handler: ((event: { state: "Pressed" | "Released" }) => Promise<void> | void) | null = null;
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === "get_setup_status") {
        return {
          deepgramKeyPresent: true,
          llmKeyPresent: true,
          llmRouteConfigured: true,
          runtimePathReady: true,
        };
      }
      if (cmd === "capture_start") return "run-1";
      if (cmd === "capture_stop_and_analyze") {
        return { gist: "g", sayNow: "a", nextMove: "n", charsBand: "normal" };
      }
      if (cmd === "get_context_status") {
        return { contextActive: true, entryCount: 1, canRetryLastTranscript: true };
      }
      return null;
    });
    const pushNotice = vi.fn();
    const triggerBilingualHotkeyAnswer = vi.fn(async () => undefined);
    const hotkeys = createHotkeys({
      platform: {
        invoke,
        shortcuts: {
          unregisterAll: vi.fn(async () => undefined),
          isRegistered: vi.fn(async () => false),
          register: vi.fn(async (_hotkey, fn) => {
            handler = fn as typeof handler;
          }),
        },
        window: {},
      } as never,
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
      setSettings: vi.fn() as never,
      setHotkeyFailed: vi.fn() as never,
      setDeepgramSaved: vi.fn() as never,
      setLlmKeySaved: vi.fn() as never,
      setLlmRouteConfigured: vi.fn() as never,
      setLastCommandErrorKind: vi.fn() as never,
      setActiveRunId: vi.fn() as never,
      isBilingualHotkeyMode: () => true,
      isBilingualDegraded: () => true,
      triggerBilingualHotkeyAnswer,
      notices: { pushNotice, dismissNotice: vi.fn(), clearNoticeTimer: vi.fn() },
      showWindow: vi.fn(async () => undefined),
      applyContextStatus: vi.fn(),
    });
    await hotkeys.registerCurrentHotkey("Ctrl+Alt+Space");
    await handler?.({ state: "Pressed" });
    await handler?.({ state: "Released" });
    expect(triggerBilingualHotkeyAnswer).not.toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledWith("capture_start");
    expect(invoke).toHaveBeenCalledWith("capture_stop_and_analyze");
    expect(pushNotice).toHaveBeenCalledTimes(1);
  });
});
