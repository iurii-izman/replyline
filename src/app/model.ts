export type Phase =
  | "booting"
  | "idle"
  | "capturing"
  | "transcribing"
  | "analyzing"
  | "ready"
  | "error";

export type Panel = "main" | "settings";

export type AppSettings = {
  schemaVersion: number;
  hotkey: string;
  llmBaseUrl: string;
  llmModel: string;
  captureMaxSeconds: number;
};

export type BootstrapDto = {
  settings: AppSettings;
  deepgramKeyPresent: boolean;
  llmKeyPresent: boolean;
  contextActive: boolean;
  contextEntryCount: number;
  runtimeReady: boolean;
};

export type ContextStatusDto = {
  contextActive: boolean;
  entryCount: number;
  lastTranscriptPreview?: string | null;
  canRetryLastTranscript: boolean;
};

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

const COMMAND_ERROR_KINDS: CommandErrorKind[] = ["Settings", "Credential", "Capture", "Pipeline", "Internal"];

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

export type AnalysisCard = {
  gist: string;
  sayNow: string;
  nextMove: string;
  charsBand?: "short" | "medium" | "long";
};

export type StatusEvent = {
  phase: string;
  detail?: string | null;
};

export type MainUiState = "idle" | "capturing" | "transcribing" | "analyzing" | "ready" | "error";

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 2,
  hotkey: "Ctrl+Alt+Space",
  llmBaseUrl: "",
  llmModel: "gpt-4o-mini",
  captureMaxSeconds: 45,
};

export function isConfiguredLlmRoute(baseUrl: string, model: string): boolean {
  return Boolean(baseUrl.trim() && model.trim());
}

function normalizeHotkeyKey(key: string): string | null {
  if (key === " ") return "Space";
  if (key === "Escape") return "Esc";
  if (/^F\d{1,2}$/i.test(key)) return key.toUpperCase();
  if (/^[a-zA-Z]$/.test(key)) return key.toUpperCase();
  if (/^[0-9]$/.test(key)) return key;
  if (key.startsWith("Arrow")) return key.replace("Arrow", "");
  if (["Tab", "Enter", "Backspace", "Delete", "Home", "End", "PageUp", "PageDown"].includes(key)) return key;
  return null;
}

export function formatHotkeyFromEvent(ev: KeyboardEvent): string | null {
  const key = normalizeHotkeyKey(ev.key);
  const parts: string[] = [];
  if (ev.ctrlKey) parts.push("Ctrl");
  if (ev.altKey) parts.push("Alt");
  if (ev.shiftKey) parts.push("Shift");
  if (ev.metaKey) parts.push("Meta");
  if (key && !["Control", "Alt", "Shift", "Meta"].includes(key)) {
    parts.push(key);
  }
  return parts.length >= 2 ? parts.join("+") : null;
}

export function userSafeCaptureStartError(): string {
  return "Запись не началась. Повторите удержание горячей клавиши.";
}

export function userSafePipelineError(err: unknown): string {
  const s = invokeErrorMessage(err);
  if (/Nothing to retry|nothing to retry/i.test(s)) {
    return "Сначала сделайте захват — пересобирать пока нечего.";
  }
  if (/Deepgram|API key|missing|распознаван/i.test(s)) {
    return "Нет текста из звука: проверьте ключ Deepgram.";
  }
  if (/LLM|gateway|401|403|http|timeout/i.test(s)) {
    return "Нет ответа LLM-шлюза: проверьте URL, модель и ключ.";
  }
  if (/SHORT_CAPTURE|слишком короткий фрагмент/i.test(s)) {
    return "Слишком короткий фрагмент, запишите 5-10 секунд.";
  }
  return "Цепочка прервалась. Повторите захват.";
}

export function userSafeBootstrapLoadError(): string {
  return "Не удалось загрузить приложение. Повторите и проверьте настройки.";
}

export function userSafeClearContextError(): string {
  return "Сброс контекста не выполнен. Повторите.";
}

export function mapSettingsSaveError(err: unknown): string | null {
  const s = invokeErrorMessage(err);
  if (s.includes("HOTKEY_REQUIRED")) return "Укажите горячую клавишу.";
  if (s.includes("MODEL_REQUIRED")) return "Укажите модель LLM.";
  if (s.includes("INVALID_URL") || /^URL:/i.test(s)) return "Неверный URL LLM.";
  if (s.includes("CAPTURE_RANGE_INVALID")) return "Лимит записи: 5-180 секунд.";
  return null;
}
