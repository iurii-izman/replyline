import { fireEvent, screen, waitFor } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

import { createMockPlatform, interviewCardFixture } from "./test-utils/mockPlatform";
import { renderApp, triggerAnalysisReady } from "./test-utils/appUi";

describe("interview mode integration", () => {
  it("renders interview answer first and supports carousel navigation and per-card copy", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    const labels = (await screen.findByTestId("main-card-shell")).querySelectorAll(".result-label");
    expect(labels[0]?.textContent).toBe("Ответ");
    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();

    fireEvent.keyDown(globalThis, { key: "ArrowRight" });
    expect(await screen.findByTestId("section-interview-question")).toBeTruthy();
    fireEvent.keyDown(globalThis, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenLastCalledWith(
        "Tell me about a delivery incident.",
      ),
    );
    fireEvent.keyDown(globalThis, { key: "1" });
    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
  });

  it("keeps interview signals, risks, follow-ups, and clarifier copy behavior deterministic", async () => {
    const mock = createMockPlatform({
      analysisCard: interviewCardFixture({
        interviewCardSchemaV1: {
          ...interviewCardFixture().interviewCardSchemaV1,
          clarifier: { needed: true, text: "Need scope?" },
        },
      }),
    });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    fireEvent.keyDown(globalThis, { key: "3" });
    expect(await screen.findByTestId("section-interview-signals")).toBeTruthy();
    expect(screen.queryByText("Метрики:")).toBeNull();

    fireEvent.keyDown(globalThis, { key: "4" });
    fireEvent.keyDown(globalThis, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenLastCalledWith("focus on learning"),
    );

    fireEvent.keyDown(globalThis, { key: "5" });
    fireEvent.keyDown(globalThis, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenLastCalledWith(
        "What changed? (I introduced weekly review.)",
      ),
    );

    fireEvent.keyDown(globalThis, { key: "6" });
    expect(await screen.findByText("Need scope?")).toBeTruthy();
    fireEvent.keyDown(globalThis, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenLastCalledWith("Need scope?"),
    );
  });

  it("survives malformed interview arrays and hides the clarifier when it is not needed", async () => {
    const mock = createMockPlatform({
      analysisCard: interviewCardFixture({
        interviewCardSchemaV1: {
          mode: "interview",
          answer: {
            main: "Primary answer main",
            short: "Short 1",
            strong: "Strong 1",
            structure: "STAR",
          },
          question: {
            rawTranscript: "raw",
            cleanQuestion: "clean",
            interviewerIntent: "intent",
            questionType: "behavioral",
            confidence: "high",
          },
          signals: {
            mustMention: "ownership",
            keywords: "impact",
            metrics: null,
            resumeAnchors: "project x",
          },
          risks: {
            weakPoints: "no numbers",
            avoid: "blame others",
            safeReframe: "focus on learning",
          },
          followUps: [{ question: "q", bridgeAnswer: "a" }],
          clarifier: { needed: false, text: null },
        },
      }),
    });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    fireEvent.keyDown(globalThis, { key: "3" });
    expect(await screen.findByTestId("section-interview-signals")).toBeTruthy();
    fireEvent.keyDown(globalThis, { key: "4" });
    expect(await screen.findByTestId("section-interview-risks")).toBeTruthy();
    expect(screen.queryByTestId("section-interview-clarifier")).toBeNull();
  });

  it("keeps pinned interview selection on retry and clears stale pinned content on reset", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    fireEvent.keyDown(globalThis, { key: "3" });
    fireEvent.click(await screen.findByRole("button", { name: "Закрепить" }));
    fireEvent.keyDown(globalThis, { key: "r" });
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "retry_last_analysis")).toBe(true),
    );
    expect(await screen.findByTestId("section-interview-signals")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Очистить" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "clear_context")).toBe(true),
    );
    expect(await screen.findByTestId("main-state-idle")).toBeTruthy();
    expect(screen.queryByTestId("interview-card-controls")).toBeNull();
  });

  it("drops a pinned card when the retried interview card no longer contains that section", async () => {
    const withClarifier = interviewCardFixture({
      interviewCardSchemaV1: {
        ...interviewCardFixture().interviewCardSchemaV1,
        clarifier: { needed: true, text: "Need scope?" },
      },
    });
    const withoutClarifier = interviewCardFixture({
      interviewCardSchemaV1: {
        ...interviewCardFixture().interviewCardSchemaV1,
        clarifier: { needed: false, text: null },
      },
    });
    const mock = createMockPlatform({ analysisCard: withClarifier });
    const baseInvoke = mock.invoke;
    const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "retry_last_analysis") return withoutClarifier;
      return baseInvoke(command, args);
    });
    mock.platform.invoke = patchedInvoke;
    mock.invoke = patchedInvoke;

    renderApp(mock);
    await triggerAnalysisReady(mock);
    fireEvent.keyDown(globalThis, { key: "6" });
    fireEvent.click(await screen.findByRole("button", { name: "Закрепить" }));
    fireEvent.keyDown(globalThis, { key: "r" });
    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
  });

  it("recovers from a failed first pass on the next shortcut cycle", async () => {
    let firstAttempt = true;
    const mock = createMockPlatform();
    const invoke = mock.platform.invoke;
    const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "capture_stop_and_analyze") {
        if (firstAttempt) {
          firstAttempt = false;
          throw { kind: "Pipeline", message: "LLM timeout" };
        }
        return interviewCardFixture();
      }
      return invoke(command, args);
    });
    mock.platform.invoke = patchedInvoke;
    mock.invoke = patchedInvoke;

    renderApp(mock);
    await triggerAnalysisReady(mock);
    expect(
      await screen.findAllByText("Нет ответа LLM-шлюза: проверьте URL, модель и ключ."),
    ).toHaveLength(2);

    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });
    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
  });

  it("supports interview session lifecycle and both report export variants", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCardFixture() });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    fireEvent.click(screen.getByRole("button", { name: "Начать сессию" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "start_interview_session")).toBe(
        true,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Завершить сессию" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "end_interview_session")).toBe(true),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Экспортировать Redacted Markdown без транскрипта" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Экспортировать полный Markdown с транскриптом" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Очистить отчёты" }));

    expect(
      mock.invoke.mock.calls.some(
        (call) => call[0] === "export_interview_report_redacted_markdown",
      ),
    ).toBe(true);
    expect(
      mock.invoke.mock.calls.some((call) => call[0] === "export_interview_report_markdown"),
    ).toBe(true);
    expect(mock.invoke.mock.calls.some((call) => call[0] === "clear_interview_reports")).toBe(true);
  });
});
