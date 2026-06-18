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
  contextPacks?: Array<{
    id: string;
    title: string;
    content: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  canRetryLastTranscript?: boolean;
  rememberTranscriptOnAnalysis?: boolean;
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
  activeAnswerProfile: "work_default",
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
  // Mutable context pack store — starts from options, mutates on CRUD commands.
  let contextPacks: Array<{
    id: string;
    title: string;
    content: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }> = (options.contextPacks ?? []).map((p) => ({ ...p }));
  let deepgramPresent = true;
  let llmPresent = true;
  let canRetryLastTranscript = options.canRetryLastTranscript ?? false;
  const contextActive = () => contextPacks.some((p) => p.isActive);
  const runtimeReady = () =>
    deepgramPresent && Boolean(settingsState.llmBaseUrl.trim() && settingsState.llmModel.trim());

  const handleBootstrap = () => ({
    settings: settingsState,
    deepgramKeyPresent: deepgramPresent,
    llmKeyPresent: llmPresent,
    contextActive: contextActive(),
    contextEntryCount: 0,
    runtimeReady: runtimeReady(),
    logStatus: { logPath: "", lastLine: null },
    canRetryLastTranscript,
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
  const handleSupportSnapshot = (args?: Record<string, unknown>) => {
    const input = (args?.input ?? {}) as { currentPhase?: string; lastErrorCategory?: string };
    const active = contextPacks.find((p) => p.isActive);
    const snapshot = {
      schemaVersion: 1,
      generatedAt: "2026-06-18T00:00:00Z",
      appVersion: "0.2.0-beta.3",
      commitSha: "test",
      currentPhase: input.currentPhase ?? "idle",
      activeContextTitle: active?.title ?? null,
      lastErrorCategory: input.lastErrorCategory ?? null,
      providerReadiness: {
        sttProvider: "deepgram",
        sttKeyPresent: deepgramPresent,
        llmRouteConfigured: Boolean(
          settingsState.llmBaseUrl.trim() && settingsState.llmModel.trim(),
        ),
        llmKeyPresent: llmPresent,
        runtimePathReady: runtimeReady(),
        selectedModelPreset: settingsState.selectedModelPreset,
        llmRouteKind: "remote_https",
      },
      runtime: {
        os: "windows",
        arch: "x86_64",
        family: "windows",
        desktopRuntime: "tauri",
      },
    };
    const json = JSON.stringify(snapshot, null, 2);
    return {
      snapshot,
      json,
      markdown: `# Replyline Support Snapshot\n\n\`\`\`json\n${json}\n\`\`\``,
    };
  };
  const handleCommand = (command: string, args?: Record<string, unknown>) => {
    if (command === "load_bootstrap") return handleBootstrap();
    if (command === "get_setup_status") return handleSetupStatus();
    if (command === "save_settings") return handleSaveSettings(args);
    if (command === "save_secret") return handleSaveSecret(args);
    if (command === "get_context_status")
      return {
        contextActive: contextActive(),
        entryCount: contextActive() ? 1 : 0,
        canRetryLastTranscript,
      };
    if (command === "capture_start") return "run-1";
    if (command === "capture_stop_and_analyze" || command === "retry_last_analysis") {
      if (
        command === "capture_stop_and_analyze" &&
        options.rememberTranscriptOnAnalysis !== false
      ) {
        canRetryLastTranscript = true;
      }
      return handleAnalysis();
    }
    if (command === "clear_context")
      return { contextActive: false, entryCount: 0, canRetryLastTranscript: false };
    if (command === "clear_interview_reports" || command === "log_client_event") {
      return null;
    }
    if (command === "get_support_snapshot") return handleSupportSnapshot(args);
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
    // Context pack commands — mutable store with real CRUD behavior
    if (command === "list_context_packs") {
      return { packs: contextPacks.map((p) => ({ ...p })) };
    }
    if (command === "get_active_context_pack") {
      return contextPacks.find((p) => p.isActive) ?? null;
    }
    if (command === "get_context_pack_status") {
      return {
        totalCount: contextPacks.length,
        activeId: contextPacks.find((p) => p.isActive)?.id ?? null,
      };
    }
    if (command === "save_context_pack") {
      const input = (args?.input ?? args ?? {}) as {
        id: string;
        title: string;
        content: string;
        isActive: boolean;
      };
      const now = new Date().toISOString();
      const existing = contextPacks.findIndex((p) => p.id === input.id);
      if (existing >= 0) {
        // Preserve active status of existing pack (backend decides, but mock mirrors backend truth)
        contextPacks[existing] = {
          ...contextPacks[existing],
          title: input.title,
          content: input.content,
          updatedAt: now,
        };
      } else {
        contextPacks.push({
          id: input.id,
          title: input.title,
          content: input.content,
          isActive: false,
          createdAt: now,
          updatedAt: now,
        });
      }
      return null;
    }
    if (command === "delete_context_pack") {
      const id = (args?.id ?? args?.contextPackId ?? "") as string;
      contextPacks = contextPacks.filter((p) => p.id !== id);
      return null;
    }
    if (command === "set_active_context_pack") {
      const id = (args?.id ?? args?.contextPackId ?? "") as string;
      for (const p of contextPacks) {
        p.isActive = p.id === id;
      }
      return null;
    }
    if (command === "clear_active_context_pack") {
      for (const p of contextPacks) {
        p.isActive = false;
      }
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
  errorState: (): MockPlatformOptions => ({
    analysisError: { kind: "Pipeline", message: "LLM timeout" },
  }),
};
