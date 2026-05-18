import { fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import type { AppPlatform, ListenerPayload, ShortcutEvent, Unlisten } from "./platform";

type MockPlatform = {
  platform: AppPlatform;
  invoke: ReturnType<typeof vi.fn>;
  emitShortcut: (event: ShortcutEvent) => Promise<void>;
};

type MockPlatformOptions = {
  analysisError?: unknown;
  analysisCard?: Record<string, unknown>;
};

function createMockPlatform(options: MockPlatformOptions = {}): MockPlatform {
  const listeners = new Map<string, ((event: ListenerPayload<unknown>) => void)[]>();
  const shortcuts: ((event: ShortcutEvent) => void | Promise<void>)[] = [];

  const invoke = vi.fn(async (command: string) => {
    if (command === "load_bootstrap") {
      return {
        settings: {
          schemaVersion: 5,
          hotkey: "Ctrl+Alt+Space",
          llmBaseUrl: "https://api.example/v1",
          llmModel: "gpt-4o-mini",
          selectedModelPreset: "custom_openai_compatible",
          captureMaxSeconds: 45,
          activeAnswerProfile: "interview_default",
          windowOpacity: 100,
          interviewCompactMode: false,
        },
        deepgramKeyPresent: true,
        llmKeyPresent: true,
        contextActive: false,
        contextEntryCount: 0,
        runtimeReady: true,
      };
    }
    if (command === "get_context_status") {
      return { contextActive: true, entryCount: 1, canRetryLastTranscript: true };
    }
    if (command === "capture_stop_and_analyze" || command === "retry_last_analysis") {
      if (options.analysisError) throw options.analysisError;
      return options.analysisCard ?? { gist: "g", sayNow: "say", nextMove: "next" };
    }
    if (command === "clear_context") {
      return { contextActive: false, entryCount: 0, canRetryLastTranscript: false };
    }
    if (command === "prepare_candidate_pack") {
      return {
        packQualityScore: 84,
        missingDataWarnings: ["add metrics"],
        suggestedMissingInfo: ["add leadership example"],
        candidateFacts: [{ fact: "Fact", evidence: "Resume line", strength: "strong", metrics: [] }],
        roleKeywords: ["rust", "ownership"],
        companyValues: ["customer obsession"],
      };
    }
    if (command === "load_candidate_pack") {
      return null;
    }
    if (command === "get_candidate_pack_status") {
      return { exists: false, factCount: 0, weakFactCount: 0 };
    }
    if (command === "save_candidate_pack") {
      return null;
    }
    if (command === "save_prepared_candidate_pack") {
      return null;
    }
    if (command === "start_interview_session") {
      return {
        active: true,
        sessionId: "is-1",
        startedAt: "2026-05-18T10:00:00Z",
        language: "en",
        questions: [],
      };
    }
    if (command === "end_interview_session" || command === "get_interview_report") {
      return {
        sessionId: "is-1",
        startedAt: "2026-05-18T10:00:00Z",
        endedAt: "2026-05-18T10:30:00Z",
        language: "en",
        questions: [
          {
            timestamp: "2026-05-18T10:01:00Z",
            rawTranscript: "Tell me about ownership",
            cleanQuestion: "Tell me about ownership",
            questionType: "behavioral",
            answerMain: "I owned delivery.",
            hints: ["safe reframe"],
            signals: ["ownership"],
          },
        ],
        fullTranscript: "Tell me about ownership",
        scores: { clarity: 80, relevance: 77, accuracy: 70 },
        feedback: { strengths: ["structured"], improvements: [], missingExamples: [] },
      };
    }
    if (command === "export_interview_report_markdown") {
      return "C:\\reports\\interview-report-is-1.md";
    }
    if (command === "clear_interview_reports") {
      return null;
    }
    return null;
  });

  const platform: AppPlatform = {
    invoke,
    listen: vi.fn(async (event, handler) => {
      const arr = listeners.get(event) ?? [];
      arr.push(handler as (event: ListenerPayload<unknown>) => void);
      listeners.set(event, arr);
      return (() => undefined) as Unlisten;
    }),
    shortcuts: {
      unregisterAll: vi.fn(async () => undefined),
      isRegistered: vi.fn(async () => false),
      register: vi.fn(async (_hotkey, handler) => {
        shortcuts.push(handler);
      }),
    },
    clipboard: {
      writeText: vi.fn(async () => undefined),
    },
    window: {
      show: vi.fn(async () => undefined),
      setFocus: vi.fn(async () => undefined),
      hide: vi.fn(async () => undefined),
      startDragging: vi.fn(async () => undefined),
      setOpacity: vi.fn(async () => undefined),
      onCloseRequested: vi.fn(async () => (() => undefined) as Unlisten),
    },
  };

  return {
    platform,
    invoke,
    emitShortcut: async (event: ShortcutEvent) => {
      for (const handler of shortcuts) {
        await handler(event);
      }
    },
  };
}

describe("App UX stabilization", () => {
  let mock: MockPlatform;

  beforeEach(() => {
    mock = createMockPlatform();
  });

  it("shows card shell and action row in idle", async () => {
    render(() => <App platform={mock.platform} />);

    const shell = await screen.findByTestId("main-card-shell");
    const surface = screen.getByTestId("main-surface");
    const top = screen.getByTestId("main-card-top");
    const body = screen.getByTestId("main-card-body");
    const actions = screen.getByTestId("action-row");

    expect(shell).toBeTruthy();
    expect([...surface.children]).toEqual([top, body, actions]);
    expect(screen.getByText("Суть")).toBeTruthy();
    expect(screen.getByText("Скажи сейчас")).toBeTruthy();
    expect(screen.getByText("Дальше")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Статус цепочки" })).toBeTruthy();
  });

  it("keeps actions disabled in idle without card", async () => {
    render(() => <App platform={mock.platform} />);

    const copy = await screen.findByRole("button", { name: "Скопировать ответ" });
    const retry = screen.getByRole("button", { name: "Пересобрать" });

    expect(copy).toHaveProperty("disabled", true);
    expect(retry).toHaveProperty("disabled", true);
    expect(copy.getAttribute("title")).toBe("Сначала получите карточку.");
  });

  it("keeps action buttons fixed-height and out of the scroll body", async () => {
    render(() => <App platform={mock.platform} />);

    const copy = await screen.findByRole("button", { name: "Скопировать ответ" });
    const actions = screen.getByTestId("action-row");
    const body = screen.getByTestId("main-card-body");

    expect(actions.parentElement).toBe(screen.getByTestId("main-surface"));
    expect(body.contains(actions)).toBe(false);
    expect(getComputedStyle(actions).alignItems).toBe("center");
    expect(getComputedStyle(copy).height).toBe("38px");
    expect(getComputedStyle(copy).maxHeight).toBe("38px");
  });

  it("enables actions and handles keyboard shortcuts when card is ready", async () => {
    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    const copy = await screen.findByRole("button", { name: "Скопировать ответ" });
    const retry = screen.getByRole("button", { name: "Пересобрать" });
    const actions = screen.getByTestId("action-row");
    await waitFor(() => {
      expect(copy).toHaveProperty("disabled", false);
      expect(retry).toHaveProperty("disabled", false);
    });
    expect(actions.parentElement).toBe(screen.getByTestId("main-surface"));
    expect(screen.getByText("Ответ готов к копированию.")).toBeTruthy();

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    await waitFor(() => expect(mock.platform.clipboard.writeText).toHaveBeenCalledWith("say"));

    fireEvent.keyDown(window, { key: "r" });
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "retry_last_analysis")).toBe(true),
    );

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Ответ скопирован.")).toBeNull());
  });

  it("keeps the same action zone after a pipeline error", async () => {
    mock = createMockPlatform({ analysisError: { kind: "Pipeline", message: "LLM timeout" } });
    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect(
      await screen.findByText("Нет ответа LLM-шлюза: проверьте URL, модель и ключ."),
    ).toBeTruthy();
    expect(screen.getByText("Повторите захват или проверьте настройки.")).toBeTruthy();
    expect(screen.getByTestId("action-row").parentElement).toBe(screen.getByTestId("main-surface"));
    expect(screen.getByRole("button", { name: "Скопировать ответ" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("renders localized settings CTA labels", async () => {
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    await waitFor(() => expect(screen.getByText("Настройки")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Назад" })).toBeTruthy();
    expect(screen.getByText("Профиль ответа")).toBeTruthy();
    expect(screen.getByText("Профиль модели")).toBeTruthy();
    expect(screen.getByTestId("answer-profile-field")).toBeTruthy();
    expect(screen.queryByText(/raw prompt/i)).toBeNull();
  });

  it("allows selecting OpenRouter Free / Dev profile", async () => {
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    const preset = await screen.findByDisplayValue("Custom OpenAI-compatible");
    fireEvent.input(preset, { target: { value: "openrouter_free_dev" } });
    expect(await screen.findByDisplayValue("OpenRouter Free / Dev")).toBeTruthy();
    expect(screen.getByText(/Fallback chain:/)).toBeTruthy();
  });

  it("opacity setting persists and applies to window", async () => {
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    const opacity = await screen.findByDisplayValue("100%");
    fireEvent.input(opacity, { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => {
      expect(mock.invoke.mock.calls.some((c) => c[0] === "save_settings")).toBe(true);
    });
    const saveCall = mock.invoke.mock.calls.find((c) => c[0] === "save_settings");
    const input = (saveCall?.[1] as { input?: Record<string, unknown> } | undefined)?.input ?? {};
    expect(input.windowOpacity).toBe(80);
    await waitFor(() => expect(mock.platform.window.setOpacity).toHaveBeenCalledWith(0.8));
  });

  it("compact mode hides pipeline", async () => {
    mock = createMockPlatform({
      analysisCard: {
        gist: "g",
        sayNow: "say",
        nextMove: "next",
        charsBand: "normal",
        interviewCardSchemaV1: {
          mode: "interview",
          answer: {
            main: "Primary answer main",
            short: "Short summary",
            strong: "Strong STAR answer",
            structure: "STAR",
          },
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
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.click(await screen.findByTitle("Настройки"));
    const compactToggle = await screen.findByLabelText("Compact interview mode");
    fireEvent.click(compactToggle);
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    fireEvent.click(await screen.findByRole("button", { name: "Назад" }));
    await waitFor(() => expect(screen.getByTestId("main-surface")).toBeTruthy());
    expect(screen.queryByTestId("pipeline-timeline")).toBeNull();
  });

  it("compact mode still shows critical error state", async () => {
    mock = createMockPlatform({
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
      analysisError: { kind: "Pipeline", message: "LLM timeout" },
    });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.click(await screen.findByTitle("Настройки"));
    const compactToggle = await screen.findByLabelText("Compact interview mode");
    fireEvent.click(compactToggle);
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    fireEvent.click(await screen.findByRole("button", { name: "Назад" }));
    fireEvent.keyDown(window, { key: "r" });

    expect(await screen.findByText("Нет ответа LLM-шлюза: проверьте URL, модель и ключ.")).toBeTruthy();
  });

  it("manages interview report actions", async () => {
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByRole("button", { name: "Start session" }));
    fireEvent.click(screen.getByRole("button", { name: "End session" }));
    await waitFor(() => expect(screen.getByTestId("interview-report-summary")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Export markdown" }));
    await waitFor(() => expect(screen.getByText(/interview-report-is-1\.md/)).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Clear reports" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "clear_interview_reports")).toBe(true),
    );
  });
});

describe("Interview card rendering", () => {
  function interviewCard(overrides: Record<string, unknown> = {}) {
    return {
      gist: "legacy gist",
      sayNow: "legacy say",
      nextMove: "legacy next",
      charsBand: "normal",
      interviewCardSchemaV1: {
        mode: "interview",
        answer: {
          main: "Primary answer main",
          short: "Short 1",
          strong: "Strong 1",
          structure: "STAR",
        },
        question: {
          rawTranscript: "um can you tell me",
          cleanQuestion: "Tell me about a delivery incident.",
          interviewerIntent: "Validate ownership",
          questionType: "behavioral",
          confidence: "high",
        },
        signals: {
          mustMention: ["ownership"],
          keywords: ["impact"],
          metrics: [],
          resumeAnchors: ["project x"],
        },
        risks: {
          weakPoints: ["no numbers"],
          avoid: ["blame others"],
          safeReframe: "focus on learning",
        },
        followUps: [{ question: "What changed?", bridgeAnswer: "I introduced weekly review." }],
        clarifier: { needed: false, text: "Which timeframe?" },
      },
      ...overrides,
    };
  }

  it("interview answer renders first", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    const labels = (await screen.findByTestId("main-card-shell")).querySelectorAll(".result-label");
    expect(labels[0]?.textContent).toBe("Ответ");
  });

  it("copy copies answer.main", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.click(await screen.findByRole("button", { name: "Скопировать ответ" }));
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenCalledWith("Primary answer main"),
    );
  });

  it("question card renders cleanQuestion", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(window, { key: "2" });
    expect(await screen.findByText(/Tell me about a delivery incident\./)).toBeTruthy();
  });

  it("signals hide empty metrics", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(window, { key: "3" });
    expect(screen.queryByText("Метрики:")).toBeNull();
  });

  it("renders interview card fixture without crash when list fields are malformed", async () => {
    const mock = createMockPlatform({
      analysisCard: interviewCard({
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
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(window, { key: "3" });
    expect(await screen.findByTestId("section-interview-signals")).toBeTruthy();
    fireEvent.keyDown(window, { key: "4" });
    expect(await screen.findByTestId("section-interview-risks")).toBeTruthy();
  });

  it("clarifier hidden when not needed", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect(screen.queryByTestId("section-interview-clarifier")).toBeNull();
  });

  it("clarifier needed=true renders text", async () => {
    const mock = createMockPlatform({
      analysisCard: interviewCard({
        interviewCardSchemaV1: {
          ...interviewCard().interviewCardSchemaV1,
          clarifier: { needed: true, text: "Which timeframe?" },
        },
      }),
    });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(window, { key: "6" });
    expect(await screen.findByTestId("section-interview-clarifier")).toBeTruthy();
    expect(screen.getByText("Which timeframe?")).toBeTruthy();
  });

  it("carousel switches cards and answer is default", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(await screen.findByTestId("section-interview-question")).toBeTruthy();
    fireEvent.keyDown(window, { key: "1" });
    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
  });

  it("pin keeps the selected card visible after refresh", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(window, { key: "3" });
    fireEvent.click(await screen.findByRole("button", { name: "Закрепить" }));
    fireEvent.keyDown(window, { key: "r" });
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "retry_last_analysis")).toBe(true),
    );
    expect(await screen.findByTestId("section-interview-signals")).toBeTruthy();
  });

  it("copy current card works for carousel card", async () => {
    const mock = createMockPlatform({ analysisCard: interviewCard() });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenCalledWith("Tell me about a delivery incident."),
    );
  });

  it("active tab copy works for risks/followUps/clarifier", async () => {
    const mock = createMockPlatform({
      analysisCard: interviewCard({
        interviewCardSchemaV1: {
          ...interviewCard().interviewCardSchemaV1,
          clarifier: { needed: true, text: "Need scope?" },
        },
      }),
    });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(window, { key: "4" });
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenLastCalledWith("focus on learning"),
    );

    fireEvent.keyDown(window, { key: "5" });
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenLastCalledWith(
        "What changed? (I introduced weekly review.)",
      ),
    );

    fireEvent.keyDown(window, { key: "6" });
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(mock.platform.clipboard.writeText).toHaveBeenLastCalledWith("Need scope?"),
    );
  });

  it("pin resets if pinned key absent in next card", async () => {
    const withClarifier = interviewCard({
      interviewCardSchemaV1: {
        ...interviewCard().interviewCardSchemaV1,
        clarifier: { needed: true, text: "Need scope?" },
      },
    });
    const withoutClarifier = interviewCard({
      interviewCardSchemaV1: {
        ...interviewCard().interviewCardSchemaV1,
        clarifier: { needed: false, text: null },
      },
    });
    const mock = createMockPlatform({ analysisCard: withClarifier });
    const baseInvoke = mock.invoke;
    const patched = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "retry_last_analysis") return withoutClarifier;
      return baseInvoke(command, args);
    });
    mock.platform.invoke = patched;
    mock.invoke = patched;
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    fireEvent.keyDown(window, { key: "6" });
    fireEvent.click(await screen.findByRole("button", { name: "Закрепить" }));
    fireEvent.keyDown(window, { key: "r" });
    expect(await screen.findByTestId("section-interview-answer")).toBeTruthy();
  });

  it("work mode still renders legacy sections", async () => {
    const mock = createMockPlatform({
      analysisCard: { gist: "g", sayNow: "say", nextMove: "next", charsBand: "normal" },
    });
    render(() => <App platform={mock.platform} />);
    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect(await screen.findByTestId("section-gist")).toBeTruthy();
    expect(screen.getByTestId("section-say-now")).toBeTruthy();
    expect(screen.getByTestId("section-next-move")).toBeTruthy();
  });

  it("prepares candidate pack on explicit action and saves only after explicit confirmation", async () => {
    const mock = createMockPlatform();
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    await waitFor(() => expect(screen.getByText("AI Candidate Pack")).toBeTruthy());

    const section = screen.getByTestId("candidate-pack-ai-section");
    const textareas = within(section).getAllByRole("textbox");
    fireEvent.input(textareas[0], { target: { value: "resume raw text" } });
    fireEvent.input(textareas[1], { target: { value: "jd raw text" } });

    const prepareBtn = screen.getByRole("button", { name: "Подготовить профиль" });
    fireEvent.click(prepareBtn);
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "prepare_candidate_pack")).toBe(true),
    );
    expect(screen.getByText("Score:")).toBeTruthy();
    expect(mock.invoke.mock.calls.some((c) => c[0] === "save_prepared_candidate_pack")).toBe(
      false,
    );

    fireEvent.click(screen.getByRole("button", { name: "Сохранить Candidate Pack" }));
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "save_prepared_candidate_pack")).toBe(
        true,
      ),
    );
  });
});

describe("Setup wizard (first-run guidance)", () => {
  /**
   * Create a mock platform with a custom bootstrap response.
   * Patches platform.invoke so the controller sees the override.
   */
  function createSetupMockPlatform(
    overrides: {
      deepgramKeyPresent?: boolean;
      llmKeyPresent?: boolean;
      llmBaseUrl?: string;
      llmModel?: string;
      runtimeReady?: boolean;
    } = {},
  ): MockPlatform {
    const base = createMockPlatform({
      analysisCard: { gist: "g", sayNow: "say", nextMove: "next" },
    });

    const origInvoke = base.platform.invoke;
    const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "load_bootstrap") {
        return {
          settings: {
            schemaVersion: 5,
            hotkey: "Ctrl+Alt+Space",
            llmBaseUrl: overrides.llmBaseUrl ?? "",
            llmModel: overrides.llmModel ?? "gpt-4o-mini",
            selectedModelPreset: "custom_openai_compatible",
            captureMaxSeconds: 45,
            activeAnswerProfile: "interview_default",
            windowOpacity: 100,
            interviewCompactMode: false,
          },
          deepgramKeyPresent: overrides.deepgramKeyPresent ?? false,
          llmKeyPresent: overrides.llmKeyPresent ?? false,
          contextActive: false,
          contextEntryCount: 0,
          runtimeReady: overrides.runtimeReady ?? false,
          logStatus: { logPath: "", lastLine: null },
          canRetryLastTranscript: false,
        };
      }
      if (command === "save_settings") {
        const input = (args as Record<string, unknown> | undefined)?.input as
          | Record<string, unknown>
          | undefined;
        return { ...input, schemaVersion: 5 };
      }
      if (command === "save_secret") {
        return null;
      }
      if (command === "get_context_status") {
        return { contextActive: true, entryCount: 1, canRetryLastTranscript: true };
      }
      return origInvoke(command, args);
    });
    // Patch both references so the controller sees the override
    base.platform.invoke = patchedInvoke;
    base.invoke = patchedInvoke;
    return base;
  }

  it("shows settings on first launch when not ready", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      expect(screen.getByText("Настройки")).toBeTruthy();
    });

    // Setup progress section is visible (text appears in both progress and legend)
    expect(screen.getAllByText("1. Речь").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2. Ответ").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("3. Горячая клавиша").length).toBeGreaterThanOrEqual(1);
  });

  it("explains missing Deepgram key", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      expect(screen.getByText("Добавьте ключ Deepgram API.")).toBeTruthy();
    });

    // Overall hint indicates not ready
    expect(screen.getByTestId("setup-overall-hint").textContent).toContain(
      "Заполните недостающие поля",
    );
  });

  it("explains missing LLM route", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmBaseUrl: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      expect(screen.getByText("Укажите URL и модель LLM-шлюза.")).toBeTruthy();
    });
  });

  it("shows saved badge when Deepgram key is present", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmBaseUrl: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      const badges = screen.getAllByText("сохранено");
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    // Speech step shows ready status
    expect(screen.getByText("Ключ Deepgram сохранён.")).toBeTruthy();
  });

  it("shows ready hint when all setup steps are complete", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmBaseUrl: "https://api.example.com/v1",
      llmModel: "gpt-4o-mini",
      runtimeReady: true,
    });

    render(() => <App platform={mock.platform} />);

    // With runtimeReady=true, we should be on main panel, not settings
    await waitFor(() => {
      expect(screen.getByTestId("main-surface")).toBeTruthy();
    });

    // Navigate to settings to check the wizard
    const gearBtn = screen.getByTitle("Настройки");
    fireEvent.click(gearBtn);

    await waitFor(() => {
      expect(screen.getAllByText("1. Речь").length).toBeGreaterThanOrEqual(1);
    });

    // All steps show done hints
    expect(screen.getByText("Ключ Deepgram сохранён.")).toBeTruthy();
    expect(screen.getByText("Маршрут LLM настроен.")).toBeTruthy();
    expect(screen.getByText("Горячая клавиша задана.")).toBeTruthy();

    // Overall hint shows ready
    expect(screen.getByTestId("setup-overall-hint").textContent).toContain(
      "Приложение готово к работе",
    );
  });

  it("renders three fieldset sections in settings", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      expect(screen.getByTestId("setup-section-speech")).toBeTruthy();
      expect(screen.getByTestId("setup-section-reply")).toBeTruthy();
      expect(screen.getByTestId("setup-section-hotkey")).toBeTruthy();
    });
  });

  it("returns to main after successful save when all fields are ready", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });

    render(() => <App platform={mock.platform} />);

    await waitFor(() => {
      expect(screen.getByText("Настройки")).toBeTruthy();
    });

    // Fill in the missing fields
    const deepgramInput = screen.getByPlaceholderText("Добавьте ключ Deepgram API.");
    fireEvent.input(deepgramInput, { target: { value: "dg-key-123" } });

    const urlInput = screen.getByPlaceholderText("https://api.example.com/v1");
    fireEvent.input(urlInput, { target: { value: "https://api.example.com/v1" } });

    // Save
    const saveBtn = screen.getByRole("button", { name: "Сохранить" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      // Should transition to main surface
      expect(screen.getByTestId("main-surface")).toBeTruthy();
    });
    const saveCall = mock.invoke.mock.calls.find((call) => call[0] === "save_settings");
    expect(saveCall).toBeTruthy();
    const input = (saveCall?.[1] as { input?: Record<string, unknown> } | undefined)?.input ?? {};
    expect(Object.prototype.hasOwnProperty.call(input, "llmApiKey")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(input, "deepgramApiKey")).toBe(false);
  });
});
