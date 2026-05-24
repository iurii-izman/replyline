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
  type PersistenceDiagnosticsDto,
  type Phase,
  type RuntimeCheckDto,
  type SettingsSectionId,
  type SetupReadinessState,
  invokeErrorMessage,
  isConfiguredLlmRoute,
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
import { emitUiEvent } from "../observability";

type InterviewCardKey = "answer" | "question" | "signals" | "risks" | "followUps" | "clarifier";
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

function summarizeFromFacts(facts: CandidatePackDraft["candidateFacts"]): string {
  const topFacts = facts
    .map((fact) => fact.fact.trim())
    .filter(Boolean)
    .slice(0, 2);
  return topFacts.join(" ");
}

function asFactTitle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.length > 72 ? `${trimmed.slice(0, 72)}...` : trimmed;
}

function draftFactsToText(facts: CandidatePackDraft["candidateFacts"]): string {
  return facts
    .map((fact, index) =>
      [`fact-${index + 1}`, asFactTitle(fact.fact), fact.fact.trim(), fact.evidence.trim()].join(
        " | ",
      ),
    )
    .join("\n");
}

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
  const [persistenceDiagnostics, setPersistenceDiagnostics] =
    createSignal<PersistenceDiagnosticsDto | null>(null);
  const [persistenceDiagnosticsError, setPersistenceDiagnosticsError] = createSignal<string | null>(
    null,
  );
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
  const [candidatePackError, setCandidatePackError] = createSignal<string | null>(null);
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
    await emitUiEvent(platform, "window_show_setup_status_refresh_start", { phase: "window" });
    await settingsActions.refreshSetupStatus();
    await emitUiEvent(platform, "window_show_setup_status_refresh_ok", {
      phase: "window",
      runtime_path_ready: String(setupReadinessState() === "ready"),
    });
    void emitUiEvent(platform, "panel_open", { panel: panelName ?? panel(), phase: "navigation" });
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
    llmRouteConfigured,
    setupReadinessState,
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
    settings: () => settings,
    setSettings,
    setHotkeyFailed,
    setDeepgramSaved,
    setLlmKeySaved,
    setLlmRouteConfigured,
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
    setPersistenceDiagnostics,
    setPersistenceDiagnosticsError,
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
    setupRequired: selectors.setupRequired,
    setupReadinessState,
    setPhase,
    setStatusDetail,
    setContextActive,
    setContextEntryCount,
    setLastTranscriptPreview,
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

  // ── Public API ─────────────────────────────────────────────────────────
  async function loadCandidatePack() {
    setCandidatePackError(null);
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
    void emitUiEvent(platform, "candidate_profile_save_clicked", { phase: "candidate_pack" });
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
    void emitUiEvent(platform, "candidate_profile_clear_clicked", { phase: "candidate_pack" });
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
    setCandidatePackError(null);
  }
  async function prepareCandidatePack() {
    void emitUiEvent(platform, "candidate_profile_prepare_clicked", { phase: "candidate_pack" });
    setCandidatePackPreparing(true);
    setCandidatePackError(null);
    setError(null);
    try {
      const draft = await platform.invoke<CandidatePackDraft>("prepare_candidate_pack", {
        input: {
          rawResume: candidateRawResume(),
          jobDescription: candidateJobDescription(),
          companyValuesText: candidateCompanyValues(),
        },
      });
      const generatedSummary = summarizeFromFacts(draft.candidateFacts);
      setCandidatePackPreview(draft);
      setCandidatePackDraft({
        candidateSummary: generatedSummary,
        targetRole: draft.roleKeywords.slice(0, 3).join(", "),
        factsText: draftFactsToText(draft.candidateFacts),
        jobTitle: draft.roleKeywords[0] ?? "",
        jobCompany: "",
        requirementsText: lines(candidateJobDescription()).slice(0, 8).join("\n"),
        responsibilitiesText: "",
        keywordsText: draft.roleKeywords.join("\n"),
        companyValuesText: draft.companyValues.length
          ? draft.companyValues.join("\n")
          : lines(candidateCompanyValues()).join("\n"),
        avoidClaimsText: "",
        preferredExamplesText: draft.suggestedMissingInfo.join("\n"),
        language: "ru",
      });
      setCandidatePackError(null);
      notices.pushNotice({ tone: "info", message: strings().notices.candidatePackPrepared });
    } catch (err) {
      const message = invokeErrorMessage(err);
      setCandidatePackError(message);
      setError(message);
    } finally {
      setCandidatePackPreparing(false);
    }
  }
  async function savePreparedCandidatePack() {
    const draft = candidatePackPreview();
    if (!draft) return;
    void emitUiEvent(platform, "candidate_profile_save_clicked", { phase: "candidate_pack" });
    setCandidatePackSaving(true);
    setCandidatePackError(null);
    setError(null);
    try {
      await platform.invoke("save_prepared_candidate_pack", { draft });
      const resumeFacts: CandidatePackDto["resumeFacts"] = draft.candidateFacts.map(
        (fact, index) => {
          const claim = fact.fact.trim();
          const evidence = fact.evidence.trim();
          return {
            id: `fact-${index + 1}`,
            title: asFactTitle(claim),
            claim,
            description: "",
            evidence,
            skills: [],
            metrics: fact.metrics ?? [],
            strength: fact.strength,
            suitableForQuestions: [],
          };
        },
      );
      const input: CandidatePackDto = {
        candidateSummary: summarizeFromFacts(draft.candidateFacts),
        targetRole: draft.roleKeywords.slice(0, 3).join(", "),
        resumeFacts,
        jobDescription: {
          title: draft.roleKeywords[0] ?? "",
          company: "",
          requirements: lines(candidateJobDescription()).slice(0, 8),
          responsibilities: [],
          keywords: draft.roleKeywords,
        },
        companyValues: draft.companyValues.length
          ? draft.companyValues
          : lines(candidateCompanyValues()),
        answerConstraints: {
          avoidClaims: [],
          preferredExamples: draft.suggestedMissingInfo,
          language: "ru",
        },
      };
      await platform.invoke("save_candidate_pack", { input });
      await loadCandidatePack();
      notices.pushNotice({ tone: "info", message: strings().notices.candidatePackSaved });
    } catch (err) {
      const message = invokeErrorMessage(err);
      setCandidatePackError(message);
      setError(message);
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
    persistenceDiagnostics,
    persistenceDiagnosticsError,
    candidatePackStatus,
    candidatePackDraft,
    candidateRawResume,
    candidateJobDescription,
    candidateCompanyValues,
    candidatePackPreview,
    candidatePackPreparing,
    candidatePackSaving,
    candidatePackError,
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
      void emitUiEvent(platform, "check_settings_clicked", { phase: "settings" });
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
    openCandidatePackStudioPanel: () => {
      setUserSelectedPanel(true);
      void emitUiEvent(platform, "candidate_studio_opened", { phase: "candidate_pack" });
      setSettingsActiveSection("candidatePack");
      setPanel("candidatePackStudio");
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
