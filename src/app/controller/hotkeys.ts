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
  setLastCommandErrorKind: Setter<CommandErrorKind | null>;
  setActiveRunId: Setter<string | null>;
  notices: NoticeApi;
  showWindow: (panelName?: Panel) => Promise<void>;
  applyContextStatus: (status: ContextStatusDto) => void;
}

export interface HotkeyApi {
  registerCurrentHotkey: (hotkey: string) => Promise<void>;
  captureHotkeyInput: (event: KeyboardEvent) => void;
}

export function createHotkeys(deps: HotkeyDeps): HotkeyApi {
  const emitClientEvent = async (event: string, detail: string) => {
    try {
      await deps.platform.invoke("log_client_event", { event, detail });
    } catch {
      // Telemetry is best-effort and must never block runtime flow.
    }
  };

  const clearCaptureAlwaysOnTop = async () => {
    if (deps.platform.window.setAlwaysOnTop && deps.settings().keepOnTopDuringCapture) {
      await deps.platform.window.setAlwaysOnTop(false);
    }
  };

  async function registerCurrentHotkey(hotkey: string) {
    await deps.platform.shortcuts.unregisterAll();
    const alreadyRegistered = await deps.platform.shortcuts.isRegistered(hotkey);
    if (alreadyRegistered) throw new Error(deps.strings().notices.hotkeyAlreadyRegistered);
    let armed = false;
    await deps.platform.shortcuts.register(hotkey, async (event) => {
      if (event.state === "Pressed") {
        void emitClientEvent("hotkey_pressed", "state=Pressed");
        if (deps.pipelineActive()) return;
        deps.setError(null);
        deps.notices.dismissNotice();
        void emitClientEvent("setup_preflight_check_start", "source=hotkey_press");
        const setupStatus = await deps.platform.invoke<SetupStatusDto>("get_setup_status");
        void emitClientEvent(
          "setup_preflight_check_result",
          `deepgram_key_present=${setupStatus.deepgramKeyPresent} llm_key_present=${setupStatus.llmKeyPresent} llm_route_configured=${setupStatus.llmRouteConfigured} runtime_path_ready=${setupStatus.runtimePathReady}`,
        );
        deps.setDeepgramSaved(setupStatus.deepgramKeyPresent);
        deps.setLlmKeySaved(setupStatus.llmKeyPresent);
        if (!setupStatus.runtimePathReady || deps.setupRequired()) {
          void emitClientEvent(
            "setup_missing_redirect",
            `runtime_path_ready=${setupStatus.runtimePathReady} setup_required=${deps.setupRequired()}`,
          );
          deps.setPanel("settings");
          deps.setPhase("idle");
          await deps.showWindow("settings");
          return;
        }
        deps.setPhase("capturing");
        try {
          if (deps.platform.window.setAlwaysOnTop && deps.settings().keepOnTopDuringCapture) {
            await deps.platform.window.setAlwaysOnTop(true);
          }
          void emitClientEvent("capture_start_requested", "source=hotkey_press");
          const runId = await deps.platform.invoke<string>("capture_start");
          void emitClientEvent("capture_start_client_ok", `run_id_present=${Boolean(runId)}`);
          deps.setActiveRunId(runId || null);
          armed = true;
          deps.setCard(null);
        } catch (err) {
          void emitClientEvent("capture_start_client_failed", "source=hotkey_press");
          await clearCaptureAlwaysOnTop();
          armed = false;
          deps.setActiveRunId(null);
          deps.setError(userSafeCaptureStartError());
          deps.notices.pushNotice({
            tone: "error",
            message: userSafeCaptureStartError(),
          });
          deps.setLastCommandErrorKind(parseCommandInvokeError(err)?.kind ?? null);
          deps.setPhase("idle");
        }
      }
      if (event.state === "Released") {
        void emitClientEvent("hotkey_released", "state=Released");
        if (!armed) return;
        armed = false;
        deps.setPhase("transcribing");
        try {
          void emitClientEvent("capture_stop_requested", "source=hotkey_release");
          const result = await deps.platform.invoke<AnalysisCardDto>("capture_stop_and_analyze");
          const card = asAnalysisCard(result);
          deps.setCard(card);
          deps.setCaptureQuality(
            card.charsBand === "short" ? "short" : card.charsBand === "long" ? "long" : "normal",
          );
          deps.setContextActive(true);
          const status = await deps.platform.invoke<ContextStatusDto>("get_context_status");
          deps.applyContextStatus(status);
          deps.setPhase("ready");
          void emitClientEvent(
            "ui_answer_ready",
            `card_present=${Boolean(card.sayNow.trim())} gist_present=${Boolean(card.gist.trim())} next_move_present=${Boolean(card.nextMove.trim())}`,
          );
          deps.setActiveRunId(null);
          await clearCaptureAlwaysOnTop();
        } catch (err) {
          void emitClientEvent("capture_stop_client_failed", "source=hotkey_release");
          deps.setLastCommandErrorKind(parseCommandInvokeError(err)?.kind ?? null);
          deps.setError(userSafePipelineError(err));
          if (invokeErrorMessage(err).includes("SHORT_CAPTURE")) deps.setCaptureQuality("short");
          deps.notices.pushNotice({
            tone: "error",
            message: userSafePipelineError(err),
          });
          deps.setPhase("idle");
          deps.setActiveRunId(null);
          await clearCaptureAlwaysOnTop();
        }
      }
    });
    void emitClientEvent("hotkey_registered", `hotkey=${hotkey}`);
  }

  function captureHotkeyInput(event: KeyboardEvent) {
    event.preventDefault();
    const hotkey = formatHotkeyFromEvent(event);
    if (hotkey) deps.setSettings("hotkey", hotkey);
  }

  return { registerCurrentHotkey, captureHotkeyInput };
}
