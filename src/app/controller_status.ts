import type { UiStrings } from "./locale";
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
  if (input.phase === "analyzing") return { phase: "analyzing", detail: null };
  if (input.phase === "ready") return { phase: "ready_card", detail: null };
  if (input.hotkeyFailed) return { phase: "hotkey_failed", detail: null };
  if (input.phase === "error" || input.hasError) return { phase: "error", detail: null };
  if (input.setupRequired) return { phase: "setup_needed", detail: null };
  return { phase: "idle_ready", detail: null };
}

export function phaseLabelFor(phase: Phase, setupRequired: boolean, hotkeyFailed: boolean, s: UiStrings): string {
  switch (phase) {
    case "booting":
      return s.phase.booting;
    case "capturing":
      return s.phase.capturing;
    case "transcribing":
      return s.phase.transcribing;
    case "analyzing":
      return s.phase.analyzing;
    case "ready":
      return s.phase.ready;
    case "error":
      return s.phase.error;
    default:
      if (hotkeyFailed) return s.phase.hotkeyFail;
      if (setupRequired) return s.phase.setupNeeded;
      return s.phase.idleReady;
  }
}
