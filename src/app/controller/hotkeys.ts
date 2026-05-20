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
} from "../model";
import type { UiStrings } from "../locale";
import type { AppPlatform } from "../platform";
import type { Panel } from "../model";
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
        if (deps.pipelineActive()) return;
        deps.setError(null);
        deps.notices.dismissNotice();
        const setupStatus = await deps.platform.invoke<SetupStatusDto>("get_setup_status");
        deps.setDeepgramSaved(setupStatus.deepgramKeyPresent);
        deps.setLlmKeySaved(setupStatus.llmKeyPresent);
        if (!setupStatus.runtimePathReady || deps.setupRequired()) {
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
          const runId = await deps.platform.invoke<string>("capture_start");
          deps.setActiveRunId(runId || null);
          armed = true;
          deps.setCard(null);
        } catch (err) {
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
        if (!armed) return;
        armed = false;
        deps.setPhase("transcribing");
        try {
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
          deps.setActiveRunId(null);
          await clearCaptureAlwaysOnTop();
        } catch (err) {
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
  }

  function captureHotkeyInput(event: KeyboardEvent) {
    event.preventDefault();
    const hotkey = formatHotkeyFromEvent(event);
    if (hotkey) deps.setSettings("hotkey", hotkey);
  }

  return { registerCurrentHotkey, captureHotkeyInput };
}
