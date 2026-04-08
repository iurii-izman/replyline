/**
 * UI strings for Replyline — Russian-first alpha.
 *
 * All user-visible text lives here so future i18n migration
 * only needs to swap this module for a locale-aware loader.
 */

export const ui = {
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

  settings: {
    title: "Подготовка к работе",
    lead: "Удержание клавиши — запись короткого звука; отпускание — в ваши STT и шлюз ответа (не на диск по умолчанию). «Сохранить» пишет файл и ключи в Windows на этой машине; не проверяет звонок и сеть.",
    save: "Сохранить на этой машине",
    saving: "Сохраняю…",
    toCard: "К карточке",
    retryLoad: "Повторить загрузку",

    hotkeyNudge:
      "Заполните обязательные блоки и нажмите «Сохранить». Без этого удержание клавиши не запускает цепочку.",
    bootstrapFail:
      "Загрузка приложения сбойнула. «Повторить» или правки ниже и «Сохранить».",

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
  },
} as const;

export type UiStrings = typeof ui;

export function fmtBundleCollected(path: string, clipboard: boolean): string {
  return clipboard
    ? `Сводка собрана. Путь в буфере: ${path}`
    : `Сводка собрана. Путь: ${path}`;
}

export function fmtLogPath(path: string, clipboard: boolean): string {
  return clipboard
    ? `Путь к логу в буфере: ${path}`
    : `Путь к логу: ${path}`;
}

export function fmtSayNowFallback(value: string): string {
  return `Скажи сейчас: ${value}`;
}

export function fmtSettingsSavedButHotkey(hint: string): string {
  return `Настройки сохранены, но ${hint.toLowerCase()}`;
}

export function fmtContextDraftActive(count: number): string {
  return `есть · фрагментов: ${count}`;
}

export function fmtSecondsSuffix(seconds: number): string {
  return `${seconds} с`;
}

export function fmtReadinessJsonCopied(clipboardOk: boolean): string {
  return clipboardOk ? ui.notices.readinessJsonCopied : ui.notices.readinessJsonCopyManual;
}
