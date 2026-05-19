import { createEffect, createMemo, createSignal, type Accessor } from "solid-js";
import { createStore } from "solid-js/store";
import {
  type CandidatePackDraft,
  type CandidatePackDto,
  type CandidatePackStatusDto,
  DEFAULT_SETTINGS,
  type AnalysisCard,
  type AppSettings,
  type CommandErrorKind,
  type ContextStatusDto,
  type InterviewReportDto,
  type InterviewSessionStateDto,
  type Panel,
  type Phase,
  type RuntimeCheckDto,
  invokeErrorMessage,
} from "../model";
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

type InterviewCardKey = "answer" | "question" | "signals" | "risks" | "followUps" | "clarifier";

export function useReplylineController(platform: AppPlatform) {
  // ── State ──────────────────────────────────────────────────────────────
  const [phase, setPhase] = createSignal<Phase>("booting");
  const [panel, setPanel] = createSignal<Panel>("main");
  const [card, setCard] = createSignal<AnalysisCard | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [statusDetail, setStatusDetail] = createSignal<string | null>(null);
  const [activeRunId, setActiveRunId] = createSignal<string | null>(null);
  const [captureQuality, setCaptureQuality] = createSignal<"short" | "normal" | "long">("normal");
  const [deepgramSaved, setDeepgramSaved] = createSignal(false);
  const [llmKeySaved, setLlmKeySaved] = createSignal(false);
  const [contextActive, setContextActive] = createSignal(false);
  const [contextEntryCount, setContextEntryCount] = createSignal(0);
  const [lastTranscriptPreview, setLastTranscriptPreview] = createSignal<string | null>(null);
  const [saving, setSaving] = createSignal(false);
  const [notice, setNotice] = createSignal<{
    tone: "info" | "error";
    message: string;
  } | null>(null);
  const [hotkeyFailed, setHotkeyFailed] = createSignal(false);
  const [settingsFormHint, setSettingsFormHint] = createSignal<string | null>(null);
  const [lastCommandErrorKind, setLastCommandErrorKind] = createSignal<CommandErrorKind | null>(
    null,
  );
  const [runtimeCheckResult, setRuntimeCheckResult] = createSignal<RuntimeCheckDto | null>(null);
  const [runtimeCheckRunning, setRuntimeCheckRunning] = createSignal(false);
  const [candidatePackStatus, setCandidatePackStatus] = createSignal<CandidatePackStatusDto>({
    exists: false,
    factCount: 0,
    weakFactCount: 0,
  });
  const [candidatePackDraft, setCandidatePackDraft] = createStore({
    candidateSummary: "",
    targetRole: "",
    factsText: "",
    jobTitle: "",
    jobCompany: "",
    requirementsText: "",
    responsibilitiesText: "",
    keywordsText: "",
    companyValuesText: "",
    avoidClaimsText: "",
    preferredExamplesText: "",
    language: "ru",
  });
  const [candidateRawResume, setCandidateRawResume] = createSignal("");
  const [candidateJobDescription, setCandidateJobDescription] = createSignal("");
  const [candidateCompanyValues, setCandidateCompanyValues] = createSignal("");
  const [candidatePackPreview, setCandidatePackPreview] = createSignal<CandidatePackDraft | null>(
    null,
  );
  const [candidatePackPreparing, setCandidatePackPreparing] = createSignal(false);
  const [candidatePackSaving, setCandidatePackSaving] = createSignal(false);
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

  const [settings, setSettings] = createStore<AppSettings>({
    ...DEFAULT_SETTINGS,
  });
  const [draftSecrets, setDraftSecrets] = createStore({
    deepgramApiKey: "",
    llmApiKey: "",
  });

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

  // ── Derived ────────────────────────────────────────────────────────────
  const strings: Accessor<UiStrings> = createMemo(() => getUi(currentLanguage()));

  // ── Notices ────────────────────────────────────────────────────────────
  const notices = createNotices(setNotice);

  // ── Small helpers shared across modules ───────────────────────────────
  function applyContextStatus(status: ContextStatusDto) {
    setContextActive(status.contextActive);
    setContextEntryCount(status.entryCount);
    setLastTranscriptPreview(status.lastTranscriptPreview ?? null);
  }

  async function showWindow(panelName?: Panel) {
    if (panelName) setPanel(panelName);
    await platform.window.show();
    await platform.window.setFocus();
  }

  // ── Selectors ──────────────────────────────────────────────────────────
  const selectors = createSelectors({
    phase,
    card,
    error,
    deepgramSaved,
    hotkeyFailed,
    contextActive,
    settingsLlmBaseUrl: () => settings.llmBaseUrl,
    settingsLlmModel: () => settings.llmModel,
    strings,
  });
  const canCopyCurrentCard = createMemo(
    () => selectors.mainUiState() === "ready" && Boolean(copyText().trim()),
  );

  // ── Hotkeys ────────────────────────────────────────────────────────────
  const hotkeys = createHotkeys({
    platform,
    phase,
    pipelineActive: selectors.pipelineActive,
    setupRequired: selectors.setupRequired,
    strings,
    setError,
    setPhase,
    setPanel,
    setCard: applyIncomingCard,
    setCaptureQuality,
    setContextActive,
    setSettings,
    setHotkeyFailed,
    setLastCommandErrorKind,
    setActiveRunId,
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
    settings,
    setSettings,
    draftSecrets,
    setDraftSecrets,
    setError,
    setPhase,
    setPanel,
    setDeepgramSaved,
    setLlmKeySaved,
    setContextActive,
    setContextEntryCount,
    setLastTranscriptPreview,
    setSaving,
    setSettingsFormHint,
    setHotkeyFailed,
    setLastCommandErrorKind,
    notices,
    hotkeys,
    loadCandidatePack,
  });

  // ── Lifecycle effects ──────────────────────────────────────────────────
  setupLifecycle({
    platform,
    strings,
    activeRunId,
    setPhase,
    setStatusDetail,
    setContextActive,
    setContextEntryCount,
    setLastTranscriptPreview,
    setCard: applyIncomingCard,
    notices,
    settingsActions,
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

  // ── Public API ─────────────────────────────────────────────────────────
  function lines(value: string): string[] {
    return value
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  function parseFactsText(value: string): CandidatePackDto["resumeFacts"] {
    return lines(value).map((line, index) => {
      const [id = `fact-${index + 1}`, title = "", claim = "", evidence = ""] = line
        .split("|")
        .map((part) => part.trim());
      return {
        id,
        title,
        claim,
        description: "",
        evidence,
        skills: [],
        metrics: [],
        strength: evidence ? "medium" : "weak",
        suitableForQuestions: [],
      };
    });
  }
  async function loadCandidatePack() {
    const pack = await platform.invoke<CandidatePackDto | null>("load_candidate_pack");
    const status = await platform.invoke<CandidatePackStatusDto>("get_candidate_pack_status");
    setCandidatePackStatus(status);
    if (!pack) return;
    setCandidatePackDraft({
      candidateSummary: pack.candidateSummary,
      targetRole: pack.targetRole,
      factsText: pack.resumeFacts
        .map((fact) => [fact.id, fact.title, fact.claim, fact.evidence].join(" | "))
        .join("\n"),
      jobTitle: pack.jobDescription.title,
      jobCompany: pack.jobDescription.company,
      requirementsText: pack.jobDescription.requirements.join("\n"),
      responsibilitiesText: pack.jobDescription.responsibilities.join("\n"),
      keywordsText: pack.jobDescription.keywords.join("\n"),
      companyValuesText: pack.companyValues.join("\n"),
      avoidClaimsText: pack.answerConstraints.avoidClaims.join("\n"),
      preferredExamplesText: pack.answerConstraints.preferredExamples.join("\n"),
      language: pack.answerConstraints.language || "ru",
    });
  }
  async function saveCandidatePack() {
    const input: CandidatePackDto = {
      candidateSummary: candidatePackDraft.candidateSummary,
      targetRole: candidatePackDraft.targetRole,
      resumeFacts: parseFactsText(candidatePackDraft.factsText),
      jobDescription: {
        title: candidatePackDraft.jobTitle,
        company: candidatePackDraft.jobCompany,
        requirements: lines(candidatePackDraft.requirementsText),
        responsibilities: lines(candidatePackDraft.responsibilitiesText),
        keywords: lines(candidatePackDraft.keywordsText),
      },
      companyValues: lines(candidatePackDraft.companyValuesText),
      answerConstraints: {
        avoidClaims: lines(candidatePackDraft.avoidClaimsText),
        preferredExamples: lines(candidatePackDraft.preferredExamplesText),
        language: candidatePackDraft.language,
      },
    };
    await platform.invoke("save_candidate_pack", { input });
    await loadCandidatePack();
  }
  async function clearCandidatePack() {
    await platform.invoke("clear_candidate_pack");
    setCandidatePackDraft({
      candidateSummary: "",
      targetRole: "",
      factsText: "",
      jobTitle: "",
      jobCompany: "",
      requirementsText: "",
      responsibilitiesText: "",
      keywordsText: "",
      companyValuesText: "",
      avoidClaimsText: "",
      preferredExamplesText: "",
      language: "ru",
    });
    setCandidatePackStatus({ exists: false, factCount: 0, weakFactCount: 0 });
  }
  async function prepareCandidatePack() {
    setCandidatePackPreparing(true);
    setError(null);
    try {
      const draft = await platform.invoke<CandidatePackDraft>("prepare_candidate_pack", {
        input: {
          rawResume: candidateRawResume(),
          jobDescription: candidateJobDescription(),
          companyValuesText: candidateCompanyValues(),
        },
      });
      setCandidatePackPreview(draft);
      notices.pushNotice({ tone: "info", message: strings().notices.candidatePackPrepared });
    } catch (err) {
      setError(invokeErrorMessage(err));
    } finally {
      setCandidatePackPreparing(false);
    }
  }
  async function savePreparedCandidatePack() {
    const draft = candidatePackPreview();
    if (!draft) return;
    setCandidatePackSaving(true);
    setError(null);
    try {
      await platform.invoke("save_prepared_candidate_pack", { draft });
      await loadCandidatePack();
      notices.pushNotice({ tone: "info", message: strings().notices.candidatePackSaved });
    } catch (err) {
      setError(invokeErrorMessage(err));
    } finally {
      setCandidatePackSaving(false);
    }
  }
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
    const session = await platform.invoke<InterviewSessionStateDto>("start_interview_session");
    setInterviewSession(session);
    setInterviewReport(null);
    setInterviewReportMarkdownPath(null);
    setInterviewReportRedactedMarkdownPath(null);
  }
  async function endInterviewSession() {
    const report = await platform.invoke<InterviewReportDto | null>("end_interview_session");
    setInterviewSession(null);
    setInterviewReport(report);
  }
  async function openInterviewReport() {
    const report = await platform.invoke<InterviewReportDto | null>("get_interview_report");
    setInterviewReport(report);
  }
  async function exportInterviewReportMarkdown() {
    const path = await platform.invoke<string | null>("export_interview_report_markdown");
    setInterviewReportMarkdownPath(path);
  }
  async function exportInterviewReportRedactedMarkdown() {
    const path = await platform.invoke<string | null>("export_interview_report_redacted_markdown");
    setInterviewReportRedactedMarkdownPath(path);
  }
  async function clearInterviewReports() {
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
    contextActive,
    contextEntryCount,
    lastTranscriptPreview,
    saving,
    notice,
    hotkeyFailed,
    settingsFormHint,
    settings,
    draftSecrets,
    ...selectors,
    canCopySayNow: canCopyCurrentCard,
    lastCommandErrorKind,
    runtimeCheckResult,
    runtimeCheckRunning,
    candidatePackStatus,
    candidatePackDraft,
    candidateRawResume,
    candidateJobDescription,
    candidateCompanyValues,
    candidatePackPreview,
    candidatePackPreparing,
    candidatePackSaving,
    activeInterviewCardIndex,
    activeInterviewCardKey,
    interviewCardKeys,
    pinnedInterviewCard,
    interviewSession,
    interviewReport,
    interviewReportMarkdownPath,
    interviewReportRedactedMarkdownPath,
    compactMode,
    checkRuntimeConfig: async () => {
      setRuntimeCheckRunning(true);
      setRuntimeCheckResult(null);
      try {
        const result = await platform.invoke<RuntimeCheckDto>("check_runtime_config");
        setRuntimeCheckResult(result);
      } catch (err) {
        setRuntimeCheckResult({
          stt: { ok: false, code: "error", message: invokeErrorMessage(err) },
          llm: { ok: false, code: "error", message: invokeErrorMessage(err) },
          settings: { ok: false, code: "error", message: invokeErrorMessage(err) },
          runtimeReady: false,
        });
      } finally {
        setRuntimeCheckRunning(false);
      }
    },
    reloadBootstrap: settingsActions.reloadBootstrap,
    persistSettings: settingsActions.persistSettings,
    clearContext: pipelineActions.clearContext,
    retryAnalysis: pipelineActions.retryAnalysis,
    copyCurrentCard: pipelineActions.copyCurrentCard,
    toggleSettingsPanel: () => setPanel(panel() === "settings" ? "main" : "settings"),
    openSettingsPanel: () => setPanel("settings"),
    openMainPanel: () => setPanel("main"),
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
    setLlmBaseUrl: (value: string) => setSettings("llmBaseUrl", value),
    setLlmModel: (value: string) => setSettings("llmModel", value),
    setWindowOpacity,
    setCompactMode: (value: boolean) => setSettings("interviewCompactMode", value),
    setInterviewReportRetentionDays: (value: AppSettings["interviewReportRetentionDays"]) =>
      setSettings("interviewReportRetentionDays", value),
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
    setSelectedModelPreset: (value: string) => {
      const preset = resolveModelPreset(value);
      setSettings("selectedModelPreset", preset.id);
      if (preset.id !== "custom_openai_compatible") {
        setSettings("llmBaseUrl", preset.baseUrl);
        setSettings("llmModel", preset.primaryModel);
      }
    },
    setActiveAnswerProfile: (value: string) => setSettings("activeAnswerProfile", value),
    setCandidatePackDraft: (key: keyof typeof candidatePackDraft, value: string) =>
      setCandidatePackDraft(key, value),
    loadCandidatePack,
    saveCandidatePack,
    clearCandidatePack,
    setCandidateRawResume: (value: string) => setCandidateRawResume(value),
    setCandidateJobDescription: (value: string) => setCandidateJobDescription(value),
    setCandidateCompanyValues: (value: string) => setCandidateCompanyValues(value),
    prepareCandidatePack,
    savePreparedCandidatePack,
    setError,
    dismissNotice: notices.dismissNotice,
  };
}

export type ReplylineController = ReturnType<typeof useReplylineController>;
