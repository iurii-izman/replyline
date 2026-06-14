import type { UiStrings } from "../locale";

export type CommandErrorKind = "Settings" | "Credential" | "Capture" | "Pipeline" | "Internal";

export type ErrorSettingsAnchor = "hotkey" | "stt" | "llm";

export function settingsAnchorForCommandErrorKind(kind: CommandErrorKind): ErrorSettingsAnchor {
  switch (kind) {
    case "Credential":
      return "stt";
    case "Settings":
    case "Pipeline":
      return "llm";
    case "Capture":
    case "Internal":
      return "hotkey";
  }
}

const COMMAND_ERROR_KINDS: CommandErrorKind[] = [
  "Settings",
  "Credential",
  "Capture",
  "Pipeline",
  "Internal",
];

export type ParsedCommandError = {
  kind: CommandErrorKind;
  message: string;
};

function rawInvokeErrorString(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return String(err);
}

function isCommandErrorPayload(value: unknown): value is ParsedCommandError {
  if (!value || typeof value !== "object") return false;
  const kind = (value as { kind?: unknown }).kind;
  const message = (value as { message?: unknown }).message;
  return (
    typeof message === "string" &&
    typeof kind === "string" &&
    (COMMAND_ERROR_KINDS as string[]).includes(kind)
  );
}

export function parseCommandInvokeError(err: unknown): ParsedCommandError | null {
  const raw = rawInvokeErrorString(err).trim();
  const tryParse = (s: string): ParsedCommandError | null => {
    try {
      const o = JSON.parse(s) as unknown;
      return isCommandErrorPayload(o) ? o : null;
    } catch {
      return null;
    }
  };
  const direct = tryParse(raw);
  if (direct) return direct;
  const brace = raw.indexOf("{");
  if (brace >= 0) return tryParse(raw.slice(brace));
  return null;
}

export function invokeErrorMessage(err: unknown): string {
  const parsed = parseCommandInvokeError(err);
  if (parsed) return parsed.message;
  return rawInvokeErrorString(err);
}

export function userSafeCaptureStartError(strings: UiStrings): string {
  return strings.errors.captureStart;
}

export function userSafePipelineError(err: unknown, strings: UiStrings): string {
  const s = invokeErrorMessage(err);
  if (/Nothing to retry|nothing to retry/i.test(s)) {
    return strings.errors.pipelineNothingToRetry;
  }
  if (/STT_NO_SPEECH|STT_EMPTY|empty transcript|no audible signal/i.test(s)) {
    return strings.errors.pipelineNoSpeech;
  }
  if (/SHORT_CAPTURE|слишком короткий фрагмент/i.test(s)) {
    return strings.errors.pipelineShortCapture;
  }
  if (/RL_CARD_INVALID|Card output invalid|repair_failed/i.test(s)) {
    return strings.errors.pipelineCardInvalid;
  }
  if (/Deepgram|STT_HTTP|STT_REQUEST|API key|unauthorized|forbidden/i.test(s)) {
    return strings.errors.pipelineDeepgram;
  }
  if (/LLM|gateway|401|403|http|timeout/i.test(s)) {
    return strings.errors.pipelineLlm;
  }
  return strings.errors.pipelineGeneric;
}

export function userSafeBootstrapLoadError(strings: UiStrings): string {
  return strings.errors.bootstrapLoad;
}

export function userSafeClearContextError(strings: UiStrings): string {
  return strings.errors.clearContext;
}

export function mapSettingsSaveError(err: unknown, strings: UiStrings): string | null {
  const s = invokeErrorMessage(err);
  if (s.includes("HOTKEY_REQUIRED")) return strings.errors.settingsHotkeyRequired;
  if (s.includes("HOTKEY_RESERVED")) return strings.errors.settingsHotkeyRequired;
  if (s.includes("MODEL_REQUIRED")) return strings.errors.settingsModelRequired;
  if (s.includes("INVALID_URL") || /^URL:/i.test(s)) return strings.errors.settingsInvalidUrl;
  if (s.includes("CAPTURE_RANGE_INVALID")) return strings.errors.settingsCaptureRange;
  if (s.includes("EMPTY_SECRET_NOT_SAVED")) return strings.errors.settingsEmptySecret;
  return null;
}
