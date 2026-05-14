/**
 * UI strings for Replyline — bilingual (ru / en).
 *
 * All user-visible text lives here so i18n only needs `getUi(lang)`.
 */

export const ui_ru = {
  appName: "Replyline",
  appSubtitle: "инструмент для сложных рабочих разговоров",

  phase: {
    booting: "Загрузка…",
    capturing: "Запись",
    transcribing: "Звук → текст",
    analyzing: "Карточка",
    ready: "Карточка",
    error: "Сбой старта",
    hotkeyFail: "Клавиша",
    setupNeeded: "Нужны данные",
    idleReady: "К захвату",
  },

  livePhase: {
    capturingHeadline: "Идёт запись",
    capturingSub: "Держите клавишу. Отпустите — дальше по цепочке.",
    transcribingHeadline: "Текст из звука",
    transcribingSub: "Ждём текст (Deepgram).",
    analyzingHeadline: "Ответ по тексту",
    analyzingSub: "Ждём карточку от шлюза.",
  },

  card: {
    gistLabel: "Суть",
    sayNowLabel: "Скажи сейчас",
    nextMoveLabel: "Дальше",
    copySayNow: "Копировать «Скажи сейчас»",
    copyToClipboardTitle: "В буфер обмена",
    retryCard: "Пересобрать карточку",
    retryCardTitle: "Тот же текст, новый ответ шлюза",
    clearContext: "Сбросить черновик реплик",
    clearContextTitle: "Убрать накопленные реплики из памяти (RAM), не с диска",
    supersededHint: "Старая карточка — ждите конца шага.",
    openNotebookLm: "Открыть NotebookLM",
    lastTranscriptLabel: "Текст последнего захвата (усечённо)",
    lastTranscriptHint: "Кнопка «Пересобрать карточку» шлёт этот же текст в шлюз снова.",
  },

  setup: {
    title: "Сначала подготовка",
    body: "Без сохранённых ключа Deepgram и маршрута ответа цепочка не стартует. Ввод в поля сам по себе ничего не включает — нужен «Сохранить».",
    step1: "Откройте подготовку (шестерёнка или кнопка ниже).",
    step2: "Ключ Deepgram + адрес и модель шлюза.",
    step3: "«Сохранить на этой машине», затем проверьте удержанием клавиши.",
    openSetup: "Открыть подготовку",
  },

  idle: {
    title: "К захвату",
    captureHold: "Удержите",
    captureMid: "на нужной реплике,",
    captureRelease: "отпустите",
    capturePipeline: "— звук → текст → одна карточка (суть, сейчас, дальше).",
    captureMaxPrefix: "Максимум",
    captureMaxSuffix: "за раз.",
  },

  startError: {
    title: "Старт не удался",
    body: "Часто это профиль Windows или файл настроек. Повторите загрузку или откройте подготовку.",
    retryLoad: "Повторить загрузку",
    toSetup: "К подготовке",
  },

  errorRoute: {
    toStt: "Ключ Deepgram →",
    toLlm: "Шлюз и модель →",
    toMemory: "Память →",
    toHotkey: "Подготовка →",
  },

  boot: {
    loading: "Читаем настройки и регистрируем клавишу. При сбое — сообщение и «Повторить».",
  },

  chrome: {
    hideToTray: "Скрыть в трей",
    closeApp: "Закрыть программу",
    trayIntroCopy:
      "× скрывает окно; приложение остаётся у часов. Снова: двойной щелчок по иконке или «Открыть» в меню трея.",
    trayIntroHide: "Скрыть подсказку",
  },

  footer: {
    loading: "Загрузка…",
    errorHint: "Сначала устраните сбой или откройте подготовку.",
    contextActive: "Черновик реплик в памяти (не на диск).",
    contextEmpty: "Нет черновика реплик.",
  },

  tray: {
    open: "Открыть",
    settings: "Настройки",
    clearContext: "Сбросить контекст",
    collectDiagnostic: "Собрать сводку диагностики…",
    quit: "Выход",
  },

  notices: {
    contextCleared: "Черновик реплик сброшен (только память).",
    trayIntroHidden: "Подсказка про трей скрыта.",
    settingsSaved: "Сохранено. Можно проверять удержанием клавиши.",
    settingsSavedPartial: "Сохранено. Осталось завершить подготовку.",
    sayNowCopied: "Строка «Скажи сейчас» в буфере.",
    cardSectionCopied: "Раздел карточки скопирован в буфер.",
    notebookLmOpened: "NotebookLM открыт в системном браузере.",
    retrying: "Пересбор…",
    hotkeyAlreadyRegistered: "Сочетание уже зарегистрировано здесь. Выберите другое.",
    readinessJsonCopied: "JSON готовности скопирован в буфер.",
    readinessJsonCopyManual: "JSON готовности: буфер недоступен, повторите или скопируйте из лога.",
    readinessCopyFailed: "Не удалось получить JSON готовности.",
    ticketPayloadCopied: "JSON для тикета скопирован в буфер.",
    ticketPayloadCopyManual: "JSON для тикета: буфер недоступен, скопируйте из консоли/логов.",
    ticketPayloadCopyFailed: "Не удалось собрать JSON для тикета.",
    ticketPackageReady: "Пакет для тикета готов: сводка собрана и JSON payload скопирован.",
  },

  copyFmt: {
    diagnosticClipboard: "Сводка собрана. Путь в буфере:",
    diagnosticPath: "Сводка собрана. Путь:",
    logClipboard: "Путь к логу в буфере:",
    logPlain: "Путь к логу:",
    sayNowFallback: "Скажи сейчас:",
    settingsSavedBut: "Настройки сохранены, но",
    contextDraftActive: "есть · фрагментов:",
    secondUnit: "с",
  },

  settings: {
    title: "Подготовка к работе",
    lead: "Удержание клавиши — запись короткого звука; отпускание — в ваши STT и шлюз ответа (не на диск по умолчанию). «Сохранить» пишет файл и ключи в Windows на этой машине; не проверяет звонок и сеть.",
    save: "Сохранить на этой машине",
    saving: "Сохраняю…",
    toCard: "К карточке",
    retryLoad: "Повторить загрузку",

    hotkeyNudge:
      "Заполните обязательные блоки и нажмите «Сохранить». Без этого удержание клавиши не запускает цепочку.",
    bootstrapFail: "Загрузка приложения сбойнула. «Повторить» или правки ниже и «Сохранить».",

    readinessTitle: "Чеклист готовности",
    readinessFoot:
      "Здесь — только конфигурация, не гарантия звонка: провайдеры, сеть и источник звука решают исход.",
    readinessLabel: {
      stt: "Распознавание",
      llm: "Ответ по тексту",
      llmKey: "Доступ к шлюзу",
      hotkey: "Управление",
    },
    readinessState: {
      deepgramMet: "Ключ Deepgram в Windows",
      deepgramMissing: "Нужно: ключ + «Сохранить»",
      llmMet: "Адрес и модель указаны (проверка — при захвате)",
      llmPlaceholder: "Нужно: заменить localhost по умолчанию на свой маршрут",
      llmMissing: "Нужно: адрес и модель ниже",
      llmKeyMet: "Ключ к шлюзу сохранён",
      llmKeyOptional: "По надобности: если шлюз просит токен — введите и сохраните",
      hotkeyMet: "Клавиша задана (вступит после «Сохранить»)",
      hotkeyMissing: "Задайте сочетание ниже",
    },

    snapshotTitle: "Среда сейчас",
    snapshotIntro:
      "Кратко, что задано в настройках и памяти сессии. Не проверяет сеть и ответы провайдеров.",
    snapshotLabel: {
      gateway: "Шлюз",
      model: "Модель",
      deepgram: "Deepgram",
      notebookLm: "NotebookLM",
      notebookLmUrl: "URL NotebookLM",
      fragmentLimit: "Лимит фрагмента",
      cardLanguage: "Язык карточки",
      contextDraft: "Черновик реплик",
      appVersion: "Версия приложения",
      settingsSchema: "Схема настроек",
      transcriptChars: "Символов в последнем тексте",
      localLog: "Локальный лог",
      lastLine: "Последняя строка",
      lastDebugWav: "Последний debug WAV",
      promptContract: "Версия контракта промпта",
    },
    snapshotValue: {
      enabled: "включён",
      disabled: "выключен",
      notYetReceived: "ещё не получен",
      noEntries: "ещё нет",
      empty: "пусто",
    },
    copyLogPath: "Скопировать путь к логу",
    copyReadinessJson: "Копировать JSON готовности",

    supportTitle: "Сводка для поддержки",
    supportIntro:
      "Собирает локальную support-папку. Если рядом есть runtime reports из клона репозитория — включит и их; если нет, соберёт хотя бы лог и manifest.",
    collectingBundle: "Собираю…",
    collectBundle: "Собрать сводку",
    collectTicketPackage: "Пакет для тикета (сводка + readiness JSON)",

    hotkeySectionTitle: "Управление в разговоре",
    hotkeySectionIntro:
      "Сейчас захват идёт только с системного вывода Windows (WASAPI loopback), а не с микрофона. Если слышен YouTube или TTS, а микрофон нет — это ожидаемое поведение текущей alpha.",
    hotkeyLabel: "Горячая клавиша",
    hotkeyHint: "Системный звук, пока держите. Сочетание не должно быть занято в Windows.",
    captureMaxLabel: "Максимальная длина одного фрагмента, сек",
    captureMaxHint: "Обычно 5–60 с. 120–180 с — больше контекста, дольше и непредсказуемее ответ.",

    sttSectionTitle: "Распознавание речи",
    sttSectionIntro:
      "После отпускания клавиши — Deepgram. Ключ в учётных данных Windows, не в открытом файле.",
    deepgramKeyLabel: "Ключ API Deepgram",
    deepgramPlaceholderSaved: "новый ключ, если меняете",
    deepgramPlaceholderNew: "вставьте ключ",

    llmSectionTitle: "Ответ по тексту",
    llmSectionIntro:
      "Шлюз в стиле OpenAI API: сюда текст распознавания, отсюда карточка. Адрес и модель — ваши. Интерфейс alpha на русском.",
    llmBaseUrlLabel: "Адрес шлюза (base URL)",
    llmBaseUrlHint:
      "http://127.0.0.1:4000/v1 здесь только как dev-пример. Для alpha укажите свой рабочий адрес.",
    llmModelLabel: "Модель",
    llmKeyLabel: "Ключ к API ответа",
    llmKeyPlaceholder: "Bearer / API key, если требует ваш шлюз",
    llmKeyIfNeeded: "если нужен шлюзу",

    notebookLmSectionTitle: "Внешний инструмент: NotebookLM",
    notebookLmSectionIntro:
      "Это отдельный запуск web-интерфейса NotebookLM в системном браузере. Интеграция не подменяет текущий LLM-шлюз Replyline и не участвует в цепочке звук → текст → карточка.",
    notebookLmEnable: "Включить быстрый запуск NotebookLM",
    notebookLmUrlLabel: "URL запуска NotebookLM",
    notebookLmUrlHint:
      "По умолчанию подставлен consumer web-entry. При enterprise-сценарии можно указать свой рабочий URL.",
    openNotebookLm: "Открыть NotebookLM",

    savedBadge: "сохранён",
    healthCheck: "Проверить провайдеров",
    healthCheckBusy: "Проверяю…",
  },

  language: {
    ru: "Русский (alpha)",
    en: "English (технический hook)",
  },

  advanced: {
    sectionTitle: "Дополнительно",
    customPromptLabel: "Свой системный промпт (вместо встроенного)",
    customPromptHint: "Оставьте пустым для использования стандартного промпта.",
    streamingSttLabel: "Стриминг STT (WebSocket, экспериментально)",
    devFixtureTitle: "Прогон фикстуры (только dev-сборка)",
    devFixtureIntro:
      "Фрагмент из fixtures/ru-work-snippets.json отправляется в шлюз как транскрипт — без микрофона и STT. Нужен доступ к LLM.",
    devFixtureRun: "Построить карточку",
    devFixtureBusy: "Строю карточку…",
    devFixtureOk: "Карточка по фикстуре готова (смотрите основную панель).",
  },

  memory: {
    sectionTitle: "Пространства памяти",
    sectionIntro: "Сохраняйте факты, обязательства и термины по проектам и собеседникам.",
    noSpaces: "Нет пространств. Создайте первое.",
    createLabel: "Название",
    createKindLabel: "Тип",
    createButton: "Создать",
    kindTeam: "Команда",
    kindThread: "Тема",
    kindContact: "Контакт",
    facts: "Факты",
    commitments: "Обязательства",
    terms: "Термины",
    saveToMemory: "В память",
    savedToMemory: "Карточка сохранена в пространство памяти.",
    selectSpace: "Выберите пространство",
    lastSavedFromCard: "Последнее из карточки в этом пространстве",
    removeLastSavedCard: "Удалить последнее из карточки",
    removedLastSavedCard: "Последняя запись с карточки удалена из пространства.",
    noSavedCardToRemove: "Нет записей с карточки для удаления в этом пространстве.",
    invokeInvalid: "Память: данные не прошли проверку. Проверьте поля и повторите.",
    invokeSpaceMissing: "Память: выбранное пространство не найдено. Обновите список.",
    invokeGeneric: "Память: операция не выполнена. Повторите позже.",
  },
} as const;

export type UiStrings = typeof ui_ru;

export const ui_en: UiStrings = {
  appName: "Replyline",
  appSubtitle: "a tool for high-stakes work conversations",

  phase: {
    booting: "Loading…",
    capturing: "Recording",
    transcribing: "Audio → text",
    analyzing: "Card",
    ready: "Card",
    error: "Start failed",
    hotkeyFail: "Hotkey",
    setupNeeded: "Setup needed",
    idleReady: "Ready",
  },

  livePhase: {
    capturingHeadline: "Recording in progress",
    capturingSub: "Hold the key. Release to continue the pipeline.",
    transcribingHeadline: "Transcribing audio",
    transcribingSub: "Waiting for transcript (Deepgram).",
    analyzingHeadline: "Generating response",
    analyzingSub: "Waiting for card from the gateway.",
  },

  card: {
    gistLabel: "Gist",
    sayNowLabel: "Say now",
    nextMoveLabel: "Next move",
    copySayNow: "Copy 'Say now'",
    copyToClipboardTitle: "Copy to clipboard",
    retryCard: "Rebuild card",
    retryCardTitle: "Same text, new gateway response",
    clearContext: "Clear draft replies",
    clearContextTitle: "Remove accumulated replies from memory (RAM), not from disk",
    supersededHint: "Outdated card — wait for the current step to finish.",
    openNotebookLm: "Open NotebookLM",
    lastTranscriptLabel: "Last capture transcript (truncated)",
    lastTranscriptHint: "The 'Rebuild card' button sends this same text to the gateway again.",
  },

  setup: {
    title: "Setup first",
    body: "Without a saved Deepgram key and response route the pipeline won't start. Filling in fields alone does nothing — you must click 'Save'.",
    step1: "Open setup (gear icon or button below).",
    step2: "Deepgram key + gateway address and model.",
    step3: "'Save on this machine', then verify by holding the hotkey.",
    openSetup: "Open setup",
  },

  idle: {
    title: "Ready",
    captureHold: "Hold",
    captureMid: "during the line you care about,",
    captureRelease: "release",
    capturePipeline: "— audio → text → one card (gist, say now, next move).",
    captureMaxPrefix: "Up to",
    captureMaxSuffix: "at a time.",
  },

  startError: {
    title: "Failed to start",
    body: "Usually a Windows profile or settings file issue. Retry loading or open setup.",
    retryLoad: "Retry loading",
    toSetup: "Go to setup",
  },

  errorRoute: {
    toStt: "Deepgram key →",
    toLlm: "Gateway & model →",
    toMemory: "Memory →",
    toHotkey: "Setup →",
  },

  boot: {
    loading:
      "Reading settings and registering the hotkey. On failure you'll see a message and 'Retry'.",
  },

  chrome: {
    hideToTray: "Hide to tray",
    closeApp: "Close application",
    trayIntroCopy:
      "× hides the window; the app stays in the system tray. To reopen: double-click the tray icon or choose 'Open' from its menu.",
    trayIntroHide: "Dismiss hint",
  },

  footer: {
    loading: "Loading…",
    errorHint: "Resolve the error first or open setup.",
    contextActive: "Draft replies in memory (not on disk).",
    contextEmpty: "No draft replies.",
  },

  tray: {
    open: "Open",
    settings: "Settings",
    clearContext: "Clear context",
    collectDiagnostic: "Collect diagnostic summary…",
    quit: "Quit",
  },

  notices: {
    contextCleared: "Draft replies cleared (memory only).",
    trayIntroHidden: "Tray hint dismissed.",
    settingsSaved: "Saved. You can now verify by holding the hotkey.",
    settingsSavedPartial: "Saved. Finish setup to complete configuration.",
    sayNowCopied: "'Say now' line copied to clipboard.",
    cardSectionCopied: "Card section copied to clipboard.",
    notebookLmOpened: "NotebookLM opened in the system browser.",
    retrying: "Rebuilding…",
    hotkeyAlreadyRegistered: "This shortcut is already registered here. Choose another one.",
    readinessJsonCopied: "Readiness JSON copied to clipboard.",
    readinessJsonCopyManual: "Readiness JSON: clipboard unavailable, retry or copy from the log.",
    readinessCopyFailed: "Failed to retrieve readiness JSON.",
    ticketPayloadCopied: "Ticket JSON copied to clipboard.",
    ticketPayloadCopyManual: "Ticket JSON: clipboard unavailable, copy from console/logs.",
    ticketPayloadCopyFailed: "Failed to build ticket JSON.",
    ticketPackageReady: "Ticket package ready: summary collected and JSON payload copied.",
  },

  copyFmt: {
    diagnosticClipboard: "Summary collected. Path in clipboard:",
    diagnosticPath: "Summary collected. Path:",
    logClipboard: "Log path in clipboard:",
    logPlain: "Log path:",
    sayNowFallback: "Say now:",
    settingsSavedBut: "Settings saved, but",
    contextDraftActive: "active · fragments:",
    secondUnit: "s",
  },

  settings: {
    title: "Setup",
    lead: "Holding the hotkey records a short audio clip; releasing sends it to your STT and response gateway (not saved to disk by default). 'Save' writes the config file and keys to Windows on this machine; it does not test connectivity.",
    save: "Save on this machine",
    saving: "Saving…",
    toCard: "Go to card",
    retryLoad: "Retry loading",

    hotkeyNudge:
      "Fill in the required sections and click 'Save'. Without this, holding the hotkey won't start the pipeline.",
    bootstrapFail: "App loading failed. 'Retry' or edit below and 'Save'.",

    readinessTitle: "Readiness checklist",
    readinessFoot:
      "This only reflects configuration, not a guarantee of connectivity: providers, network, and audio source determine the outcome.",
    readinessLabel: {
      stt: "Speech-to-text",
      llm: "Text response",
      llmKey: "Gateway access",
      hotkey: "Controls",
    },
    readinessState: {
      deepgramMet: "Deepgram key stored in Windows",
      deepgramMissing: "Required: key + 'Save'",
      llmMet: "Address and model set (verified on capture)",
      llmPlaceholder: "Required: replace the default localhost with your route",
      llmMissing: "Required: address and model below",
      llmKeyMet: "Gateway key saved",
      llmKeyOptional: "Optional: if the gateway requires a token, enter and save it",
      hotkeyMet: "Hotkey assigned (takes effect after 'Save')",
      hotkeyMissing: "Assign a shortcut below",
    },

    snapshotTitle: "Current environment",
    snapshotIntro:
      "A brief overview of what's configured in settings and session memory. Does not test network or provider responses.",
    snapshotLabel: {
      gateway: "Gateway",
      model: "Model",
      deepgram: "Deepgram",
      notebookLm: "NotebookLM",
      notebookLmUrl: "NotebookLM URL",
      fragmentLimit: "Fragment limit",
      cardLanguage: "Card language",
      contextDraft: "Draft replies",
      appVersion: "App version",
      settingsSchema: "Settings schema",
      transcriptChars: "Characters in last transcript",
      localLog: "Local log",
      lastLine: "Last line",
      lastDebugWav: "Last debug WAV",
      promptContract: "Prompt contract version",
    },
    snapshotValue: {
      enabled: "enabled",
      disabled: "disabled",
      notYetReceived: "not yet received",
      noEntries: "none yet",
      empty: "empty",
    },
    copyLogPath: "Copy log path",
    copyReadinessJson: "Copy readiness JSON",

    supportTitle: "Support summary",
    supportIntro:
      "Collects a local support folder. If runtime reports from a repo clone are nearby they'll be included; otherwise at minimum the log and manifest are gathered.",
    collectingBundle: "Collecting…",
    collectBundle: "Collect summary",
    collectTicketPackage: "Ticket package (summary + readiness JSON)",

    hotkeySectionTitle: "In-conversation controls",
    hotkeySectionIntro:
      "Currently capture uses Windows system output only (WASAPI loopback), not the microphone. If YouTube or TTS is audible but the mic isn't — that's expected behavior in this alpha.",
    hotkeyLabel: "Hotkey",
    hotkeyHint: "System audio while held. The shortcut must not conflict with Windows.",
    captureMaxLabel: "Max fragment length, sec",
    captureMaxHint:
      "Typically 5–60 s. 120–180 s gives more context but slower, less predictable responses.",

    sttSectionTitle: "Speech recognition",
    sttSectionIntro:
      "After releasing the key — Deepgram. The key is stored in Windows credentials, not in a plain file.",
    deepgramKeyLabel: "Deepgram API key",
    deepgramPlaceholderSaved: "new key, if changing",
    deepgramPlaceholderNew: "paste your key",

    llmSectionTitle: "Text response",
    llmSectionIntro:
      "An OpenAI-API-style gateway: transcript goes in, card comes out. Address and model are yours to set.",
    llmBaseUrlLabel: "Gateway address (base URL)",
    llmBaseUrlHint:
      "http://127.0.0.1:4000/v1 is only a dev example here. For alpha, enter your working address.",
    llmModelLabel: "Model",
    llmKeyLabel: "Response API key",
    llmKeyPlaceholder: "Bearer / API key, if your gateway requires one",
    llmKeyIfNeeded: "if required by gateway",

    notebookLmSectionTitle: "External tool: NotebookLM",
    notebookLmSectionIntro:
      "This opens the NotebookLM web interface in the system browser. It does not replace Replyline's LLM gateway and is not part of the audio → text → card pipeline.",
    notebookLmEnable: "Enable quick-launch NotebookLM",
    notebookLmUrlLabel: "NotebookLM launch URL",
    notebookLmUrlHint:
      "The default is the consumer web entry. For enterprise use you can specify your own URL.",
    openNotebookLm: "Open NotebookLM",

    savedBadge: "saved",
    healthCheck: "Check providers",
    healthCheckBusy: "Checking…",
  },

  language: {
    ru: "Русский (alpha)",
    en: "English",
  },

  advanced: {
    sectionTitle: "Advanced",
    customPromptLabel: "Custom system prompt (replaces built-in)",
    customPromptHint: "Leave empty to use the default prompt.",
    streamingSttLabel: "Streaming STT (WebSocket, experimental)",
    devFixtureTitle: "Fixture run (dev build only)",
    devFixtureIntro:
      "A snippet from fixtures/ru-work-snippets.json is sent to the gateway as a transcript — no microphone or STT. Requires LLM access.",
    devFixtureRun: "Build card",
    devFixtureBusy: "Building card…",
    devFixtureOk: "Fixture card ready (check the main panel).",
  },

  memory: {
    sectionTitle: "Memory spaces",
    sectionIntro: "Save facts, commitments, and terms by project and contact.",
    noSpaces: "No spaces yet. Create your first one.",
    createLabel: "Name",
    createKindLabel: "Kind",
    createButton: "Create",
    kindTeam: "Team",
    kindThread: "Thread",
    kindContact: "Contact",
    facts: "Facts",
    commitments: "Commitments",
    terms: "Terms",
    saveToMemory: "Save to memory",
    savedToMemory: "Card saved to memory space.",
    selectSpace: "Select a space",
    lastSavedFromCard: "Last saved from card in this space",
    removeLastSavedCard: "Remove last saved card",
    removedLastSavedCard: "Last card entry removed from the space.",
    noSavedCardToRemove: "No card entries to remove in this space.",
    invokeInvalid: "Memory: data failed validation. Check fields and try again.",
    invokeSpaceMissing: "Memory: selected space was not found. Refresh the list.",
    invokeGeneric: "Memory: operation failed. Try again later.",
  },
} as const;

/** Backward-compatible default export. */
export const ui: UiStrings = ui_ru;

export function getUi(lang: string): UiStrings {
  return lang.startsWith("en") ? ui_en : ui_ru;
}

export function fmtBundleCollected(path: string, clipboard: boolean, s: UiStrings): string {
  return clipboard
    ? `${s.copyFmt.diagnosticClipboard} ${path}`
    : `${s.copyFmt.diagnosticPath} ${path}`;
}

export function fmtLogPath(path: string, clipboard: boolean, s: UiStrings): string {
  return clipboard ? `${s.copyFmt.logClipboard} ${path}` : `${s.copyFmt.logPlain} ${path}`;
}

export function fmtSayNowFallback(value: string, s: UiStrings): string {
  return `${s.copyFmt.sayNowFallback} ${value}`;
}

export function fmtSettingsSavedButHotkey(hint: string, s: UiStrings): string {
  return `${s.copyFmt.settingsSavedBut} ${hint.toLowerCase()}`;
}

export function fmtContextDraftActive(count: number, s: UiStrings): string {
  return `${s.copyFmt.contextDraftActive} ${count}`;
}

export function fmtSecondsSuffix(seconds: number, s: UiStrings): string {
  return `${seconds} ${s.copyFmt.secondUnit}`;
}

export function fmtReadinessJsonCopied(clipboardOk: boolean, s: UiStrings): string {
  return clipboardOk ? s.notices.readinessJsonCopied : s.notices.readinessJsonCopyManual;
}
