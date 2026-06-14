import type { InterviewCardDto } from "./cards";

export type BilingualMetaDto = {
  sessionId: string;
  sourceSegmentIds: string[];
  questionRu?: string | null;
  listeningStatus: string;
};

export type SpeakerSource = "system_audio" | "microphone";
export type TranslationStrategy = "debounced_batch" | "llm_micro";
export type ExportType = "full" | "redacted";

export type BilingualSessionSettings = {
  speakerSource: SpeakerSource;
  interviewInputLanguage: "en" | "ru";
  translationLanguage: "en" | "ru";
  translationStrategy: TranslationStrategy;
  liveTranslationEnabled: boolean;
  translationDebounceMs: number;
  translationMinWordCount: number;
};

export type LiveTranscriptSegmentDto = {
  segmentId: string;
  timestamp: string;
  text: string;
  finalized: boolean;
};

export type LiveTranslationSegmentDto = {
  segmentId: string;
  sourceSegmentIds: string[];
  primarySourceSegmentId: string;
  timestamp: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: "en" | "ru";
  targetLanguage: "en" | "ru";
  isFinal: boolean;
  latencyMs: number;
  isFallback: boolean;
  strategy: TranslationStrategy;
  batchSize: number;
};

export type BilingualErrorDto = {
  code: string;
  message: string;
  recoverable?: boolean | null;
};

export type BilingualSessionStatus =
  | "idle"
  | "starting"
  | "active"
  | "stopping"
  | "reconnecting"
  | "degraded";
export type BilingualLaneStatus = "idle" | "active" | "reconnecting" | "degraded" | "error";

export type BilingualLatencyMetricsDto = {
  latencyMs?: number;
  sampleRate?: number;
  durationMs?: number;
  partialEnMs?: number;
  translationMs?: number;
  answerTtftMs?: number;
  answerTotalMs?: number;
};

export type BilingualAnswerReadyDto = {
  answerCard: InterviewCardDto;
};

export type BilingualAnswerChunkDto = {
  sessionId: string;
  text: string;
  isFinal: boolean;
  chunkIndex: number;
};

export type BilingualDisplaySegment = {
  segmentId: string;
  timestamp: string;
  transcriptText: string;
  translatedText: string | null;
  sourceSegmentIds: string[];
};

export type ExportSummary = {
  exportType: ExportType;
  sessionId: string;
  path: string;
  questionsCount: number;
  transcriptSegmentsCount: number;
};

export type BilingualInterviewState = {
  active: boolean;
  status: BilingualSessionStatus;
  transcriptLane: BilingualLaneStatus;
  translationLane: BilingualLaneStatus;
  degraded: boolean;
  sessionId: string | null;
  startedAt: string | null;
  latestPartial: LiveTranscriptSegmentDto | null;
  finalizedSegments: LiveTranscriptSegmentDto[];
  transcriptSegments: LiveTranscriptSegmentDto[];
  translationSegments: LiveTranslationSegmentDto[];
  displaySegments: BilingualDisplaySegment[];
  translationsBySourceSegmentId: Record<string, LiveTranslationSegmentDto>;
  latency: BilingualLatencyMetricsDto | null;
  lastAnswerCard: InterviewCardDto | null;
  streamedAnswerText: string;
  answerStatus: "idle" | "streaming" | "ready";
  lastChunkIndex: number;
  answerInFlight: boolean;
  lastError: BilingualErrorDto | null;
};

export const initialBilingualInterviewState: BilingualInterviewState = {
  active: false,
  status: "idle",
  transcriptLane: "idle",
  translationLane: "idle",
  degraded: false,
  sessionId: null,
  startedAt: null,
  latestPartial: null,
  finalizedSegments: [],
  transcriptSegments: [],
  translationSegments: [],
  displaySegments: [],
  translationsBySourceSegmentId: {},
  latency: null,
  lastAnswerCard: null,
  streamedAnswerText: "",
  answerStatus: "idle",
  lastChunkIndex: -1,
  answerInFlight: false,
  lastError: null,
};
