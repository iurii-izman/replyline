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
  notebookLmEnabled: boolean;
  notebookLmLaunchUrl: string;
  primaryLanguage: string;
  deepgramModel: string;
  captureMaxSeconds: number;
  llmTemperature: number;
  useStreamingStt: boolean;
  customSystemPrompt: string | null;
  showAdvanced: boolean;
  trayIntroSeen: boolean;
};

export type BootstrapDto = {
  settings: AppSettings;
  deepgramKeyPresent: boolean;
  llmKeyPresent: boolean;
  contextActive: boolean;
  contextEntryCount: number;
  runtimeReady: boolean;
  logStatus: LogStatusDto;
  /** Truncated; same source as «Пересобрать карточку». */
  lastTranscriptPreview?: string | null;
  canRetryLastTranscript: boolean;
};

export type ContextStatusDto = {
  contextActive: boolean;
  entryCount: number;
  lastTranscriptPreview?: string | null;
  canRetryLastTranscript: boolean;
};

/** Compact readiness for UI/support (no raw transcript). */
export type RuntimeReadinessDto = {
  appVersion: string;
  settingsSchemaVersion: number;
  deepgramKeyPresent: boolean;
  llmKeyPresent: boolean;
  runtimeReady: boolean;
  contextActive: boolean;
  contextEntryCount: number;
  canRetryLastTranscript: boolean;
  lastTranscriptCharCount?: number | null;
  /** Backend prompt contract version (bumps with system prompt changes). */
  promptContractVersion: string;
};

export type DiagnosticBundleDto = {
  bundlePath: string;
  manifestPath: string;
};

export type CommandErrorKind =
  | "Settings"
  | "Credential"
  | "Capture"
  | "Pipeline"
  | "Memory"
  | "Internal";

/** DOM id suffix: `settings-anchor-${anchor}` in SettingsSurface. */
export type ErrorSettingsAnchor = "hotkey" | "stt" | "llm" | "memory";

export function settingsAnchorForCommandErrorKind(kind: CommandErrorKind): ErrorSettingsAnchor {
  switch (kind) {
    case "Credential":
      return "stt";
    case "Settings":
    case "Pipeline":
      return "llm";
    case "Memory":
      return "memory";
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
  "Memory",
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

/** Parses structured `CommandError` JSON from a Tauri `invoke` rejection when present. */
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

/** User/log-safe message: inner `message` when JSON envelope is recognized, else the raw error string. */
export function invokeErrorMessage(err: unknown): string {
  const parsed = parseCommandInvokeError(err);
  if (parsed) return parsed.message;
  return rawInvokeErrorString(err);
}

export type HealthCheckResult = {
  deepgramOk: boolean;
  llmOk: boolean;
  detail: string;
};

export type LogStatusDto = {
  logPath: string;
  lastLine: string | null;
  lastDebugWavPath?: string | null;
};

export type AnalysisCard = {
  gist: string;
  sayNow: string;
  nextMove: string;
};

export type MemorySpace = {
  id: string;
  kind: "team" | "thread" | "contact";
  label: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type MemorySpaceRecord = {
  space: MemorySpace;
  facts: MemoryFact[];
  commitments: MemoryCommitment[];
  terms: MemoryTerm[];
};

export type MemoryFact = {
  id: string;
  text: string;
  category: "goal" | "constraint" | "term" | "preference" | "context";
  sourceKind: "manual" | "post_call_summary" | "saved_card";
  confidence: number;
  confirmedByUser: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MemoryCommitment = {
  id: string;
  text: string;
  owner: string;
  dueHint: string | null;
  status: "open" | "done" | "cancelled";
  confirmedByUser: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MemoryTerm = {
  id: string;
  term: string;
  preferredText: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StatusEvent = {
  phase: string;
  detail?: string | null;
};

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 2,
  hotkey: "Ctrl+Alt+Space",
  llmBaseUrl: "",
  llmModel: "gpt-4o-mini",
  notebookLmEnabled: false,
  notebookLmLaunchUrl: "https://notebooklm.google.com/",
  primaryLanguage: "ru",
  deepgramModel: "nova-3",
  captureMaxSeconds: 30,
  llmTemperature: 0.25,
  useStreamingStt: false,
  customSystemPrompt: null,
  showAdvanced: false,
  trayIntroSeen: false,
};

export function usesPlaceholderLlmRoute(baseUrl: string, model: string): boolean {
  return (
    baseUrl.trim() === "http://127.0.0.1:4000/v1" ||
    (baseUrl.trim() === "" && model.trim() === "gpt-4o-mini")
  );
}

export function isConfiguredLlmRoute(baseUrl: string, model: string): boolean {
  return Boolean(baseUrl.trim() && model.trim()) && !usesPlaceholderLlmRoute(baseUrl, model);
}

export function isNotebookLmLaunchReady(enabled: boolean, launchUrl: string): boolean {
  if (!enabled) return false;
  try {
    const parsed = new URL(launchUrl.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeHotkeyKey(key: string): string | null {
  if (key === " ") return "Space";
  if (key === "Escape") return "Esc";
  if (/^F\d{1,2}$/i.test(key)) return key.toUpperCase();
  if (/^[a-zA-Z]$/.test(key)) return key.toUpperCase();
  if (/^[0-9]$/.test(key)) return key;
  if (key.startsWith("Arrow")) return key.replace("Arrow", "");
  if (["Tab", "Enter", "Backspace", "Delete", "Home", "End", "PageUp", "PageDown"].includes(key))
    return key;
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

export function userSafeCaptureStartError(err: unknown): string {
  const s = invokeErrorMessage(err);
  if (/не была активна|not active/i.test(s)) {
    return "Запись не была активна. Сначала удержите клавишу, затем отпустите.";
  }
  return "Запись не началась: звук или занятый захват. Повторите удержание.";
}

export function userSafePipelineError(err: unknown): string {
  const s = invokeErrorMessage(err);
  if (/не была активна|not active/i.test(s)) {
    return "Сначала удержите клавишу для записи, потом отпустите.";
  }
  if (/Nothing to retry|nothing to retry/i.test(s)) {
    return "Сначала сделайте захват — пересобрать пока нечего.";
  }
  if (/join failed|Capture join/i.test(s)) {
    return "Сбой при остановке записи. Повторите захват.";
  }
  if (/empty transcript|пуст.*транскрип|empty transcription/i.test(s)) {
    return "Текст из звука не получился: в фрагменте не оказалось разборчивой речи или был захвачен пустой системный вывод. Replyline сейчас слушает системный звук, не микрофон.";
  }
  if (/Deepgram|API key|missing|Нет ключа Deepgram|распознаван/i.test(s)) {
    return "Нет текста из звука: ключ Deepgram и сеть → Настройки.";
  }
  if (/stt_streaming_failed_then_batch_failed|stt_streaming_failed|Deepgram WS|websocket/i.test(s)) {
    return "Стриминг STT не удался; приложение пробовало fallback на batch, но текста всё ещё нет. Проверьте ключ Deepgram, сеть и переключатель Streaming STT.";
  }
  if (/Card output invalid|слишком расплывчат|too generic/i.test(s)) {
    return "Карточка вышла слишком расплывчатой. Повторите захват или уточните фрагмент.";
  }
  if (/gateway|401|403|fetch failed|reqwest|http|LLM|OpenAI|timeout/i.test(s)) {
    return "Нет ответа шлюза: адрес, модель, ключ → Настройки.";
  }
  return "Цепочка оборвалась: настройки, ключи, сеть. Повторите захват.";
}

export function userSafeBootstrapLoadError(err: unknown): string {
  const s = invokeErrorMessage(err);
  if (/Context lock poisoned|lock poisoned/i.test(s)) {
    return "Внутренняя ошибка. Закройте приложение и откройте снова.";
  }
  if (/config|credential|IO:|JSON|NotFound|denied/i.test(s)) {
    return "Не прочитались настройки или ключи Windows. Проверьте профиль и повторите загрузку.";
  }
  return "Не удалось загрузить приложение. Нажмите «Повторить» или откройте настройки.";
}

export function userSafeClearContextError(err: unknown): string {
  const s = invokeErrorMessage(err);
  if (/Context lock poisoned/i.test(s)) {
    return "Сброс не выполнен. Перезапустите приложение.";
  }
  return "Сброс черновика не прошёл. Повторите.";
}

export function alphaLanguageLabel(code: string): string {
  const c = code.trim().toLowerCase();
  if (c === "ru") return "Русский (alpha)";
  if (c === "en") return "English (технический hook)";
  return code.trim() || "—";
}

export function shortUrlForUi(url: string, max = 46): string {
  const u = url.trim();
  if (u.length <= max) return u;
  return `${u.slice(0, Math.max(0, max - 1))}…`;
}

export function userSafeDiagnosticError(err: unknown): string {
  const s = invokeErrorMessage(err);
  if (/bundle|support|runtime-evidence|log/i.test(s)) return s;
  return "Не удалось собрать сводку. Повторите и при необходимости скопируйте путь к локальному логу ниже.";
}

export function userSafeHotkeyRegisterError(err: unknown, hotkey: string): string {
  const s = invokeErrorMessage(err);
  const fallbackHotkey = hotkey === "Ctrl+Alt+Space" ? "Ctrl+Shift+." : "Ctrl+Alt+Space";
  if (/unregister_all not allowed|allow-unregister-all/i.test(s)) {
    return "Текущая сборка не дала права на перерегистрацию клавиши. После обновления сборки сохраните ещё раз.";
  }
  if (/already registered|already.*registered/i.test(s)) {
    return `Сочетание ${hotkey} уже занято этим приложением.`;
  }
  if (/accelerator|shortcut|register|global shortcut|hotkey/i.test(s)) {
    return `Сочетание ${hotkey} не удалось зарегистрировать. Попробуйте другое, например ${fallbackHotkey}.`;
  }
  return `Сочетание ${hotkey} не удалось включить. Попробуйте другое, например ${fallbackHotkey}.`;
}

export function mapSettingsSaveError(err: unknown): string | null {
  const s = invokeErrorMessage(err);
  if (s.includes("HOTKEY_REQUIRED")) {
    return "Клавиша: задайте сочетание ниже.";
  }
  if (s.includes("MODEL_REQUIRED")) {
    return "Модель ответа: заполните поле.";
  }
  if (s.includes("INVALID_URL") || /^URL:/i.test(s)) {
    return "Адрес шлюза: http:// или https://, полный URL.";
  }
  if (s.includes("INVALID_NOTEBOOKLM_URL")) {
    return "Адрес NotebookLM: укажите полный http:// или https:// URL.";
  }
  if (s.includes("CAPTURE_RANGE_INVALID")) {
    return "Лимит фрагмента: 5–180 секунд.";
  }
  if (s.includes("INVALID_LANGUAGE")) {
    return "Файл настроек повреждён (язык). Напишите разработчикам.";
  }
  if (s.includes("INVALID_SCHEMA")) {
    return "Версия settings.json не подходит. См. docs или удалите файл для сброса.";
  }
  if (s.includes("IO:")) {
    return "Не записался файл настроек. Проверьте профиль Windows.";
  }
  if (s.includes("JSON")) {
    return "Сбой записи настроек. Повторите или проверьте диск.";
  }
  return null;
}

export function userSafeTrayAckSaveError(err: unknown): string {
  const mapped = mapSettingsSaveError(err);
  if (mapped) return mapped;
  return "Не сохранилось. Проверьте диск и повторите.";
}

export function userSafePersistOuterError(err: unknown): string {
  const s = invokeErrorMessage(err);
  if (/Unknown secret slot/i.test(s)) {
    return "Сбой записи ключа. Перезапустите приложение.";
  }
  if (/credential|Credential|password/i.test(s)) {
    return "Ключ не записался в Windows. Повторите «Сохранить».";
  }
  const mapped = mapSettingsSaveError(err);
  if (mapped) return mapped;
  return "Сохранение не завершилось. Повторите или откройте подготовку.";
}

export function userSafeNotebookLmOpenError(err: unknown): string {
  const s = invokeErrorMessage(err);
  if (/NOTEBOOKLM_DISABLED/i.test(s)) {
    return "NotebookLM выключен в настройках. Включите интеграцию и сохраните изменения.";
  }
  if (/INVALID_NOTEBOOKLM_URL|missing.*url|invalid.*url|URL:/i.test(s)) {
    return "NotebookLM не открыт: проверьте адрес в настройках.";
  }
  if (/opener|open url|browser|launch/i.test(s)) {
    return "Не удалось открыть NotebookLM в браузере. Проверьте адрес и системный браузер.";
  }
  return "NotebookLM не открылся. Проверьте настройки и повторите.";
}
