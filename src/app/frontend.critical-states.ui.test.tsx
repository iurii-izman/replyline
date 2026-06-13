import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen, within } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MainSurface } from "./MainSurface";
import { SettingsSurface } from "./SettingsSurface";
import { CandidatePackStudio } from "./CandidatePackStudio";
import { ui_ru } from "./locale";

function mainController(overrides: Record<string, unknown> = {}) {
  const report = {
    sessionId: "s1",
    startedAt: "2026-05-20T10:00:00Z",
    endedAt: "2026-05-20T10:10:00Z",
    language: "ru",
    questions: [],
    fullTranscript: "",
    scores: { clarity: 1, relevance: 1, accuracy: 1 },
    feedback: { strengths: [], improvements: [], missingExamples: [] },
  };
  return {
    strings: () => ui_ru,
    panel: () => "main",
    phase: () => "ready",
    phaseLabel: () => ui_ru.phase.ready,
    mainUiState: () => "ready",
    setupReadinessState: () => "ready",
    setupRequired: () => false,
    setupSteps: () => [
      { label: ui_ru.setup.stepSpeech, readyLabel: "", missingLabel: "", ready: true },
      { label: ui_ru.setup.stepReply, readyLabel: "", missingLabel: "", ready: true },
      { label: ui_ru.setup.stepHotkey, readyLabel: "", missingLabel: "", ready: true },
    ],
    compactMode: () => false,
    settings: { bilingualInterviewEnabled: false },
    bilingualActive: () => false,
    bilingualInterviewState: () => ({
      active: false,
      status: "idle",
      transcriptLane: "idle",
      translationLane: "idle",
      degraded: false,
      sessionId: null,
      startedAt: null,
      latestPartial: null,
      finalizedSegments: [],
      transcriptSegments: [],
      translationSegments: [],
      displaySegments: [],
      translationsBySourceSegmentId: {},
      latency: null,
      lastAnswerCard: null,
      answerInFlight: false,
      lastError: null,
    }),
    card: () => ({ mode: "work", gist: "g", sayNow: "say", nextMove: "next", charsBand: "normal" }),
    statusDetail: () => null,
    openSettingsPanel: vi.fn(),
    startInterviewSession: vi.fn(),
    endInterviewSession: vi.fn(),
    openInterviewReport: vi.fn(),
    exportInterviewReportMarkdown: vi.fn(),
    exportInterviewReportRedactedMarkdown: vi.fn(),
    clearInterviewReports: vi.fn(),
    interviewSession: () => null,
    interviewReport: () => report,
    interviewReportMarkdownPath: () => null,
    interviewReportRedactedMarkdownPath: () => null,
    canRetry: () => true,
    retryDisabledReason: () => null,
    retryAnalysis: vi.fn(),
    canClear: () => true,
    clearDisabledReason: () => null,
    clearContext: vi.fn(),
    copyCurrentCard: vi.fn(),
    ...overrides,
  };
}

function settingsController(overrides: Record<string, unknown> = {}) {
  return {
    strings: () => ui_ru,
    panel: () => "settings",
    settingsActiveSection: () => "reports",
    setSettingsActiveSection: vi.fn(),
    setupSteps: () => [
      { label: ui_ru.setup.stepSpeech, readyLabel: "ok", missingLabel: "miss", ready: true },
      { label: ui_ru.setup.stepReply, readyLabel: "ok", missingLabel: "miss", ready: true },
      { label: ui_ru.setup.stepHotkey, readyLabel: "ok", missingLabel: "miss", ready: true },
    ],
    allSetupReady: () => true,
    runtimeCheckResult: () => null,
    runtimeCheckRunning: () => false,
    persistenceDiagnostics: () => null,
    persistenceDiagnosticsError: () => null,
    refreshPersistenceDiagnostics: vi.fn(),
    settings: {
      selectedModelPreset: "custom_openai_compatible",
      llmBaseUrl: "https://api.example/v1",
      llmModel: "gpt-4o-mini",
      activeAnswerProfile: "interview_default",
      hotkey: "Ctrl+Alt+Space",
      captureMaxSeconds: 45,
      windowOpacity: 100,
      hideToTrayOnClose: true,
      keepOnTopDuringCapture: false,
      interviewCompactMode: false,
      bilingualInterviewEnabled: false,
      liveTranslationEnabled: true,
      translationDebounceMs: 600,
      translationMinWordCount: 3,
      interviewReportRetentionDays: 0,
      debugTraceMode: "full_local",
      debugTraceRetentionDays: 3,
    },
    deepgramSaved: () => true,
    llmKeySaved: () => true,
    draftSecrets: { deepgramApiKey: "", llmApiKey: "" },
    setDeepgramApiKeyDraft: vi.fn(),
    setLlmBaseUrl: vi.fn(),
    setLlmModel: vi.fn(),
    setSelectedModelPreset: vi.fn(),
    setActiveAnswerProfile: vi.fn(),
    setLlmApiKeyDraft: vi.fn(),
    captureHotkeyInput: vi.fn(),
    setHotkeyFromInput: vi.fn(),
    setCaptureMaxSecondsFromInput: vi.fn(),
    setCompactMode: vi.fn(),
    setBilingualInterviewEnabled: vi.fn(),
    setLiveTranslationEnabled: vi.fn(),
    setWindowOpacity: vi.fn(),
    setHideToTrayOnClose: vi.fn(),
    setKeepOnTopDuringCapture: vi.fn(),
    setInterviewReportRetentionDays: vi.fn(),
    setDebugTraceMode: vi.fn(),
    setDebugTraceRetentionDays: vi.fn(),
    openTraceFolder: vi.fn(),
    clearDebugTraces: vi.fn(),
    candidatePackStatus: () => ({ exists: false, factCount: 0, weakFactCount: 0 }),
    openCandidatePackStudioPanel: vi.fn(),
    settingsFormHint: () => null,
    saving: () => false,
    persistSettings: vi.fn(),
    checkRuntimeConfig: vi.fn(),
    openMainPanel: vi.fn(),
    clearInterviewReports: vi.fn(),
    ...overrides,
  };
}

function candidateController(overrides: Record<string, unknown> = {}) {
  return {
    candidateRawResume: () => "",
    candidateJobDescription: () => "",
    candidateCompanyValues: () => "",
    candidatePackPreview: () => null,
    candidatePackStatus: () => ({ exists: false, factCount: 0, weakFactCount: 0 }),
    candidatePackPreparing: () => false,
    candidatePackSaving: () => false,
    candidatePackError: () => null,
    candidatePackDraft: {
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
    },
    setCandidateRawResume: vi.fn(),
    setCandidateJobDescription: vi.fn(),
    setCandidateCompanyValues: vi.fn(),
    setCandidatePackDraft: vi.fn(),
    savePreparedCandidatePack: vi.fn(),
    prepareCandidatePack: vi.fn(),
    saveCandidatePack: vi.fn(),
    clearCandidatePack: vi.fn(),
    openSettingsPanel: vi.fn(),
    ...overrides,
  };
}

describe("frontend critical state coverage", () => {
  it("shows WorkConversation default mode banner", () => {
    render(() => <MainSurface controller={mainController() as never} />);
    expect(screen.getByTestId("mode-state-banner").textContent).toContain(ui_ru.card.modeWorkDefault);
  });

  it("shows Interview Mode active banner", () => {
    render(
      () =>
        (
          <MainSurface
            controller={
              mainController({
                interviewSession: () => ({
                  active: true,
                  sessionId: "s1",
                  startedAt: "2026-05-20T10:00:00Z",
                  language: "ru",
                  questions: [],
                }),
              }) as never
            }
          />
        ) as never,
    );
    expect(screen.getByTestId("mode-state-banner").textContent).toContain(
      ui_ru.card.modeInterviewActive,
    );
  });

  it("renders full vs redacted export copy", () => {
    render(() => <MainSurface controller={mainController() as never} />);
    expect(screen.getByText(ui_ru.card.interview.sessionActions.exportRedactedRecommended)).toBeTruthy();
    expect(screen.getByRole("button", { name: ui_ru.card.interview.sessionActions.exportMarkdownRedacted })).toBeTruthy();
    expect(screen.getByRole("button", { name: ui_ru.card.interview.sessionActions.exportMarkdown })).toBeTruthy();
  });

  it("shows full_local diagnostics warning", () => {
    render(() => <SettingsSurface controller={settingsController() as never} />);
    expect(screen.getByText(ui_ru.settings.debugTraceFullWarning)).toBeTruthy();
  });

  it("renders bilingual toggles in hotkey section and wires handlers", () => {
    const setBilingualInterviewEnabled = vi.fn();
    const setLiveTranslationEnabled = vi.fn();
    render(
      () =>
        (
          <SettingsSurface
            controller={
              settingsController({
                settingsActiveSection: () => "hotkey",
                setBilingualInterviewEnabled,
                setLiveTranslationEnabled,
              }) as never
            }
          />
        ) as never,
    );

    const bilingualToggle = screen.getByLabelText(ui_ru.settings.bilingualInterviewEnabledLabel);
    const translationToggle = screen.getByLabelText(ui_ru.settings.liveTranslationEnabledLabel);
    fireEvent.click(bilingualToggle);
    fireEvent.click(translationToggle);
    expect(setBilingualInterviewEnabled).toHaveBeenCalled();
    expect(setLiveTranslationEnabled).toHaveBeenCalled();
    expect(screen.getByText(ui_ru.settings.bilingualInterviewDisclaimer)).toBeTruthy();
  });

  it("settings llm controls stay in tab order through the runtime check button", async () => {
    const user = userEvent.setup();
    render(
      () =>
        (
          <SettingsSurface
            controller={
              settingsController({
                settingsActiveSection: () => "llm",
              }) as never
            }
          />
        ) as never,
    );

    const sidebar = screen.getByTestId("settings-sidebar");
    const llmTab = within(sidebar).getByRole("tab", { name: /Ответ \/ LLM/ });
    const modelPreset = screen.getByLabelText(ui_ru.settings.modelPresetLabel);
    const checkButton = screen.getByTestId("check-settings-btn");

    llmTab.focus();
    await user.tab();
    expect(document.activeElement).toBe(modelPreset);
    for (let index = 0; index < 10 && document.activeElement !== checkButton; index += 1) {
      await user.tab();
    }
    expect(document.activeElement).toBe(checkButton);
  });

  it("covers Candidate Pack empty/preparing/prepared/saved states", () => {
    render(() => <CandidatePackStudio controller={candidateController() as never} st={ui_ru} />);
    expect(screen.getByTestId("candidate-pack-status-banner").textContent).toContain(
      ui_ru.settings.candidatePackStateEmpty,
    );

    cleanup();
    render(
      () =>
        (
          <CandidatePackStudio
            controller={candidateController({ candidatePackPreparing: () => true }) as never}
            st={ui_ru}
          />
        ) as never,
    );
    expect(screen.getByTestId("candidate-pack-status-banner").textContent).toContain(
      ui_ru.settings.candidatePackStateProcessing,
    );

    cleanup();
    render(
      () =>
        (
          <CandidatePackStudio
            controller={
              candidateController({
                candidatePackPreview: () => ({
                  packQualityScore: 80,
                  missingDataWarnings: [],
                  suggestedMissingInfo: [],
                  candidateFacts: [],
                  roleKeywords: [],
                  companyValues: [],
                }),
              }) as never
            }
            st={ui_ru}
          />
        ) as never,
    );
    expect(screen.getByTestId("candidate-pack-status-banner").textContent).toContain(
      ui_ru.settings.candidatePackStatePrepared,
    );

    cleanup();
    render(
      () =>
        (
          <CandidatePackStudio
            controller={
              candidateController({
                candidatePackStatus: () => ({ exists: true, factCount: 2, weakFactCount: 0 }),
              }) as never
            }
            st={ui_ru}
          />
        ) as never,
    );
    expect(screen.getByTestId("candidate-pack-status-banner").textContent).toContain(
      ui_ru.settings.candidatePackStateSaved,
    );
  });

  it("candidate pack fields stay keyboard reachable through the footer actions", async () => {
    const user = userEvent.setup();
    render(
      () =>
        (
          <CandidatePackStudio
            controller={candidateController({ candidateRawResume: () => "CV" }) as never}
            st={ui_ru}
          />
        ) as never,
    );

    const resume = screen.getByLabelText(ui_ru.settings.resumeLabel);
    const jobDescription = screen.getByLabelText(ui_ru.settings.jdLabel);
    const companyValues = screen.getByLabelText(ui_ru.settings.valuesLabel);
    const prepareButton = screen.getByRole("button", { name: ui_ru.settings.prepare });

    expect(prepareButton.hasAttribute("disabled")).toBe(false);

    await user.tab();
    expect(document.activeElement).toBe(resume);
    await user.tab();
    expect(document.activeElement).toBe(jobDescription);
    await user.tab();
    expect(document.activeElement).toBe(companyValues);
    for (let index = 0; index < 20 && document.activeElement !== prepareButton; index += 1) {
      await user.tab();
    }
    expect(document.activeElement).toBe(prepareButton);
  });

  it("preserves focus-visible coverage for tabs and candidate pack accordions", () => {
    const css = readFileSync("src/App.css", "utf8");
    expect(css).toContain(".interview-card-tab");
    expect(css).toContain(".settings-sidebar-link");
    expect(css).toContain(".studio-accordion-trigger");
    expect(css).toContain(".settings-collapsible > summary");
    expect(css).toContain(":focus-visible");
  });
});
