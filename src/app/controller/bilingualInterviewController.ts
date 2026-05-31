import type { Accessor, Setter } from "solid-js";
import type {
  AnalysisCard,
  BilingualAnswerChunkDto,
  BilingualAnswerReadyDto,
  BilingualDisplaySegment,
  BilingualErrorDto,
  BilingualInterviewState,
  BilingualLatencyMetricsDto,
  LiveTranscriptSegmentDto,
  LiveTranslationSegmentDto,
} from "../model";
import {
  initialBilingualInterviewState,
  type InterviewCardDto,
} from "../model";
import type { AppPlatform, Unlisten } from "../platform";
import { captureBilingualAnswer, startBilingualSession, stopBilingualSession } from "../platform";

export const BILINGUAL_MAX_DISPLAY_SEGMENTS = 30;

function buildDisplaySegments(
  finalizedSegments: LiveTranscriptSegmentDto[],
  translationsBySourceSegmentId: Record<string, LiveTranslationSegmentDto>,
): BilingualDisplaySegment[] {
  const next = finalizedSegments.map((segment) => {
    const translation = translationsBySourceSegmentId[segment.segmentId] ?? null;
    return {
      segmentId: segment.segmentId,
      timestamp: segment.timestamp,
      transcriptText: segment.text,
      translatedText: translation?.translatedText ?? null,
      sourceSegmentIds: translation?.sourceSegmentIds ?? [segment.segmentId],
    };
  });
  return next.slice(-BILINGUAL_MAX_DISPLAY_SEGMENTS);
}

export interface BilingualInterviewControllerDeps {
  platform: AppPlatform;
  bilingualState: Accessor<BilingualInterviewState>;
  setBilingualState: Setter<BilingualInterviewState>;
  setCard: (card: AnalysisCard | null) => void;
  setError: Setter<string | null>;
}

export interface BilingualInterviewController {
  startSession: () => Promise<void>;
  stopSession: () => Promise<void>;
  triggerHotkeyAnswer: () => Promise<void>;
  wireListeners: () => Promise<void>;
  unwireListeners: () => void;
  handleTranscriptSegment: (segment: LiveTranscriptSegmentDto) => void;
  handleTranslationSegment: (segment: LiveTranslationSegmentDto) => void;
  handleLatencyMetrics: (metrics: BilingualLatencyMetricsDto) => void;
  handleAnswerReady: (payload: BilingualAnswerReadyDto | InterviewCardDto) => void;
  handleAnswerChunk: (payload: BilingualAnswerChunkDto) => void;
  handleError: (error: BilingualErrorDto) => void;
}

export function createBilingualInterviewController(
  deps: BilingualInterviewControllerDeps,
): BilingualInterviewController {
  const unlisteners: Unlisten[] = [];

  const patchState = (patch: Partial<BilingualInterviewState>) => {
    deps.setBilingualState((prev) => ({ ...prev, ...patch }));
  };

  const handleTranscriptSegment = (segment: LiveTranscriptSegmentDto) => {
    if (!segment.finalized) {
      patchState({ latestPartial: segment, transcriptLane: "active", lastError: null });
      return;
    }
    deps.setBilingualState((prev) => {
      const nextFinalized = [...prev.finalizedSegments, segment].slice(-BILINGUAL_MAX_DISPLAY_SEGMENTS);
      const nextTranscript = [...prev.transcriptSegments, segment].slice(-BILINGUAL_MAX_DISPLAY_SEGMENTS);
      const nextIds = new Set(nextFinalized.map((item) => item.segmentId));
      const nextTranslationsMap = Object.fromEntries(
        Object.entries(prev.translationsBySourceSegmentId).filter(([segmentId]) => nextIds.has(segmentId)),
      );
      const next = {
        ...prev,
        latestPartial: null,
        finalizedSegments: nextFinalized,
        transcriptSegments: nextTranscript,
        translationsBySourceSegmentId: nextTranslationsMap,
        translationSegments: prev.translationSegments.filter((item) =>
          item.sourceSegmentIds.some((id) => nextIds.has(id))
            || nextIds.has(item.primarySourceSegmentId),
        ),
        transcriptLane: "active" as const,
        lastError: null,
      };
      return {
        ...next,
        displaySegments: buildDisplaySegments(next.finalizedSegments, next.translationsBySourceSegmentId),
      };
    });
  };

  const handleTranslationSegment = (segment: LiveTranslationSegmentDto) => {
    deps.setBilingualState((prev) => {
      const map = { ...prev.translationsBySourceSegmentId };
      const sourceIds =
        segment.sourceSegmentIds.length > 0
          ? segment.sourceSegmentIds
          : [segment.primarySourceSegmentId];
      for (const sourceSegmentId of sourceIds) {
        map[sourceSegmentId] = segment;
      }
      const next = {
        ...prev,
        translationSegments: [...prev.translationSegments, segment].slice(-BILINGUAL_MAX_DISPLAY_SEGMENTS),
        translationsBySourceSegmentId: map,
        translationLane: "active" as const,
        lastError: null,
      };
      return {
        ...next,
        displaySegments: buildDisplaySegments(next.finalizedSegments, next.translationsBySourceSegmentId),
      };
    });
  };

  const handleLatencyMetrics = (metrics: BilingualLatencyMetricsDto) => {
    deps.setBilingualState((prev) => ({
      ...prev,
      latency: {
        latencyMs: metrics.latencyMs ?? prev.latency?.latencyMs ?? 0,
        sampleRate: metrics.sampleRate ?? prev.latency?.sampleRate ?? 0,
        durationMs: metrics.durationMs ?? prev.latency?.durationMs ?? 0,
        partialEnMs: metrics.partialEnMs ?? prev.latency?.partialEnMs,
        translationMs: metrics.translationMs ?? prev.latency?.translationMs,
        answerTtftMs: metrics.answerTtftMs ?? prev.latency?.answerTtftMs,
        answerTotalMs: metrics.answerTotalMs ?? prev.latency?.answerTotalMs,
      },
    }));
  };

  const handleAnswerReady = (payload: BilingualAnswerReadyDto | InterviewCardDto) => {
    const interviewCard = "answerCard" in payload ? payload.answerCard : payload;
    const answerCard = {
      mode: "interview",
      answer: interviewCard.answer,
      question: interviewCard.question,
      signals: interviewCard.signals,
      risks: interviewCard.risks,
      followUps: interviewCard.followUps,
      clarifier: interviewCard.clarifier,
    } as const;
    deps.setCard({
      mode: "interview",
      interview: answerCard,
      gist: interviewCard.question.cleanQuestion,
      sayNow: interviewCard.answer.main,
      nextMove: interviewCard.answer.short,
      charsBand: "normal",
    });
    patchState({
      lastAnswerCard: interviewCard,
      answerInFlight: false,
      answerStatus: "ready",
      streamedAnswerText: interviewCard.answer.main?.trim() ?? "",
      lastError: null,
    });
  };

  const handleAnswerChunk = (payload: BilingualAnswerChunkDto) => {
    deps.setBilingualState((prev) => {
      if (!prev.sessionId || payload.sessionId !== prev.sessionId) {
        return prev;
      }
      if (payload.isFinal) {
        return { ...prev, answerStatus: "streaming", lastChunkIndex: payload.chunkIndex };
      }
      if (payload.chunkIndex <= prev.lastChunkIndex) {
        return prev;
      }
      return {
        ...prev,
        answerStatus: "streaming",
        streamedAnswerText: `${prev.streamedAnswerText}${payload.text}`,
        lastChunkIndex: payload.chunkIndex,
      };
    });
  };

  const handleError = (error: BilingualErrorDto) => {
    const recoverable = error.recoverable !== false;
    deps.setError(error.message);
    patchState({
      lastError: error,
      degraded: !recoverable,
      transcriptLane: recoverable ? "reconnecting" : "error",
      translationLane: recoverable ? "reconnecting" : "degraded",
      status: recoverable ? "reconnecting" : "degraded",
      active: recoverable ? deps.bilingualState().active : false,
      answerInFlight: false,
      answerStatus: "idle",
    });
  };

  const startSession = async () => {
    patchState({ ...initialBilingualInterviewState, status: "starting", active: true });
    try {
      await startBilingualSession(deps.platform);
      patchState({
        active: true,
        status: "active",
        transcriptLane: "active",
        translationLane: "active",
        degraded: false,
      });
    } catch (err) {
      handleError({
        code: "BILINGUAL_START_FAILED",
        message: err instanceof Error ? err.message : String(err),
        recoverable: false,
      });
    }
  };

  const stopSession = async () => {
    patchState({ status: "stopping" });
    try {
      await stopBilingualSession(deps.platform);
      patchState({ active: false, status: "idle", answerInFlight: false, answerStatus: "idle" });
    } catch (err) {
      handleError({
        code: "BILINGUAL_STOP_FAILED",
        message: err instanceof Error ? err.message : String(err),
        recoverable: true,
      });
    }
  };

  const triggerHotkeyAnswer = async () => {
    patchState({
      answerInFlight: true,
      answerStatus: "idle",
      streamedAnswerText: "",
      lastChunkIndex: -1,
      lastAnswerCard: null,
      lastError: null,
    });
    try {
      const payload = await captureBilingualAnswer(deps.platform);
      if (payload && typeof payload === "object") {
        handleAnswerReady(payload as BilingualAnswerReadyDto | InterviewCardDto);
        return;
      }
      patchState({ answerInFlight: false });
    } catch (err) {
      handleError({
        code: "BILINGUAL_ANSWER_CAPTURE_FAILED",
        message: err instanceof Error ? err.message : String(err),
        recoverable: true,
      });
    }
  };

  const wireListeners = async () => {
    unlisteners.push(
      await deps.platform.listen<LiveTranscriptSegmentDto>("bilingual://transcript-segment", (event) => {
        handleTranscriptSegment(event.payload);
      }),
      await deps.platform.listen<LiveTranslationSegmentDto>("bilingual://translation-segment", (event) => {
        handleTranslationSegment(event.payload);
      }),
      await deps.platform.listen<BilingualLatencyMetricsDto>("bilingual://latency-metrics", (event) => {
        handleLatencyMetrics(event.payload);
      }),
      await deps.platform.listen<BilingualErrorDto>("bilingual://error", (event) => {
        handleError(event.payload);
      }),
      await deps.platform.listen<BilingualAnswerReadyDto>("bilingual://answer-ready", (event) => {
        handleAnswerReady(event.payload);
      }),
      await deps.platform.listen<BilingualAnswerChunkDto>("bilingual://answer-chunk", (event) => {
        handleAnswerChunk(event.payload);
      }),
      await deps.platform.listen<{ status?: string; sessionId?: string | null }>(
        "bilingual://session-status",
        (event) => {
          const nextSessionId = event.payload?.sessionId ?? undefined;
        if (event.payload?.status === "active") {
            patchState({ status: "active", active: true, sessionId: nextSessionId ?? deps.bilingualState().sessionId });
        }
        if (event.payload?.status === "starting") {
            patchState({ status: "starting", active: true });
        }
        if (event.payload?.status === "stopping") {
          patchState({ status: "stopping" });
        }
        if (event.payload?.status === "reconnecting") {
          patchState({ status: "reconnecting" });
        }
        if (event.payload?.status === "degraded") {
          patchState({ status: "degraded", degraded: true });
        }
        if (event.payload?.status === "stopped") {
            patchState({
              active: false,
              status: "idle",
              answerInFlight: false,
              answerStatus: "idle",
              sessionId: null,
            });
        }
        },
      ),
    );
  };

  const unwireListeners = () => {
    while (unlisteners.length) {
      const unlisten = unlisteners.pop();
      if (unlisten) unlisten();
    }
  };

  return {
    startSession,
    stopSession,
    triggerHotkeyAnswer,
    wireListeners,
    unwireListeners,
    handleTranscriptSegment,
    handleTranslationSegment,
    handleLatencyMetrics,
    handleAnswerReady,
    handleAnswerChunk,
    handleError,
  };
}
