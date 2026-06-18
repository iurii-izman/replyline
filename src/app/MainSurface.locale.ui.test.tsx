import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { MainSurface } from "./MainSurface";
import { ui_en, ui_ru, type UiStrings } from "./locale";

function createController(strings: UiStrings, overrides: Record<string, unknown> = {}) {
  const base = {
    strings: () => strings,
    panel: () => "main",
    card: () => null,
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
    phase: () => "idle",
    mainUiState: () => "idle",
    setupReadinessState: () => "ready",
    setupRequired: () => false,
    hotkeyFailed: () => false,
    setupTroubleCount: () => 0,
    setupSteps: () => [
      { label: strings.setup.stepSpeech, readyLabel: "", missingLabel: "", ready: true },
      { label: strings.setup.stepReply, readyLabel: "", missingLabel: "", ready: true },
      { label: strings.setup.stepHotkey, readyLabel: "", missingLabel: "", ready: true },
    ],
    statusDetail: () => null,
    openSettingsPanel: vi.fn(),
    startInterviewSession: vi.fn(),
    canRetry: () => true,
    retryDisabledReason: () => null,
    retryAnalysis: vi.fn(),
    canClear: () => true,
    clearDisabledReason: () => null,
    clearContext: vi.fn(),
    copyCurrentCard: vi.fn(),
    interviewCardKeys: () => ["answer", "question", "signals", "risks", "followUps"],
    activeInterviewCardIndex: () => 0,
    activeInterviewCardKey: () => "answer",
    selectInterviewCardIndex: vi.fn(),
    nextInterviewCard: vi.fn(),
    prevInterviewCard: vi.fn(),
    pinnedInterviewCard: () => null,
    togglePinInterviewCard: vi.fn(),
    checkRuntimeConfig: vi.fn(),
    copySetupIssueHint: vi.fn(),
    error: () => null,
    phaseLabel: () => strings.phase.idleReady,
    interviewSession: () => null,
    interviewReport: () => null,
    interviewReportMarkdownPath: () => null,
    interviewReportRedactedMarkdownPath: () => null,
    endInterviewSession: vi.fn(),
    openInterviewReport: vi.fn(),
    exportInterviewReportMarkdown: vi.fn(),
    exportInterviewReportRedactedMarkdown: vi.fn(),
    clearInterviewReports: vi.fn(),
    activeContextPack: () => null,
    clearActiveContextPackAction: vi.fn(),
    openContextPackPanel: vi.fn(),
    experimentalBilingualAllowed: () => false,
  };
  return { ...base, ...overrides };
}

describe("MainSurface state-driven view", () => {
  it("setup state renders focused panel and no cockpit", () => {
    const openSettingsPanel = vi.fn();
    render(
      () =>
        (
          <MainSurface
            controller={
              createController(ui_ru, {
                setupRequired: () => true,
                setupSteps: () => [
                  { label: "1. Речь", readyLabel: "", missingLabel: "", ready: false },
                  { label: "2. Ответ / LLM", readyLabel: "", missingLabel: "", ready: false },
                  { label: "3. Горячая клавиша", readyLabel: "", missingLabel: "", ready: true },
                ],
                openSettingsPanel,
              }) as never
            }
          />
        ) as never,
    );
    expect(screen.getByTestId("main-state-setup")).toBeTruthy();
    expect(screen.queryByTestId("answer-hero-card")).toBeNull();
    expect(screen.queryByTestId("main-side-panel")).toBeNull();
    expect(screen.queryByTestId("action-row")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Перейти к первому незаполненному шагу" }));
    expect(openSettingsPanel).toHaveBeenCalled();
  });

  it("setup CTA stays keyboard reachable and activates with Enter", async () => {
    const user = userEvent.setup();
    const openSettingsPanel = vi.fn();
    render(
      () =>
        (
          <MainSurface
            controller={
              createController(ui_ru, {
                setupRequired: () => true,
                setupSteps: () => [
                  { label: "1. Речь", readyLabel: "", missingLabel: "", ready: false },
                  { label: "2. Ответ / LLM", readyLabel: "", missingLabel: "", ready: false },
                  { label: "3. Горячая клавиша", readyLabel: "", missingLabel: "", ready: true },
                ],
                openSettingsPanel,
              }) as never
            }
          />
        ) as never,
    );

    const cta = screen.getByTestId("setup-first-missing-cta");
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(cta);
    await user.keyboard("{Enter}");
    expect(openSettingsPanel).toHaveBeenCalledWith("speech");
  });

  it("idle state renders readiness without side panel", () => {
    render(() => <MainSurface controller={createController(ui_ru) as never} />);
    expect(screen.getByTestId("main-state-idle")).toBeTruthy();
    // Primary CTA is context management, not interview.
    expect(screen.getByTestId("idle-open-context-btn").textContent).toBe("Контекст");
    // Interview is secondary.
    expect(screen.getByTestId("idle-interview-secondary-btn").textContent).toBe("Режим интервью");
    expect(screen.queryByTestId("main-side-panel")).toBeNull();
    expect(screen.queryByTestId("action-row")).toBeNull();
  });

  it("processing state renders user-facing status", () => {
    render(
      () =>
        (
          <MainSurface
            controller={
              createController(ui_ru, {
                phase: () => "transcribing",
                mainUiState: () => "transcribing",
                statusDetail: () => "Распознаем речь: 40%",
                phaseLabel: () => ui_ru.phase.transcribing,
              }) as never
            }
          />
        ) as never,
    );
    expect(screen.getByTestId("main-state-processing")).toBeTruthy();
    expect(screen.getByTestId("processing-phase-label").textContent).toBe("Распознаём");
    expect(screen.queryByTestId("pipeline-timeline")).toBeNull();
  });

  it("recording state renders dedicated visual class", () => {
    render(
      () =>
        (
          <MainSurface
            controller={
              createController(ui_ru, {
                phase: () => "capturing",
                mainUiState: () => "capturing",
                phaseLabel: () => ui_ru.phase.capturing,
              }) as never
            }
          />
        ) as never,
    );
    expect(screen.getByTestId("main-state-processing").className).toContain(
      "phase-card--recording",
    );
    expect(screen.getByText("Идёт запись")).toBeTruthy();
  });

  it("analyzing state renders dedicated visual class", () => {
    render(
      () =>
        (
          <MainSurface
            controller={
              createController(ui_ru, {
                phase: () => "analyzing",
                mainUiState: () => "analyzing",
                phaseLabel: () => ui_ru.phase.analyzing,
              }) as never
            }
          />
        ) as never,
    );
    expect(screen.getByTestId("main-state-processing").className).toContain(
      "phase-card--analyzing",
    );
    expect(screen.getByTestId("processing-phase-label").textContent).toBe("Собираем ответ");
  });

  it("answer-ready renders hero, insight and action dock", () => {
    const copyCurrentCard = vi.fn();
    render(
      () =>
        (
          <MainSurface
            controller={
              createController(ui_ru, {
                mainUiState: () => "ready",
                phase: () => "ready",
                card: () => ({
                  mode: "work",
                  gist: "g",
                  sayNow: "say",
                  nextMove: "next",
                  starEvidence: "evidence",
                  riskOrClarifier: "clarification",
                  charsBand: "normal",
                }),
                copyCurrentCard,
              }) as never
            }
          />
        ) as never,
    );
    expect(screen.getByTestId("answer-hero-card")).toBeTruthy();
    expect(screen.getByTestId("secondary-insight-cards")).toBeTruthy();
    expect(screen.getByTestId("section-star-evidence").textContent).toContain("evidence");
    expect(screen.getByTestId("section-risk-clarifier").textContent).toContain("clarification");
    expect(screen.getByTestId("section-say-now").textContent).toBe("say");
    expect(screen.getByTestId("action-row")).toBeTruthy();
    const hero = screen.getByTestId("answer-hero-card");
    const copy = screen.getByRole("button", { name: "Скопировать ответ" });
    expect(hero.contains(copy)).toBe(true);
    expect(screen.getByRole("button", { name: "Пересобрать" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Очистить" })).toBeTruthy();
    fireEvent.click(copy);
    expect(copyCurrentCard).toHaveBeenCalled();
  });

  it("copy action and action row remain keyboard reachable", async () => {
    const user = userEvent.setup();
    const copyCurrentCard = vi.fn();
    render(
      () =>
        (
          <MainSurface
            controller={
              createController(ui_ru, {
                mainUiState: () => "ready",
                phase: () => "ready",
                card: () => ({
                  mode: "work",
                  gist: "g",
                  sayNow: "say",
                  nextMove: "next",
                  charsBand: "normal",
                }),
                copyCurrentCard,
              }) as never
            }
          />
        ) as never,
    );

    const copy = screen.getByRole("button", { name: "Скопировать ответ" });
    await user.tab();
    expect(document.activeElement).toBe(copy);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(copyCurrentCard).toHaveBeenCalled());
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Пересобрать" }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Очистить" }));
  });

  it("side panel appears only when useful", () => {
    render(
      () =>
        (
          <MainSurface
            controller={
              createController(ui_en, {
                mainUiState: () => "ready",
                phase: () => "ready",
                card: () => ({
                  mode: "work",
                  gist: "g",
                  sayNow: "say",
                  nextMove: "next",
                  charsBand: "normal",
                }),
              }) as never
            }
          />
        ) as never,
    );
    expect(screen.queryByTestId("main-side-panel")).toBeNull();
    render(
      () =>
        (
          <MainSurface
            controller={
              createController(ui_en, {
                mainUiState: () => "ready",
                phase: () => "ready",
                card: () => ({
                  mode: "work",
                  gist: "g",
                  sayNow: "say",
                  nextMove: "next",
                  charsBand: "normal",
                }),
                interviewReport: () =>
                  ({
                    sessionId: "is-1",
                    startedAt: "2026-05-20T10:00:00Z",
                    endedAt: "2026-05-20T10:12:00Z",
                    language: "en",
                    questions: [],
                    fullTranscript: "",
                    scores: { clarity: 0, relevance: 0, accuracy: 0 },
                    feedback: { strengths: [], improvements: [], missingExamples: [] },
                  }) as never,
              }) as never
            }
          />
        ) as never,
    );
    expect(screen.getByTestId("main-side-panel")).toBeTruthy();
  });

  it("interview carousel keeps roving focus and ArrowRight moves cards", async () => {
    const user = userEvent.setup();
    const [activeIndex, setActiveIndex] = createSignal(0);
    const interviewCard = {
      mode: "interview",
      gist: "g",
      sayNow: "say",
      nextMove: "next",
      charsBand: "normal",
      interview: {
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
    };
    render(
      () =>
        (
          <MainSurface
            controller={
              createController(ui_ru, {
                mainUiState: () => "ready",
                phase: () => "ready",
                card: () => interviewCard,
                interviewCardKeys: () => ["answer", "question", "signals", "risks", "followUps"],
                activeInterviewCardIndex: activeIndex,
                activeInterviewCardKey: () =>
                  ["answer", "question", "signals", "risks", "followUps"][activeIndex()] ??
                  "answer",
                selectInterviewCardIndex: (next: number) => setActiveIndex(next),
                nextInterviewCard: () => setActiveIndex((current) => Math.min(current + 1, 4)),
                prevInterviewCard: () => setActiveIndex((current) => Math.max(current - 1, 0)),
                pinnedInterviewCard: () => null,
                togglePinInterviewCard: vi.fn(),
              }) as never
            }
          />
        ) as never,
    );

    const answerTab = screen.getByRole("tab", { name: "1. Ответ" });
    const questionTab = screen.getByRole("tab", { name: "2. Вопрос" });
    expect(answerTab.getAttribute("tabindex")).toBe("0");
    expect(questionTab.getAttribute("tabindex")).toBe("-1");

    answerTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(activeIndex()).toBe(1);
    expect(document.activeElement).toBe(questionTab);
    expect(screen.getByTestId("section-interview-question")).toBeTruthy();
  });

  it("error state renders recovery card without answer actions", () => {
    render(
      () =>
        (
          <MainSurface
            controller={
              createController(ui_ru, {
                mainUiState: () => "error",
                phase: () => "error",
              }) as never
            }
          />
        ) as never,
    );
    expect(screen.getByTestId("error-recovery-card")).toBeTruthy();
    expect(screen.queryByTestId("answer-hero-card")).toBeNull();
    expect(screen.queryByTestId("action-row")).toBeNull();
  });
});
