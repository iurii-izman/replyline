import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

import { MainSurface } from "./MainSurface";
import { ui_en, ui_ru, type UiStrings } from "./locale";

function createController(strings: UiStrings) {
  return {
    strings: () => strings,
    panel: () => "main",
    card: () => null,
    compactMode: () => false,
    phase: () => "idle",
    mainUiState: () => "idle",
    hotkeyFailed: () => false,
    setupRequired: () => false,
    pipelineActive: () => false,
    statusDetail: () => null,
    captureQuality: () => "normal",
    openSettingsPanel: vi.fn(),
    interviewCardKeys: () => [],
    activeInterviewCardIndex: () => 0,
    activeInterviewCardKey: () => null,
    pinnedInterviewCard: () => null,
    prevInterviewCard: vi.fn(),
    nextInterviewCard: vi.fn(),
    selectInterviewCardIndex: vi.fn(),
    togglePinInterviewCard: vi.fn(),
    startInterviewSession: vi.fn(),
    endInterviewSession: vi.fn(),
    openInterviewReport: vi.fn(),
    exportInterviewReportMarkdown: vi.fn(),
    clearInterviewReports: vi.fn(),
    canCopySayNow: () => false,
    copyDisabledReason: () => strings.card.copyDisabledNoCard,
    copyCurrentCard: vi.fn(),
    canRetry: () => false,
    retryDisabledReason: () => strings.card.retryDisabledNoCard,
    retryAnalysis: vi.fn(),
    canClear: () => false,
    clearDisabledReason: () => strings.card.clearDisabledNoCard,
    clearContext: vi.fn(),
    interviewReport: () => ({
      sessionId: "s-1",
      startedAt: "2026-05-18T10:00:00Z",
      endedAt: "2026-05-18T10:30:00Z",
      language: "en",
      questions: [],
      fullTranscript: "",
      scores: { clarity: 1, relevance: 2, accuracy: 3 },
      feedback: { strengths: [], improvements: [], missingExamples: [] },
    }),
    interviewReportMarkdownPath: () => null,
    phaseLabel: () => strings.phase.idleReady,
  };
}

describe("MainSurface locale labels", () => {
  it("renders RU session/report labels", () => {
    render(() => <MainSurface controller={createController(ui_ru) as never} />);

    expect(screen.getByRole("button", { name: "Начать сессию" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Завершить сессию" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Открыть отчёт" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Экспортировать Markdown" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Очистить отчёты" })).toBeTruthy();
    expect(screen.getByText("Отчёт интервью")).toBeTruthy();
    expect(screen.queryByText("undefined")).toBeNull();
  });

  it("renders EN session/report labels", () => {
    render(() => <MainSurface controller={createController(ui_en) as never} />);

    expect(screen.getByRole("button", { name: "Start session" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "End session" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open report" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export markdown" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear reports" })).toBeTruthy();
    expect(screen.getByText("Interview report")).toBeTruthy();
    expect(screen.queryByText("undefined")).toBeNull();
  });
});
