import { describe, expect, it, vi } from "vitest";
import {
  BILINGUAL_MAX_DISPLAY_SEGMENTS,
  createBilingualInterviewController,
} from "./controller/bilingualInterviewController";
import { initialBilingualInterviewState, type BilingualInterviewState } from "./model";

function createHarness() {
  let state: BilingualInterviewState = {
    ...initialBilingualInterviewState,
    sessionId: "session-1",
    translationsBySourceSegmentId: {},
    transcriptSegments: [],
    translationSegments: [],
    finalizedSegments: [],
    displaySegments: [],
  };

  const setState = vi.fn((next: BilingualInterviewState | ((prev: BilingualInterviewState) => BilingualInterviewState)) => {
    state = typeof next === "function" ? next(state) : next;
  });

  const controller = createBilingualInterviewController({
    platform: { listen: vi.fn(), invoke: vi.fn() } as never,
    bilingualState: () => state,
    setBilingualState: setState as never,
    setCard: vi.fn(),
    setError: vi.fn() as never,
  });

  return { controller, getState: () => state };
}

describe("createBilingualInterviewController", () => {
  it("updates latestPartial for partial transcript", () => {
    const h = createHarness();
    h.controller.handleTranscriptSegment({
      segmentId: "seg-1",
      timestamp: "2026-01-01T00:00:00Z",
      text: "partial",
      finalized: false,
    });

    expect(h.getState().latestPartial?.text).toBe("partial");
    expect(h.getState().finalizedSegments).toEqual([]);
  });

  it("moves final transcript into finalizedSegments and clears latestPartial", () => {
    const h = createHarness();
    h.controller.handleTranscriptSegment({
      segmentId: "seg-1",
      timestamp: "2026-01-01T00:00:00Z",
      text: "partial",
      finalized: false,
    });
    h.controller.handleTranscriptSegment({
      segmentId: "seg-1",
      timestamp: "2026-01-01T00:00:01Z",
      text: "final",
      finalized: true,
    });

    expect(h.getState().latestPartial).toBeNull();
    expect(h.getState().finalizedSegments.at(-1)?.text).toBe("final");
  });

  it("trims display segments to memory cap", () => {
    const h = createHarness();
    for (let i = 0; i < BILINGUAL_MAX_DISPLAY_SEGMENTS + 5; i += 1) {
      h.controller.handleTranscriptSegment({
        segmentId: `seg-${i}`,
        timestamp: `2026-01-01T00:00:${String(i).padStart(2, "0")}Z`,
        text: `final-${i}`,
        finalized: true,
      });
    }

    expect(h.getState().displaySegments).toHaveLength(BILINGUAL_MAX_DISPLAY_SEGMENTS);
    expect(h.getState().displaySegments[0]?.segmentId).toBe("seg-5");
  });

  it("prunes translation map entries when old finalized segments are trimmed", () => {
    const h = createHarness();
    for (let i = 0; i < BILINGUAL_MAX_DISPLAY_SEGMENTS + 1; i += 1) {
      h.controller.handleTranscriptSegment({
        segmentId: `seg-${i}`,
        timestamp: `2026-01-01T00:00:${String(i).padStart(2, "0")}Z`,
        text: `final-${i}`,
        finalized: true,
      });
      h.controller.handleTranslationSegment({
        segmentId: `tr-${i}`,
        sourceSegmentIds: [`seg-${i}`],
        primarySourceSegmentId: `seg-${i}`,
        timestamp: "2026-01-01T00:00:10Z",
        sourceText: "hello",
        translatedText: "привет",
        sourceLanguage: "en",
        targetLanguage: "ru",
        isFinal: true,
        latencyMs: 20,
        isFallback: false,
        strategy: "debounced_batch",
        batchSize: 1,
      });
    }
    expect(h.getState().translationsBySourceSegmentId["seg-0"]).toBeUndefined();
    expect(h.getState().translationsBySourceSegmentId["seg-1"]).toBeDefined();
  });

  it("maps batched translation to every source segment id", () => {
    const h = createHarness();
    h.controller.handleTranslationSegment({
      segmentId: "tr-1",
      sourceSegmentIds: ["seg-1", "seg-2", "seg-3"],
      primarySourceSegmentId: "seg-2",
      timestamp: "2026-01-01T00:00:10Z",
      sourceText: "hello world",
      translatedText: "привет мир",
      sourceLanguage: "en",
      targetLanguage: "ru",
      isFinal: true,
      latencyMs: 100,
      isFallback: false,
      strategy: "debounced_batch",
      batchSize: 3,
    });

    const map = h.getState().translationsBySourceSegmentId;
    expect(map["seg-1"]?.segmentId).toBe("tr-1");
    expect(map["seg-2"]?.segmentId).toBe("tr-1");
    expect(map["seg-3"]?.segmentId).toBe("tr-1");
  });

  it("maps translation by primarySourceSegmentId when source ids list is empty", () => {
    const h = createHarness();
    h.controller.handleTranslationSegment({
      segmentId: "tr-2",
      sourceSegmentIds: [],
      primarySourceSegmentId: "seg-primary",
      timestamp: "2026-01-01T00:00:11Z",
      sourceText: "hello",
      translatedText: "привет",
      sourceLanguage: "en",
      targetLanguage: "ru",
      isFinal: true,
      latencyMs: 90,
      isFallback: false,
      strategy: "debounced_batch",
      batchSize: 1,
    });
    expect(h.getState().translationsBySourceSegmentId["seg-primary"]?.segmentId).toBe("tr-2");
  });

  it("sets reconnecting lane on recoverable error", () => {
    const h = createHarness();
    h.controller.handleError({
      code: "TRANSCRIPT_TEMPORARY",
      message: "temporary",
      recoverable: true,
    });

    expect(h.getState().transcriptLane).toBe("reconnecting");
    expect(h.getState().status).toBe("reconnecting");
    expect(h.getState().degraded).toBe(false);
  });

  it("sets degraded/error lane on non-recoverable error", () => {
    const h = createHarness();
    h.controller.handleError({
      code: "TRANSCRIPT_FATAL",
      message: "fatal",
      recoverable: false,
    });

    expect(h.getState().transcriptLane).toBe("error");
    expect(h.getState().translationLane).toBe("degraded");
    expect(h.getState().degraded).toBe(true);
    expect(h.getState().active).toBe(false);
    expect(h.getState().status).toBe("degraded");
  });

  it("merges latency metrics from partial updates", () => {
    const h = createHarness();
    h.controller.handleLatencyMetrics({
      latencyMs: 100,
      sampleRate: 16000,
      durationMs: 120,
    });
    h.controller.handleLatencyMetrics({
      partialEnMs: 90,
      translationMs: 150,
      answerTtftMs: 300,
      answerTotalMs: 650,
    });
    expect(h.getState().latency).toMatchObject({
      latencyMs: 100,
      sampleRate: 16000,
      durationMs: 120,
      partialEnMs: 90,
      translationMs: 150,
      answerTtftMs: 300,
      answerTotalMs: 650,
    });
  });

  it("appends answer chunks in order", () => {
    const h = createHarness();
    h.controller.handleAnswerChunk({
      sessionId: "session-1",
      text: "A",
      isFinal: false,
      chunkIndex: 0,
    });
    h.controller.handleAnswerChunk({
      sessionId: "session-1",
      text: "B",
      isFinal: false,
      chunkIndex: 2,
    });
    h.controller.handleAnswerChunk({
      sessionId: "session-1",
      text: "C",
      isFinal: false,
      chunkIndex: 1,
    });

    expect(h.getState().streamedAnswerText).toBe("AB");
    expect(h.getState().answerStatus).toBe("streaming");
  });

  it("answer-ready still sets final card and completes status", () => {
    const h = createHarness();
    h.controller.handleAnswerReady({
      answerCard: {
        mode: "interview",
        answer: { main: "I built this", short: "Built this", strong: "Owned delivery", structure: "STAR" },
        question: {
          rawTranscript: "raw",
          cleanQuestion: "Tell me about ownership",
          interviewerIntent: "ownership",
          questionType: "behavioral",
          confidence: "high",
        },
        signals: { mustMention: ["impact"], keywords: ["ownership"] },
        risks: { weakPoints: [], avoid: [], safeReframe: "" },
        followUps: [],
        clarifier: { needed: false },
      },
    });

    expect(h.getState().answerInFlight).toBe(false);
    expect(h.getState().answerStatus).toBe("ready");
    expect(h.getState().lastAnswerCard?.answer.main).toBe("I built this");
  });
});
