import { ui } from "./locale";
import type { Phase } from "./model";

type TrayPayloadInput = {
  phase: Phase;
  statusDetail: string | null;
  setupRequired: boolean;
  hotkeyFailed: boolean;
  hasError: boolean;
};

export function traySyncPayload(input: TrayPayloadInput): { phase: string; detail: string | null } {
  if (input.phase === "booting") return { phase: "booting", detail: null };
  if (input.phase === "capturing") return { phase: "capturing", detail: null };
  if (input.phase === "transcribing") return { phase: "transcribing", detail: null };
  if (input.phase === "analyzing") {
    const detail = input.statusDetail;
    return {
      phase: "analyzing",
      detail: detail && detail.length <= 48 ? detail : null,
    };
  }
  if (input.phase === "ready") return { phase: "ready_card", detail: null };
  if (input.hotkeyFailed) return { phase: "hotkey_failed", detail: null };
  if (input.phase === "error" || input.hasError) return { phase: "error", detail: null };
  if (input.setupRequired) return { phase: "setup_needed", detail: null };
  return { phase: "idle_ready", detail: null };
}

export function phaseLabelFor(
  phase: Phase,
  setupRequired: boolean,
  hotkeyFailed: boolean,
): string {
  switch (phase) {
    case "booting":
      return ui.phase.booting;
    case "capturing":
      return ui.phase.capturing;
    case "transcribing":
      return ui.phase.transcribing;
    case "analyzing":
      return ui.phase.analyzing;
    case "ready":
      return ui.phase.ready;
    case "error":
      return ui.phase.error;
    default:
      if (hotkeyFailed) return ui.phase.hotkeyFail;
      if (setupRequired) return ui.phase.setupNeeded;
      return ui.phase.idleReady;
  }
}

export function livePhaseHeadlineFor(phase: Phase): string {
  switch (phase) {
    case "capturing":
      return ui.livePhase.capturingHeadline;
    case "transcribing":
      return ui.livePhase.transcribingHeadline;
    case "analyzing":
      return ui.livePhase.analyzingHeadline;
    default:
      return "";
  }
}

export function livePhaseSubFor(phase: Phase): string {
  switch (phase) {
    case "capturing":
      return ui.livePhase.capturingSub;
    case "transcribing":
      return ui.livePhase.transcribingSub;
    case "analyzing":
      return ui.livePhase.analyzingSub;
    default:
      return "";
  }
}
