import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { MainSurface } from "./MainSurface";
import { ui_en, ui_ru, type UiStrings } from "./locale";

function createController(strings: UiStrings, overrides: Record<string, unknown> = {}) {
  const base = {
    strings: () => strings,
    panel: () => "main",
    card: () => null,
    compactMode: () => false,
    phase: () => "idle",
    mainUiState: () => "idle",
    setupReadinessState: () => "ready",
    setupRequired: () => false,
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

  it("idle state renders readiness without side panel", () => {
    render(() => <MainSurface controller={createController(ui_ru) as never} />);
    expect(screen.getByTestId("main-state-idle")).toBeTruthy();
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
    expect(screen.getByText("Собираем ответ")).toBeTruthy();
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
    expect(screen.getByText("Собираем ответ")).toBeTruthy();
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
    expect(screen.getByTestId("action-row")).toBeTruthy();
    const hero = screen.getByTestId("answer-hero-card");
    const copy = screen.getByRole("button", { name: "Скопировать ответ" });
    expect(hero.contains(copy)).toBe(true);
    expect(screen.getByRole("button", { name: "Пересобрать" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Очистить" })).toBeTruthy();
    fireEvent.click(copy);
    expect(copyCurrentCard).toHaveBeenCalled();
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
});
