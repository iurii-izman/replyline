import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { BilingualInterviewSurface } from "./BilingualInterviewSurface";
import { ui_ru } from "./locale";

function createController(overrides: Record<string, unknown> = {}) {
  return {
    strings: () => ui_ru,
    copyCurrentCard: vi.fn(),
    bilingualInterviewState: () => ({
      active: true,
      status: "active",
      transcriptLane: "active",
      translationLane: "active",
      degraded: false,
      sessionId: "b1",
      startedAt: "2026-05-30T10:00:00Z",
      latestPartial: { segmentId: "p-1", timestamp: "2026-05-30T10:00:04Z", text: "partial", finalized: false },
      finalizedSegments: [],
      transcriptSegments: [
        { segmentId: "s-1", timestamp: "2026-05-30T10:00:01Z", text: "final one", finalized: true },
      ],
      translationSegments: [
        {
          segmentId: "t-1",
          sourceSegmentIds: ["s-1", "s-2"],
          primarySourceSegmentId: "s-1",
          timestamp: "2026-05-30T10:00:02Z",
          sourceText: "hello world",
          translatedText: "привет мир",
          sourceLanguage: "en",
          targetLanguage: "ru",
          isFinal: true,
          latencyMs: 120,
          isFallback: false,
          strategy: "debounced_batch",
          batchSize: 2,
        },
      ],
      displaySegments: [
        {
          segmentId: "s-1",
          timestamp: "2026-05-30T10:00:01Z",
          transcriptText: "final one",
          translatedText: "перевод 1",
          sourceSegmentIds: ["s-1"],
        },
        {
          segmentId: "s-2",
          timestamp: "2026-05-30T10:00:02Z",
          transcriptText: "final two",
          translatedText: "перевод 2",
          sourceSegmentIds: ["s-1", "s-2"],
        },
      ],
      translationsBySourceSegmentId: {},
      latency: { latencyMs: 90, sampleRate: 16000, durationMs: 210 },
      lastAnswerCard: {
        mode: "interview",
        answer: { main: "Use STAR and quantify impact.", short: "Use STAR.", strong: "Quantify impact.", structure: "STAR" },
        question: {
          rawTranscript: "Расскажите о конфликте.",
          cleanQuestion: "Tell me about a conflict you resolved.",
          interviewerIntent: "Assess conflict handling",
          questionType: "behavioral",
          confidence: "high",
        },
        signals: { mustMention: [], keywords: [], metrics: [], resumeAnchors: [] },
        risks: { weakPoints: [], avoid: [], safeReframe: "" },
        followUps: [],
        clarifier: { needed: false, text: null },
      },
      answerInFlight: false,
      lastError: null,
    }),
    ...overrides,
  };
}

describe("BilingualInterviewSurface", () => {
  it("renders active status", () => {
    render(() => <BilingualInterviewSurface controller={createController() as never} />);
    expect(screen.getByTestId("bilingual-status-text").textContent).toContain(
      "Слушаю интервьюера на английском",
    );
  });

  it("renders reconnecting vs degraded differently", () => {
    const { unmount } = render(
      () =>
        (
          <BilingualInterviewSurface
            controller={createController({ bilingualInterviewState: () => ({ ...createController().bilingualInterviewState(), status: "reconnecting" }) }) as never}
          />
        ) as never,
    );
    expect(screen.getByTestId("bilingual-status-text").textContent).toContain("Потеря соединения");
    unmount();
    render(
      () =>
        (
          <BilingualInterviewSurface
            controller={createController({ bilingualInterviewState: () => ({ ...createController().bilingualInterviewState(), degraded: true }) }) as never}
          />
        ) as never,
    );
    expect(screen.getByTestId("bilingual-status-text").textContent).toContain("Streaming недоступен");
  });

  it("renders partial EN dim class and final EN normal class", () => {
    render(() => <BilingualInterviewSurface controller={createController() as never} />);
    expect(screen.getByTestId("bilingual-partial-en").className).toContain("is-partial");
    expect(screen.getByTestId("bilingual-final-s-1").className).not.toContain("is-partial");
  });

  it("shows batched translation for all mapped segments", () => {
    render(() => <BilingualInterviewSurface controller={createController() as never} />);
    expect(screen.getByTestId("bilingual-ru-s-1").textContent).toContain("перевод 1");
    expect(screen.getByTestId("bilingual-ru-s-2").textContent).toContain("перевод 2");
  });

  it("renders answer lane with English answer", () => {
    render(() => <BilingualInterviewSurface controller={createController() as never} />);
    expect(screen.getByTestId("bilingual-answer-text").textContent).toContain(
      "Use STAR and quantify impact.",
    );
  });
});
