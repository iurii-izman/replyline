import { createEffect, createMemo, createSignal, onCleanup, type Accessor } from "solid-js";
import { createStore } from "solid-js/store";
import {
  DEFAULT_SETTINGS,
  type AnalysisCard,
  type AppSettings,
  type BilingualInterviewState,
  type CommandErrorKind,
  type ContextStatusDto,
  type InterviewReportDto,
  type InterviewSessionStateDto,
  initialBilingualInterviewState,
  type Panel,
  type PersistenceDiagnosticsDto,
  type Phase,
  type RuntimeCheckDto,
  type SettingsSectionId,
  type SetupReadinessState,
  invokeErrorMessage,
  isConfiguredLlmRoute,
} from "../model";
import type { ContextPackDto, ContextPackListDto } from "../model";
import { getUi, type UiStrings } from "../locale";
import { currentLanguage } from "../language_profile";
import type { AppPlatform } from "../platform";
import { resolveModelPreset } from "../modelPresets";

import { createNotices } from "./notices";
import { createSelectors } from "./selectors";
import { createHotkeys } from "./hotkeys";
import { createSettingsActions } from "./settingsActions";
import { createPipelineActions } from "./pipelineActions";
import { setupLifecycle } from "./lifecycle";
import { setupKeyboardShortcuts } from "./keyboardShortcuts";
import { setupTraySync } from "./traySync";
import { emitUiEvent } from "../observability";
import { createBilingualInterviewController } from "./bilingualInterviewController";

type InterviewCardKey = "answer" | "question" | "signals" | "risks" | "followUps" | "clarifier";

export function useReplylineController(platform: AppPlatform) {
  // ── State ──────────────────────────────────────────────────────────────
  const [phase, setPhase] = createSignal<Phase>("booting");
  const [panel, setPanel] = createSignal<Panel>("main");
  const [settingsActiveSection, setSettingsActiveSection] =
    createSignal<SettingsSectionId>("overview");
  const [card, setCard] = createSignal<AnalysisCard | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [statusDetail, setStatusDetail] = createSignal<string | null>(null);
  const [activeRunId, setActiveRunId] = createSignal<string | null>(null);
  const [captureQuality, setCaptureQuality] = createSignal<"short" | "normal" | "long">("normal");
  const [deepgramSaved, setDeepgramSaved] = createSignal(false);
  const [llmKeySaved, setLlmKeySaved] = createSignal(false);
  const [llmRouteConfigured, setLlmRouteConfigured] = createSignal(false);
  const [setupReadinessState, setSetupReadinessState] =
    createSignal<SetupReadinessState>("checking");
  const [startupPanelDecisionPending, setStartupPanelDecisionPending] = createSignal(true);
  const [userSelectedPanel, setUserSelectedPanel] = createSignal(false);
  const [contextActive, setContextActive] = createSignal(false);
  const [contextEntryCount, setContextEntryCount] = createSignal(0);
  const [lastTranscriptPreview, setLastTranscriptPreview] = createSignal<string | null>(null);
  const [canRetryLastTranscript, setCanRetryLastTranscript] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [notice, setNotice] = createSignal<{
    tone: "info" | "error";
    message: string;
  } | null>(null);
  const [hotkeyFailed, setHotkeyFailed] = createSignal(false);
  const [settingsFormHint, setSettingsFormHint] = createSignal<string | null>(null);
  const [setupTroubleCount, setSetupTroubleCount] = createSignal(0);
  const [lastCommandErrorKind, setLastCommandErrorKind] = createSignal<CommandErrorKind | null>(
    null,
  );
  const [runtimeCheckResult, setRuntimeCheckResult] = createSignal<RuntimeCheckDto | null>(null);
  const [runtimeCheckRunning, setRuntimeCheckRunning] = createSignal(false);
  const [persistenceDiagnostics, setPersistenceDiagnostics] =
    createSignal<PersistenceDiagnosticsDto | null>(null);
  const [persistenceDiagnosticsError, setPersistenceDiagnosticsError] = createSignal<string | null>(
    null,
  );
  const [activeInterviewCardIndex, setActiveInterviewCardIndex] = createSignal(0);
  const [pinnedInterviewCard, setPinnedInterviewCard] = createSignal<InterviewCardKey | null>(null);
  const [interviewSession, setInterviewSession] = createSignal<InterviewSessionStateDto | null>(
    null,
  );
  const [interviewReport, setInterviewReport] = createSignal<InterviewReportDto | null>(null);
  const [interviewReportMarkdownPath, setInterviewReportMarkdownPath] = createSignal<string | null>(
    null,
  );
  const [interviewReportRedactedMarkdownPath, setInterviewReportRedactedMarkdownPath] =
    createSignal<string | null>(null);
  const [bilingualInterviewState, setBilingualInterviewState] =
    createSignal<BilingualInterviewState>(initialBilingualInterviewState);

  const [settings, setSettings] = createStore<AppSettings>({
    ...DEFAULT_SETTINGS,
  });
  const [draftSecrets, setDraftSecrets] = createStore({
    deepgramApiKey: "",
    llmApiKey: "",
  });

  const [contextPacks, setContextPacks] = createSignal<ContextPackDto[]>([]);
  const [activeContextPack, setActiveContextPack] = createSignal<ContextPackDto | null>(null);

  createEffect(() => {
    const nextOpacity = settings.windowOpacity;
    if (platform.window.setOpacity) {
      void platform.window.setOpacity(nextOpacity / 100);
    }
  });

  const interviewCarouselKeys = (nextCard: AnalysisCard | null): InterviewCardKey[] => {
    if (nextCard?.mode !== "interview") return [];
    const keys: InterviewCardKey[] = ["answer", "question", "signals", "risks", "followUps"];
    if (nextCard.interview.clarifier?.needed) keys.push("clarifier");
    return keys;
  };

  const applyIncomingCard = (nextCard: AnalysisCard | null) => {
    setCard(nextCard);
    if (nextCard?.mode !== "interview") {
      setActiveInterviewCardIndex(0);
      setPinnedInterviewCard(null);
      return;
    }
    const keys = interviewCarouselKeys(nextCard);
    const pinned = pinnedInterviewCard();
    if (pinned) {
      const pinnedIndex = keys.indexOf(pinned);
      if (pinnedIndex >= 0) {
        setActiveInterviewCardIndex(pinnedIndex);
        return;
      }
      setPinnedInterviewCard(null);
    }
    setActiveInterviewCardIndex(0);
  };

  const clampInterviewCardIndex = (next: number) => {
    const max = Math.max(0, interviewCarouselKeys(card()).length - 1);
    return Math.min(Math.max(0, next), max);
  };
  const activeInterviewCardKeyNow = (): InterviewCardKey | null => {
    const keys = interviewCarouselKeys(card());
    if (!keys.length) return null;
    return keys[clampInterviewCardIndex(activeInterviewCardIndex())] ?? keys[0] ?? null;
  };
  const joinNonEmpty = (items: unknown, separator = " • "): string => {
    if (!Array.isArray(items)) return "";
    return items
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join(separator);
  };
  const clarifierText = (cardValue: AnalysisCard): string => {
    if (cardValue.mode !== "interview") return "";
    const value = cardValue.interview.clarifier;
    const text = typeof value.text === "string" ? value.text.trim() : "";
    if (text) return text;
    const maybeQuestion =
      "question" in (value as Record<string, unknown>) &&
      typeof (value as { question?: unknown }).question === "string"
        ? ((value as { question: string }).question ?? "").trim()
        : "";
    return maybeQuestion;
  };
  const copyText = createMemo(() => {
    const currentCard = card();
    if (!currentCard) return "";
    if (currentCard.mode !== "interview") return currentCard.sayNow ?? "";
    switch (activeInterviewCardKeyNow()) {
      case "answer":
        return currentCard.interview.answer.main ?? "";
      case "question":
        return currentCard.interview.question.cleanQuestion ?? "";
      case "signals": {
        const signals = currentCard.interview.signals;
        return [
          joinNonEmpty(signals.mustMention),
          joinNonEmpty(signals.keywords),
          joinNonEmpty(signals.metrics),
          joinNonEmpty(signals.resumeAnchors),
        ]
          .filter(Boolean)
          .join("\n");
      }
      case "risks":
        return currentCard.interview.risks.safeReframe?.trim()
          ? currentCard.interview.risks.safeReframe
          : joinNonEmpty(currentCard.interview.risks.avoid) ||
              joinNonEmpty(currentCard.interview.risks.weakPoints);
      case "followUps":
        return currentCard.interview.followUps
          .map((item) => `${item.question} (${item.bridgeAnswer})`)
          .join("\n");
      case "clarifier":
        return clarifierText(currentCard);
      default:
        return currentCard.interview.answer.main ?? "";
    }
  });
  const buildSetupIssueHint = () => {
    const s = strings();
    const missingSteps = selectors
      .setupSteps()
      .filter((step) => !step.ready)
      .map((step) => step.label);
    const runtimeReady = setupReadinessState() === "ready" && !hotkeyFailed();
    const runtimeSummary = runtimeCheckResult()
      ? runtimeCheckResult()!.runtimeReady
        ? s.settings.runtimeSummaryReady
        : s.settings.runtimeSummaryNeedsFix
      : s.settings.runtimeSummaryNotRun;
    return [
      s.settings.setupIssueHintTitle,
      `${s.settings.setupIssueHintMissing} ${missingSteps.length ? missingSteps.join(", ") : s.settings.setupIssueHintNone}`,
      `${s.settings.setupIssueHintRuntime} ${runtimeReady ? s.settings.runtimeSummaryReady : runtimeSummary}`,
      s.settings.setupIssueHintSteps,
      `1. ${s.settings.setupIssueHintOpenSettings}`,
      `2. ${s.settings.setupIssueHintRunCheck}`,
      `3. ${s.settings.setupIssueHintSmokeReport}`,
    ].join("\n");
  };

  // ── Derived ────────────────────────────────────────────────────────────
  const strings: Accessor<UiStrings> = createMemo(() => getUi(currentLanguage()));

  // ── Notices ────────────────────────────────────────────────────────────
  const notices = createNotices(setNotice);

  // ── Small helpers shared across modules ───────────────────────────────
  function applyContextStatus(status: ContextStatusDto) {
    setContextActive(status.contextActive);
    setContextEntryCount(status.entryCount);
    setLastTranscriptPreview(status.lastTranscriptPreview ?? null);
    setCanRetryLastTranscript(status.canRetryLastTranscript);
  }

  async function showWindow(panelName?: Panel) {
    if (panelName) setPanel(panelName);
    await emitUiEvent(platform, "window_show_setup_status_refresh_start", { phase: "window" });
    await settingsActions.refreshSetupStatus();
    // Load context packs after settings are ready
    loadContextPacks().catch(() => {});
    await emitUiEvent(platform, "window_show_setup_status_refresh_ok", {
      phase: "window",
      runtime_path_ready: String(setupReadinessState() === "ready"),
    });
    void emitUiEvent(platform, "panel_open", { panel: panelName ?? panel(), phase: "navigation" });
    await platform.window.show();
    await platform.window.setFocus();
  }

  async function loadContextPacks() {
    const list = await platform.invoke<ContextPackListDto>("list_context_packs");
    setContextPacks(list.packs);
    const active = await platform.invoke<ContextPackDto | null>("get_active_context_pack");
    setActiveContextPack(active);
  }

  // ── Selectors ──────────────────────────────────────────────────────────
  const selectors = createSelectors({
    phase,
    card,
    error,
    deepgramSaved,
    hotkeyFailed,
    contextActive,
    canRetryLastTranscript,
    llmRouteConfigured,
    setupReadinessState,
    strings,
  });
  const canCopyCurrentCard = createMemo(
    () => selectors.mainUiState() === "ready" && Boolean(copyText().trim()),
  );
  let triggerBilingualHotkeyAnswerImpl: () => Promise<void> = async () => undefined;

  // ── Hotkeys ────────────────────────────────────────────────────────────
  const hotkeys = createHotkeys({
    platform,
    phase,
    pipelineActive: selectors.pipelineActive,
    setupRequired: selectors.setupRequired,
    setupReady: () => setupReadinessState() === "ready",
    strings,
    setError,
    setPhase,
    setPanel,
    setCard: applyIncomingCard,
    setCaptureQuality,
    setContextActive,
    settings: () => settings,
    setSettings,
    setHotkeyFailed,
    setDeepgramSaved,
    setLlmKeySaved,
    setLlmRouteConfigured,
    setLastCommandErrorKind,
    setActiveRunId,
    isBilingualHotkeyMode: () =>
      settings.bilingualInterviewEnabled &&
      bilingualInterviewState().active &&
      Boolean(bilingualInterviewState().sessionId),
    isBilingualDegraded: () => bilingualInterviewState().degraded,
    triggerBilingualHotkeyAnswer: () => triggerBilingualHotkeyAnswerImpl(),
    notices,
    showWindow,
    applyContextStatus,
  });

  // ── Pipeline / context actions ─────────────────────────────────────────
  const pipelineActions = createPipelineActions({
    platform,
    canCopyCurrentCard,
    copyText,
    strings,
    setError,
    setPhase,
    setCard: applyIncomingCard,
    setCaptureQuality,
    setContextActive,
    setStatusDetail,
    setLastCommandErrorKind,
    setActiveRunId,
    notices,
    applyContextStatus,
  });

  // ── Settings actions ───────────────────────────────────────────────────
  const settingsActions = createSettingsActions({
    platform,
    strings,
    setupRequired: selectors.setupRequired,
    panel,
    settings,
    setSettings,
    draftSecrets,
    setDraftSecrets,
    setError,
    setPhase,
    setPanel,
    setDeepgramSaved,
    setLlmKeySaved,
    setLlmRouteConfigured,
    setupReadinessState,
    setSetupReadinessState,
    startupPanelDecisionPending,
    setStartupPanelDecisionPending,
    userSelectedPanel,
    setContextActive,
    setContextEntryCount,
    setLastTranscriptPreview,
    setCanRetryLastTranscript,
    setPersistenceDiagnostics,
    setPersistenceDiagnosticsError,
    setSaving,
    setSettingsFormHint,
    setHotkeyFailed,
    setSetupTroubleCount,
    setLastCommandErrorKind,
    notices,
    hotkeys,
    loadContextPacks,
  });

  // ── Lifecycle effects ──────────────────────────────────────────────────
  setupLifecycle({
    platform,
    strings,
    activeRunId,
    setupRequired: selectors.setupRequired,
    setupReadinessState,
    setPhase,
    setStatusDetail,
    setContextActive,
    setContextEntryCount,
    setLastTranscriptPreview,
    setCanRetryLastTranscript,
    setCard: applyIncomingCard,
    notices,
    settingsActions,
    settings: () => settings,
    showWindow,
  });

  setupKeyboardShortcuts({
    panel,
    canCopyCurrentCard,
    canRetry: selectors.canRetry,
    copyCurrentCard: pipelineActions.copyCurrentCard,
    retryAnalysis: pipelineActions.retryAnalysis,
    nextInterviewCard: () =>
      setActiveInterviewCardIndex((current) => clampInterviewCardIndex(current + 1)),
    prevInterviewCard: () =>
      setActiveInterviewCardIndex((current) => clampInterviewCardIndex(current - 1)),
    selectInterviewCardByNumber: (number) =>
      setActiveInterviewCardIndex(clampInterviewCardIndex(number - 1)),
    dismissNotice: notices.dismissNotice,
    setError,
  });

  setupTraySync({
    platform,
    phase,
    statusDetail,
    setupRequired: selectors.setupRequired,
    hotkeyFailed,
    hasError: () => Boolean(error()),
  });

  const bilingualController = createBilingualInterviewController({
    platform,
    bilingualState: bilingualInterviewState,
    setBilingualState: setBilingualInterviewState,
    setCard: applyIncomingCard,
    setError,
  });
  triggerBilingualHotkeyAnswerImpl = bilingualController.triggerHotkeyAnswer;
  void bilingualController.wireListeners().catch((err) => {
    setBilingualInterviewState((prev) => ({
      ...prev,
      status: "reconnecting",
      transcriptLane: "reconnecting",
      translationLane: "reconnecting",
      lastError: {
        code: "BILINGUAL_LISTENER_WIRE_FAILED",
        message: invokeErrorMessage(err),
        recoverable: true,
      },
    }));
  });
  onCleanup(() => bilingualController.unwireListeners());

  const bilingualActive = createMemo(
    () => bilingualInterviewState().active || bilingualInterviewState().status === "active",
  );
  const bilingualCanAnswer = createMemo(
    () =>
      bilingualActive() &&
      !bilingualInterviewState().answerInFlight &&
      bilingualInterviewState().finalizedSegments.length > 0,
  );
  const bilingualDegraded = createMemo(() => bilingualInterviewState().degraded);

  // ── Public API ─────────────────────────────────────────────────────────
  const interviewCardKeys = createMemo(() => interviewCarouselKeys(card()));
  const activeInterviewCardKey = createMemo<InterviewCardKey | null>(() =>
    activeInterviewCardKeyNow(),
  );
  const compactMode = createMemo(() => settings.interviewCompactMode);
  const setWindowOpacity = async (value: AppSettings["windowOpacity"]) => {
    setSettings("windowOpacity", value);
    if (platform.window.setOpacity) {
      await platform.window.setOpacity(value / 100);
    }
  };
  const togglePinInterviewCard = () => {
    const active = activeInterviewCardKey();
    if (!active) return;
    setPinnedInterviewCard((current) => (current === active ? null : active));
  };
  async function startInterviewSession() {
    void emitUiEvent(platform, "start_session_clicked", { phase: "interview" });
    const session = await platform.invoke<InterviewSessionStateDto>("start_interview_session");
    setInterviewSession(session);
    setInterviewReport(null);
    setInterviewReportMarkdownPath(null);
    setInterviewReportRedactedMarkdownPath(null);
  }
  async function endInterviewSession() {
    void emitUiEvent(platform, "end_session_clicked", { phase: "interview" });
    const report = await platform.invoke<InterviewReportDto | null>("end_interview_session");
    setInterviewSession(null);
    setInterviewReport(report);
  }
  async function openInterviewReport() {
    void emitUiEvent(platform, "open_report_clicked", { phase: "report" });
    const report = await platform.invoke<InterviewReportDto | null>("get_interview_report");
    setInterviewReport(report);
  }
  async function exportInterviewReportMarkdown() {
    void emitUiEvent(platform, "export_full_clicked", { phase: "export" });
    const path = await platform.invoke<string | null>("export_interview_report_markdown");
    setInterviewReportMarkdownPath(path);
  }
  async function exportInterviewReportRedactedMarkdown() {
    void emitUiEvent(platform, "export_redacted_clicked", { phase: "export" });
    const path = await platform.invoke<string | null>("export_interview_report_redacted_markdown");
    setInterviewReportRedactedMarkdownPath(path);
  }
  async function clearInterviewReports() {
    void emitUiEvent(platform, "clear_reports_clicked", { phase: "report" });
    await platform.invoke("clear_interview_reports");
    setInterviewReport(null);
    setInterviewReportMarkdownPath(null);
    setInterviewReportRedactedMarkdownPath(null);
    setInterviewSession(null);
  }

  return {
    strings,
    phase,
    panel,
    card,
    error,
    statusDetail,
    activeRunId,
    captureQuality,
    deepgramSaved,
    llmKeySaved,
    llmRouteConfigured,
    setupReadinessState,
    contextActive,
    contextEntryCount,
    lastTranscriptPreview,
    canRetryLastTranscript,
    saving,
    notice,
    hotkeyFailed,
    settingsFormHint,
    setupTroubleCount,
    settings,
    draftSecrets,
    ...selectors,
    canCopySayNow: canCopyCurrentCard,
    lastCommandErrorKind,
    runtimeCheckResult,
    runtimeCheckRunning,
    persistenceDiagnostics,
    persistenceDiagnosticsError,
    activeInterviewCardIndex,
    activeInterviewCardKey,
    interviewCardKeys,
    pinnedInterviewCard,
    interviewSession,
    interviewReport,
    interviewReportMarkdownPath,
    interviewReportRedactedMarkdownPath,
    bilingualInterviewState,
    bilingualActive,
    bilingualCanAnswer,
    bilingualDegraded,
    compactMode,
    checkRuntimeConfig: async () => {
      void emitUiEvent(platform, "check_settings_clicked", { phase: "settings" });
      setRuntimeCheckRunning(true);
      setRuntimeCheckResult(null);
      try {
        const result = await platform.invoke<RuntimeCheckDto>("check_runtime_config");
        setRuntimeCheckResult(result);
        setSetupTroubleCount((count) => (result.runtimeReady ? 0 : count + 1));
      } catch (err) {
        setRuntimeCheckResult({
          stt: { ok: false, code: "error", message: invokeErrorMessage(err) },
          llm: { ok: false, code: "error", message: invokeErrorMessage(err) },
          settings: { ok: false, code: "error", message: invokeErrorMessage(err) },
          runtimeReady: false,
        });
        setSetupTroubleCount((count) => count + 1);
      } finally {
        setRuntimeCheckRunning(false);
      }
    },
    copySetupIssueHint: async () => {
      await platform.clipboard.writeText(buildSetupIssueHint());
      notices.pushNotice({ tone: "info", message: strings().notices.setupIssueHintCopied });
    },
    refreshPersistenceDiagnostics: async () => {
      setPersistenceDiagnosticsError(null);
      try {
        const diagnostics = await platform.invoke<PersistenceDiagnosticsDto>(
          "get_persistence_diagnostics",
        );
        setPersistenceDiagnostics(diagnostics);
      } catch (err) {
        setPersistenceDiagnostics(null);
        setPersistenceDiagnosticsError(invokeErrorMessage(err));
      }
    },
    reloadBootstrap: settingsActions.reloadBootstrap,
    refreshSetupStatus: settingsActions.refreshSetupStatus,
    persistSettings: settingsActions.persistSettings,
    clearContext: pipelineActions.clearContext,
    retryAnalysis: pipelineActions.retryAnalysis,
    copyCurrentCard: pipelineActions.copyCurrentCard,
    settingsActiveSection,
    toggleSettingsPanel: () => {
      setUserSelectedPanel(true);
      const target = panel() === "settings" ? "main" : "settings";
      void emitUiEvent(platform, "panel_open", { panel: target, phase: "navigation" });
      setPanel(target);
    },
    openSettingsPanel: (section?: SettingsSectionId) => {
      setUserSelectedPanel(true);
      void emitUiEvent(platform, "settings_opened", { phase: "settings" });
      if (section) {
        void emitUiEvent(platform, "settings_section_opened", { section, phase: "settings" });
      }
      if (section) setSettingsActiveSection(section);
      setPanel("settings");
    },
    openMainPanel: () => {
      setUserSelectedPanel(true);
      void emitUiEvent(platform, "panel_open", { panel: "main", phase: "navigation" });
      setPanel("main");
    },
    setSettingsActiveSection: (section: SettingsSectionId) => {
      void emitUiEvent(platform, "settings_section_opened", { section, phase: "settings" });
      setSettingsActiveSection(section);
    },
    hideWindow: () => platform.window.hide(),
    quitApp: () => platform.invoke("quit_app"),
    startDragging: () => platform.window.startDragging(),
    captureHotkeyInput: hotkeys.captureHotkeyInput,
    setHotkeyFromInput: (value: string) => setSettings("hotkey", value),
    setCaptureMaxSecondsFromInput: (value: string) => {
      const next = Number.parseInt(value, 10);
      setSettings(
        "captureMaxSeconds",
        Number.isFinite(next) ? next : DEFAULT_SETTINGS.captureMaxSeconds,
      );
    },
    setDeepgramApiKeyDraft: (value: string) => setDraftSecrets("deepgramApiKey", value),
    setLlmApiKeyDraft: (value: string) => setDraftSecrets("llmApiKey", value),
    setLlmBaseUrl: (value: string) => {
      setSettings("llmBaseUrl", value);
      setLlmRouteConfigured(isConfiguredLlmRoute(value, settings.llmModel));
    },
    setLlmModel: (value: string) => {
      setSettings("llmModel", value);
      setLlmRouteConfigured(isConfiguredLlmRoute(settings.llmBaseUrl, value));
    },
    setWindowOpacity,
    setCompactMode: (value: boolean) => setSettings("interviewCompactMode", value),
    setHideToTrayOnClose: (value: boolean) => setSettings("hideToTrayOnClose", value),
    setKeepOnTopDuringCapture: (value: boolean) => setSettings("keepOnTopDuringCapture", value),
    setBilingualInterviewEnabled: (value: boolean) =>
      setSettings("bilingualInterviewEnabled", value),
    setLiveTranslationEnabled: (value: boolean) => setSettings("liveTranslationEnabled", value),
    setTranslationDebounceMs: (value: number) =>
      setSettings("translationDebounceMs", Math.max(200, Math.min(4000, Math.round(value)))),
    setTranslationMinWordCount: (value: number) =>
      setSettings("translationMinWordCount", Math.max(1, Math.min(20, Math.round(value)))),
    setInterviewReportRetentionDays: (value: AppSettings["interviewReportRetentionDays"]) =>
      setSettings("interviewReportRetentionDays", value),
    setDebugTraceMode: (value: AppSettings["debugTraceMode"]) =>
      setSettings("debugTraceMode", value),
    setDebugTraceRetentionDays: (value: AppSettings["debugTraceRetentionDays"]) =>
      setSettings("debugTraceRetentionDays", value),
    openTraceFolder: () => platform.invoke("open_trace_folder"),
    clearDebugTraces: () => platform.invoke("clear_debug_traces"),
    selectInterviewCardIndex: (index: number) =>
      setActiveInterviewCardIndex(clampInterviewCardIndex(index)),
    nextInterviewCard: () =>
      setActiveInterviewCardIndex((current) => clampInterviewCardIndex(current + 1)),
    prevInterviewCard: () =>
      setActiveInterviewCardIndex((current) => clampInterviewCardIndex(current - 1)),
    togglePinInterviewCard,
    startInterviewSession,
    endInterviewSession,
    openInterviewReport,
    exportInterviewReportMarkdown,
    exportInterviewReportRedactedMarkdown,
    clearInterviewReports,
    startBilingualSession: bilingualController.startSession,
    stopBilingualSession: bilingualController.stopSession,
    triggerBilingualHotkeyAnswer: bilingualController.triggerHotkeyAnswer,
    setSelectedModelPreset: (value: string) => {
      const preset = resolveModelPreset(value);
      setSettings("selectedModelPreset", preset.id);
      if (preset.id !== "custom_openai_compatible") {
        setSettings("llmBaseUrl", preset.baseUrl);
        setSettings("llmModel", preset.primaryModel);
      }
      setLlmRouteConfigured(
        isConfiguredLlmRoute(
          preset.id !== "custom_openai_compatible" ? preset.baseUrl : settings.llmBaseUrl,
          preset.id !== "custom_openai_compatible" ? preset.primaryModel : settings.llmModel,
        ),
      );
    },
    setActiveAnswerProfile: (value: string) => setSettings("activeAnswerProfile", value),
    // ── ContextPack ──
    contextPacks,
    activeContextPack,
    loadContextPacks,
    saveContextPack: async (input: ContextPackDto) => {
      await platform.invoke("save_context_pack", { input });
      await loadContextPacks();
    },
    deleteContextPack: async (id: string) => {
      await platform.invoke("delete_context_pack", { id });
      await loadContextPacks();
    },
    setActiveContextPackAction: async (id: string) => {
      await platform.invoke("set_active_context_pack", { id });
      await loadContextPacks();
    },
    clearActiveContextPackAction: async () => {
      await platform.invoke("clear_active_context_pack");
      await loadContextPacks();
    },
    openContextPackPanel: () => {
      setUserSelectedPanel(true);
      setPanel("contextPack");
    },
    goToMainPanel: () => {
      setPanel("main");
    },
    setError,
    dismissNotice: notices.dismissNotice,
  };
}

export type ReplylineController = ReturnType<typeof useReplylineController>;
