import { vi } from "vitest";

import type { AppPlatform, ListenerPayload, ShortcutEvent, Unlisten } from "../platform";

export type MockPlatform = {
  platform: AppPlatform;
  invoke: ReturnType<typeof vi.fn>;
  emitShortcut: (event: ShortcutEvent) => Promise<void>;
  emitCloseRequest: () => Promise<void>;
};

export type MockPlatformOptions = {
  settingsOverrides?: Partial<{
    hideToTrayOnClose: boolean;
    keepOnTopDuringCapture: boolean;
    interviewCompactMode: boolean;
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
  contextPacks?: Array<{
    id: string;
    title: string;
    content: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type SetupMockPlatformOverrides = {
  deepgramKeyPresent?: boolean;
  llmKeyPresent?: boolean;
  llmBaseUrl?: string;
  llmModel?: string;
  runtimeReady?: boolean;
};

export const defaultMockSettings = {
  schemaVersion: 10,
  hotkey: "Ctrl+Alt+Space",
  llmBaseUrl: "https://api.example/v1",
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
  liveTranslationEnabled: false,
  translationDebounceMs: 600,
  translationMinWordCount: 3,
  bilingualRetentionBehavior: "session_only",
  bilingualAnswerStyle: "b2_conversational",
};

export function interviewCardFixture(overrides: Record<string, unknown> = {}) {
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

function defaultInterviewReport() {
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

function defaultCandidatePackPreview() {
  return {
    packQualityScore: 84,
    missingDataWarnings: ["add metrics"],
    suggestedMissingInfo: ["add leadership example"],
    candidateFacts: [
      { fact: "Fact", evidence: "Resume line", strength: "strong", metrics: [] },
      { fact: "Weak fact", evidence: "No metric", strength: "weak", metrics: [] },
    ],
    roleKeywords: ["rust", "ownership"],
    companyValues: ["customer obsession"],
  };
}

export function createMockPlatform(options: MockPlatformOptions = {}): MockPlatform {
  const listeners = new Map<string, ((event: ListenerPayload<unknown>) => void)[]>();
  const shortcuts: ((event: ShortcutEvent) => void | Promise<void>)[] = [];
  let closeHandler: ((event: { preventDefault(): void }) => void | Promise<void>) | null = null;

  let settingsState = {
    ...defaultMockSettings,
    hideToTrayOnClose: options.settingsOverrides?.hideToTrayOnClose ?? true,
    keepOnTopDuringCapture: options.settingsOverrides?.keepOnTopDuringCapture ?? false,
    interviewCompactMode: options.settingsOverrides?.interviewCompactMode ?? false,
  };
  let deepgramPresent = true;
  let llmPresent = true;
  const runtimeReady = () =>
    deepgramPresent && Boolean(settingsState.llmBaseUrl.trim() && settingsState.llmModel.trim());

  const handleBootstrap = () => ({
    settings: settingsState,
    deepgramKeyPresent: deepgramPresent,
    llmKeyPresent: llmPresent,
    contextActive: false,
    contextEntryCount: 0,
    runtimeReady: runtimeReady(),
    logStatus: { logPath: "", lastLine: null },
    canRetryLastTranscript: false,
    experimentalBilingualAllowed: false,
  });
  const handleSetupStatus = () => ({
    deepgramKeyPresent: deepgramPresent,
    llmKeyPresent: llmPresent,
    llmRouteConfigured: Boolean(settingsState.llmBaseUrl.trim() && settingsState.llmModel.trim()),
    runtimePathReady: runtimeReady(),
  });
  const handleSaveSettings = (args?: Record<string, unknown>) => {
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
    if (command === "save_secret") return handleSaveSecret(args);
    if (command === "get_context_status")
      return { contextActive: true, entryCount: 1, canRetryLastTranscript: true };
    if (command === "capture_start") return "run-1";
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
      command === "clear_interview_reports" ||
      command === "clear_candidate_pack" ||
      command === "log_client_event"
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
    // Context pack commands
    if (command === "list_context_packs") {
      return { packs: options.contextPacks ?? [] };
    }
    if (command === "get_active_context_pack") {
      return (options.contextPacks ?? []).find((p) => p.isActive) ?? null;
    }
    if (command === "get_context_pack_status") {
      const packs = options.contextPacks ?? [];
      return {
        totalCount: packs.length,
        activeId: packs.find((p) => p.isActive)?.id ?? null,
      };
    }
    if (
      command === "save_context_pack" ||
      command === "delete_context_pack" ||
      command === "set_active_context_pack" ||
      command === "clear_active_context_pack"
    ) {
      return null;
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

export function createSetupMockPlatform(overrides: SetupMockPlatformOverrides = {}): MockPlatform {
  const base = createMockPlatform({
    analysisCard: { gist: "g", sayNow: "say", nextMove: "next" },
  });

  let deepgramPresent = overrides.deepgramKeyPresent ?? false;
  let llmPresent = overrides.llmKeyPresent ?? false;
  let settingsState = {
    ...defaultMockSettings,
    llmBaseUrl: overrides.llmBaseUrl ?? "",
    llmModel: overrides.llmModel ?? "gpt-4o-mini",
  };
  const runtimeReady = () =>
    deepgramPresent && Boolean(settingsState.llmBaseUrl.trim() && settingsState.llmModel.trim());
  const origInvoke = base.platform.invoke;
  const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
    if (command === "load_bootstrap") {
      return {
        settings: settingsState,
        deepgramKeyPresent: deepgramPresent,
        llmKeyPresent: llmPresent,
        contextActive: false,
        contextEntryCount: 0,
        runtimeReady: overrides.runtimeReady ?? runtimeReady(),
        logStatus: { logPath: "", lastLine: null },
        canRetryLastTranscript: false,
        experimentalBilingualAllowed: false,
      };
    }
    if (command === "save_settings") {
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
      return {
        deepgramKeyPresent: deepgramPresent,
        llmKeyPresent: llmPresent,
        llmRouteConfigured: Boolean(
          settingsState.llmBaseUrl.trim() && settingsState.llmModel.trim(),
        ),
        runtimePathReady: runtimeReady(),
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

export const uiStateFixtures = {
  defaultEmpty: (): MockPlatformOptions => ({}),
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
