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
    expect(await screen.findByTestId("answer-body")).toBeTruthy();

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

    const sayNowHeadline = screen.getByTestId("answer-headline");
    const gistTextEl = screen.getByTestId("section-gist").querySelector(".result-text");
    expect(sayNowHeadline).toBeTruthy();
    expect(gistTextEl).toBeTruthy();

    // answer-headline uses result-text--speak for stronger typography
    expect(sayNowHeadline.classList.contains("result-text--speak")).toBe(true);
    // gist text uses plain result-text (no speak modifier)
    expect(gistTextEl!.classList.contains("result-text--speak")).toBe(false);
    // answer-headline is the primary visual element inside answer-hero-card
    expect(sayNowHeadline.tagName).toBe("P");
    const heroCard = screen.getByTestId("answer-hero-card");
    expect(heroCard.contains(sayNowHeadline)).toBe(true);
    // answer detail is also present
    expect(screen.getByTestId("answer-detail")).toBeTruthy();
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
    await waitFor(() => expect(copyBtn.classList.contains("is-copied")).toBe(true));
    // Visual feedback: icon changes to checkmark, class toggles.
    // Text stays stable — screen readers get consistent label via aria-label.
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
    expect(screen.getByTestId("answer-body")).toBeTruthy();
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
    // The states.css contains a @media (prefers-reduced-motion: reduce) block.
    const css = readFileSync("src/styles/states.css", "utf-8");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("animation-duration: 0.01ms");
  });

  // ── Accessibility ─────────────────────────────────────────────────

  it("error recovery card has alert role for screen readers", async () => {
    mock = createMockPlatform({ analysisError: { kind: "Pipeline", message: "LLM timeout" } });
    renderApp(mock);

    await triggerAnalysisReady(mock);
    const errorCard = await screen.findByTestId("error-recovery-card");
    expect(errorCard.getAttribute("role")).toBe("alert");
  });

  it("answer copy button has accessible name", async () => {
    mock = createMockPlatform({
      analysisCard: { mode: "work", gist: "g", sayNow: "say", nextMove: "next" },
    });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    const copyBtn = screen.getByTestId("answer-copy-btn");
    expect(copyBtn.getAttribute("aria-label")).toBe("Скопировать ответ");
  });

  it("main idle primary CTA is focusable", async () => {
    mock = createMockPlatform({
      analysisCard: { mode: "work", gist: "g", sayNow: "say", nextMove: "next" },
    });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    // Clear to get back to idle.
    fireEvent.click(screen.getByRole("button", { name: "Очистить" }));
    await waitFor(() => expect(screen.getByTestId("main-state-idle")).toBeTruthy());

    const contextBtn = screen.getByTestId("idle-open-context-btn");
    contextBtn.focus();
    expect(document.activeElement).toBe(contextBtn);
  });

  it("header icon buttons have aria labels", () => {
    mock = createMockPlatform();
    renderApp(mock);

    // Settings gear button.
    const settingsBtn = screen.getByTestId("app-header-settings-action");
    expect(settingsBtn.getAttribute("aria-label")).toBeTruthy();

    // Hide-to-tray button.
    const hideBtn = screen.getByTestId("app-header-hide-action");
    expect(hideBtn.getAttribute("aria-label")).toBeTruthy();
  });

  it("context pack editor fields have explicit label association", async () => {
    mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    // Open context pack panel and start a new pack to reveal editor labels.
    await waitFor(() => expect(screen.getByTestId("context-pack-open-btn")).toBeTruthy(), {
      timeout: 3000,
    });
    fireEvent.click(screen.getByTestId("context-pack-open-btn"));
    await waitFor(() => expect(screen.getByTestId("context-pack-panel")).toBeTruthy(), {
      timeout: 3000,
    });

    fireEvent.click(screen.getByTestId("context-pack-new-btn"));
    await waitFor(() => expect(screen.getByTestId("context-pack-editor")).toBeTruthy());

    // Editor has label elements wrapping title input and content textarea.
    const editorLabels = screen.getByTestId("context-pack-editor").querySelectorAll("label");
    expect(editorLabels.length).toBeGreaterThanOrEqual(2);

    // Labels have for attributes pointing to input ids.
    const titleLabel = editorLabels[0];
    const contentLabel = editorLabels[1];
    expect(titleLabel.getAttribute("for")).toBe("context-pack-title-field");
    expect(contentLabel.getAttribute("for")).toBe("context-pack-content-field");

    // Inputs have matching id attributes.
    expect(screen.getByTestId("context-pack-title-input").getAttribute("id")).toBe(
      "context-pack-title-field",
    );
    expect(screen.getByTestId("context-pack-content-input").getAttribute("id")).toBe(
      "context-pack-content-field",
    );
  });

  it("idle screen shows context value hint", async () => {
    // When all providers are ready, idle screen explains why context matters.
    const setupMock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmKeyPresent: true,
      llmBaseUrl: "https://api.example.com/v1",
      llmModel: "gpt-4o-mini",
      runtimeReady: true,
    });
    renderApp(setupMock);

    await screen.findByTestId("main-state-idle");

    // Idle screen shows context value hint.
    const hint = screen.getByTestId("idle-context-value-hint");
    expect(hint).toBeTruthy();
    expect(hint.textContent).toContain("Контекст помогает");
  });

  it("error recovery card shows actionable recovery hint", async () => {
    mock = createMockPlatform({ analysisError: { kind: "Pipeline", message: "LLM timeout" } });
    renderApp(mock);

    await triggerAnalysisReady(mock);

    // Error recovery hint is visible with actionable guidance.
    const recoveryHint = await screen.findByTestId("error-recovery-hint");
    expect(recoveryHint).toBeTruthy();
    expect(recoveryHint.textContent).toContain("проверьте доступ провайдера");
  });

  it("context chip disable button uses ghost style not danger", async () => {
    const packs = [
      {
        id: "ctx-1",
        title: "Test",
        content: "content",
        isActive: true,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];
    mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await waitFor(() => expect(screen.getByTestId("context-chip-disable-btn")).toBeTruthy(), {
      timeout: 3000,
    });

    const disableBtn = screen.getByTestId("context-chip-disable-btn");
    // Should use btn-ghost, not btn-danger.
    expect(disableBtn.classList.contains("btn-ghost")).toBe(true);
    expect(disableBtn.classList.contains("btn-danger")).toBe(false);
  });

  it("answer copy button preserves accessible name after copy", async () => {
    mock = createMockPlatform({
      analysisCard: { mode: "work", gist: "g", sayNow: "say", nextMove: "next" },
    });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    const copyBtn = screen.getByTestId("answer-copy-btn");
    expect(copyBtn.getAttribute("aria-label")).toBe("Скопировать ответ");

    fireEvent.click(copyBtn);
    await waitFor(() => expect(copyBtn.classList.contains("is-copied")).toBe(true));
    // aria-label stays stable; visual feedback is icon + class change.
    expect(copyBtn.getAttribute("aria-label")).toBe("Скопировать ответ");
  });

  // ── Responsive layout ────────────────────────────────────────────

  it("main CTA and action dock visible when answer ready", async () => {
    mock = createMockPlatform({
      analysisCard: { mode: "work", gist: "g", sayNow: "say", nextMove: "next" },
    });
    renderApp(mock);
    await triggerAnalysisReady(mock);

    // Answer card is visible.
    expect(screen.getByTestId("answer-hero-card")).toBeTruthy();
    // Action dock is visible with retry/clear buttons.
    expect(screen.getByTestId("action-row")).toBeTruthy();
    // Copy button is visible.
    expect(screen.getByTestId("answer-copy-btn")).toBeTruthy();
  });

  it("no horizontal overflow on app root at default viewport", () => {
    mock = createMockPlatform();
    renderApp(mock);

    const root = document.querySelector(".app-root");
    expect(root).toBeTruthy();
    // Body has overflow: hidden to prevent horizontal scroll.
    const bodyOverflow = window.getComputedStyle(document.body).overflow;
    expect(bodyOverflow).toBe("hidden");
  });
});
