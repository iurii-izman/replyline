import { fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import type { AppPlatform, ListenerPayload, ShortcutEvent, Unlisten } from "./platform";

type MockPlatform = {
  platform: AppPlatform;
  invoke: ReturnType<typeof vi.fn>;
  emitShortcut: (event: ShortcutEvent) => Promise<void>;
  emitCloseRequest: () => Promise<void>;
};

type MockPlatformOptions = {
  settingsOverrides?: Partial<{
    hideToTrayOnClose: boolean;
    keepOnTopDuringCapture: boolean;
  }>;
  analysisError?: unknown;
  analysisCard?: Record<string, unknown>;
  candidatePackStatus?: { exists: boolean; factCount: number; weakFactCount: number };
  candidatePack?: {
    candidateSummary: string;
    targetRole: string;
    resumeFacts: Array<{ id: string; title: string; claim: string; evidence: string }>;
    jobDescription: {
      title: string;
      company: string;
      requirements: string[];
      responsibilities: string[];
      keywords: string[];
    };
    companyValues: string[];
    answerConstraints: {
      avoidClaims: string[];
      preferredExamples: string[];
      language: string;
    };
  } | null;
  candidatePackPreview?: {
    packQualityScore: number;
    missingDataWarnings: string[];
    suggestedMissingInfo: string[];
    candidateFacts: Array<{
      fact: string;
      evidence: string;
      strength: "strong" | "medium" | "weak";
      metrics: string[];
    }>;
    roleKeywords: string[];
    companyValues: string[];
  } | null;
};

function createMockPlatform(options: MockPlatformOptions = {}): MockPlatform {
  const listeners = new Map<string, ((event: ListenerPayload<unknown>) => void)[]>();
  const shortcuts: ((event: ShortcutEvent) => void | Promise<void>)[] = [];
  let closeHandler: ((event: { preventDefault(): void }) => void | Promise<void>) | null = null;

  const invoke = vi.fn(async (command: string) => {
    if (command === "load_bootstrap") {
      return {
        settings: {
          schemaVersion: 7,
          hotkey: "Ctrl+Alt+Space",
          llmBaseUrl: "https://api.example/v1",
          llmModel: "gpt-4o-mini",
          selectedModelPreset: "custom_openai_compatible",
          captureMaxSeconds: 45,
          activeAnswerProfile: "interview_default",
          windowOpacity: 100,
          hideToTrayOnClose: options.settingsOverrides?.hideToTrayOnClose ?? true,
          keepOnTopDuringCapture: options.settingsOverrides?.keepOnTopDuringCapture ?? false,
          interviewCompactMode: false,
          interviewReportRetentionDays: 0,
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
    if (command === "prepare_candidate_pack") {
      return (
        options.candidatePackPreview ?? {
          packQualityScore: 84,
          missingDataWarnings: ["add metrics"],
          suggestedMissingInfo: ["add leadership example"],
          candidateFacts: [
            { fact: "Fact", evidence: "Resume line", strength: "strong", metrics: [] },
            { fact: "Weak fact", evidence: "No metric", strength: "weak", metrics: [] },
          ],
          roleKeywords: ["rust", "ownership"],
          companyValues: ["customer obsession"],
        }
      );
    }
    if (command === "load_candidate_pack") {
      return options.candidatePack ?? null;
    }
    if (command === "get_candidate_pack_status") {
      return options.candidatePackStatus ?? { exists: false, factCount: 0, weakFactCount: 0 };
    }
    if (command === "save_candidate_pack") {
      return null;
    }
    if (command === "save_prepared_candidate_pack") {
      return null;
    }
    if (command === "start_interview_session") {
      return {
        active: true,
        sessionId: "is-1",
        startedAt: "2026-05-18T10:00:00Z",
        language: "en",
        questions: [],
      };
    }
    if (command === "end_interview_session" || command === "get_interview_report") {
      return {
        sessionId: "is-1",
        startedAt: "2026-05-18T10:00:00Z",
        endedAt: "2026-05-18T10:30:00Z",
        language: "en",
        questions: [
          {
            timestamp: "2026-05-18T10:01:00Z",
            rawTranscript: "Tell me about ownership",
            cleanQuestion: "Tell me about ownership",
            questionType: "behavioral",
            answerMain: "I owned delivery.",
            hints: ["safe reframe"],
            signals: ["ownership"],
          },
        ],
        fullTranscript: "Tell me about ownership",
        scores: { clarity: 80, relevance: 77, accuracy: 70 },
        feedback: { strengths: ["structured"], improvements: [], missingExamples: [] },
      };
    }
    if (command === "export_interview_report_markdown") {
      return "C:\\reports\\interview-report-full-is-1.md";
    }
    if (command === "export_interview_report_redacted_markdown") {
      return "C:\\reports\\interview-report-redacted-is-1.md";
    }
    if (command === "clear_interview_reports") {
      return null;
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
      setOpacity: vi.fn(async () => undefined),
      setAlwaysOnTop: vi.fn(async () => undefined),
      onCloseRequested: vi.fn(async (handler) => {
        closeHandler = handler;
        return (() => undefined) as Unlisten;
      }),
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
    emitCloseRequest: async () => {
      if (!closeHandler) return;
      await closeHandler({ preventDefault: vi.fn() });
    },
  };
}

describe("App UX stabilization", () => {
  let mock: MockPlatform;

  beforeEach(() => {
    mock = createMockPlatform();
  });

  function createSetupStatePlatform(
    overrides: {
      deepgramKeyPresent?: boolean;
      llmKeyPresent?: boolean;
      llmBaseUrl?: string;
      llmModel?: string;
      runtimeReady?: boolean;
    } = {},
  ): MockPlatform {
    const base = createMockPlatform();
    const origInvoke = base.platform.invoke;
    const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "load_bootstrap") {
        return {
          settings: {
            schemaVersion: 7,
            hotkey: "Ctrl+Alt+Space",
            llmBaseUrl: overrides.llmBaseUrl ?? "",
            llmModel: overrides.llmModel ?? "gpt-4o-mini",
            selectedModelPreset: "custom_openai_compatible",
            captureMaxSeconds: 45,
            activeAnswerProfile: "interview_default",
            windowOpacity: 100,
            hideToTrayOnClose: true,
            keepOnTopDuringCapture: false,
            interviewCompactMode: false,
            interviewReportRetentionDays: 0,
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
        return { ...input, schemaVersion: 7 };
      }
      if (command === "save_secret") return null;
      return origInvoke(command, args);
    });
    base.platform.invoke = patchedInvoke;
    base.invoke = patchedInvoke;
    return base;
  }

  const uiStateFixtures = {
    defaultEmpty: (): MockPlatformOptions => ({}),
    setupRequired: (): MockPlatformOptions => ({
      analysisCard: { gist: "g", sayNow: "say", nextMove: "next" },
    }),
    workCardReady: (): MockPlatformOptions => ({
      analysisCard: { mode: "work", gist: "work gist", sayNow: "work say", nextMove: "work next" },
    }),
    interviewCardReady: (): MockPlatformOptions => ({
      analysisCard: {
        gist: "g",
        sayNow: "say",
        nextMove: "next",
        interviewCardSchemaV1: {
          mode: "interview",
          answer: { main: "Main", short: "Short", strong: "Strong", structure: "STAR" },
          question: {
            rawTranscript: "raw",
            cleanQuestion: "clean",
            interviewerIntent: "intent",
            questionType: "behavioral",
            confidence: "high",
          },
          signals: { mustMention: ["ownership"], keywords: ["impact"] },
          risks: { weakPoints: ["wp"], avoid: ["avoid"], safeReframe: "safe" },
          followUps: [{ question: "q", bridgeAnswer: "a" }],
          clarifier: { needed: false, text: null },
        },
      },
    }),
    reportAvailable: (): MockPlatformOptions => ({}),
    settingsIncomplete: (): MockPlatformOptions => ({}),
    settingsReady: (): MockPlatformOptions => ({}),
    candidatePackEmpty: (): MockPlatformOptions => ({
      candidatePackStatus: { exists: false, factCount: 0, weakFactCount: 0 },
      candidatePackPreview: null,
    }),
    candidatePackPreview: (): MockPlatformOptions => ({
      candidatePackStatus: { exists: true, factCount: 7, weakFactCount: 1 },
    }),
    errorState: (): MockPlatformOptions => ({
      analysisError: { kind: "Pipeline", message: "LLM timeout" },
    }),
  };

  it("renders app shell and main landmarks in default fixture", async () => {
    mock = createMockPlatform(uiStateFixtures.defaultEmpty());
    render(() => <App platform={mock.platform} />);

    const appRoot = await screen.findByTestId("app-root");
    const appWorkarea = screen.getByTestId("app-workarea");
    const appView = screen.getByTestId("app-view");
    expect(appRoot).toBeTruthy();
    expect(appWorkarea).toBeTruthy();
    expect(appView).toBeTruthy();
    expect(appView.contains(screen.getByTestId("main-surface"))).toBe(true);
    expect(screen.getByTestId("main-card-body")).toBeTruthy();
    expect(screen.getByTestId("action-row")).toBeTruthy();
    expect(screen.queryByTitle("Выход")).toBeNull();
  });

  it("native close request hides window to tray when enabled", async () => {
    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(mock.platform.window.onCloseRequested).toHaveBeenCalled());
    await mock.emitCloseRequest();

    await waitFor(() => expect(mock.platform.window.hide).toHaveBeenCalled());
  });

  it("native close request does not force hide when hide-to-tray is disabled", async () => {
    mock = createMockPlatform({ settingsOverrides: { hideToTrayOnClose: false } });
    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(mock.platform.window.onCloseRequested).toHaveBeenCalled());
    await mock.emitCloseRequest();

    await waitFor(() => expect(mock.platform.window.hide).not.toHaveBeenCalled());
  });

  it("keeps window on top only during capture when enabled", async () => {
    mock = createMockPlatform({ settingsOverrides: { keepOnTopDuringCapture: true } });
    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    await waitFor(() =>
      expect(mock.platform.window.setAlwaysOnTop).toHaveBeenNthCalledWith(1, true),
    );
    await waitFor(() =>
      expect(mock.platform.window.setAlwaysOnTop).toHaveBeenNthCalledWith(2, false),
    );
  });

  it("renders wide cockpit layout landmarks in work-ready fixture", async () => {
    mock = createMockPlatform(uiStateFixtures.workCardReady());
    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    const mainLayout = screen.getByTestId("main-card-body").querySelector(".main-cockpit-layout");
    expect(mainLayout?.className).toContain("is-wide");
    expect(screen.getByTestId("main-side-panel")).toBeTruthy();
  });

  it("renders compact interview layout fixture after enabling compact mode", async () => {
    mock = createMockPlatform(uiStateFixtures.interviewCardReady());
    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Горячая клавиша и захват/i }));
    fireEvent.click(await screen.findByLabelText("Компактный режим интервью"));
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    fireEvent.click(await screen.findByRole("button", { name: "Назад" }));

    await waitFor(() =>
      expect(screen.getByTestId("main-surface").className).toContain("main-card--compact"),
    );
    const mainLayout = screen.getByTestId("main-card-body").querySelector(".main-cockpit-layout");
    expect(mainLayout?.className).toContain("is-compact");
  });

  it("renders window behavior toggles in hotkey settings section", async () => {
    render(() => <App platform={mock.platform} />);

    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Горячая клавиша и захват/i }));

    expect(await screen.findByText("Поведение окна")).toBeTruthy();
    expect(screen.getByLabelText("Скрывать в трей при закрытии окна")).toBeTruthy();
    expect(screen.getByLabelText("Поверх окон только во время захвата и анализа")).toBeTruthy();
  });

  it("renders setup-required fixture with settings nav landmarks", async () => {
    const setupMock = createSetupStatePlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });
    render(() => <App platform={setupMock.platform} />);

    await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());
    expect(screen.getByTestId("settings-sidebar")).toBeTruthy();
  });

  it("renders candidate studio empty fixture", async () => {
    mock = createMockPlatform(uiStateFixtures.candidatePackEmpty());
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Профиль кандидата/i }));
    fireEvent.click(screen.getByRole("button", { name: "Открыть студию профиля кандидата" }));
    expect(screen.getByTestId("candidate-pack-studio")).toBeTruthy();
    expect(screen.getByTestId("candidate-pack-ai-section")).toBeTruthy();
    expect(screen.getByTestId("candidate-pack-preview").textContent).toContain("Пусто");
  });

  it("renders candidate studio preview fixture", async () => {
    mock = createMockPlatform(uiStateFixtures.candidatePackPreview());
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Профиль кандидата/i }));
    fireEvent.click(screen.getByRole("button", { name: "Открыть студию профиля кандидата" }));
    await waitFor(() =>
      expect(screen.getByTestId("candidate-pack-preview").textContent).toContain("7 / weak 1"),
    );
  });

  it("renders interview session active and report available states", async () => {
    mock = createMockPlatform(uiStateFixtures.reportAvailable());
    render(() => <App platform={mock.platform} />);

    fireEvent.click(await screen.findByRole("button", { name: "Начать сессию" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "start_interview_session")).toBe(true),
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Завершить сессию" })[0]);
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "end_interview_session")).toBe(true),
    );
    expect(screen.getByTestId("interview-report-summary")).toBeTruthy();
  });

  it("renders pipeline error fixture and keeps action bar landmark", async () => {
    mock = createMockPlatform(uiStateFixtures.errorState());
    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect(
      await screen.findByText("Нет ответа LLM-шлюза: проверьте URL, модель и ключ."),
    ).toBeTruthy();
    expect(screen.getByTestId("action-row")).toBeTruthy();
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
    expect(screen.getByTestId("main-status-strip")).toBeTruthy();
  });

  it("keeps responsive layout class contracts for main/settings/candidate pack", async () => {
    render(() => <App platform={mock.platform} />);

    const mainSurface = await screen.findByTestId("main-surface");
    const appView = screen.getByTestId("app-view");
    const mainLayout = screen.getByTestId("main-card-body").querySelector(".main-cockpit-layout");
    const sidePanel = screen.getByTestId("main-side-panel");
    expect(mainSurface.className).toContain("app-page");
    expect(appView.contains(mainSurface)).toBe(true);
    expect(mainLayout?.className).toContain("is-wide");
    expect(sidePanel.className).toContain("cockpit-side");

    fireEvent.click(screen.getByTitle("Настройки"));
    await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());
    expect(appView.contains(screen.getByTestId("settings-surface"))).toBe(true);
    expect(screen.getByTestId("settings-sidebar").className).toContain("settings-sidebar");
    fireEvent.click(screen.getByRole("tab", { name: /Профиль кандидата/i }));
    fireEvent.click(screen.getByRole("button", { name: "Открыть студию профиля кандидата" }));
    expect(screen.getByTestId("candidate-pack-studio")).toBeTruthy();
    expect(screen.getByTestId("candidate-pack-ai-section")).toBeTruthy();
    expect(screen.getByTestId("candidate-pack-preview")).toBeTruthy();
  });

  it("keeps actions disabled in idle without card", async () => {
    render(() => <App platform={mock.platform} />);

    const copy = await screen.findByRole("button", { name: "Скопировать ответ" });
    const retry = screen.getByRole("button", { name: "Пересобрать" });

    expect(copy).toHaveProperty("disabled", true);
    expect(retry).toHaveProperty("disabled", true);
    expect(copy.getAttribute("title")).toBe("Ответ ещё не готов.");
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
    await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());
    const save = screen.getByRole("button", { name: "Сохранить" });
    const back = screen.getByRole("button", { name: "Назад" });
    expect(save).toBeTruthy();
    expect(back).toBeTruthy();
    expect(save.className).toContain("btn-primary");
    expect(back.className).toContain("btn-secondary");
    expect(screen.getByTestId("settings-sticky-footer").className).toContain(
      "sticky-action-footer",
    );
    fireEvent.click(screen.getByRole("tab", { name: /Ответ \/ LLM/i }));
    expect(screen.getByText("Профиль ответа")).toBeTruthy();
    expect(screen.getByText("Профиль модели")).toBeTruthy();
    expect(screen.getByTestId("answer-profile-field")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Отчёты интервью/i }));
    expect(screen.getByText("Срок хранения отчётов интервью")).toBeTruthy();
    expect(screen.getByText("Только ручная очистка")).toBeTruthy();
    expect(screen.queryByText(/raw prompt/i)).toBeNull();
  });

  it("allows selecting OpenRouter Free / Dev profile", async () => {
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Ответ \/ LLM/i }));
    const preset = await screen.findByDisplayValue("Custom OpenAI-compatible");
    fireEvent.input(preset, { target: { value: "openrouter_free_dev" } });
    expect(await screen.findByDisplayValue("OpenRouter Free / Dev")).toBeTruthy();
    expect(screen.getByText(/Fallback chain:/)).toBeTruthy();
  });

  it("syncs base URL and model for non-custom preset", async () => {
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Ответ \/ LLM/i }));
    const preset = await screen.findByDisplayValue("Custom OpenAI-compatible");
    fireEvent.input(preset, { target: { value: "openrouter_balanced_paid" } });
    expect(await screen.findByDisplayValue("OpenRouter Balanced Paid")).toBeTruthy();
    expect(screen.getByDisplayValue("https://openrouter.ai/api/v1")).toBeTruthy();
    expect(screen.getByDisplayValue("openai/gpt-4.1-mini")).toBeTruthy();
  });

  it("saves selectedModelPreset with synced route values", async () => {
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Ответ \/ LLM/i }));
    const preset = await screen.findByDisplayValue("Custom OpenAI-compatible");
    fireEvent.input(preset, { target: { value: "openrouter_quality_paid" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "save_settings")).toBe(true),
    );
    const saveCall = mock.invoke.mock.calls.find((call) => call[0] === "save_settings");
    const input = (saveCall?.[1] as { input?: Record<string, unknown> } | undefined)?.input ?? {};
    expect(input.selectedModelPreset).toBe("openrouter_quality_paid");
    expect(input.llmBaseUrl).toBe("https://openrouter.ai/api/v1");
    expect(input.llmModel).toBe("anthropic/claude-3.7-sonnet");
  });

  it("does not overwrite manual route fields when custom preset is selected", async () => {
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Ответ \/ LLM/i }));
    const baseUrl = await screen.findByDisplayValue("https://api.example/v1");
    const model = screen.getByDisplayValue("gpt-4o-mini");
    fireEvent.input(baseUrl, { target: { value: "https://custom.gateway/v1" } });
    fireEvent.input(model, { target: { value: "custom-model-1" } });

    const preset = await screen.findByDisplayValue("Custom OpenAI-compatible");
    fireEvent.input(preset, { target: { value: "custom_openai_compatible" } });

    expect(await screen.findByDisplayValue("Custom OpenAI-compatible")).toBeTruthy();
    expect(screen.getByDisplayValue("https://custom.gateway/v1")).toBeTruthy();
    expect(screen.getByDisplayValue("custom-model-1")).toBeTruthy();
  });

  it("opacity setting persists and applies to window", async () => {
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Горячая клавиша и захват/i }));
    const opacity = await screen.findByDisplayValue("100%");
    fireEvent.input(opacity, { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => {
      expect(mock.invoke.mock.calls.some((c) => c[0] === "save_settings")).toBe(true);
    });
    const saveCall = mock.invoke.mock.calls.find((c) => c[0] === "save_settings");
    const input = (saveCall?.[1] as { input?: Record<string, unknown> } | undefined)?.input ?? {};
    expect(input.windowOpacity).toBe(80);
    await waitFor(() => expect(mock.platform.window.setOpacity).toHaveBeenCalledWith(0.8));
  });

  it("compact mode hides pipeline", async () => {
    mock = createMockPlatform({
      analysisCard: {
        gist: "g",
        sayNow: "say",
        nextMove: "next",
        charsBand: "normal",
        interviewCardSchemaV1: {
          mode: "interview",
          answer: {
            main: "Primary answer main",
            short: "Short summary",
            strong: "Strong STAR answer",
            structure: "STAR",
          },
          question: {
            rawTranscript: "raw",
            cleanQuestion: "clean",
            interviewerIntent: "intent",
            questionType: "behavioral",
            confidence: "high",
          },
          signals: { mustMention: ["ownership"], keywords: ["impact"] },
          risks: { weakPoints: ["wp"], avoid: ["avoid"], safeReframe: "safe" },
          followUps: [{ question: "q", bridgeAnswer: "a" }],
          clarifier: { needed: false, text: null },
        },
      },
    });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Горячая клавиша и захват/i }));
    const compactToggle = await screen.findByLabelText("Компактный режим интервью");
    fireEvent.click(compactToggle);
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    fireEvent.click(await screen.findByRole("button", { name: "Назад" }));
    await waitFor(() => expect(screen.getByTestId("main-surface")).toBeTruthy());
    expect(screen.queryByTestId("pipeline-timeline")).toBeNull();
  });

  it("compact mode still shows critical error state", async () => {
    mock = createMockPlatform({
      analysisCard: {
        gist: "g",
        sayNow: "say",
        nextMove: "next",
        charsBand: "normal",
        interviewCardSchemaV1: {
          mode: "interview",
          answer: { main: "Main", short: "Short", strong: "Strong", structure: "STAR" },
          question: {
            rawTranscript: "raw",
            cleanQuestion: "clean",
            interviewerIntent: "intent",
            questionType: "behavioral",
            confidence: "high",
          },
          signals: { mustMention: ["ownership"], keywords: ["impact"] },
          risks: { weakPoints: ["wp"], avoid: ["avoid"], safeReframe: "safe" },
          followUps: [{ question: "q", bridgeAnswer: "a" }],
          clarifier: { needed: false, text: null },
        },
      },
      analysisError: { kind: "Pipeline", message: "LLM timeout" },
    });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Горячая клавиша и захват/i }));
    const compactToggle = await screen.findByLabelText("Компактный режим интервью");
    fireEvent.click(compactToggle);
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    fireEvent.click(await screen.findByRole("button", { name: "Назад" }));
    fireEvent.keyDown(window, { key: "r" });

    expect(
      await screen.findByText("Нет ответа LLM-шлюза: проверьте URL, модель и ключ."),
    ).toBeTruthy();
  });

  it("manages interview report actions", async () => {
    render(() => <App platform={mock.platform} />);
    const fullExportBefore = screen.getByRole("button", {
      name: "Экспортировать Full Markdown с transcript",
    });
    const redactedBefore = screen.getByRole("button", {
      name: "Экспортировать Redacted Markdown без transcript",
    });
    expect(fullExportBefore).toHaveProperty("disabled", true);
    expect(redactedBefore).toHaveProperty("disabled", true);
    expect(fullExportBefore.className).toContain("btn-warning");
    expect(redactedBefore.className).toContain("btn-secondary");

    fireEvent.click(await screen.findByRole("button", { name: "Начать сессию" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Завершить сессию" })[0]!);
    await waitFor(() => expect(screen.getByTestId("interview-report-summary")).toBeTruthy());
    fireEvent.click(
      screen.getByRole("button", { name: "Экспортировать Full Markdown с transcript" }),
    );
    await waitFor(() => expect(screen.getByText(/interview-report-full-is-1\.md/)).toBeTruthy());
    fireEvent.click(
      screen.getByRole("button", { name: "Экспортировать Redacted Markdown без transcript" }),
    );
    await waitFor(() =>
      expect(screen.getByText(/interview-report-redacted-is-1\.md/)).toBeTruthy(),
    );
    const clearReports = screen.getByRole("button", { name: "Очистить отчёты" });
    expect(clearReports.className).toContain("btn-danger");
    fireEvent.click(clearReports);
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "clear_interview_reports")).toBe(true),
    );
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
        mode: "interview",
        answer: {
          main: "Primary answer main",
          short: "Short 1",
          strong: "Strong 1",
          structure: "STAR",
        },
        question: {
          rawTranscript: "um can you tell me",
          cleanQuestion: "Tell me about a delivery incident.",
          interviewerIntent: "Validate ownership",
          questionType: "behavioral",
          confidence: "high",
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
          safeReframe: "focus on learning",
        },
        followUps: [{ question: "What changed?", bridgeAnswer: "I introduced weekly review." }],
        clarifier: { needed: false, text: "Which timeframe?" },
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

    fireEvent.keyDown(window, { key: "2" });
    expect(await screen.findByText(/Tell me about a delivery incident\./)).toBeTruthy();
  });

  it("signals hide empty metrics", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(window, { key: "3" });
    expect(screen.queryByText("Метрики:")).toBeNull();
  });

  it("renders interview card fixture without crash when list fields are malformed", async () => {
    const mock = createMockPlatform({
      analysisCard: interviewCard({
        interviewCardSchemaV1: {
          mode: "interview",
          answer: {
            main: "Primary answer main",
            short: "Short 1",
            strong: "Strong 1",
            structure: "STAR",
          },
          question: {
            rawTranscript: "raw",
            cleanQuestion: "clean",
            interviewerIntent: "intent",
            questionType: "behavioral",
            confidence: "high",
          },
          signals: {
            mustMention: "ownership",
            keywords: "impact",
            metrics: null,
            resumeAnchors: "project x",
          },
          risks: {
            weakPoints: "no numbers",
            avoid: "blame others",
            safeReframe: "focus on learning",
          },
          followUps: [{ question: "q", bridgeAnswer: "a" }],
          clarifier: { needed: false, text: null },
        },
      }),
    });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(window, { key: "3" });
    expect(await screen.findByTestId("section-interview-signals")).toBeTruthy();
    fireEvent.keyDown(window, { key: "4" });
    expect(await screen.findByTestId("section-interview-risks")).toBeTruthy();
  });

  it("clarifier hidden when not needed", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect(screen.queryByTestId("section-interview-clarifier")).toBeNull();
  });

  it("clarifier needed=true renders text", async () => {
    const mock = createMockPlatform({
      analysisCard: interviewCard({
        interviewCardSchemaV1: {
          ...interviewCard().interviewCardSchemaV1,
          clarifier: { needed: true, text: "Which timeframe?" },
        },
      }),
    });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(window, { key: "6" });
    expect(await screen.findByTestId("section-interview-clarifier")).toBeTruthy();
    expect(screen.getByText("Which timeframe?")).toBeTruthy();
  });

  it("carousel switches cards and answer is default", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(await screen.findByTestId("section-interview-question")).toBeTruthy();
    fireEvent.keyDown(window, { key: "1" });
    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
  });

  it("pin keeps the selected card visible after refresh", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(window, { key: "3" });
    fireEvent.click(await screen.findByRole("button", { name: "Закрепить" }));
    fireEvent.keyDown(window, { key: "r" });
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "retry_last_analysis")).toBe(true),
    );
    expect(await screen.findByTestId("section-interview-signals")).toBeTruthy();
  });

  it("copy current card works for carousel card", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenCalledWith(
        "Tell me about a delivery incident.",
      ),
    );
  });

  it("active tab copy works for risks/followUps/clarifier", async () => {
    const mock = createMockPlatform({
      analysisCard: interviewCard({
        interviewCardSchemaV1: {
          ...interviewCard().interviewCardSchemaV1,
          clarifier: { needed: true, text: "Need scope?" },
        },
      }),
    });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(window, { key: "4" });
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenLastCalledWith("focus on learning"),
    );

    fireEvent.keyDown(window, { key: "5" });
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenLastCalledWith(
        "What changed? (I introduced weekly review.)",
      ),
    );

    fireEvent.keyDown(window, { key: "6" });
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenLastCalledWith("Need scope?"),
    );
  });

  it("pin resets if pinned key absent in next card", async () => {
    const withClarifier = interviewCard({
      interviewCardSchemaV1: {
        ...interviewCard().interviewCardSchemaV1,
        clarifier: { needed: true, text: "Need scope?" },
      },
    });
    const withoutClarifier = interviewCard({
      interviewCardSchemaV1: {
        ...interviewCard().interviewCardSchemaV1,
        clarifier: { needed: false, text: null },
      },
    });
    const mock = createMockPlatform({ analysisCard: withClarifier });
    const baseInvoke = mock.invoke;
    const patched = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "retry_last_analysis") return withoutClarifier;
      return baseInvoke(command, args);
    });
    mock.platform.invoke = patched;
    mock.invoke = patched;
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(window, { key: "6" });
    fireEvent.click(await screen.findByRole("button", { name: "Закрепить" }));
    fireEvent.keyDown(window, { key: "r" });
    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
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

  it("shows empty candidate pack preview state and disabled save before prepare", async () => {
    const mock = createMockPlatform();
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Профиль кандидата/i }));
    await waitFor(() => expect(screen.getByTestId("settings-section-candidate-pack")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Открыть студию профиля кандидата" }));

    expect(screen.getByTestId("candidate-pack-empty-state")).toBeTruthy();
    expect(screen.getByText("Профиль ещё не подготовлен")).toBeTruthy();
    const savePack = screen.getByRole("button", { name: "Сохранить профиль" });
    expect(savePack.hasAttribute("disabled")).toBe(true);
    expect(savePack.className).toContain("btn-secondary");
    const clearProfile = screen.getByRole("button", { name: "Очистить профиль" });
    expect(clearProfile).toBeTruthy();
    expect(clearProfile.className).toContain("btn-danger");
  });

  it("renders preview metrics after prepare and saves only after explicit confirmation", async () => {
    const mock = createMockPlatform();
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Профиль кандидата/i }));
    await waitFor(() => expect(screen.getByTestId("settings-section-candidate-pack")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Открыть студию профиля кандидата" }));

    const section = screen.getByTestId("candidate-pack-ai-section");
    const textareas = within(section).getAllByRole("textbox");
    fireEvent.input(textareas[0], { target: { value: "resume raw text" } });
    fireEvent.input(textareas[1], { target: { value: "jd raw text" } });

    const prepareBtn = screen.getByRole("button", { name: "Подготовить профиль" });
    fireEvent.click(prepareBtn);
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "prepare_candidate_pack")).toBe(true),
    );
    expect(screen.getByTestId("candidate-pack-quality-card")).toBeTruthy();
    expect(screen.getByText("Оценка:")).toBeTruthy();
    expect(screen.getByText("Слабые факты: 1")).toBeTruthy();
    expect(mock.invoke.mock.calls.some((c) => c[0] === "save_prepared_candidate_pack")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "save_prepared_candidate_pack")).toBe(
        true,
      ),
    );
  });

  it("shows saved status state after saving candidate pack", async () => {
    const mock = createMockPlatform({
      candidatePackStatus: { exists: true, factCount: 9, weakFactCount: 2 },
    });
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Профиль кандидата/i }));
    await waitFor(() => expect(screen.getByTestId("settings-section-candidate-pack")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Открыть студию профиля кандидата" }));
    const section = screen.getByTestId("candidate-pack-ai-section");
    const textareas = within(section).getAllByRole("textbox");
    fireEvent.input(textareas[0], { target: { value: "resume raw text" } });
    fireEvent.click(screen.getByRole("button", { name: "Подготовить профиль" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "prepare_candidate_pack")).toBe(true),
    );
    fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "save_prepared_candidate_pack")).toBe(
        true,
      ),
    );
    expect(screen.getByTestId("candidate-pack-preview").textContent).toContain("9 / weak 2");
  });

  it("renders styled check results and open-step action class", async () => {
    const setupMock = createMockPlatform();
    const invoke = setupMock.platform.invoke;
    setupMock.platform.invoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "load_bootstrap") {
        return {
          settings: {
            schemaVersion: 7,
            hotkey: "Ctrl+Alt+Space",
            llmBaseUrl: "",
            llmModel: "gpt-4o-mini",
            selectedModelPreset: "custom_openai_compatible",
            captureMaxSeconds: 45,
            activeAnswerProfile: "interview_default",
            windowOpacity: 100,
            hideToTrayOnClose: true,
            keepOnTopDuringCapture: false,
            interviewCompactMode: false,
            interviewReportRetentionDays: 0,
          },
          deepgramKeyPresent: false,
          llmKeyPresent: false,
          contextActive: false,
          contextEntryCount: 0,
          runtimeReady: false,
        };
      }
      if (command === "check_runtime_config") {
        return {
          runtimeReady: false,
          stt: { ok: false, code: "missing_key", message: "Deepgram key missing" },
          llm: { ok: true, code: "ok", message: "OK" },
          settings: { ok: false, code: "config_error", message: "Hotkey invalid" },
        };
      }
      return invoke(command, args);
    });
    render(() => <App platform={setupMock.platform} />);
    await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Проверить настройки" }));
    const checks = await screen.findByTestId("check-results");
    expect(checks.className).toContain("check-results-card");
    const openStep = within(checks).getByRole("button", { name: "Открыть шаг" });
    expect(openStep.className).toContain("btn-secondary");
  });

  it("renders localized sidebar status badges", async () => {
    const setupMock = createMockPlatform();
    const invoke = setupMock.platform.invoke;
    setupMock.platform.invoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "load_bootstrap") {
        return {
          settings: {
            schemaVersion: 7,
            hotkey: "Ctrl+Alt+Space",
            llmBaseUrl: "",
            llmModel: "gpt-4o-mini",
            selectedModelPreset: "custom_openai_compatible",
            captureMaxSeconds: 45,
            activeAnswerProfile: "interview_default",
            windowOpacity: 100,
            hideToTrayOnClose: true,
            keepOnTopDuringCapture: false,
            interviewCompactMode: false,
            interviewReportRetentionDays: 0,
          },
          deepgramKeyPresent: false,
          llmKeyPresent: false,
          contextActive: false,
          contextEntryCount: 0,
          runtimeReady: false,
        };
      }
      return invoke(command, args);
    });
    render(() => <App platform={setupMock.platform} />);
    await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());
    const badges = screen.getAllByText(/Не заполнено|Сохранено|Готово|Опционально/);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("candidate studio uses styled accordions instead of details", async () => {
    const studioMock = createMockPlatform({
      candidatePackStatus: { exists: false, factCount: 0, weakFactCount: 0 },
      candidatePackPreview: null,
    });
    render(() => <App platform={studioMock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Профиль кандидата/i }));
    fireEvent.click(screen.getByRole("button", { name: "Открыть студию профиля кандидата" }));
    expect(screen.getByTestId("studio-accordion-root")).toBeTruthy();
    expect(screen.getByTestId("studio-accordion-summary")).toBeTruthy();
  });

  it("candidate studio keeps localized heading and sticky footer actions", async () => {
    const studioMock = createMockPlatform({
      candidatePackStatus: { exists: false, factCount: 0, weakFactCount: 0 },
      candidatePackPreview: null,
    });
    render(() => <App platform={studioMock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Профиль кандидата/i }));
    fireEvent.click(screen.getByRole("button", { name: "Открыть студию профиля кандидата" }));

    expect(screen.getByRole("heading", { name: /Студия профиля кандидата/i })).toBeTruthy();
    const footer = screen.getByTestId("candidate-pack-studio-footer");
    expect(footer.className).toContain("app-sticky-footer");
    expect(within(footer).getByRole("button", { name: "Подготовить профиль" })).toBeTruthy();
    expect(within(footer).getByRole("button", { name: "Назад в настройки" })).toBeTruthy();
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
            schemaVersion: 7,
            hotkey: "Ctrl+Alt+Space",
            llmBaseUrl: overrides.llmBaseUrl ?? "",
            llmModel: overrides.llmModel ?? "gpt-4o-mini",
            selectedModelPreset: "custom_openai_compatible",
            captureMaxSeconds: 45,
            activeAnswerProfile: "interview_default",
            windowOpacity: 100,
            hideToTrayOnClose: true,
            keepOnTopDuringCapture: false,
            interviewCompactMode: false,
            interviewReportRetentionDays: 0,
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
        return { ...input, schemaVersion: 7 };
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
      expect(screen.getByTestId("settings-surface")).toBeTruthy();
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
      llmModel: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      expect(screen.getByText("Укажите URL и модель LLM-шлюза.")).toBeTruthy();
    });
    const cta = screen.getByTestId("setup-first-missing-cta");
    fireEvent.click(cta);
    expect(screen.getByTestId("settings-section-llm")).toBeTruthy();
  });

  it("shows saved badge when Deepgram key is present", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmBaseUrl: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      expect(screen.getByText("Ключ Deepgram сохранён.")).toBeTruthy();
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
    expect(screen.getByText("Горячая клавиша задана.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Проверить настройки" })).toBeTruthy();
  });

  it("renders three fieldset sections in settings", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      expect(screen.getByTestId("settings-section-overview")).toBeTruthy();
      expect(screen.getByTestId("settings-sticky-footer")).toBeTruthy();
    });
  });

  it("shows CTA to first missing setup section", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });
    render(() => <App platform={mock.platform} />);
    const cta = await screen.findByTestId("setup-first-missing-cta");
    fireEvent.click(cta);
    expect(screen.getByTestId("settings-section-speech")).toBeTruthy();
  });

  it("returns to main after successful save when all fields are ready", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      expect(screen.getByTestId("settings-surface")).toBeTruthy();
    });

    // Fill in the missing fields
    fireEvent.click(screen.getByRole("tab", { name: /Речь/i }));
    const deepgramInput = screen.getByPlaceholderText("Добавьте ключ Deepgram API.");
    fireEvent.input(deepgramInput, { target: { value: "dg-key-123" } });

    fireEvent.click(screen.getByRole("tab", { name: /Ответ \/ LLM/i }));
    const urlInput = screen.getByPlaceholderText("https://api.example.com/v1");
    fireEvent.input(urlInput, { target: { value: "https://api.example.com/v1" } });

    // Save
    const saveBtn = screen.getByRole("button", { name: "Сохранить" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      // Should transition to main surface
      expect(screen.getByTestId("main-surface")).toBeTruthy();
    });
    const saveCall = mock.invoke.mock.calls.find((call) => call[0] === "save_settings");
    expect(saveCall).toBeTruthy();
    const input = (saveCall?.[1] as { input?: Record<string, unknown> } | undefined)?.input ?? {};
    expect(Object.prototype.hasOwnProperty.call(input, "llmApiKey")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(input, "deepgramApiKey")).toBe(false);
  });
});
