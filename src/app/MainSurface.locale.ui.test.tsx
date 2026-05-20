import { fireEvent, render, screen, within } from "@solidjs/testing-library";
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
    interviewSession: () => null,
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
      screen.getByRole("button", { name: "Экспортировать Full Markdown с transcript" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Экспортировать Redacted Markdown без transcript" }),
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
    render(() => (
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
      />
    ));

    expect(screen.getByText("Распознаем речь")).toBeTruthy();
    expect(screen.getAllByText("Распознаем речь: 40%").length).toBeGreaterThan(0);
  });

  it("shows work empty state guidance", () => {
    render(() => <MainSurface controller={createController(ui_ru) as never} />);

    expect(screen.getByTestId("main-empty-state-work")).toBeTruthy();
    expect(screen.getByTestId("readiness-instruction").textContent).toContain(
      "Ctrl+Alt+Space — удержать и отпустить",
    );
    expect(screen.getByTestId("readiness-status-rail")).toBeTruthy();
  });

  it("keeps idle status without loading copy", () => {
    render(() => <MainSurface controller={createController(ui_ru) as never} />);

    const phase = screen.getByTestId("status-strip-phase");
    expect(phase.textContent).toContain("Готово");
    expect(phase.textContent?.toLowerCase()).not.toContain("загружа");
  });

  it("shows setup required state", () => {
    render(() => (
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
      />
    ));

    expect(screen.getByTestId("main-empty-state-setup")).toBeTruthy();
    expect(screen.getByText("Нужно завершить настройку")).toBeTruthy();
    expect(screen.getByText("Настройка локальная, ключи не уходят в облако.")).toBeTruthy();
    const chips = screen.getByTestId("setup-banner-missing-steps").children;
    expect(chips.length).toBe(2);
    expect(screen.queryByText("3. Горячая клавиша")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Перейти к первому незаполненному шагу" }),
    ).toBeTruthy();
  });

  it("shows ready card with copy action inside hero card", () => {
    const copyCurrentCard = vi.fn();
    render(() => (
      <MainSurface
        controller={
          createController(ui_ru, {
            card: () => ({
              mode: "work",
              gist: "g",
              sayNow: "say",
              nextMove: "next",
              charsBand: "normal",
            }),
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
      />
    ));

    const heroCard = screen.getByTestId("answer-hero-card");
    const copy = within(heroCard).getByRole("button", { name: "Скопировать ответ" });
    expect(copy).toHaveProperty("disabled", false);
    fireEvent.click(copy);
    expect(copyCurrentCard).toHaveBeenCalled();
  });

  it("shows side panel and transcript preview", () => {
    render(() => (
      <MainSurface
        controller={
          createController(ui_ru, {
            lastTranscriptPreview: () => "last snippet",
          }) as never
        }
      />
    ));

    expect(screen.getByTestId("main-side-panel")).toBeTruthy();
    expect(screen.getByTestId("workspace-aside-stack")).toBeTruthy();
    expect(screen.getByTestId("session-panel")).toBeTruthy();
    expect(screen.getByTestId("session-metrics")).toBeTruthy();
    expect(screen.getByTestId("session-active-chip").textContent).toContain("Не активна");
    expect(screen.getByTestId("export-panel")).toBeTruthy();
    expect(screen.getByTestId("transcript-preview-panel")).toBeTruthy();
  });

  it("uses action-bar and disables exports without report with reason", () => {
    render(() => <MainSurface controller={createController(ui_ru) as never} />);

    const actionRow = screen.getByTestId("action-row");
    expect(actionRow.className).toContain("action-bar");
    expect(actionRow.className).toContain("sticky-action-footer");

    const fullExport = screen.getByRole("button", {
      name: "Экспортировать Full Markdown с transcript",
    });
    const redactedExport = screen.getByRole("button", {
      name: "Экспортировать Redacted Markdown без transcript",
    });

    expect(fullExport).toHaveProperty("disabled", true);
    expect(redactedExport).toHaveProperty("disabled", true);
    expect(within(actionRow).queryByRole("button", { name: "Начать сессию" })).toBeNull();
    expect(within(actionRow).queryByRole("button", { name: "Скопировать ответ" })).toBeNull();
    expect(
      within(actionRow).queryByRole("button", {
        name: "Экспортировать Full Markdown с transcript",
      }),
    ).toBeNull();
    expect(fullExport.getAttribute("title")).toBe("Отчёт ещё не сформирован.");
    expect(redactedExport.getAttribute("title")).toBe("Отчёт ещё не сформирован.");
    expect(
      screen.getByText("Завершите сессию, чтобы получить отчёт и включить экспорт."),
    ).toBeTruthy();
    expect(screen.getByTestId("report-panel-empty")).toBeTruthy();
    expect(screen.getByText("Без полного transcript, безопаснее для передачи.")).toBeTruthy();
    expect(fullExport.getAttribute("title")).toBe("Отчёт ещё не сформирован.");
  });

  it("keeps session/report/export buttons wired", () => {
    const startInterviewSession = vi.fn();
    const endInterviewSession = vi.fn();
    const openInterviewReport = vi.fn();
    const exportInterviewReportMarkdown = vi.fn();
    const exportInterviewReportRedactedMarkdown = vi.fn();
    const clearInterviewReports = vi.fn();
    render(() => (
      <MainSurface
        controller={
          createController(ui_ru, {
            interviewReport: () => ({
              sessionId: "is-1",
              startedAt: "2026-05-20T10:00:00Z",
              endedAt: "2026-05-20T10:12:00Z",
              language: "ru",
              questions: [],
              fullTranscript: "",
              scores: { clarity: 0, relevance: 0, accuracy: 0 },
              feedback: { strengths: [], improvements: [], missingExamples: [] },
            }),
            startInterviewSession,
            endInterviewSession,
            openInterviewReport,
            exportInterviewReportMarkdown,
            exportInterviewReportRedactedMarkdown,
            clearInterviewReports,
          }) as never
        }
      />
    ));

    fireEvent.click(screen.getByRole("button", { name: "Начать сессию" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Завершить сессию" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Открыть отчёт" })[0]);
    fireEvent.click(
      screen.getByRole("button", { name: "Экспортировать Full Markdown с transcript" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Экспортировать Redacted Markdown без transcript" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Очистить отчёты" }));

    expect(startInterviewSession).toHaveBeenCalled();
    expect(endInterviewSession).toHaveBeenCalled();
    expect(openInterviewReport).toHaveBeenCalled();
    expect(exportInterviewReportMarkdown).toHaveBeenCalled();
    expect(exportInterviewReportRedactedMarkdown).toHaveBeenCalled();
    expect(clearInterviewReports).toHaveBeenCalled();
  });

  it("preserves copy/retry/clear behavior", () => {
    const copyCurrentCard = vi.fn();
    const retryAnalysis = vi.fn();
    const clearContext = vi.fn();
    render(() => (
      <MainSurface
        controller={
          createController(ui_ru, {
            card: () => ({
              mode: "work",
              gist: "g",
              sayNow: "say",
              nextMove: "next",
              charsBand: "normal",
            }),
            canCopySayNow: () => true,
            canRetry: () => true,
            canClear: () => true,
            copyDisabledReason: () => null,
            retryDisabledReason: () => null,
            clearDisabledReason: () => null,
            copyCurrentCard,
            retryAnalysis,
            clearContext,
          }) as never
        }
      />
    ));

    fireEvent.click(screen.getByRole("button", { name: "Скопировать ответ" }));
    fireEvent.click(screen.getByRole("button", { name: "Пересобрать" }));
    fireEvent.click(screen.getByRole("button", { name: "Очистить" }));
    expect(copyCurrentCard).toHaveBeenCalled();
    expect(retryAnalysis).toHaveBeenCalled();
    expect(clearContext).toHaveBeenCalled();
  });

  it("does not render legacy pipeline timeline", () => {
    render(() => <MainSurface controller={createController(ui_ru) as never} />);
    expect(screen.queryByTestId("pipeline-timeline")).toBeNull();
  });
});
