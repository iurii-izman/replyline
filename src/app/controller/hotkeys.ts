import type { Accessor, Setter } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import type {
  Phase,
  AnalysisCard,
  AnalysisCardDto,
  AppSettings,
  ContextStatusDto,
  CommandErrorKind,
  SetupStatusDto,
  Panel,
} from "../model";
import type { UiStrings } from "../locale";
import type { AppPlatform } from "../platform";
import type { NoticeApi } from "./notices";
import { emitUiEvent } from "../observability";
import {
  invokeErrorMessage,
  parseCommandInvokeError,
  userSafeCaptureStartError,
  userSafePipelineError,
  formatHotkeyFromEvent,
  asAnalysisCard,
} from "../model";

export interface HotkeyDeps {
  platform: AppPlatform;
  phase: Accessor<Phase>;
  pipelineActive: Accessor<boolean>;
  setupRequired: Accessor<boolean>;
  strings: Accessor<UiStrings>;
  setError: Setter<string | null>;
  setPhase: Setter<Phase>;
  setPanel: Setter<Panel>;
  setCard: (card: AnalysisCard | null) => void;
  setCaptureQuality: Setter<"short" | "normal" | "long">;
  setContextActive: Setter<boolean>;
  settings: Accessor<AppSettings>;
  setSettings: SetStoreFunction<AppSettings>;
  setHotkeyFailed: Setter<boolean>;
  setDeepgramSaved: Setter<boolean>;
  setLlmKeySaved: Setter<boolean>;
  setLlmRouteConfigured: Setter<boolean>;
  setLastCommandErrorKind: Setter<CommandErrorKind | null>;
  setActiveRunId: Setter<string | null>;
  isBilingualHotkeyMode: () => boolean;
  isBilingualDegraded: () => boolean;
  triggerBilingualHotkeyAnswer: () => Promise<void>;
  notices: NoticeApi;
  showWindow: (panelName?: Panel) => Promise<void>;
  applyContextStatus: (status: ContextStatusDto) => void;
}

export interface HotkeyApi {
  registerCurrentHotkey: (hotkey: string) => Promise<void>;
  captureHotkeyInput: (event: KeyboardEvent) => void;
}

export function createHotkeys(deps: HotkeyDeps): HotkeyApi {
  const emitClientEvent = async (event: string, fields: Record<string, string | boolean>) =>
    emitUiEvent(deps.platform, event, fields);

  const clearCaptureAlwaysOnTop = async () => {
    if (deps.platform.window.setAlwaysOnTop && deps.settings().keepOnTopDuringCapture) {
      await deps.platform.window.setAlwaysOnTop(false);
    }
  };
  const resolveCaptureQuality = (
    charsBand: AnalysisCard["charsBand"],
  ): "short" | "normal" | "long" => {
    if (charsBand === "short") return "short";
    if (charsBand === "long") return "long";
    return "normal";
  };

  async function registerCurrentHotkey(hotkey: string) {
    await deps.platform.shortcuts.unregisterAll();
    const alreadyRegistered = await deps.platform.shortcuts.isRegistered(hotkey);
    if (alreadyRegistered) throw new Error(deps.strings().notices.hotkeyAlreadyRegistered);
    let armed = false;
    let currentRunId: string | null = null;
    const handlePressed = async () => {
      void emitClientEvent("hotkey_pressed", {
        state: "Pressed",
        source: "hotkey",
        phase: "capture",
      });
      if (deps.pipelineActive()) return;
      deps.setError(null);
      deps.notices.dismissNotice();
      void emitClientEvent("setup_preflight_check_start", {
        source: "hotkey_press",
        phase: "settings",
      });
      const setupStatus = await deps.platform.invoke<SetupStatusDto>("get_setup_status");
      void emitClientEvent("setup_preflight_check_result", {
        source: "hotkey_press",
        phase: "settings",
        deepgram_key_present: String(setupStatus.deepgramKeyPresent),
        llm_key_present: String(setupStatus.llmKeyPresent),
        llm_route_configured: String(setupStatus.llmRouteConfigured),
        runtime_path_ready: String(setupStatus.runtimePathReady),
      });
      deps.setDeepgramSaved(setupStatus.deepgramKeyPresent);
      deps.setLlmKeySaved(setupStatus.llmKeyPresent);
      deps.setLlmRouteConfigured(setupStatus.llmRouteConfigured);
      if (!setupStatus.runtimePathReady || deps.setupRequired()) {
        void emitClientEvent("setup_missing_redirect", {
          phase: "settings",
          runtime_path_ready: String(setupStatus.runtimePathReady),
          setup_required: String(deps.setupRequired()),
        });
        deps.setPanel("settings");
        deps.setPhase("idle");
        await deps.showWindow("settings");
        return;
      }
      if (deps.isBilingualHotkeyMode()) {
        if (deps.isBilingualDegraded()) {
          deps.notices.pushNotice({
            tone: "info",
            message: deps.strings().card.bilingual.status.degraded,
          });
        } else {
          armed = true;
          deps.setPhase("capturing");
          deps.setCard(null);
          return;
        }
      }
      deps.setPhase("capturing");
      try {
        if (deps.platform.window.setAlwaysOnTop && deps.settings().keepOnTopDuringCapture) {
          await deps.platform.window.setAlwaysOnTop(true);
        }
        void emitClientEvent("capture_start_requested", {
          source: "hotkey_press",
          phase: "capture",
        });
        const runId = await deps.platform.invoke<string>("capture_start");
        void emitClientEvent("capture_start_client_ok", {
          source: "hotkey_press",
          phase: "capture",
          run_id: runId || "-",
        });
        deps.setActiveRunId(runId || null);
        currentRunId = runId || null;
        armed = true;
        deps.setCard(null);
      } catch (err) {
        void emitClientEvent("capture_start_client_failed", {
          source: "hotkey_press",
          phase: "capture",
        });
        await clearCaptureAlwaysOnTop();
        armed = false;
        deps.setActiveRunId(null);
        currentRunId = null;
        const message = userSafeCaptureStartError(deps.strings());
        deps.setError(message);
        deps.notices.pushNotice({
          tone: "error",
          message,
        });
        deps.setLastCommandErrorKind(parseCommandInvokeError(err)?.kind ?? null);
        deps.setPhase("idle");
      }
    };
    const handleReleased = async () => {
      void emitClientEvent("hotkey_released", {
        state: "Released",
        source: "hotkey",
        phase: "capture",
      });
      if (!armed) return;
      armed = false;
      deps.setPhase("transcribing");
      try {
        if (deps.isBilingualHotkeyMode() && !deps.isBilingualDegraded()) {
          await deps.triggerBilingualHotkeyAnswer();
          deps.setPhase("ready");
          deps.setActiveRunId(null);
          currentRunId = null;
          await clearCaptureAlwaysOnTop();
          return;
        }
        void emitClientEvent("capture_stop_requested", {
          source: "hotkey_release",
          phase: "capture",
          run_id: currentRunId ?? "unknown",
        });
        const result = await deps.platform.invoke<AnalysisCardDto>("capture_stop_and_analyze");
        const card = asAnalysisCard(result);
        deps.setCard(card);
        deps.setCaptureQuality(resolveCaptureQuality(card.charsBand));
        deps.setContextActive(true);
        const status = await deps.platform.invoke<ContextStatusDto>("get_context_status");
        deps.applyContextStatus(status);
        deps.setPhase("ready");
        void emitClientEvent("ui_ready", {
          phase: "ready",
          card_present: String(Boolean(card.sayNow.trim())),
          gist_present: String(Boolean(card.gist.trim())),
          next_move_present: String(Boolean(card.nextMove.trim())),
        });
        void emitClientEvent("ui_answer_ready", {
          phase: "ready",
          card_present: String(Boolean(card.sayNow.trim())),
          gist_present: String(Boolean(card.gist.trim())),
          next_move_present: String(Boolean(card.nextMove.trim())),
        });
        deps.setActiveRunId(null);
        currentRunId = null;
        await clearCaptureAlwaysOnTop();
      } catch (err) {
        void emitClientEvent("capture_stop_client_failed", {
          source: "hotkey_release",
          phase: "capture",
        });
        deps.setLastCommandErrorKind(parseCommandInvokeError(err)?.kind ?? null);
        const message = userSafePipelineError(err, deps.strings());
        deps.setError(message);
        if (invokeErrorMessage(err).includes("SHORT_CAPTURE")) deps.setCaptureQuality("short");
        deps.notices.pushNotice({
          tone: "error",
          message,
        });
        deps.setPhase("idle");
        deps.setActiveRunId(null);
        currentRunId = null;
        await clearCaptureAlwaysOnTop();
      }
    };
    await deps.platform.shortcuts.register(hotkey, async (event) => {
      if (event.state === "Pressed") return handlePressed();
      if (event.state === "Released") return handleReleased();
    });
    void emitClientEvent("hotkey_registered", { hotkey, phase: "settings" });
  }

  function captureHotkeyInput(event: KeyboardEvent) {
    event.preventDefault();
    const hotkey = formatHotkeyFromEvent(event);
    if (hotkey) deps.setSettings("hotkey", hotkey);
  }

  return { registerCurrentHotkey, captureHotkeyInput };
}
