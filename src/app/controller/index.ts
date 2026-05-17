import { createMemo, createSignal, type Accessor } from "solid-js";
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
  type Panel,
  type Phase,
  type RuntimeCheckDto,
  invokeErrorMessage,
} from "../model";
import { getUi, type UiStrings } from "../locale";
import { currentLanguage } from "../language_profile";
import type { AppPlatform } from "../platform";

import { createNotices } from "./notices";
import { createSelectors } from "./selectors";
import { createHotkeys } from "./hotkeys";
import { createSettingsActions } from "./settingsActions";
import { createPipelineActions } from "./pipelineActions";
import { setupLifecycle } from "./lifecycle";
import { setupKeyboardShortcuts } from "./keyboardShortcuts";
import { setupTraySync } from "./traySync";

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

  const [settings, setSettings] = createStore<AppSettings>({
    ...DEFAULT_SETTINGS,
  });
  const [draftSecrets, setDraftSecrets] = createStore({
    deepgramApiKey: "",
    llmApiKey: "",
  });

  // ── Derived ────────────────────────────────────────────────────────────
  const strings: Accessor<UiStrings> = createMemo(() => getUi(currentLanguage()));

  // ── Notices ────────────────────────────────────────────────────────────
  const notices = createNotices(setNotice);

  // ── Small helpers shared across modules ───────────────────────────────
  function applyContextStatus(status: ContextStatusDto) {
    setContextActive(status.contextActive);
    setContextEntryCount(status.entryCount);
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
    setCard,
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
    card,
    canCopySayNow: selectors.canCopySayNow,
    strings,
    setError,
    setPhase,
    setCard,
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
    setCard,
    notices,
    settingsActions,
    showWindow,
  });

  setupKeyboardShortcuts({
    panel,
    canCopySayNow: selectors.canCopySayNow,
    canRetry: selectors.canRetry,
    copySection: pipelineActions.copySection,
    retryAnalysis: pipelineActions.retryAnalysis,
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
      notices.pushNotice({ tone: "info", message: strings().notices.candidatePackSaved });
    } catch (err) {
      setError(invokeErrorMessage(err));
    } finally {
      setCandidatePackSaving(false);
    }
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
    saving,
    notice,
    hotkeyFailed,
    settingsFormHint,
    settings,
    draftSecrets,
    ...selectors,
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
    copySection: pipelineActions.copySection,
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
