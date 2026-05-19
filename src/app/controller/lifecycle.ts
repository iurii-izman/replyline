import { onCleanup, onMount, type Accessor, type Setter } from "solid-js";
import type { Phase, Panel, AnalysisCard, StatusEvent } from "../model";
import type { UiStrings } from "../locale";
import type { AppPlatform } from "../platform";
import type { NoticeApi } from "./notices";
import type { SettingsActions } from "./settingsActions";

export interface LifecycleDeps {
  platform: AppPlatform;
  strings: Accessor<UiStrings>;
  activeRunId: Accessor<string | null>;
  setPhase: Setter<Phase>;
  setStatusDetail: Setter<string | null>;
  setContextActive: Setter<boolean>;
  setContextEntryCount: Setter<number>;
  setLastTranscriptPreview: Setter<string | null>;
  setCard: (card: AnalysisCard | null) => void;
  notices: NoticeApi;
  settingsActions: SettingsActions;
  showWindow: (panelName?: Panel) => Promise<void>;
}

/**
 * Pure guard: returns true when the status event should be accepted.
 * Rejects events that carry a runId different from the active one,
 * which indicates a stale event from a previous pipeline run.
 */
export function shouldAcceptStatusEvent(
  activeRunId: string | null,
  eventRunId: string | undefined,
): boolean {
  if (activeRunId && eventRunId && eventRunId !== activeRunId) {
    return false;
  }
  return true;
}

export function setupLifecycle(deps: LifecycleDeps): void {
  onMount(() => {
    const cleanups: Array<() => void> = [];
    onCleanup(() => {
      for (const c of cleanups) c();
      deps.notices.clearNoticeTimer();
      void deps.platform.shortcuts.unregisterAll();
    });
    void deps.settingsActions.reloadBootstrap();
    void (async () => {
      cleanups.push(
        await deps.platform.listen<StatusEvent>("replyline://status", (event) => {
          if (!shouldAcceptStatusEvent(deps.activeRunId(), event.payload.runId)) {
            return;
          }
          const nextPhase = event.payload.phase as Phase;
          if (["transcribing", "analyzing", "ready"].includes(nextPhase)) deps.setPhase(nextPhase);
          deps.setStatusDetail(event.payload.detail ?? null);
        }),
      );
      cleanups.push(
        await deps.platform.listen("replyline://open-settings", async () => {
          await deps.showWindow("settings");
        }),
      );
      cleanups.push(
        await deps.platform.listen("replyline://context-cleared", () => {
          deps.setContextActive(false);
          deps.setContextEntryCount(0);
          deps.setLastTranscriptPreview(null);
          deps.setCard(null);
          deps.setPhase("idle");
          deps.notices.pushNotice({
            tone: "info",
            message: deps.strings().notices.contextCleared,
          });
        }),
      );
      cleanups.push(
        await deps.platform.window.onCloseRequested(async (event) => {
          // Keep desktop semantics tray-first: native close hides the main window.
          event.preventDefault();
          await deps.platform.window.hide();
        }),
      );
    })();
  });
}
