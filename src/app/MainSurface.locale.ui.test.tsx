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
    hotkeyFailed: () => false,
    setupRequired: () => false,
    setupSteps: () => [],
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
    exportInterviewReportRedactedMarkdown: vi.fn(),
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
    interviewReport: () => null,
    interviewReportMarkdownPath: () => null,
    interviewReportRedactedMarkdownPath: () => null,
    phaseLabel: () => strings.phase.idleReady,
    lastTranscriptPreview: () => null,
  };
  return { ...base, ...overrides };
}

describe("MainSurface locale labels", () => {
  it("renders RU session/report labels", () => {
    render(() => <MainSurface controller={createController(ui_ru) as never} />);

    expect(screen.getByRole("button", { name: "Начать сессию" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Завершить сессию" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Открыть отчёт" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Экспортировать full Markdown (с transcript)" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Экспортировать redacted Markdown (без transcript)" }),
    ).toBeTruthy();
    const clearReports = screen.getByRole("button", { name: "Очистить отчёты" });
    expect(clearReports).toBeTruthy();
    expect(clearReports.className).toContain("btn-danger");
    expect(screen.getByRole("button", { name: "Открыть отчёт" })).toHaveProperty("disabled", true);
  });

  it("renders EN session/report labels", () => {
    render(() => <MainSurface controller={createController(ui_en) as never} />);

    expect(screen.getByRole("button", { name: "Start session" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "End session" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Open report" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Export full markdown (includes transcript)" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Export redacted markdown (no transcript)" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear reports" })).toBeTruthy();
  });
});

describe("MainSurface cockpit states", () => {
  it("shows loading state copy for transcribing", () => {
    render(
      () =>
        <MainSurface
          controller={
            createController(ui_ru, {
              phase: () => "transcribing",
              mainUiState: () => "transcribing",
              pipelineActive: () => true,
              statusDetail: () => "Распознаем речь: 40%",
              phaseLabel: () => ui_ru.phase.transcribing,
            }) as never
          }
        />,
    );

    expect(screen.getByText("Распознаем речь")).toBeTruthy();
    expect(screen.getByText("Распознаем речь: 40%")).toBeTruthy();
  });

  it("shows work empty state guidance", () => {
    render(() => <MainSurface controller={createController(ui_ru) as never} />);

    expect(screen.getByTestId("main-empty-state-work")).toBeTruthy();
    expect(screen.getByText("Зажмите Ctrl+Alt+Space, чтобы записать фрагмент.")).toBeTruthy();
  });

  it("shows setup required state", () => {
    render(
      () =>
        <MainSurface
          controller={
            createController(ui_ru, {
              setupRequired: () => true,
              setupSteps: () => [
                { label: "1. Речь", readyLabel: "", missingLabel: "", ready: false },
                { label: "2. Ответ", readyLabel: "", missingLabel: "", ready: false },
                { label: "3. Горячая клавиша", readyLabel: "", missingLabel: "", ready: true },
              ],
            }) as never
          }
        />,
    );

    expect(screen.getByTestId("main-empty-state-setup")).toBeTruthy();
    expect(screen.getByText("Нужно завершить настройку")).toBeTruthy();
    expect(screen.getByText("Сначала заполните Speech и LLM.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Продолжить настройку" })).toBeTruthy();
  });

  it("shows ready card with copy action enabled", () => {
    const copyCurrentCard = vi.fn();
    render(
      () =>
        <MainSurface
          controller={
            createController(ui_ru, {
              card: () => ({ mode: "work", gist: "g", sayNow: "say", nextMove: "next", charsBand: "normal" }),
              mainUiState: () => "ready",
              phase: () => "ready",
              canCopySayNow: () => true,
              canRetry: () => true,
              canClear: () => true,
              copyDisabledReason: () => null,
              retryDisabledReason: () => null,
              clearDisabledReason: () => null,
              copyCurrentCard,
            }) as never
          }
        />,
    );

    const copy = screen.getByRole("button", { name: "Скопировать ответ" });
    expect(copy).toHaveProperty("disabled", false);
    fireEvent.click(copy);
    expect(copyCurrentCard).toHaveBeenCalled();
  });

  it("shows side panel and transcript preview", () => {
    render(
      () =>
        <MainSurface
          controller={
            createController(ui_ru, {
              lastTranscriptPreview: () => "last snippet",
            }) as never
          }
        />,
    );

    expect(screen.getByTestId("main-side-panel")).toBeTruthy();
    expect(screen.getByTestId("session-panel")).toBeTruthy();
    expect(screen.getByTestId("report-panel")).toBeTruthy();
    expect(screen.getByTestId("transcript-preview-panel")).toBeTruthy();
  });

  it("uses action-bar and disables exports without report with reason", () => {
    render(() => <MainSurface controller={createController(ui_ru) as never} />);

    const actionRow = screen.getByTestId("action-row");
    expect(actionRow.className).toContain("action-bar");
    expect(actionRow.className).toContain("sticky-action-footer");

    const fullExport = screen.getByRole("button", { name: "Экспортировать full Markdown (с transcript)" });
    const redactedExport = screen.getByRole("button", { name: "Экспортировать redacted Markdown (без transcript)" });

    expect(fullExport).toHaveProperty("disabled", true);
    expect(redactedExport).toHaveProperty("disabled", true);
    expect(fullExport.getAttribute("title")).toBe("Сначала завершите сессию и сформируйте отчёт.");
    expect(redactedExport.getAttribute("title")).toBe("Сначала завершите сессию и сформируйте отчёт.");
    expect(screen.getByTestId("interview-report-empty")).toBeTruthy();
    expect(screen.getByText("Отчёт пока не сформирован")).toBeTruthy();
  });

  it("shows short capture quality hint", () => {
    render(
      () =>
        <MainSurface
          controller={
            createController(ui_ru, {
              card: () => ({ mode: "work", gist: "g", sayNow: "say", nextMove: "next", charsBand: "short" }),
              captureQuality: () => "short",
            }) as never
          }
        />,
    );

    expect(screen.getByText(/Короткий фрагмент: запишите 5-10 секунд/)).toBeTruthy();
  });
});
