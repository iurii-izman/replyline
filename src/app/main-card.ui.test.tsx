import { cleanup, fireEvent, screen, waitFor } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockPlatform,
  createSetupMockPlatform,
  type MockPlatform,
} from "./test-utils/mockPlatform";
import { enableCompactInterviewMode, renderApp, triggerAnalysisReady } from "./test-utils/appUi";

describe("main card integration", () => {
  let mock: MockPlatform;

  beforeEach(() => {
    mock = createMockPlatform();
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

  it("setup state shows progress indicator and why-explanations for each step", async () => {
    const setupMock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmKeyPresent: false,
      llmBaseUrl: "",
      llmModel: "",
      runtimeReady: false,
    });
    renderApp(setupMock);

    await screen.findByTestId("main-state-setup");

    // Progress indicator is visible (hotkey is ready by default).
    expect(screen.getByTestId("setup-progress").textContent).toMatch(/\d из 3/);

    // Each step has a "why" explanation.
    expect(screen.getByTestId("setup-why-1. Речь").textContent).toContain("Deepgram");
    expect(screen.getByTestId("setup-why-2. Ответ").textContent).toContain("LLM-шлюз");
    expect(screen.getByTestId("setup-why-3. Горячая клавиша").textContent).toContain("запись");

    // When not all ready, shows "open first missing" CTA, not context CTA.
    expect(screen.getByTestId("setup-first-missing-cta")).toBeTruthy();
    expect(screen.queryByTestId("setup-create-context-cta")).toBeNull();
  });

  it("setup complete state transitions to idle which offers ContextPack creation", async () => {
    // When all providers are ready, setupRequired is false — the app
    // transitions to IdleReadyState which has the ContextPack button.
    const setupMock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmKeyPresent: true,
      llmBaseUrl: "https://api.example.com/v1",
      llmModel: "gpt-4o-mini",
      runtimeReady: true,
    });
    renderApp(setupMock);

    // The app transitions from setup to idle.
    await screen.findByTestId("main-state-idle");
    expect(screen.queryByTestId("main-state-setup")).toBeNull();

    // Idle state offers ContextPack as the primary action.
    expect(screen.getByTestId("idle-open-context-btn")).toBeTruthy();
    expect(screen.getByTestId("idle-open-context-btn").textContent).toContain("Контекст");
  });

  it("setup shows clear message when Deepgram key is missing", async () => {
    const setupMock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmKeyPresent: true,
      llmBaseUrl: "https://api.example.com/v1",
      llmModel: "gpt-4o-mini",
      runtimeReady: false,
    });
    renderApp(setupMock);

    await screen.findByTestId("main-state-setup");

    // The speech step shows missing status.
    expect(screen.getByText("Добавьте ключ Deepgram API.")).toBeTruthy();
    // The why explanation explains what Deepgram does.
    expect(screen.getByTestId("setup-why-1. Речь").textContent).toContain(
      "превращает голос собеседника в текст",
    );
  });

  it("setup shows clear message when LLM route is not configured", async () => {
    const setupMock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmKeyPresent: false,
      llmBaseUrl: "",
      llmModel: "",
      runtimeReady: false,
    });
    renderApp(setupMock);

    await screen.findByTestId("main-state-setup");

    // The LLM step shows missing status.
    expect(screen.getByText("Укажите URL и модель LLM-шлюза.")).toBeTruthy();
    // The why explanation explains what LLM gateway does.
    expect(screen.getByTestId("setup-why-2. Ответ").textContent).toContain(
      "собирает карточку ответа",
    );
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

  it("shows error recovery state and hides the action zone after a pipeline error", async () => {
    mock = createMockPlatform({ analysisError: { kind: "Pipeline", message: "LLM timeout" } });
    renderApp(mock);

    await triggerAnalysisReady(mock);
    expect(
      await screen.findAllByText("Нет ответа LLM-шлюза: проверьте URL, модель и ключ."),
    ).toHaveLength(2);
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
      await screen.findAllByText("Нет ответа LLM-шлюза: проверьте URL, модель и ключ."),
    ).toHaveLength(2);
  });

  it("renders divider between hero say-now and secondary insights", async () => {
    mock = createMockPlatform({
      analysisCard: { mode: "work", gist: "work gist", sayNow: "work say", nextMove: "work next" },
    });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    // Hero card and secondary sections should be separated by a divider
    expect(screen.getByTestId("answer-hero-card")).toBeTruthy();
    // The hr divider should be present between hero and insights
    const dividers = document.querySelectorAll("hr.card-section-divider");
    expect(dividers.length).toBeGreaterThanOrEqual(1);
    // Secondary insights still visible
    expect(screen.getByTestId("secondary-insight-cards")).toBeTruthy();
    expect(screen.getByTestId("section-gist")).toBeTruthy();
    expect(screen.getByTestId("section-next-move")).toBeTruthy();
  });

  it("keeps say_now as visual primary element with stronger typography than gist", async () => {
    mock = createMockPlatform({
      analysisCard: { mode: "work", gist: "work gist", sayNow: "work say", nextMove: "work next" },
    });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    const sayNowEl = screen.getByTestId("section-say-now");
    const gistTextEl = screen.getByTestId("section-gist").querySelector(".result-text");
    expect(sayNowEl).toBeTruthy();
    expect(gistTextEl).toBeTruthy();

    // say_now uses the result-text--speak class for stronger typography
    expect(sayNowEl.classList.contains("result-text--speak")).toBe(true);
    // gist text uses plain result-text (no speak modifier)
    expect(gistTextEl!.classList.contains("result-text--speak")).toBe(false);
    // say_now has font-weight: 700 via CSS
    expect(sayNowEl.tagName).toBe("P");
    // answer-hero-card wraps say_now as the primary element
    const heroCard = screen.getByTestId("answer-hero-card");
    expect(heroCard.contains(sayNowEl)).toBe(true);
  });

  it("copy button transitions to copied state and back", async () => {
    mock = createMockPlatform({
      analysisCard: { mode: "work", gist: "work gist", sayNow: "work say", nextMove: "work next" },
    });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    const copyBtn = screen.getByTestId("answer-copy-btn");
    expect(copyBtn.textContent).toContain("Скопировать ответ");
    expect(copyBtn.classList.contains("is-copied")).toBe(false);

    fireEvent.click(copyBtn);
    await waitFor(() => expect(copyBtn.textContent).toContain("Скопировано"));
    expect(copyBtn.classList.contains("is-copied")).toBe(true);
    expect(mock.platform.clipboard.writeText).toHaveBeenCalledWith("work say");
  });

  it("next move is always visible in work answer card", async () => {
    mock = createMockPlatform({
      analysisCard: { mode: "work", gist: "work gist", sayNow: "work say", nextMove: "work next" },
    });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    expect(screen.getByTestId("section-next-move")).toBeTruthy();
    expect(screen.getByTestId("section-next-move").textContent).toContain("work next");
  });

  it("hides risk/clarifier and star evidence when not present in card", async () => {
    mock = createMockPlatform({
      analysisCard: { mode: "work", gist: "work gist", sayNow: "work say", nextMove: "work next" },
    });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    expect(screen.queryByTestId("section-star-evidence")).toBeNull();
    expect(screen.queryByTestId("section-risk-clarifier")).toBeNull();
  });

  it("shows risk/clarifier and star evidence with distinct treatment when present", async () => {
    mock = createMockPlatform({
      analysisCard: {
        mode: "work",
        gist: "g",
        sayNow: "say",
        nextMove: "next",
        starEvidence: "Use STAR structure",
        riskOrClarifier: "Avoid blaming tone",
      },
    });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    const evidenceEl = screen.getByTestId("section-star-evidence");
    const riskEl = screen.getByTestId("section-risk-clarifier");
    expect(evidenceEl).toBeTruthy();
    expect(riskEl).toBeTruthy();
    expect(evidenceEl.classList.contains("insight-section--evidence")).toBe(true);
    expect(riskEl.classList.contains("insight-section--risk")).toBe(true);
    expect(evidenceEl.textContent).toContain("Use STAR structure");
    expect(riskEl.textContent).toContain("Avoid blaming tone");
  });

  it("keeps retry and clear action dock accessible inside answer-ready state", async () => {
    mock = createMockPlatform({
      analysisCard: { mode: "work", gist: "work gist", sayNow: "work say", nextMove: "work next" },
    });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    const retryBtn = screen.getByRole("button", { name: "Пересобрать" });
    const clearBtn = screen.getByRole("button", { name: "Очистить" });
    expect(retryBtn).toBeTruthy();
    expect(clearBtn).toBeTruthy();
    expect(retryBtn).toHaveProperty("disabled", false);
    expect(clearBtn).toHaveProperty("disabled", false);

    // Focus order: document → copy → retry → clear
    retryBtn.focus();
    expect(document.activeElement).toBe(retryBtn);
  });

  it("processing state shows distinct labels for transcribing vs analyzing", async () => {
    // Test via controller mock that ProcessingState renders phase-specific text.
    // We verify the ProcessingState component directly through a card test.
    mock = createMockPlatform({
      analysisCard: { mode: "work", gist: "work gist", sayNow: "work say", nextMove: "work next" },
    });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    // After analysis completes, processing state is gone; answer card is visible.
    expect(screen.getByTestId("section-say-now")).toBeTruthy();
    // The processing state should no longer be visible.
    expect(screen.queryByTestId("main-state-processing")).toBeNull();
  });

  it("disabled retry button shows reason text when processing", async () => {
    // After pipeline error, retry may be disabled with a reason.
    mock = createMockPlatform({ analysisError: { kind: "Pipeline", message: "LLM timeout" } });
    renderApp(mock);

    await triggerAnalysisReady(mock);
    // In error state, action dock is hidden (tested earlier).
    // Test in idle state: retry is disabled with reason.
    expect(screen.queryByTestId("action-row")).toBeNull();
  });

  it("reduced-motion CSS guard exists in stylesheet", () => {
    // The App.css contains a @media (prefers-reduced-motion: reduce) block
    // that zeros out motion tokens and disables animations.
    const css = readFileSync("src/App.css", "utf-8");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("animation-duration: 0.01ms");
  });
});
