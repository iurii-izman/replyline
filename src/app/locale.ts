export const ui_ru = {
  appName: "Replyline",
  appSubtitle: "Slim Stable Beta",
  phase: {
    booting: "Загрузка...",
    capturing: "capture",
    transcribing: "stt",
    analyzing: "llm",
    ready: "card",
    error: "Ошибка",
    hotkeyFail: "Клавиша",
    setupNeeded: "Нужны настройки",
    idleReady: "Готово",
  },
  card: {
    gistLabel: "Суть",
    sayNowLabel: "Скажи сейчас",
    nextMoveLabel: "Дальше",
    copySayNow: "copy say_now",
    retryCard: "retry card",
    clearContext: "clear context",
  },
  setup: {
    title: "Нужны настройки",
    body: "Заполните обязательные поля и сохраните.",
    openSetup: "Открыть Settings",
  },
  startError: {
    title: "Старт не удался",
    body: "Проверьте настройки и повторите.",
    retryLoad: "Повторить",
    toSetup: "Settings",
  },
  boot: {
    loading: "Загрузка...",
  },
  chrome: {
    hideToTray: "Скрыть",
    closeApp: "Выход",
  },
  notices: {
    contextCleared: "Контекст очищен.",
    settingsSaved: "Сохранено.",
    settingsSavedPartial: "Сохранено частично.",
    sayNowCopied: "say_now скопирован.",
    retrying: "Пересбор карточки...",
    hotkeyAlreadyRegistered: "Клавиша уже занята.",
  },
  settings: {
    title: "Settings",
    save: "Save",
    saving: "Saving...",
    back: "Back",
    retryLoad: "Повторить",
    hotkeyLabel: "Hotkey",
    captureMaxLabel: "Capture max seconds",
    deepgramKeyLabel: "Deepgram API key",
    llmBaseUrlLabel: "LLM base URL",
    llmModelLabel: "LLM model",
    llmKeyLabel: "LLM API key (optional)",
    savedBadge: "saved",
  },
} as const;

export type UiStrings = typeof ui_ru;

export const ui_en: UiStrings = {
  appName: "Replyline",
  appSubtitle: "Slim Stable Beta",
  phase: {
    booting: "Loading...",
    capturing: "capture",
    transcribing: "stt",
    analyzing: "llm",
    ready: "card",
    error: "Error",
    hotkeyFail: "Hotkey",
    setupNeeded: "Setup needed",
    idleReady: "Ready",
  },
  card: {
    gistLabel: "Gist",
    sayNowLabel: "Say now",
    nextMoveLabel: "Next move",
    copySayNow: "copy say_now",
    retryCard: "retry card",
    clearContext: "clear context",
  },
  setup: {
    title: "Setup required",
    body: "Fill required fields and save.",
    openSetup: "Open Settings",
  },
  startError: {
    title: "Start failed",
    body: "Check settings and retry.",
    retryLoad: "Retry",
    toSetup: "Settings",
  },
  boot: {
    loading: "Loading...",
  },
  chrome: {
    hideToTray: "Hide",
    closeApp: "Quit",
  },
  notices: {
    contextCleared: "Context cleared.",
    settingsSaved: "Saved.",
    settingsSavedPartial: "Saved partially.",
    sayNowCopied: "say_now copied.",
    retrying: "Retrying card...",
    hotkeyAlreadyRegistered: "Hotkey is already taken.",
  },
  settings: {
    title: "Settings",
    save: "Save",
    saving: "Saving...",
    back: "Back",
    retryLoad: "Retry",
    hotkeyLabel: "Hotkey",
    captureMaxLabel: "Capture max seconds",
    deepgramKeyLabel: "Deepgram API key",
    llmBaseUrlLabel: "LLM base URL",
    llmModelLabel: "LLM model",
    llmKeyLabel: "LLM API key (optional)",
    savedBadge: "saved",
  },
} as const;

export function getUi(lang: string): UiStrings {
  return lang.startsWith("en") ? ui_en : ui_ru;
}
