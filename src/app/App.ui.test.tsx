import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import type { AppPlatform, ListenerPayload, ShortcutEvent, Unlisten } from "./platform";

type MockPlatform = {
  platform: AppPlatform;
  invoke: ReturnType<typeof vi.fn>;
  emitShortcut: (event: ShortcutEvent) => Promise<void>;
};

type MockPlatformOptions = {
  analysisError?: unknown;
  analysisCard?: Record<string, unknown>;
};

function createMockPlatform(options: MockPlatformOptions = {}): MockPlatform {
  const listeners = new Map<string, ((event: ListenerPayload<unknown>) => void)[]>();
  const shortcuts: ((event: ShortcutEvent) => void | Promise<void>)[] = [];

  const invoke = vi.fn(async (command: string) => {
    if (command === "load_bootstrap") {
      return {
        settings: {
          schemaVersion: 2,
          hotkey: "Ctrl+Alt+Space",
          llmBaseUrl: "https://api.example/v1",
          llmModel: "gpt-4o-mini",
          captureMaxSeconds: 45,
        },
        deepgramKeyPresent: true,
        llmKeyPresent: true,
        contextActive: false,
        contextEntryCount: 0,
        runtimeReady: true,
      };
    }
    if (command === "get_context_status") {
      return { contextActive: true, entryCount: 1, canRetryLastTranscript: true };
    }
    if (command === "capture_stop_and_analyze" || command === "retry_last_analysis") {
      if (options.analysisError) throw options.analysisError;
      return options.analysisCard ?? { gist: "g", sayNow: "say", nextMove: "next" };
    }
    if (command === "clear_context") {
      return { contextActive: false, entryCount: 0, canRetryLastTranscript: false };
    }
    return null;
  });

  const platform: AppPlatform = {
    invoke,
    listen: vi.fn(async (event, handler) => {
      const arr = listeners.get(event) ?? [];
      arr.push(handler as (event: ListenerPayload<unknown>) => void);
      listeners.set(event, arr);
      return (() => undefined) as Unlisten;
    }),
    shortcuts: {
      unregisterAll: vi.fn(async () => undefined),
      isRegistered: vi.fn(async () => false),
      register: vi.fn(async (_hotkey, handler) => {
        shortcuts.push(handler);
      }),
    },
    clipboard: {
      writeText: vi.fn(async () => undefined),
    },
    window: {
      show: vi.fn(async () => undefined),
      setFocus: vi.fn(async () => undefined),
      hide: vi.fn(async () => undefined),
      startDragging: vi.fn(async () => undefined),
      onCloseRequested: vi.fn(async () => (() => undefined) as Unlisten),
    },
  };

  return {
    platform,
    invoke,
    emitShortcut: async (event: ShortcutEvent) => {
      for (const handler of shortcuts) {
        await handler(event);
      }
    },
  };
}

describe("App UX stabilization", () => {
  let mock: MockPlatform;

  beforeEach(() => {
    mock = createMockPlatform();
  });

  it("shows card shell and action row in idle", async () => {
    render(() => <App platform={mock.platform} />);

    const shell = await screen.findByTestId("main-card-shell");
    const surface = screen.getByTestId("main-surface");
    const top = screen.getByTestId("main-card-top");
    const body = screen.getByTestId("main-card-body");
    const actions = screen.getByTestId("action-row");

    expect(shell).toBeTruthy();
    expect([...surface.children]).toEqual([top, body, actions]);
    expect(screen.getByText("Суть")).toBeTruthy();
    expect(screen.getByText("Скажи сейчас")).toBeTruthy();
    expect(screen.getByText("Дальше")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Статус цепочки" })).toBeTruthy();
  });

  it("keeps actions disabled in idle without card", async () => {
    render(() => <App platform={mock.platform} />);

    const copy = await screen.findByRole("button", { name: "Скопировать ответ" });
    const retry = screen.getByRole("button", { name: "Пересобрать" });

    expect(copy).toHaveProperty("disabled", true);
    expect(retry).toHaveProperty("disabled", true);
    expect(copy.getAttribute("title")).toBe("Сначала получите карточку.");
  });

  it("keeps action buttons fixed-height and out of the scroll body", async () => {
    render(() => <App platform={mock.platform} />);

    const copy = await screen.findByRole("button", { name: "Скопировать ответ" });
    const actions = screen.getByTestId("action-row");
    const body = screen.getByTestId("main-card-body");

    expect(actions.parentElement).toBe(screen.getByTestId("main-surface"));
    expect(body.contains(actions)).toBe(false);
    expect(getComputedStyle(actions).alignItems).toBe("center");
    expect(getComputedStyle(copy).height).toBe("38px");
    expect(getComputedStyle(copy).maxHeight).toBe("38px");
  });

  it("enables actions and handles keyboard shortcuts when card is ready", async () => {
    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    const copy = await screen.findByRole("button", { name: "Скопировать ответ" });
    const retry = screen.getByRole("button", { name: "Пересобрать" });
    const actions = screen.getByTestId("action-row");
    await waitFor(() => {
      expect(copy).toHaveProperty("disabled", false);
      expect(retry).toHaveProperty("disabled", false);
    });
    expect(actions.parentElement).toBe(screen.getByTestId("main-surface"));
    expect(screen.getByText("Ответ готов к копированию.")).toBeTruthy();

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    await waitFor(() => expect(mock.platform.clipboard.writeText).toHaveBeenCalledWith("say"));

    fireEvent.keyDown(window, { key: "r" });
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "retry_last_analysis")).toBe(true),
    );

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Ответ скопирован.")).toBeNull());
  });

  it("keeps the same action zone after a pipeline error", async () => {
    mock = createMockPlatform({ analysisError: { kind: "Pipeline", message: "LLM timeout" } });
    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect(
      await screen.findByText("Нет ответа LLM-шлюза: проверьте URL, модель и ключ."),
    ).toBeTruthy();
    expect(screen.getByText("Повторите захват или проверьте настройки.")).toBeTruthy();
    expect(screen.getByTestId("action-row").parentElement).toBe(screen.getByTestId("main-surface"));
    expect(screen.getByRole("button", { name: "Скопировать ответ" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("renders localized settings CTA labels", async () => {
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    await waitFor(() => expect(screen.getByText("Настройки")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Назад" })).toBeTruthy();
  });
});

describe("Interview card rendering", () => {
  function interviewCard(overrides: Record<string, unknown> = {}) {
    return {
      gist: "legacy gist",
      sayNow: "legacy say",
      nextMove: "legacy next",
      charsBand: "normal",
      interviewCardSchemaV1: {
        answer: {
          main: "Primary answer main",
          short: ["Short 1"],
          strong: ["Strong 1"],
        },
        question: {
          rawTranscript: "um can you tell me",
          cleanQuestion: "Tell me about a delivery incident.",
          interviewerIntent: "Validate ownership",
          questionType: "behavioral",
        },
        signals: {
          mustMention: ["ownership"],
          keywords: ["impact"],
          metrics: [],
          resumeAnchors: ["project x"],
        },
        risks: {
          weakPoints: ["no numbers"],
          avoid: ["blame others"],
          safeReframe: ["focus on learning"],
        },
        followUps: [{ question: "What changed?", bridgeAnswer: "I introduced weekly review." }],
        clarifier: { needed: false, question: "Which timeframe?" },
      },
      ...overrides,
    };
  }

  it("interview answer renders first", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    const labels = (await screen.findByTestId("main-card-shell")).querySelectorAll(".result-label");
    expect(labels[0]?.textContent).toBe("Ответ");
  });

  it("copy copies answer.main", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.click(await screen.findByRole("button", { name: "Скопировать ответ" }));
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenCalledWith("Primary answer main"),
    );
  });

  it("question card renders cleanQuestion", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect(await screen.findByText(/Tell me about a delivery incident\./)).toBeTruthy();
  });

  it("signals hide empty metrics", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect(screen.queryByText("Метрики:")).toBeNull();
  });

  it("clarifier hidden when not needed", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect(screen.queryByTestId("section-interview-clarifier")).toBeNull();
  });

  it("work mode still renders legacy sections", async () => {
    const mock = createMockPlatform({
      analysisCard: { gist: "g", sayNow: "say", nextMove: "next", charsBand: "normal" },
    });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect(await screen.findByTestId("section-gist")).toBeTruthy();
    expect(screen.getByTestId("section-say-now")).toBeTruthy();
    expect(screen.getByTestId("section-next-move")).toBeTruthy();
  });
});

describe("Setup wizard (first-run guidance)", () => {
  /**
   * Create a mock platform with a custom bootstrap response.
   * Patches platform.invoke so the controller sees the override.
   */
  function createSetupMockPlatform(
    overrides: {
      deepgramKeyPresent?: boolean;
      llmKeyPresent?: boolean;
      llmBaseUrl?: string;
      llmModel?: string;
      runtimeReady?: boolean;
    } = {},
  ): MockPlatform {
    const base = createMockPlatform({
      analysisCard: { gist: "g", sayNow: "say", nextMove: "next" },
    });

    const origInvoke = base.platform.invoke;
    const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "load_bootstrap") {
        return {
          settings: {
            schemaVersion: 2,
            hotkey: "Ctrl+Alt+Space",
            llmBaseUrl: overrides.llmBaseUrl ?? "",
            llmModel: overrides.llmModel ?? "gpt-4o-mini",
            captureMaxSeconds: 45,
          },
          deepgramKeyPresent: overrides.deepgramKeyPresent ?? false,
          llmKeyPresent: overrides.llmKeyPresent ?? false,
          contextActive: false,
          contextEntryCount: 0,
          runtimeReady: overrides.runtimeReady ?? false,
          logStatus: { logPath: "", lastLine: null },
          canRetryLastTranscript: false,
        };
      }
      if (command === "save_settings") {
        const input = (args as Record<string, unknown> | undefined)?.input as
          | Record<string, unknown>
          | undefined;
        return { ...input, schemaVersion: 2 };
      }
      if (command === "save_secret") {
        return null;
      }
      if (command === "get_context_status") {
        return { contextActive: true, entryCount: 1, canRetryLastTranscript: true };
      }
      return origInvoke(command, args);
    });
    // Patch both references so the controller sees the override
    base.platform.invoke = patchedInvoke;
    base.invoke = patchedInvoke;
    return base;
  }

  it("shows settings on first launch when not ready", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      expect(screen.getByText("Настройки")).toBeTruthy();
    });

    // Setup progress section is visible (text appears in both progress and legend)
    expect(screen.getAllByText("1. Речь").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2. Ответ").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("3. Горячая клавиша").length).toBeGreaterThanOrEqual(1);
  });

  it("explains missing Deepgram key", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      expect(screen.getByText("Добавьте ключ Deepgram API.")).toBeTruthy();
    });

    // Overall hint indicates not ready
    expect(screen.getByTestId("setup-overall-hint").textContent).toContain(
      "Заполните недостающие поля",
    );
  });

  it("explains missing LLM route", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmBaseUrl: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      expect(screen.getByText("Укажите URL и модель LLM-шлюза.")).toBeTruthy();
    });
  });

  it("shows saved badge when Deepgram key is present", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmBaseUrl: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      const badges = screen.getAllByText("сохранено");
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    // Speech step shows ready status
    expect(screen.getByText("Ключ Deepgram сохранён.")).toBeTruthy();
  });

  it("shows ready hint when all setup steps are complete", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmBaseUrl: "https://api.example.com/v1",
      llmModel: "gpt-4o-mini",
      runtimeReady: true,
    });

    render(() => <App platform={mock.platform} />);

    // With runtimeReady=true, we should be on main panel, not settings
    await waitFor(() => {
      expect(screen.getByTestId("main-surface")).toBeTruthy();
    });

    // Navigate to settings to check the wizard
    const gearBtn = screen.getByTitle("Настройки");
    fireEvent.click(gearBtn);

    await waitFor(() => {
      expect(screen.getAllByText("1. Речь").length).toBeGreaterThanOrEqual(1);
    });

    // All steps show done hints
    expect(screen.getByText("Ключ Deepgram сохранён.")).toBeTruthy();
    expect(screen.getByText("Маршрут LLM настроен.")).toBeTruthy();
    expect(screen.getByText("Горячая клавиша задана.")).toBeTruthy();

    // Overall hint shows ready
    expect(screen.getByTestId("setup-overall-hint").textContent).toContain(
      "Приложение готово к работе",
    );
  });

  it("renders three fieldset sections in settings", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      expect(screen.getByTestId("setup-section-speech")).toBeTruthy();
      expect(screen.getByTestId("setup-section-reply")).toBeTruthy();
      expect(screen.getByTestId("setup-section-hotkey")).toBeTruthy();
    });
  });

  it("returns to main after successful save when all fields are ready", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      expect(screen.getByText("Настройки")).toBeTruthy();
    });

    // Fill in the missing fields
    const deepgramInput = screen.getByPlaceholderText("Добавьте ключ Deepgram API.");
    fireEvent.input(deepgramInput, { target: { value: "dg-key-123" } });

    const urlInput = screen.getByPlaceholderText("https://api.example.com/v1");
    fireEvent.input(urlInput, { target: { value: "https://api.example.com/v1" } });

    // Save
    const saveBtn = screen.getByRole("button", { name: "Сохранить" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      // Should transition to main surface
      expect(screen.getByTestId("main-surface")).toBeTruthy();
    });
  });
});
