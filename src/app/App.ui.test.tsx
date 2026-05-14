import { cleanup, render, screen, waitFor } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import type {
  AnalysisCard,
  AppSettings,
  BootstrapDto,
  ContextStatusDto,
  DiagnosticBundleDto,
  LogStatusDto,
} from "./model";
import type { AppPlatform, CloseRequestEvent, ListenerPayload, ShortcutEvent } from "./platform";

afterEach(() => {
  cleanup();
});

const DEFAULT_LOG_STATUS: LogStatusDto = {
  logPath: "C:\\Users\\tester\\AppData\\Local\\com.replyline.app\\logs\\app.log",
  lastLine: "2026-04-07T13:00:00 [bootstrap_loaded] runtime_ready=true",
};

const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 2,
  hotkey: "Ctrl+Alt+Space",
  llmBaseUrl: "https://openrouter.ai/api/v1",
  llmModel: "openai/gpt-4o-mini",
  primaryLanguage: "ru",
  deepgramModel: "nova-3",
  captureMaxSeconds: 30,
  llmTemperature: 0.25,
  useStreamingStt: false,
  customSystemPrompt: null,
  showAdvanced: true,
  trayIntroSeen: true,
};

const DEFAULT_CARD: AnalysisCard = {
  gist: "Нужно быстро зафиксировать владельца и срок.",
  sayNow: "Давайте сейчас закрепим владельца и срок до конца дня.",
  nextMove: "После звонка отправить короткое подтверждение в чат.",
};

function makeBootstrap(overrides: Partial<BootstrapDto> = {}): BootstrapDto {
  return {
    settings: DEFAULT_SETTINGS,
    deepgramKeyPresent: true,
    llmKeyPresent: true,
    contextActive: false,
    contextEntryCount: 0,
    runtimeReady: true,
    logStatus: DEFAULT_LOG_STATUS,
    lastTranscriptPreview: null,
    canRetryLastTranscript: false,
    ...overrides,
  };
}

type CommandHandler = (args?: Record<string, unknown>) => unknown | Promise<unknown>;

function createMockPlatform(
  options: {
    bootstrap?: BootstrapDto;
    commandHandlers?: Record<string, CommandHandler>;
    registerError?: Error;
    alreadyRegistered?: boolean;
    bundleResult?: DiagnosticBundleDto;
  } = {},
) {
  const listeners = new Map<string, Set<(event: ListenerPayload<unknown>) => void>>();
  let shortcutHandler: ((event: ShortcutEvent) => void | Promise<void>) | null = null;
  let closeHandler: ((event: CloseRequestEvent) => void | Promise<void>) | null = null;
  let currentContext: ContextStatusDto = {
    contextActive: options.bootstrap?.contextActive ?? false,
    entryCount: options.bootstrap?.contextEntryCount ?? 0,
    lastTranscriptPreview: null,
    canRetryLastTranscript: false,
  };
  let currentLogStatus = options.bootstrap?.logStatus ?? DEFAULT_LOG_STATUS;

  const bootstrap = options.bootstrap ?? makeBootstrap();
  const bundleResult = options.bundleResult ?? {
    bundlePath: "C:\\Support\\runtime-evidence-20260407-130000",
    manifestPath: "C:\\Support\\runtime-evidence-20260407-130000\\manifest.json",
  };

  const defaultHandlers: Record<string, CommandHandler> = {
    load_bootstrap: async () => bootstrap,
    get_log_status: async () => currentLogStatus,
    sync_tray_ui_phase: async () => null,
    log_client_event: async () => null,
    capture_start: async () => null,
    capture_stop_and_analyze: async () => {
      currentContext = {
        contextActive: true,
        entryCount: Math.max(1, currentContext.entryCount),
        lastTranscriptPreview: "тестовый фрагмент транскрипта",
        canRetryLastTranscript: true,
      };
      return DEFAULT_CARD;
    },
    get_context_status: async () => currentContext,
    get_runtime_readiness: async () => ({
      appVersion: "0.1.0-test",
      settingsSchemaVersion: bootstrap.settings.schemaVersion,
      deepgramKeyPresent: bootstrap.deepgramKeyPresent,
      llmKeyPresent: bootstrap.llmKeyPresent,
      runtimeReady: bootstrap.runtimeReady,
      contextActive: currentContext.contextActive,
      contextEntryCount: currentContext.entryCount,
      canRetryLastTranscript: currentContext.canRetryLastTranscript,
      lastTranscriptCharCount:
        currentContext.lastTranscriptPreview != null
          ? currentContext.lastTranscriptPreview.length
          : null,
      promptContractVersion: "v2",
    }),
    retry_last_analysis: async () => DEFAULT_CARD,
    clear_context: async () => {
      currentContext = {
        contextActive: false,
        entryCount: 0,
        lastTranscriptPreview: null,
        canRetryLastTranscript: false,
      };
      return currentContext;
    },
    acknowledge_tray_intro: async () => ({ ...bootstrap.settings, trayIntroSeen: true }),
    save_settings: async (args) => args?.input,
    save_secret: async () => null,
    collect_diagnostic_bundle: async () => bundleResult,
    dev_analyze_fixture_snippet: async () => DEFAULT_CARD,
    refresh_tray_menu: async () => null,
    quit_app: async () => null,
    memory_list_spaces: async () => [],
    memory_get_space_record: async () => {
      throw new Error("Memory space not found");
    },
    memory_save_space_record: async () => null,
    delete_secret: async () => null,
    tray_open_main: async () => null,
    check_provider_health: async () => ({
      deepgramOk: true,
      llmOk: true,
      detail: "mock",
    }),
  };

  const invokeMock = vi.fn((command: string, args?: Record<string, unknown>) => {
    const handler = options.commandHandlers?.[command] ?? defaultHandlers[command];
    if (!handler) {
      return Promise.reject(new Error(`Unhandled invoke command: ${command}`));
    }
    return Promise.resolve(handler(args)).then((result) => {
      if (command === "get_log_status" && result) {
        currentLogStatus = result as LogStatusDto;
      }
      return result;
    });
  });

  // Use explicit Promise.resolve/reject (not `async` vi.fn) so the shortcut
  // register promise always settles under Vitest + jsdom; otherwise
  // `await platform.shortcuts.register` can stall and leave the UI on booting.
  const registerMock = vi.fn((_hotkey: string, handler: (event: ShortcutEvent) => void | Promise<void>) => {
    if (options.registerError) {
      return Promise.reject(options.registerError);
    }
    shortcutHandler = handler;
    return Promise.resolve();
  });

  const platform: AppPlatform = {
    invoke: invokeMock,
    listen: vi.fn(async <T,>(event: string, handler: (event: ListenerPayload<T>) => void) => {
      const handlers = listeners.get(event) ?? new Set();
      handlers.add(handler as (event: ListenerPayload<unknown>) => void);
      listeners.set(event, handlers);
      return () => {
        handlers.delete(handler as (event: ListenerPayload<unknown>) => void);
      };
    }),
    shortcuts: {
      unregisterAll: vi.fn(() => Promise.resolve()),
      isRegistered: vi.fn(() => Promise.resolve(options.alreadyRegistered ?? false)),
      register: registerMock,
    },
    clipboard: {
      writeText: vi.fn(async () => undefined),
    },
    window: {
      show: vi.fn(async () => undefined),
      setFocus: vi.fn(async () => undefined),
      hide: vi.fn(async () => undefined),
      startDragging: vi.fn(async () => undefined),
      onCloseRequested: vi.fn(async (handler) => {
        closeHandler = handler;
        return () => {
          closeHandler = null;
        };
      }),
    },
  };

  return {
    platform,
    invokeMock,
    registerMock,
    clipboardWriteMock: platform.clipboard.writeText as ReturnType<typeof vi.fn>,
    async emit<T>(event: string, payload: T) {
      const handlers = listeners.get(event) ?? new Set();
      await Promise.all(Array.from(handlers).map((handler) => handler({ payload })));
    },
    async triggerShortcut(state: ShortcutEvent["state"]) {
      if (!shortcutHandler) {
        throw new Error("Shortcut handler is not registered.");
      }
      await shortcutHandler({ state });
    },
    async closeWindow() {
      if (!closeHandler) {
        throw new Error("Close handler is not registered.");
      }
      const event = {
        preventDefault: vi.fn(),
      };
      await closeHandler(event);
      return event;
    },
  };
}

describe("Replyline UI lane", () => {
  it("renders the main surface after successful bootstrap", async () => {
    const mock = createMockPlatform();

    render(() => <App platform={mock.platform} />);

    expect(await screen.findByText(/Удержите/)).toBeTruthy();
    expect(screen.getAllByText(/Ctrl\+Alt\+Space/).length).toBeGreaterThan(0);
  });

  it("shows the bootstrap failure state", async () => {
    const mock = createMockPlatform({
      commandHandlers: {
        load_bootstrap: async () => {
          throw new Error("IO: access denied");
        },
      },
    });

    render(() => <App platform={mock.platform} />);

    expect(await screen.findByText("Старт не удался")).toBeTruthy();
    expect(screen.getByText(/Не прочитались настройки или ключи Windows/)).toBeTruthy();
  });

  it("routes into settings when setup is required", async () => {
    const mock = createMockPlatform({
      bootstrap: makeBootstrap({
        runtimeReady: false,
        deepgramKeyPresent: false,
        llmKeyPresent: false,
      }),
    });

    render(() => <App platform={mock.platform} />);

    expect(await screen.findByText("Подготовка к работе")).toBeTruthy();
    expect(screen.getByText("Чеклист готовности")).toBeTruthy();
  });

  it("shows a hotkey registration fallback hint", async () => {
    const mock = createMockPlatform({
      registerError: new Error("global shortcut register failed"),
    });

    render(() => <App platform={mock.platform} />);

    expect(await screen.findByText("Подготовка к работе")).toBeTruthy();
    expect(screen.getAllByText(/не удалось зарегистрировать/i).length).toBeGreaterThan(0);
  });

  it("renders a result card after shortcut press and release", async () => {
    const mock = createMockPlatform();

    render(() => <App platform={mock.platform} />);
    await screen.findByText(/Удержите/);

    await mock.triggerShortcut("Pressed");
    expect(await screen.findByText("Идёт запись")).toBeTruthy();

    await mock.triggerShortcut("Released");
    expect(await screen.findByText(DEFAULT_CARD.sayNow)).toBeTruthy();
  });

  it("copies say_now to the clipboard", async () => {
    const mock = createMockPlatform();
    const user = userEvent.setup();

    render(() => <App platform={mock.platform} />);
    await screen.findByText(/Удержите/);
    await mock.triggerShortcut("Pressed");
    await mock.triggerShortcut("Released");
    await screen.findByText(DEFAULT_CARD.sayNow);

    await user.click(screen.getByRole("button", { name: "Копировать «Скажи сейчас»" }));

    expect(mock.clipboardWriteMock).toHaveBeenCalledWith(DEFAULT_CARD.sayNow);
    expect(await screen.findByText("Строка «Скажи сейчас» в буфере.")).toBeTruthy();
  });

  it("shows diagnostic bundle success and failure states", async () => {
    const successMock = createMockPlatform({
      bootstrap: makeBootstrap({ runtimeReady: false }),
    });
    const successUser = userEvent.setup();

    render(() => <App platform={successMock.platform} />);
    await screen.findByText("Подготовка к работе");
    await successUser.click(screen.getByRole("button", { name: "Собрать сводку" }));
    expect(await screen.findByText(/Сводка собрана\./)).toBeTruthy();

    cleanup();

    const failureMock = createMockPlatform({
      bootstrap: makeBootstrap({ runtimeReady: false }),
      commandHandlers: {
        collect_diagnostic_bundle: async () => {
          throw new Error("bundle failed");
        },
      },
    });
    const failureUser = userEvent.setup();

    render(() => <App platform={failureMock.platform} />);
    await screen.findByText("Подготовка к работе");
    await failureUser.click(screen.getByRole("button", { name: "Собрать сводку" }));
    expect(await screen.findByText(/bundle failed/)).toBeTruthy();
  });

  it("renders the settings readiness snapshot from bootstrap data", async () => {
    const bootstrap = makeBootstrap({
      runtimeReady: false,
      contextActive: true,
      contextEntryCount: 3,
      logStatus: {
        logPath: "C:\\Logs\\replyline.log",
        lastLine: "last line",
      },
    });
    const mock = createMockPlatform({ bootstrap });

    render(() => <App platform={mock.platform} />);

    expect(await screen.findByText("Среда сейчас")).toBeTruthy();
    expect(screen.getByText("https://openrouter.ai/api/v1")).toBeTruthy();
    expect(screen.getByText("openai/gpt-4o-mini")).toBeTruthy();
    expect(screen.getByText("есть · фрагментов: 3")).toBeTruthy();
    expect(screen.getByText("C:\\Logs\\replyline.log")).toBeTruthy();
    expect(screen.getByText("last line")).toBeTruthy();
  });

  it("persists showAdvanced in save_settings payload", async () => {
    const mock = createMockPlatform({
      bootstrap: makeBootstrap({ runtimeReady: false, settings: { ...DEFAULT_SETTINGS, showAdvanced: false } }),
    });
    const user = userEvent.setup();

    render(() => <App platform={mock.platform} />);
    await screen.findByText("Подготовка к работе");

    await user.click(screen.getByLabelText("Расширенные настройки"));
    await user.click(screen.getByRole("button", { name: "Сохранить на этой машине" }));

    await waitFor(() => {
      expect(mock.invokeMock).toHaveBeenCalledWith(
        "save_settings",
        expect.objectContaining({
          input: expect.objectContaining({ showAdvanced: true }),
        }),
      );
    });
  });

  it("shows section-specific notice when copying card section", async () => {
    const mock = createMockPlatform();
    const user = userEvent.setup();

    render(() => <App platform={mock.platform} />);
    await screen.findByText(/Удержите/);
    await mock.triggerShortcut("Pressed");
    await mock.triggerShortcut("Released");
    await screen.findByText(DEFAULT_CARD.sayNow);

    await user.click(screen.getByRole("button", { name: "В буфер обмена: Суть" }));
    expect(await screen.findByText("Раздел «Суть» скопирован в буфер.")).toBeTruthy();
  });

  it("submits settings by Enter and shows inline validation before submit", async () => {
    const mock = createMockPlatform({
      bootstrap: makeBootstrap({ runtimeReady: false }),
    });
    const user = userEvent.setup();

    render(() => <App platform={mock.platform} />);
    await screen.findByText("Подготовка к работе");

    const modelInput = screen.getByDisplayValue("openai/gpt-4o-mini");
    await user.clear(modelInput);
    expect(await screen.findByText("Укажите модель ответа.")).toBeTruthy();

    const urlInput = screen.getByDisplayValue("https://openrouter.ai/api/v1");
    await user.clear(urlInput);
    await user.type(urlInput, "not-a-url");
    expect(await screen.findByText("Укажите полный URL шлюза с http:// или https://.")).toBeTruthy();

    await user.clear(urlInput);
    await user.type(urlInput, "https://openrouter.ai/api/v1");
    await user.type(modelInput, "openai/gpt-4o-mini{Enter}");

    await waitFor(() => {
      expect(mock.invokeMock).toHaveBeenCalledWith(
        "save_settings",
        expect.objectContaining({
          input: expect.objectContaining({
            llmBaseUrl: "https://openrouter.ai/api/v1",
            llmModel: "openai/gpt-4o-mini",
          }),
        }),
      );
    });
  });

  it("keeps first-run setup -> save -> reopen flow stable", async () => {
    let persisted = {
      ...DEFAULT_SETTINGS,
      llmBaseUrl: "",
      llmModel: "",
      showAdvanced: false,
    };
    let deepgramSaved = false;
    const mock = createMockPlatform({
      bootstrap: makeBootstrap({
        runtimeReady: false,
        deepgramKeyPresent: false,
        llmKeyPresent: false,
        settings: persisted,
      }),
      commandHandlers: {
        load_bootstrap: async () =>
          makeBootstrap({
            runtimeReady: deepgramSaved && Boolean(persisted.llmBaseUrl.trim() && persisted.llmModel.trim()),
            deepgramKeyPresent: deepgramSaved,
            llmKeyPresent: true,
            settings: persisted,
          }),
        save_settings: async (args) => {
          persisted = { ...(args?.input as AppSettings) };
          return persisted;
        },
        save_secret: async () => {
          deepgramSaved = true;
          return null;
        },
      },
    });
    const user = userEvent.setup();

    render(() => <App platform={mock.platform} />);
    await screen.findByText("Подготовка к работе");

    await user.type(screen.getByPlaceholderText("вставьте ключ"), "dg-key");
    const urlInput = screen.getByPlaceholderText("https://api.openai.com/v1");
    await user.clear(urlInput);
    await user.type(urlInput, "https://openrouter.ai/api/v1");
    const modelField = screen.getByText("Модель").closest("label")?.querySelector("input");
    expect(modelField).toBeTruthy();
    await user.clear(modelField!);
    await user.type(modelField!, "openai/gpt-4o-mini");
    await user.click(screen.getByRole("button", { name: "Сохранить на этой машине" }));
    await screen.findByText(/Сохранено\./);

    expect(await screen.findByText(/Удержите/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Настройки" }));
    expect(await screen.findByText("Подготовка к работе")).toBeTruthy();
    expect(screen.getByDisplayValue("https://openrouter.ai/api/v1")).toBeTruthy();
    expect(screen.getByDisplayValue("openai/gpt-4o-mini")).toBeTruthy();
  });

  it("hides to tray instead of closing the window directly", async () => {
    const mock = createMockPlatform();

    render(() => <App platform={mock.platform} />);
    await screen.findByText(/Удержите/);

    const closeEvent = await mock.closeWindow();

    expect(closeEvent.preventDefault).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(mock.platform.window.hide).toHaveBeenCalledTimes(1);
    });
  });

  it("runs full capture-stop-analyze pipeline and shows all three card sections", async () => {
    const customCard: AnalysisCard = {
      gist: "Клиент просит перенести срок на неделю.",
      sayNow:
        "Давайте зафиксируем: перенос на 14 апреля, я пришлю обновлённый план сегодня до 18:00.",
      nextMove: "Отправить письмо с новым сроком и чекпоинтом на среду.",
    };
    const mock = createMockPlatform({
      commandHandlers: {
        capture_stop_and_analyze: async () => customCard,
      },
    });

    render(() => <App platform={mock.platform} />);
    await screen.findByText(/Удержите/);

    await mock.triggerShortcut("Pressed");
    expect(mock.invokeMock).toHaveBeenCalledWith("capture_start");

    await mock.triggerShortcut("Released");

    expect(await screen.findByText(customCard.gist)).toBeTruthy();
    expect(screen.getByText(customCard.sayNow)).toBeTruthy();
    expect(screen.getByText(customCard.nextMove)).toBeTruthy();

    expect(mock.invokeMock).toHaveBeenCalledWith("capture_stop_and_analyze");
    expect(mock.invokeMock).toHaveBeenCalledWith("get_context_status");
  });

  it("result card DOM contains expected structure with labels and copy buttons", async () => {
    const mock = createMockPlatform();

    render(() => <App platform={mock.platform} />);
    await screen.findByText(/Удержите/);
    await mock.triggerShortcut("Pressed");
    await mock.triggerShortcut("Released");
    await screen.findByText(DEFAULT_CARD.sayNow);

    const cardContainer = screen.getByText(DEFAULT_CARD.gist).closest(".result-card");
    expect(cardContainer).toBeTruthy();

    expect(screen.getByText("Суть")).toBeTruthy();
    expect(screen.getByText("Скажи сейчас")).toBeTruthy();
    expect(screen.getByText("Дальше")).toBeTruthy();

    const copyButtons = screen.getAllByTitle("В буфер обмена");
    expect(copyButtons.length).toBeGreaterThanOrEqual(3);
  });

  it("shows pipeline error when capture_stop_and_analyze fails", async () => {
    const mock = createMockPlatform({
      commandHandlers: {
        capture_stop_and_analyze: async () => {
          throw new Error("LLM error 500: internal server error");
        },
      },
    });

    render(() => <App platform={mock.platform} />);
    await screen.findByText(/Удержите/);
    await mock.triggerShortcut("Pressed");
    await mock.triggerShortcut("Released");

    expect(await screen.findByText(/шлюза/)).toBeTruthy();
  });

  it("shows retry failure safely when retry_last_analysis fails", async () => {
    const mock = createMockPlatform({
      commandHandlers: {
        retry_last_analysis: async () => {
          throw new Error("nothing to retry");
        },
      },
    });
    const user = userEvent.setup();

    render(() => <App platform={mock.platform} />);
    await screen.findByText(/Удержите/);
    await mock.triggerShortcut("Pressed");
    await mock.triggerShortcut("Released");
    await screen.findByText(DEFAULT_CARD.sayNow);
    await user.click(screen.getByRole("button", { name: "Пересобрать карточку" }));

    expect(await screen.findByText("Сначала сделайте захват — пересобрать пока нечего.")).toBeTruthy();
  });

  it("handles repeated capture cycles without degradation", async () => {
    const mock = createMockPlatform();
    render(() => <App platform={mock.platform} />);
    await screen.findByText(/Удержите/);

    for (let i = 0; i < 8; i += 1) {
      await mock.triggerShortcut("Pressed");
      await mock.triggerShortcut("Released");
      expect(await screen.findByText(DEFAULT_CARD.sayNow)).toBeTruthy();
    }

    expect(mock.invokeMock.mock.calls.filter(([cmd]) => cmd === "capture_start")).toHaveLength(8);
    expect(mock.invokeMock.mock.calls.filter(([cmd]) => cmd === "capture_stop_and_analyze")).toHaveLength(8);
  });
});
