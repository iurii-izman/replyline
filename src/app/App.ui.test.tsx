import { fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import { ui_ru } from "./locale";
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
  saveSettingsError?: unknown;
  checkRuntimeConfigResult?: {
    stt: { ok: boolean; code: string; message: string; action?: string | null };
    llm: { ok: boolean; code: string; message: string; action?: string | null };
    settings: { ok: boolean; code: string; message: string; action?: string | null };
    runtimeReady: boolean;
  } | null;
};

function interviewCardFixture(overrides: Record<string, unknown> = {}) {
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

function createMockPlatform(options: MockPlatformOptions = {}): MockPlatform {
  const listeners = new Map<string, ((event: ListenerPayload<unknown>) => void)[]>();
  const shortcuts: ((event: ShortcutEvent) => void | Promise<void>)[] = [];
  let closeHandler: ((event: { preventDefault(): void }) => void | Promise<void>) | null = null;

  let settingsState = {
    schemaVersion: 10,
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
    debugTraceMode: "redacted",
    debugTraceRetentionDays: 3,
    bilingualInterviewEnabled: false,
    interviewInputLanguage: "en",
    translationLanguage: "ru",
    liveTranslationEnabled: true,
    translationDebounceMs: 600,
    translationMinWordCount: 3,
    bilingualRetentionBehavior: "session_only",
    bilingualAnswerStyle: "b2_conversational",
  };
  let deepgramPresent = true;
  let llmPresent = true;
  const runtimeReady = () =>
    deepgramPresent && Boolean(settingsState.llmBaseUrl.trim() && settingsState.llmModel.trim());
  const defaultInterviewReport = () => ({
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
  });
  const defaultCandidatePackPreview = () => ({
    packQualityScore: 84,
    missingDataWarnings: ["add metrics"],
    suggestedMissingInfo: ["add leadership example"],
    candidateFacts: [
      { fact: "Fact", evidence: "Resume line", strength: "strong", metrics: [] },
      { fact: "Weak fact", evidence: "No metric", strength: "weak", metrics: [] },
    ],
    roleKeywords: ["rust", "ownership"],
    companyValues: ["customer obsession"],
  });

  const handleBootstrap = () => ({
    settings: settingsState,
    deepgramKeyPresent: deepgramPresent,
    llmKeyPresent: llmPresent,
    contextActive: false,
    contextEntryCount: 0,
    runtimeReady: runtimeReady(),
  });
  const handleSetupStatus = () => ({
    deepgramKeyPresent: deepgramPresent,
    llmKeyPresent: llmPresent,
    llmRouteConfigured: Boolean(settingsState.llmBaseUrl.trim() && settingsState.llmModel.trim()),
    runtimePathReady: runtimeReady(),
  });
  const handleSaveSettings = (args?: Record<string, unknown>) => {
    if (options.saveSettingsError) throw options.saveSettingsError;
    const next = (args?.input as Record<string, unknown> | undefined) ?? {};
    settingsState = { ...settingsState, ...(next as typeof settingsState) };
    return settingsState;
  };
  const handleSaveSecret = (args?: Record<string, unknown>) => {
    const slot = args?.slot;
    if (slot === "deepgramApiKey") deepgramPresent = true;
    if (slot === "llmApiKey") llmPresent = true;
    return null;
  };
  const handleAnalysis = () => {
    if (options.analysisError) throw options.analysisError;
    return options.analysisCard ?? { gist: "g", sayNow: "say", nextMove: "next" };
  };
  const handleCommand = (command: string, args?: Record<string, unknown>) => {
    if (command === "load_bootstrap") return handleBootstrap();
    if (command === "get_setup_status") return handleSetupStatus();
    if (command === "save_settings") return handleSaveSettings(args);
    if (command === "check_runtime_config") return options.checkRuntimeConfigResult ?? null;
    if (command === "save_secret") return handleSaveSecret(args);
    if (command === "get_context_status")
      return { contextActive: true, entryCount: 1, canRetryLastTranscript: true };
    if (command === "capture_stop_and_analyze" || command === "retry_last_analysis") {
      return handleAnalysis();
    }
    if (command === "clear_context")
      return { contextActive: false, entryCount: 0, canRetryLastTranscript: false };
    if (command === "prepare_candidate_pack") {
      return options.candidatePackPreview ?? defaultCandidatePackPreview();
    }
    if (command === "load_candidate_pack") return options.candidatePack ?? null;
    if (command === "get_candidate_pack_status") {
      return options.candidatePackStatus ?? { exists: false, factCount: 0, weakFactCount: 0 };
    }
    if (
      command === "save_candidate_pack" ||
      command === "save_prepared_candidate_pack" ||
      command === "clear_interview_reports"
    ) {
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
      return defaultInterviewReport();
    }
    if (command === "export_interview_report_markdown") {
      return String.raw`C:\reports\interview-report-full-is-1.md`;
    }
    if (command === "export_interview_report_redacted_markdown") {
      return String.raw`C:\reports\interview-report-redacted-is-1.md`;
    }
    return null;
  };
  const invoke = vi.fn(async (command: string, args?: Record<string, unknown>) =>
    handleCommand(command, args),
  );

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

  let deepgramPresent = overrides.deepgramKeyPresent ?? false;
  let llmPresent = overrides.llmKeyPresent ?? false;
  let settingsState = {
    schemaVersion: 10,
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
    debugTraceMode: "redacted",
    debugTraceRetentionDays: 3,
    bilingualInterviewEnabled: false,
    interviewInputLanguage: "en",
    translationLanguage: "ru",
    liveTranslationEnabled: true,
    translationDebounceMs: 600,
    translationMinWordCount: 3,
    bilingualRetentionBehavior: "session_only",
    bilingualAnswerStyle: "b2_conversational",
  };
  const origInvoke = base.platform.invoke;
  const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
    if (command === "load_bootstrap") {
      const routeReady = Boolean(settingsState.llmBaseUrl.trim() && settingsState.llmModel.trim());
      const runtimeReady = deepgramPresent && routeReady;
      return {
        settings: settingsState,
        deepgramKeyPresent: deepgramPresent,
        llmKeyPresent: llmPresent,
        contextActive: false,
        contextEntryCount: 0,
        runtimeReady,
        logStatus: { logPath: "", lastLine: null },
        canRetryLastTranscript: false,
      };
    }
    if (command === "save_settings") {
      if (options.saveSettingsError) throw options.saveSettingsError;
      const input = args?.input as Record<string, unknown> | undefined;
      settingsState = { ...settingsState, ...(input as typeof settingsState), schemaVersion: 10 };
      return settingsState;
    }
    if (command === "save_secret") {
      const slot = args?.slot;
      if (slot === "deepgramApiKey") deepgramPresent = true;
      if (slot === "llmApiKey") llmPresent = true;
      return null;
    }
    if (command === "get_setup_status") {
      const routeReady = Boolean(settingsState.llmBaseUrl.trim() && settingsState.llmModel.trim());
      const runtimePathReady = deepgramPresent && routeReady;
      return {
        deepgramKeyPresent: deepgramPresent,
        llmKeyPresent: llmPresent,
        llmRouteConfigured: routeReady,
        runtimePathReady,
      };
    }
    if (command === "get_context_status") {
      return { contextActive: true, entryCount: 1, canRetryLastTranscript: true };
    }
    return origInvoke(command, args);
  });
  base.platform.invoke = patchedInvoke;
  base.invoke = patchedInvoke;
  return base;
}

async function triggerAnalysisReady(mock: MockPlatform): Promise<void> {
  await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
  await mock.emitShortcut({ state: "Pressed" });
  await mock.emitShortcut({ state: "Released" });
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
            schemaVersion: 10,
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
            debugTraceMode: "redacted",
            debugTraceRetentionDays: 3,
            bilingualInterviewEnabled: false,
            interviewInputLanguage: "en",
            translationLanguage: "ru",
            liveTranslationEnabled: true,
            translationDebounceMs: 600,
            translationMinWordCount: 3,
            bilingualRetentionBehavior: "session_only",
            bilingualAnswerStyle: "b2_conversational",
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
        const input = args?.input as Record<string, unknown> | undefined;
        return { ...input, schemaVersion: 10 };
      }
      if (command === "save_secret") return null;
      if (command === "get_setup_status") {
        const routeReady = Boolean(
          (overrides.llmBaseUrl ?? "").trim() && (overrides.llmModel ?? "gpt-4o-mini").trim(),
        );
        return {
          deepgramKeyPresent: overrides.deepgramKeyPresent ?? false,
          llmKeyPresent: overrides.llmKeyPresent ?? false,
          llmRouteConfigured: routeReady,
        runtimePathReady: overrides.runtimeReady ?? false,
      };
    }
    if (command === "check_runtime_config") {
      return (
        options.checkRuntimeConfigResult ?? {
          stt: { ok: true, code: "ok", message: "ok" },
          llm: { ok: true, code: "ok", message: "ok" },
          settings: { ok: true, code: "ok", message: "ok" },
          runtimeReady: true,
        }
      );
    }
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
    expect(screen.queryByTestId("action-row")).toBeNull();
    expect(screen.queryByTitle("Выход")).toBeNull();
  });

  it("renders compact header brand and actions", async () => {
    render(() => <App platform={mock.platform} />);

    expect(await screen.findByTestId("app-header-brand")).toBeTruthy();
    expect(screen.getByText("Replyline")).toBeTruthy();
    expect(screen.getByTestId("app-header-hotkey").textContent).toContain("Ctrl+Alt+Space");
    expect(screen.getByTestId("app-header-settings-action")).toBeTruthy();
    expect(screen.getByTestId("app-header-hide-action")).toBeTruthy();
  });

  it("renders current panel breadcrumb for settings speech section", async () => {
    render(() => <App platform={mock.platform} />);

    fireEvent.click(await screen.findByTestId("app-header-settings-action"));
    fireEvent.click(screen.getByRole("tab", { name: /Речь/i }));

    expect(screen.getByTestId("app-header-section").textContent).toContain("Настройки");
    expect(screen.getByTestId("app-header-section").textContent).toContain("Речь");
  });

  it("renders setup-required phase label in header", async () => {
    const setupMock = createSetupStatePlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });
    render(() => <App platform={setupMock.platform} />);

    await waitFor(() =>
      expect(screen.getByTestId("app-header-phase").textContent).toContain(
        "Нужно завершить настройку",
      ),
    );
    expect(screen.getByTestId("app-header-phase").className).toContain("app-header-phase--setup");
  });

  it("renders idle-ready phase label in header", async () => {
    render(() => <App platform={mock.platform} />);
    await waitFor(() =>
      expect(screen.getByTestId("app-header-phase").textContent).toContain("Готово к записи"),
    );
    expect(screen.getByTestId("app-header-phase").className).toContain("app-header-phase--idle");
  });

  it("header settings action opens settings panel", async () => {
    render(() => <App platform={mock.platform} />);

    fireEvent.click(await screen.findByTestId("app-header-settings-action"));
    expect(await screen.findByTestId("settings-surface")).toBeTruthy();
  });

  it("header icon actions expose accessible names", async () => {
    render(() => <App platform={mock.platform} />);
    expect(await screen.findByRole("button", { name: "Настройки" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Скрыть" })).toBeTruthy();
  });

  it("header hide action calls hideWindow", async () => {
    render(() => <App platform={mock.platform} />);

    fireEvent.click(await screen.findByTestId("app-header-hide-action"));
    await waitFor(() => expect(mock.platform.window.hide).toHaveBeenCalled());
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
    expect(mainLayout?.className).toContain("no-side-panel");
    expect(screen.queryByTestId("main-side-panel")).toBeNull();
  });

  it("renders compact interview layout fixture after enabling compact mode", async () => {
    mock = createMockPlatform(uiStateFixtures.interviewCardReady());
    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Горячая клавиша/i }));
    fireEvent.click(await screen.findByLabelText("Компактный режим интервью"));
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    fireEvent.click(await screen.findByRole("button", { name: "Назад" }));

    await waitFor(() => expect(screen.getByTestId("main-surface")).toBeTruthy());
    const mainLayout = screen.getByTestId("main-card-body").querySelector(".main-cockpit-layout");
    expect(mainLayout?.className).toContain("is-compact");
  });

  it("renders window behavior toggles in hotkey settings section", async () => {
    render(() => <App platform={mock.platform} />);

    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Горячая клавиша/i }));

    expect(await screen.findByText("Поведение окна")).toBeTruthy();
    expect(screen.getByLabelText("Скрывать в трей при закрытии окна")).toBeTruthy();
    expect(screen.getByLabelText("Поверх окон только во время захвата и анализа")).toBeTruthy();
  });

  it("settings can be submitted from form keyboard path", async () => {
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());

    const form = document.querySelector("form.settings-content");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "save_settings")).toBe(true),
    );
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
    expect(screen.getByRole("tab", { name: /Обзор/i }).getAttribute("aria-controls")).toBe(
      "settings-panel-overview",
    );
  });

  it("renders candidate studio empty fixture", async () => {
    mock = createMockPlatform(uiStateFixtures.candidatePackEmpty());
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Профиль кандидата/i }));
    fireEvent.click(screen.getByRole("button", { name: "Открыть студию профиля кандидата" }));
    expect(screen.getByTestId("candidate-pack-studio")).toBeTruthy();
    expect(screen.getByTestId("candidate-pack-status-banner").textContent).toContain("Пусто");
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
      expect(screen.getByTestId("candidate-pack-preview").textContent).toContain("7 / слабых 1"),
    );
  });

  it("renders interview session active and report available states", async () => {
    mock = createMockPlatform(uiStateFixtures.reportAvailable());
    render(() => <App platform={mock.platform} />);

    fireEvent.click(await screen.findByRole("button", { name: "Начать сессию" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "start_interview_session")).toBe(true),
    );

    expect(screen.getByTestId("idle-session-chip")).toBeTruthy();
  });

  it("renders pipeline error fixture", async () => {
    mock = createMockPlatform(uiStateFixtures.errorState());
    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect((await screen.findAllByText("Нет ответа LLM-шлюза: проверьте URL, модель и ключ.")).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId("action-row")).toBeNull();
  });

  it("shows idle readiness state without cockpit", async () => {
    render(() => <App platform={mock.platform} />);

    expect(await screen.findByTestId("main-state-idle")).toBeTruthy();
    expect(screen.queryByTestId("main-card-shell")).toBeNull();
    expect(screen.queryByTestId("action-row")).toBeNull();
    expect(screen.getByTestId("main-status-strip")).toBeTruthy();
  });

  it("keeps responsive layout class contracts for main/settings/candidate pack", async () => {
    render(() => <App platform={mock.platform} />);

    const mainSurface = await screen.findByTestId("main-surface");
    const appView = screen.getByTestId("app-view");
    const mainLayout = screen.getByTestId("main-card-body").querySelector(".main-cockpit-layout");
    expect(mainSurface.className).toContain("app-page");
    expect(appView.contains(mainSurface)).toBe(true);
    expect(mainLayout).toBeNull();

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

  it("does not render copy action in idle without card", async () => {
    render(() => <App platform={mock.platform} />);

    expect(await screen.findByTestId("main-state-idle")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Скопировать ответ" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Пересобрать" })).toBeNull();
  });

  it("does not expose stealth or cheating copy in visible UI", async () => {
    render(() => <App platform={mock.platform} />);
    const text = document.body.textContent?.toLowerCase() ?? "";
    expect(text).not.toContain("stealth");
    expect(text).not.toContain("cheat");
    expect(text).not.toContain("hidden overlay");
  });

  it("renders answer action dock only in ready state", async () => {
    render(() => <App platform={mock.platform} />);

    expect(await screen.findByTestId("main-state-idle")).toBeTruthy();
    expect(screen.queryByTestId("action-row")).toBeNull();
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
    expect(screen.getByTestId("answer-hero-card")).toBeTruthy();

    fireEvent.keyDown(globalThis, { key: "c", ctrlKey: true });
    await waitFor(() => expect(mock.platform.clipboard.writeText).toHaveBeenCalledWith("say"));

    fireEvent.keyDown(globalThis, { key: "r" });
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "retry_last_analysis")).toBe(true),
    );

    fireEvent.keyDown(globalThis, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Ответ скопирован.")).toBeNull());
  });

  it("hides action zone after a pipeline error", async () => {
    mock = createMockPlatform({ analysisError: { kind: "Pipeline", message: "LLM timeout" } });
    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect((await screen.findAllByText("Нет ответа LLM-шлюза: проверьте URL, модель и ключ.")).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId("action-row")).toBeNull();
    expect(screen.queryByRole("button", { name: "Скопировать ответ" })).toBeNull();
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
    expect(back.className).toContain("btn-ghost");
    expect(screen.getByTestId("settings-sticky-footer").className).toContain(
      "sticky-action-footer",
    );
    fireEvent.click(screen.getByRole("tab", { name: /Ответ \/ LLM/i }));
    expect(screen.getByText("Профиль ответа")).toBeTruthy();
    expect(screen.getByText("Профиль модели")).toBeTruthy();
    expect(screen.getByTestId("answer-profile-field")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Отчёты/i }));
    expect(screen.getByText("Срок хранения отчётов интервью")).toBeTruthy();
    expect(screen.getAllByText("Только ручная очистка").length).toBeGreaterThanOrEqual(1);
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

  it("shows preset caveats for free and paid routes and hides paid caveat for custom", async () => {
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Ответ \/ LLM/i }));
    fireEvent.click(screen.getByText(/caveats/i));

    const preset = await screen.findByDisplayValue("Custom OpenAI-compatible");
    fireEvent.input(preset, { target: { value: "openrouter_free_dev" } });
    expect(
      screen.getByText("Free models can be rate-limited and availability may vary."),
    ).toBeTruthy();
    expect(
      screen.queryByText(
        "Paid presets require active credits/billing; provider limits may change.",
      ),
    ).toBeNull();

    fireEvent.input(preset, { target: { value: "openrouter_quality_paid" } });
    expect(
      screen.getByText("Paid presets require active credits/billing; provider limits may change."),
    ).toBeTruthy();

    fireEvent.input(preset, { target: { value: "custom_openai_compatible" } });
    expect(
      screen.queryByText(
        "Paid presets require active credits/billing; provider limits may change.",
      ),
    ).toBeNull();
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
    fireEvent.click(screen.getByRole("tab", { name: /Горячая клавиша/i }));
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

  it("saves full_local debug trace mode from reports settings", async () => {
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Отчёты/i }));
    const modeField = await screen.findByTestId("debug-trace-mode-field");
    const select = within(modeField).getByRole("combobox");
    fireEvent.input(select, { target: { value: "full_local" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "save_settings")).toBe(true),
    );
    const saveCall = mock.invoke.mock.calls.find((call) => call[0] === "save_settings");
    const input = (saveCall?.[1] as { input?: Record<string, unknown> } | undefined)?.input ?? {};
    expect(input.debugTraceMode).toBe("full_local");
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
    fireEvent.click(screen.getByRole("tab", { name: /Горячая клавиша/i }));
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
    fireEvent.click(screen.getByRole("tab", { name: /Горячая клавиша/i }));
    const compactToggle = await screen.findByLabelText("Компактный режим интервью");
    fireEvent.click(compactToggle);
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    fireEvent.click(await screen.findByRole("button", { name: "Назад" }));
    fireEvent.keyDown(globalThis, { key: "r" });

    expect((await screen.findAllByText("Нет ответа LLM-шлюза: проверьте URL, модель и ключ.")).length).toBeGreaterThanOrEqual(1);
  });

  it("manages interview report actions", async () => {
    mock = createMockPlatform({
      ...uiStateFixtures.workCardReady(),
      deepgramKeyPresent: true,
      llmBaseUrl: "https://api.openai.com/v1",
    });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(screen.getByTestId("main-surface")).toBeTruthy());
    expect(
      screen.queryByRole("button", { name: "Экспортировать Full Markdown с transcript" }),
    ).toBeNull();
  });
});
describe("Interview card rendering", () => {
  it("interview answer renders first", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    const labels = (await screen.findByTestId("main-card-shell")).querySelectorAll(".result-label");
    expect(labels[0]?.textContent).toBe("Ответ");
  });

  it("copy copies answer.main", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(globalThis, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenCalledWith("Primary answer main"),
    );
  });

  it("question card renders cleanQuestion", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(globalThis, { key: "2" });
    expect(await screen.findByText(/Tell me about a delivery incident\./)).toBeTruthy();
  });

  it("signals hide empty metrics", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(globalThis, { key: "3" });
    expect(screen.queryByText("Метрики:")).toBeNull();
  });

  it("renders interview card fixture without crash when list fields are malformed", async () => {
    const mock = createMockPlatform({
      analysisCard: interviewCardFixture({
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

    fireEvent.keyDown(globalThis, { key: "3" });
    expect(await screen.findByTestId("section-interview-signals")).toBeTruthy();
    fireEvent.keyDown(globalThis, { key: "4" });
    expect(await screen.findByTestId("section-interview-risks")).toBeTruthy();
  });

  it("clarifier hidden when not needed", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect(screen.queryByTestId("section-interview-clarifier")).toBeNull();
  });

  it("clarifier needed=true renders text", async () => {
    const mock = createMockPlatform({
      analysisCard: interviewCardFixture({
        interviewCardSchemaV1: {
          ...interviewCardFixture().interviewCardSchemaV1,
          clarifier: { needed: true, text: "Which timeframe?" },
        },
      }),
    });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(globalThis, { key: "6" });
    expect(await screen.findByTestId("section-interview-clarifier")).toBeTruthy();
    expect(screen.getByText("Which timeframe?")).toBeTruthy();
  });

  it("carousel switches cards and answer is default", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
    fireEvent.keyDown(globalThis, { key: "ArrowRight" });
    expect(await screen.findByTestId("section-interview-question")).toBeTruthy();
    fireEvent.keyDown(globalThis, { key: "1" });
    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
  });

  it("pin keeps the selected card visible after refresh", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(globalThis, { key: "3" });
    fireEvent.click(await screen.findByRole("button", { name: "Закрепить" }));
    fireEvent.keyDown(globalThis, { key: "r" });
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "retry_last_analysis")).toBe(true),
    );
    expect(await screen.findByTestId("section-interview-signals")).toBeTruthy();
  });

  it("copy current card works for carousel card", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(globalThis, { key: "2" });
    fireEvent.keyDown(globalThis, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenCalledWith(
        "Tell me about a delivery incident.",
      ),
    );
  });

  it("active tab copy works for risks/followUps/clarifier", async () => {
    const mock = createMockPlatform({
      analysisCard: interviewCardFixture({
        interviewCardSchemaV1: {
          ...interviewCardFixture().interviewCardSchemaV1,
          clarifier: { needed: true, text: "Need scope?" },
        },
      }),
    });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(globalThis, { key: "4" });
    fireEvent.keyDown(globalThis, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenLastCalledWith("focus on learning"),
    );

    fireEvent.keyDown(globalThis, { key: "5" });
    fireEvent.keyDown(globalThis, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenLastCalledWith(
        "What changed? (I introduced weekly review.)",
      ),
    );

    fireEvent.keyDown(globalThis, { key: "6" });
    fireEvent.keyDown(globalThis, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenLastCalledWith("Need scope?"),
    );
  });

  it("pin resets if pinned key absent in next card", async () => {
    const withClarifier = interviewCardFixture({
      interviewCardSchemaV1: {
        ...interviewCardFixture().interviewCardSchemaV1,
        clarifier: { needed: true, text: "Need scope?" },
      },
    });
    const withoutClarifier = interviewCardFixture({
      interviewCardSchemaV1: {
        ...interviewCardFixture().interviewCardSchemaV1,
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

    fireEvent.keyDown(globalThis, { key: "6" });
    fireEvent.click(await screen.findByRole("button", { name: "Закрепить" }));
    fireEvent.keyDown(globalThis, { key: "r" });
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

    expect(screen.getByTestId("candidate-pack-stepper")).toBeTruthy();
    expect(screen.getByTestId("candidate-pack-stepper-item-1").className).toContain("is-current");
    expect(screen.getByTestId("candidate-pack-empty-state")).toBeTruthy();
    expect(screen.getByText("Профиль ещё не подготовлен")).toBeTruthy();
    const savePack = screen.getByRole("button", { name: "Сохранить черновик профиля" });
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
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Сохранить профиль" }).className).toContain(
        "btn-primary",
      ),
    );
    expect(screen.getByTestId("candidate-pack-stepper-item-2").className).not.toContain(
      "is-complete",
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
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "save_candidate_pack")).toBe(true),
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
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "save_candidate_pack")).toBe(true),
    );
    expect(screen.getByTestId("candidate-pack-preview").textContent).toContain("Слабые факты:");
  });

  it("renders styled check results and open-step action class", async () => {
    const setupMock = createMockPlatform();
    const invoke = setupMock.platform.invoke;
    setupMock.platform.invoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "load_bootstrap") {
        return {
          settings: {
            schemaVersion: 10,
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
            debugTraceMode: "redacted",
            debugTraceRetentionDays: 3,
            bilingualInterviewEnabled: false,
            interviewInputLanguage: "en",
            translationLanguage: "ru",
            liveTranslationEnabled: true,
            translationDebounceMs: 600,
            translationMinWordCount: 3,
            bilingualRetentionBehavior: "session_only",
            bilingualAnswerStyle: "b2_conversational",
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
      if (command === "get_setup_status") {
        return {
          deepgramKeyPresent: false,
          llmKeyPresent: false,
          llmRouteConfigured: false,
          runtimePathReady: false,
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
    expect(openStep.className).toContain("check-item-action");
  });

  it("renders compact sidebar status indicators", async () => {
    const setupMock = createMockPlatform();
    const invoke = setupMock.platform.invoke;
    setupMock.platform.invoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "load_bootstrap") {
        return {
          settings: {
            schemaVersion: 10,
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
            debugTraceMode: "redacted",
            debugTraceRetentionDays: 3,
            bilingualInterviewEnabled: false,
            interviewInputLanguage: "en",
            translationLanguage: "ru",
            liveTranslationEnabled: true,
            translationDebounceMs: 600,
            translationMinWordCount: 3,
            bilingualRetentionBehavior: "session_only",
            bilingualAnswerStyle: "b2_conversational",
          },
          deepgramKeyPresent: false,
          llmKeyPresent: false,
          contextActive: false,
          contextEntryCount: 0,
          runtimeReady: false,
        };
      }
      if (command === "get_setup_status") {
        return {
          deepgramKeyPresent: false,
          llmKeyPresent: false,
          llmRouteConfigured: false,
          runtimePathReady: false,
        };
      }
      return invoke(command, args);
    });
    render(() => <App platform={setupMock.platform} />);
    await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());
    const dots = document.querySelectorAll(".section-status-dot");
    expect(dots.length).toBeGreaterThan(0);
    expect(document.querySelector(".section-status-dot.section-status-missing")).toBeTruthy();
    expect(document.querySelector(".section-status-dot.section-status-optional")).toBeTruthy();
  });

  it("renders speech helper as compact note", async () => {
    const localMock = createMockPlatform();
    render(() => <App platform={localMock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Речь/i }));
    const helper = await screen.findByTestId("speech-helper-note");
    expect(helper.className).toContain("settings-note");
    expect(helper.className).not.toContain("settings-section-helper");
  });

  it("renders hotkey checkbox row with alignment class", async () => {
    const localMock = createMockPlatform();
    render(() => <App platform={localMock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Горячая клавиша/i }));
    const row = await screen.findByTestId("hotkey-compact-row");
    expect(row.className).toContain("settings-checkbox-row");
  });

  it("keeps single settings footer instance", async () => {
    const localMock = createMockPlatform();
    render(() => <App platform={localMock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());
    const footers = screen.getAllByTestId("settings-sticky-footer");
    expect(footers).toHaveLength(1);
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
    const roleCompany = screen.getByTestId("studio-accordion-role-company");
    fireEvent.click(within(roleCompany).getByRole("button"));
    expect(within(roleCompany).getByLabelText("Целевая роль")).toBeTruthy();
  });

  it("candidate studio action dock wires clear and back actions", async () => {
    const studioMock = createMockPlatform({
      candidatePackStatus: { exists: false, factCount: 0, weakFactCount: 0 },
      candidatePackPreview: null,
    });
    render(() => <App platform={studioMock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Профиль кандидата/i }));
    fireEvent.click(screen.getByRole("button", { name: "Открыть студию профиля кандидата" }));

    fireEvent.click(screen.getByRole("button", { name: "Очистить профиль" }));
    await waitFor(() =>
      expect(studioMock.invoke.mock.calls.some((c) => c[0] === "clear_candidate_pack")).toBe(true),
    );
    fireEvent.click(screen.getByRole("button", { name: "Назад в настройки" }));
    await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());
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

describe("Work/Interview behavior parity", () => {
  it("setup required state is shown instead of idle ready content", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmKeyPresent: false,
      llmBaseUrl: "",
      llmModel: "",
      runtimeReady: false,
    });
    render(() => <App platform={mock.platform} />);

    expect(await screen.findByTestId("main-state-setup")).toBeTruthy();
    expect(screen.queryByTestId("main-state-idle")).toBeNull();
  });

  it("clear resets interview view and prevents stale pinned content", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    render(() => <App platform={mock.platform} />);
    await triggerAnalysisReady(mock);

    fireEvent.keyDown(globalThis, { key: "3" });
    fireEvent.click(await screen.findByRole("button", { name: "Закрепить" }));
    expect(await screen.findByTestId("section-interview-signals")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Очистить" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "clear_context")).toBe(true),
    );
    expect(await screen.findByTestId("main-state-idle")).toBeTruthy();
    expect(screen.queryByTestId("interview-card-controls")).toBeNull();
    expect(screen.queryByTestId("section-interview-signals")).toBeNull();
  });

  it("retry keeps interview mode and works with active answer profile", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    render(() => <App platform={mock.platform} />);
    await triggerAnalysisReady(mock);

    fireEvent.keyDown(globalThis, { key: "r" });
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "retry_last_analysis")).toBe(true),
    );
    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
    expect(screen.queryByTestId("section-gist")).toBeNull();
  });

  it("compact interview keeps critical states and actions visible", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    render(() => <App platform={mock.platform} />);
    await triggerAnalysisReady(mock);

    fireEvent.click(await screen.findByTitle("Настройки"));
    fireEvent.click(screen.getByRole("tab", { name: /Горячая клавиша/i }));
    fireEvent.click(await screen.findByLabelText("Компактный режим интервью"));
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    fireEvent.click(await screen.findByRole("button", { name: "Назад" }));

    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Пересобрать" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Очистить" })).toBeTruthy();
  });

  it("switches from interview to work layout without leftover interview controls", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    const invoke = mock.platform.invoke;
    const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "retry_last_analysis") {
        return { mode: "work", gist: "work gist", sayNow: "work say", nextMove: "work next" };
      }
      return invoke(command, args);
    });
    mock.platform.invoke = patchedInvoke;
    mock.invoke = patchedInvoke;

    render(() => <App platform={mock.platform} />);
    await triggerAnalysisReady(mock);

    fireEvent.keyDown(globalThis, { key: "r" });
    expect(await screen.findByTestId("section-gist")).toBeTruthy();
    expect(screen.getByTestId("section-say-now")).toBeTruthy();
    expect(screen.getByTestId("section-next-move")).toBeTruthy();
    expect(screen.queryByTestId("interview-card-controls")).toBeNull();
  });

  it("switches from work to interview without inheriting legacy-only output", async () => {
    const mock = createMockPlatform({
      analysisCard: { mode: "work", gist: "work gist", sayNow: "work say", nextMove: "work next" },
    });
    const invoke = mock.platform.invoke;
    const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "retry_last_analysis") return interviewCardFixture();
      return invoke(command, args);
    });
    mock.platform.invoke = patchedInvoke;
    mock.invoke = patchedInvoke;

    render(() => <App platform={mock.platform} />);
    await triggerAnalysisReady(mock);

    expect(await screen.findByTestId("section-gist")).toBeTruthy();
    fireEvent.keyDown(globalThis, { key: "r" });
    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
    expect(screen.queryByTestId("section-gist")).toBeNull();
  });
});

describe("Runtime scenario matrix (deterministic)", () => {
  it("Scenario 2: WorkConversation happy path supports capture, copy, retry, and clear", async () => {
    const mock = createMockPlatform({
      analysisCard: { mode: "work", gist: "work gist", sayNow: "work say", nextMove: "work next" },
    });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());

    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "capture_start")).toBe(true),
    );
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "capture_stop_and_analyze")).toBe(
        true,
      ),
    );
    expect(await screen.findByTestId("section-say-now")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Скопировать ответ" }));
    await waitFor(() => expect(mock.platform.clipboard.writeText).toHaveBeenCalledWith("work say"));

    fireEvent.click(screen.getByRole("button", { name: "Пересобрать" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "retry_last_analysis")).toBe(true),
    );
    expect(await screen.findByTestId("section-say-now")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Очистить" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "clear_context")).toBe(true),
    );
    expect(await screen.findByTestId("main-state-idle")).toBeTruthy();
  });

  it("Scenario 4: Candidate Pack signals avoid fabricated metrics and missing anchors", async () => {
    const cardWithoutEvidence = interviewCardFixture({
      interviewCardSchemaV1: {
        ...interviewCardFixture().interviewCardSchemaV1,
        signals: {
          mustMention: ["ownership"],
          keywords: ["impact"],
          metrics: [],
          resumeAnchors: [],
        },
      },
    });
    const mock = createMockPlatform({ analysisCard: cardWithoutEvidence });
    render(() => <App platform={mock.platform} />);
    await triggerAnalysisReady(mock);

    fireEvent.keyDown(globalThis, { key: "3" });
    expect(await screen.findByTestId("section-interview-signals")).toBeTruthy();
    expect(screen.queryByText("Метрики:")).toBeNull();
    expect(screen.queryByText(/project x/i)).toBeNull();
  });

  it("Scenario 5: invalid first pass can recover on next deterministic pass", async () => {
    let firstAttempt = true;
    const mock = createMockPlatform();
    const invoke = mock.platform.invoke;
    const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "capture_stop_and_analyze") {
        if (firstAttempt) {
          firstAttempt = false;
          throw { kind: "Pipeline", message: "LLM timeout" };
        }
        return interviewCardFixture();
      }
      return invoke(command, args);
    });
    mock.platform.invoke = patchedInvoke;
    mock.invoke = patchedInvoke;

    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });
    expect((await screen.findAllByText("Нет ответа LLM-шлюза: проверьте URL, модель и ключ.")).length).toBeGreaterThanOrEqual(1);

    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });
    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
  });

  it("Scenario 6: session lifecycle supports report export and clear", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    render(() => <App platform={mock.platform} />);
    await triggerAnalysisReady(mock);

    fireEvent.click(screen.getByRole("button", { name: "Начать сессию" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "start_interview_session")).toBe(
        true,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Завершить сессию" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "end_interview_session")).toBe(true),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Экспортировать Redacted Markdown без транскрипта" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Экспортировать полный Markdown с транскриптом" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Очистить отчёты" }));

    await waitFor(() =>
      expect(
        mock.invoke.mock.calls.some(
          (call) => call[0] === "export_interview_report_redacted_markdown",
        ),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(
        mock.invoke.mock.calls.some((call) => call[0] === "export_interview_report_markdown"),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "clear_interview_reports")).toBe(
        true,
      ),
    );
  });
});

describe("Setup wizard (first-run guidance)", () => {
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
    expect(screen.getByTestId("setup-overall-hint").textContent).toContain("Проверьте готовность");
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

    // Overview stays available with ready setup and manual checks
    expect(screen.getByTestId("settings-surface")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Проверить настройки" })).toBeTruthy();
  });

  it("shows runtime check failures and smoke-report hint after repeated failures", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "https://api.example.com/v1",
      llmModel: "gpt-4o-mini",
      runtimeReady: false,
    });
    const invoke = mock.platform.invoke;
    mock.platform.invoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "check_runtime_config") {
        return {
          stt: { ok: false, code: "missing_key", message: "Deepgram API key is not set" },
          llm: { ok: false, code: "endpoint_error", message: "LLM endpoint unreachable" },
          settings: { ok: false, code: "config_error", message: "Settings validation failed" },
          runtimeReady: false,
        };
      }
      return invoke(command, args);
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());
    const checkBtn = screen.getByRole("button", { name: "Проверить настройки" });
    fireEvent.click(checkBtn);
    await waitFor(() =>
      expect(screen.getAllByText(ui_ru.errors.missingDeepgramKey).length).toBeGreaterThanOrEqual(1),
    );
    fireEvent.click(checkBtn);

    await waitFor(() =>
      expect(screen.getAllByText(ui_ru.settings.setupSmokeReportHint).length).toBeGreaterThanOrEqual(1),
    );
    expect(screen.getAllByText(ui_ru.errors.runtimeCheckEndpoint).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(ui_ru.errors.runtimeCheckFailed).length).toBeGreaterThanOrEqual(1);
  });

  it("shows invalid URL hint when save fails", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
      saveSettingsError: JSON.stringify({ kind: "Settings", message: "INVALID_URL: bad URL" }),
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());
    fireEvent.click(screen.getByRole("tab", { name: /Ответ \/ LLM/i }));
    const urlInput = screen.getByPlaceholderText("https://api.example.com/v1");
    fireEvent.input(urlInput, { target: { value: "not-a-url" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(ui_ru.errors.settingsSaveFailed);
    });
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

  it("shows main when runtime is ready", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmBaseUrl: "https://api.example.com/v1",
      llmModel: "gpt-4o-mini",
      runtimeReady: true,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      expect(screen.getByTestId("main-surface")).toBeTruthy();
      expect(screen.getByTestId("app-header-settings-action")).toBeTruthy();
    });
  });

  it("save flow applies backend settings and resyncs bootstrap without empty secret overwrite", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmKeyPresent: true,
      llmBaseUrl: "https://api.example.com/v1",
      llmModel: "gpt-4o-mini",
      runtimeReady: true,
    });

    let bootstrapCount = 0;
    const invoke = mock.platform.invoke;
    const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "load_bootstrap") {
        bootstrapCount += 1;
        return {
          settings: {
            schemaVersion: 10,
            hotkey: "Ctrl+Alt+Shift+S",
            llmBaseUrl: "https://api.example.com/v1",
            llmModel: "gpt-4.1-mini",
            selectedModelPreset: "custom_openai_compatible",
            captureMaxSeconds: 45,
            activeAnswerProfile: "interview_default",
            windowOpacity: 100,
            hideToTrayOnClose: true,
            keepOnTopDuringCapture: false,
            interviewCompactMode: false,
            interviewReportRetentionDays: 0,
            debugTraceMode: "redacted",
            debugTraceRetentionDays: 3,
            bilingualInterviewEnabled: false,
            interviewInputLanguage: "en",
            translationLanguage: "ru",
            liveTranslationEnabled: true,
            translationDebounceMs: 600,
            translationMinWordCount: 3,
            bilingualRetentionBehavior: "session_only",
            bilingualAnswerStyle: "b2_conversational",
          },
          deepgramKeyPresent: true,
          llmKeyPresent: true,
          contextActive: false,
          contextEntryCount: 0,
          runtimeReady: true,
          logStatus: { logPath: "", lastLine: null },
          canRetryLastTranscript: false,
        };
      }
      if (command === "save_settings") {
        return (args as { input: Record<string, unknown> }).input;
      }
      return invoke(command, args);
    });
    mock.platform.invoke = patchedInvoke;
    mock.invoke = patchedInvoke;

    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(screen.getByTestId("main-surface")).toBeTruthy());
    fireEvent.click(screen.getByTitle("Настройки"));
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() =>
      expect(mock.invoke.mock.calls.filter((call) => call[0] === "load_bootstrap").length).toBe(2),
    );
    expect(bootstrapCount).toBe(2);
    expect(mock.invoke.mock.calls.some((c) => c[0] === "save_secret")).toBe(false);
  });

  it("hotkey uses cached ready state when startup already confirmed credential availability", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmKeyPresent: true,
      llmBaseUrl: "https://api.example.com/v1",
      llmModel: "gpt-4o-mini",
      runtimeReady: true,
    });

    const origInvoke = mock.platform.invoke;
    const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "get_setup_status") {
        return {
          deepgramKeyPresent: true,
          llmKeyPresent: true,
          llmRouteConfigured: true,
          runtimePathReady: true,
        };
      }
      if (command === "capture_start") return "run-1";
      if (command === "get_context_status") {
        return { contextActive: true, entryCount: 1, canRetryLastTranscript: true };
      }
      return origInvoke(command, args);
    });
    mock.platform.invoke = patchedInvoke;
    mock.invoke = patchedInvoke;

    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(screen.getByTestId("main-surface")).toBeTruthy());
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    const setupChecksBeforeCapture = mock.invoke.mock.calls.filter(
      (call) => call[0] === "get_setup_status",
    ).length;

    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "capture_start")).toBe(true),
    );
    expect(screen.queryByTestId("settings-surface")).toBeNull();
    expect(mock.invoke.mock.calls.filter((call) => call[0] === "get_setup_status")).toHaveLength(
      setupChecksBeforeCapture,
    );
    expect(
      mock.invoke.mock.calls.some(
        (c) =>
          c[0] === "log_client_event" &&
          (c[1] as { event?: string })?.event === "setup_preflight_check_result",
      ),
    ).toBe(true);
    expect(
      mock.invoke.mock.calls.some(
        (c) =>
          c[0] === "log_client_event" && (c[1] as { event?: string })?.event === "ui_answer_ready",
      ),
    ).toBe(true);
  });

  it("startup probes setup status automatically without manual settings check", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmKeyPresent: true,
      llmBaseUrl: "https://api.example.com/v1",
      llmModel: "gpt-4o-mini",
      runtimeReady: true,
    });

    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(screen.getByTestId("main-surface")).toBeTruthy());

    await waitFor(
      () =>
        expect(mock.invoke.mock.calls.some((call) => call[0] === "get_setup_status")).toBe(true),
      { timeout: 3500 },
    );
  });

  it("does not show setup-required while startup readiness is still checking", async () => {
    let resolveBootstrap: ((value: unknown) => void) | null = null;
    const bootstrapPromise = new Promise((resolve) => {
      resolveBootstrap = resolve;
    });
    const mock = createMockPlatform();
    const origInvoke = mock.platform.invoke;
    const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "load_bootstrap") {
        return bootstrapPromise;
      }
      return origInvoke(command, args);
    });
    mock.platform.invoke = patchedInvoke;
    mock.invoke = patchedInvoke;

    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(screen.getByTestId("startup-checking")).toBeTruthy());
    expect(screen.queryByText("Нужно завершить настройку")).toBeNull();

    resolveBootstrap?.({
      settings: {
        schemaVersion: 10,
        hotkey: "Ctrl+Alt+Space",
        llmBaseUrl: "https://api.example.com/v1",
        llmModel: "gpt-4o-mini",
        selectedModelPreset: "custom_openai_compatible",
        captureMaxSeconds: 45,
        activeAnswerProfile: "interview_default",
        windowOpacity: 100,
        hideToTrayOnClose: true,
        keepOnTopDuringCapture: false,
        interviewCompactMode: false,
        interviewReportRetentionDays: 0,
        debugTraceMode: "redacted",
        debugTraceRetentionDays: 3,
        bilingualInterviewEnabled: false,
        interviewInputLanguage: "en",
        translationLanguage: "ru",
        liveTranslationEnabled: true,
        translationDebounceMs: 600,
        translationMinWordCount: 3,
        bilingualRetentionBehavior: "session_only",
        bilingualAnswerStyle: "b2_conversational",
      },
      deepgramKeyPresent: true,
      llmKeyPresent: true,
      contextActive: false,
      contextEntryCount: 0,
      runtimeReady: true,
      logStatus: { logPath: "", lastLine: null },
      canRetryLastTranscript: false,
    });
    await waitFor(() => expect(screen.queryByTestId("startup-checking")).toBeNull());
  });

  it("startup ready opens working state without setup-required and without network check", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmKeyPresent: true,
      llmBaseUrl: "https://api.example.com/v1",
      llmModel: "gpt-4o-mini",
      runtimeReady: true,
    });

    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(screen.getByTestId("main-state-idle")).toBeTruthy());
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    expect(screen.queryByTestId("main-state-setup")).toBeNull();
    expect(screen.queryByText("Нужно завершить настройку")).toBeNull();
    expect(screen.getAllByText("Готово к записи").length).toBeGreaterThan(0);
    expect(mock.invoke.mock.calls.some((c) => c[0] === "check_runtime_config")).toBe(false);
  });

  it("shows setup-required only after backend resolves startup as missing", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmKeyPresent: false,
      llmBaseUrl: "",
      llmModel: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(screen.getByTestId("main-state-setup")).toBeTruthy());
    expect(screen.getAllByText("Нужно завершить настройку").length).toBeGreaterThan(0);
  });
});
