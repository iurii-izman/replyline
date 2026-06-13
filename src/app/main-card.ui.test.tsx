import { cleanup, fireEvent, screen, waitFor } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockPlatform, createSetupMockPlatform, type MockPlatform } from "./test-utils/mockPlatform";
import { enableCompactInterviewMode, renderApp, triggerAnalysisReady } from "./test-utils/appUi";

describe("main card integration", () => {
  let mock: MockPlatform;

  beforeEach(() => {
    mock = createMockPlatform();
  });

  it("shows idle readiness without copy or retry actions until a card exists", async () => {
    renderApp(mock);

    expect(await screen.findByTestId("main-state-idle")).toBeTruthy();
    expect(screen.queryByTestId("main-card-shell")).toBeNull();
    expect(screen.queryByTestId("action-row")).toBeNull();
    expect(screen.queryByRole("button", { name: "Скопировать ответ" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Пересобрать" })).toBeNull();
    expect(screen.getByTestId("main-status-strip")).toBeTruthy();
  });

  it("shows setup-required state instead of idle ready content when bootstrap is incomplete", async () => {
    const setupMock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmKeyPresent: false,
      llmBaseUrl: "",
      llmModel: "",
      runtimeReady: false,
    });
    renderApp(setupMock);

    expect(await screen.findByTestId("main-state-setup")).toBeTruthy();
    expect(screen.queryByTestId("main-state-idle")).toBeNull();
  });

  it("handles work happy path for capture, copy, retry, and clear", async () => {
    mock = createMockPlatform({
      analysisCard: { mode: "work", gist: "work gist", sayNow: "work say", nextMove: "work next" },
    });
    renderApp(mock);

    await triggerAnalysisReady(mock);
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "capture_start")).toBe(true),
    );
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "capture_stop_and_analyze")).toBe(
        true,
      ),
    );

    const copy = await screen.findByRole("button", { name: "Скопировать ответ" });
    const retry = screen.getByRole("button", { name: "Пересобрать" });
    expect(copy).toHaveProperty("disabled", false);
    expect(retry).toHaveProperty("disabled", false);

    fireEvent.click(copy);
    await waitFor(() => expect(mock.platform.clipboard.writeText).toHaveBeenCalledWith("work say"));

    fireEvent.click(retry);
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "retry_last_analysis")).toBe(true),
    );
    expect(await screen.findByTestId("section-say-now")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Очистить" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "clear_context")).toBe(true),
    );
    expect(await screen.findByTestId("main-state-idle")).toBeTruthy();
  });

  it("wires keyboard shortcuts for ready work cards", async () => {
    renderApp(mock);

    await triggerAnalysisReady(mock);
    fireEvent.keyDown(globalThis, { key: "c", ctrlKey: true });
    await waitFor(() => expect(mock.platform.clipboard.writeText).toHaveBeenCalledWith("say"));

    fireEvent.keyDown(globalThis, { key: "r" });
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "retry_last_analysis")).toBe(true),
    );

    fireEvent.keyDown(globalThis, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Ответ скопирован.")).toBeNull());
  });

  it("shows error recovery state and hides the action zone after a pipeline error", async () => {
    mock = createMockPlatform({ analysisError: { kind: "Pipeline", message: "LLM timeout" } });
    renderApp(mock);

    await triggerAnalysisReady(mock);
    expect(
      await screen.findByText("Нет ответа LLM-шлюза: проверьте URL, модель и ключ."),
    ).toBeTruthy();
    expect(screen.getByText("Повторите захват или проверьте настройки.")).toBeTruthy();
    expect(screen.queryByTestId("action-row")).toBeNull();
    expect(screen.queryByRole("button", { name: "Скопировать ответ" })).toBeNull();
  });

  it("switches from interview layout to work layout without stale UI remnants", async () => {
    const interviewToWorkMock = createMockPlatform({
      analysisCard: {
        gist: "g",
        sayNow: "say",
        nextMove: "next",
        interviewCardSchemaV1: {
          mode: "interview",
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
      },
    });
    const baseInvoke = interviewToWorkMock.platform.invoke;
    const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "retry_last_analysis") {
        return { mode: "work", gist: "work gist", sayNow: "work say", nextMove: "work next" };
      }
      return baseInvoke(command, args);
    });
    interviewToWorkMock.platform.invoke = patchedInvoke;
    interviewToWorkMock.invoke = patchedInvoke;
    renderApp(interviewToWorkMock);
    await triggerAnalysisReady(interviewToWorkMock);
    fireEvent.keyDown(globalThis, { key: "r" });
    expect(await screen.findByTestId("section-gist")).toBeTruthy();
    expect(screen.queryByTestId("interview-card-controls")).toBeNull();
  });

  it("switches from work layout to interview layout without stale UI remnants", async () => {
    const workToInterviewMock = createMockPlatform({
      analysisCard: { mode: "work", gist: "work gist", sayNow: "work say", nextMove: "work next" },
    });
    const workInvoke = workToInterviewMock.platform.invoke;
    const patchedWorkInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "retry_last_analysis") {
        return {
          gist: "legacy gist",
          sayNow: "legacy say",
          nextMove: "legacy next",
          charsBand: "normal",
          interviewCardSchemaV1: {
            mode: "interview",
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
      }
      return workInvoke(command, args);
    });
    workToInterviewMock.platform.invoke = patchedWorkInvoke;
    workToInterviewMock.invoke = patchedWorkInvoke;
    cleanup();
    renderApp(workToInterviewMock);
    await triggerAnalysisReady(workToInterviewMock);
    expect(await screen.findByTestId("section-gist")).toBeTruthy();
    fireEvent.keyDown(globalThis, { key: "r" });
    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
    expect(screen.queryByTestId("section-gist")).toBeNull();
  });

  it("keeps compact interview mode functional for actions and critical error fallback", async () => {
    const compactMock = createMockPlatform({
      analysisCard: {
        gist: "g",
        sayNow: "say",
        nextMove: "next",
        charsBand: "normal",
        interviewCardSchemaV1: {
          mode: "interview",
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
      },
    });
    const baseInvoke = compactMock.platform.invoke;
    const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "retry_last_analysis") {
        throw { kind: "Pipeline", message: "LLM timeout" };
      }
      return baseInvoke(command, args);
    });
    compactMock.platform.invoke = patchedInvoke;
    compactMock.invoke = patchedInvoke;
    renderApp(compactMock);
    await triggerAnalysisReady(compactMock);
    await enableCompactInterviewMode();

    expect(screen.getByRole("button", { name: "Пересобрать" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Очистить" })).toBeTruthy();

    fireEvent.keyDown(globalThis, { key: "r" });
    expect(
      await screen.findByText("Нет ответа LLM-шлюза: проверьте URL, модель и ключ."),
    ).toBeTruthy();
  });
});
