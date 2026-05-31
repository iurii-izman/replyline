export type Phase =
  | "booting"
  | "idle"
  | "capturing"
  | "transcribing"
  | "analyzing"
  | "ready"
  | "error";

export type SettingsSectionId =
  | "overview"
  | "speech"
  | "llm"
  | "hotkey"
  | "reports"
  | "candidatePack";

export type Panel = "main" | "settings" | "candidatePackStudio";

export type AppSettings = {
  schemaVersion: 10;
  hotkey: string;
  llmBaseUrl: string;
  llmModel: string;
  selectedModelPreset: string;
  captureMaxSeconds: number;
  activeAnswerProfile: string;
  windowOpacity: 100 | 90 | 80 | 70;
  hideToTrayOnClose: boolean;
  keepOnTopDuringCapture: boolean;
  interviewCompactMode: boolean;
  interviewReportRetentionDays: 0 | 7 | 30 | 90;
  debugTraceMode: "off" | "redacted" | "full_local";
  debugTraceRetentionDays: 0 | 1 | 3 | 7;
  bilingualInterviewEnabled: boolean;
  interviewInputLanguage: "en" | "ru";
  translationLanguage: "en" | "ru";
  liveTranslationEnabled: boolean;
  translationDebounceMs: number;
  translationMinWordCount: number;
  bilingualRetentionBehavior: "session_only";
  bilingualAnswerStyle: "b2_conversational";
};

export type CandidateFactStrength = "strong" | "medium" | "weak";

export type CandidateFact = {
  id: string;
  title: string;
  claim: string;
  description: string;
  evidence: string;
  skills: string[];
  metrics: string[];
  strength: CandidateFactStrength;
  suitableForQuestions: string[];
};

export type CandidatePackDto = {
  candidateSummary: string;
  targetRole: string;
  resumeFacts: CandidateFact[];
  jobDescription: {
    title: string;
    company: string;
    requirements: string[];
    responsibilities: string[];
    keywords: string[];
  };
  companyValues: string[];
  answerConstraints: {
    avoidClaims: string[];
    preferredExamples: string[];
    language: string;
  };
};

export type CandidatePackStatusDto = {
  exists: boolean;
  factCount: number;
  weakFactCount: number;
};

/**
 * Mirrors Rust LogStatusDto for IPC deserialization.
 * Not surfaced in Slim Stable Beta UI — available for diagnostics via IPC only.
 */
export type LogStatusDto = {
  logPath: string;
  lastLine?: string | null;
  lastDebugWavPath?: string | null;
};

export type BootstrapDto = {
  settings: AppSettings;
  deepgramKeyPresent: boolean;
  llmKeyPresent: boolean;
  contextActive: boolean;
  contextEntryCount: number;
  runtimeReady: boolean;
  /// Log diagnostics. Not surfaced in Slim Stable Beta UI.
  logStatus: LogStatusDto;
  /// Truncated text from the last successful STT pass. Not surfaced in Slim Stable Beta UI.
  lastTranscriptPreview?: string | null;
  canRetryLastTranscript: boolean;
};

export type ContextStatusDto = {
  contextActive: boolean;
  entryCount: number;
  lastTranscriptPreview?: string | null;
  canRetryLastTranscript: boolean;
};

export type CommandErrorKind = "Settings" | "Credential" | "Capture" | "Pipeline" | "Internal";

export type ErrorSettingsAnchor = "hotkey" | "stt" | "llm";

export function settingsAnchorForCommandErrorKind(kind: CommandErrorKind): ErrorSettingsAnchor {
  switch (kind) {
    case "Credential":
      return "stt";
    case "Settings":
    case "Pipeline":
      return "llm";
    case "Capture":
    case "Internal":
      return "hotkey";
  }
}

const COMMAND_ERROR_KINDS: CommandErrorKind[] = [
  "Settings",
  "Credential",
  "Capture",
  "Pipeline",
  "Internal",
];

export type ParsedCommandError = {
  kind: CommandErrorKind;
  message: string;
};

function rawInvokeErrorString(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return String(err);
}

function isCommandErrorPayload(value: unknown): value is ParsedCommandError {
  if (!value || typeof value !== "object") return false;
  const kind = (value as { kind?: unknown }).kind;
  const message = (value as { message?: unknown }).message;
  return (
    typeof message === "string" &&
    typeof kind === "string" &&
    (COMMAND_ERROR_KINDS as string[]).includes(kind)
  );
}

export function parseCommandInvokeError(err: unknown): ParsedCommandError | null {
  const raw = rawInvokeErrorString(err).trim();
  const tryParse = (s: string): ParsedCommandError | null => {
    try {
      const o = JSON.parse(s) as unknown;
      return isCommandErrorPayload(o) ? o : null;
    } catch {
      return null;
    }
  };
  const direct = tryParse(raw);
  if (direct) return direct;
  const brace = raw.indexOf("{");
  if (brace >= 0) return tryParse(raw.slice(brace));
  return null;
}

export function invokeErrorMessage(err: unknown): string {
  const parsed = parseCommandInvokeError(err);
  if (parsed) return parsed.message;
  return rawInvokeErrorString(err);
}

export type LegacyAnalysisCard = {
  gist: string;
  sayNow: string;
  nextMove: string;
  /// Always present in Rust AnalysisCardDto (chars_band: String, not Option).
  charsBand: string;
  /// Supporting evidence snippet from the LLM response. Not surfaced in Slim Stable Beta UI.
  starEvidence?: string;
};

export type InterviewAnswerDto = {
  main: string;
  short: string;
  strong: string;
  structure: "STAR" | "CASE" | "DIRECT" | "CLARIFY";
};

export type InterviewQuestionDto = {
  rawTranscript: string;
  cleanQuestion: string;
  interviewerIntent: string;
  questionType: string;
  confidence: "low" | "medium" | "high";
};

export type InterviewSignalsDto = {
  mustMention: string[];
  keywords: string[];
  metrics: string[];
  resumeAnchors: string[];
};

export type InterviewRisksDto = {
  weakPoints: string[];
  avoid: string[];
  safeReframe: string;
};

export type InterviewFollowUpDto = {
  question: string;
  bridgeAnswer: string;
};

export type InterviewClarifierDto = {
  needed: boolean;
  text: string | null;
};

export type BilingualMetaDto = {
  sessionId: string;
  sourceSegmentIds: string[];
  questionRu?: string | null;
  listeningStatus: string;
};

export type InterviewCardDto = {
  mode: "interview";
  answer: InterviewAnswerDto;
  question: InterviewQuestionDto;
  signals: InterviewSignalsDto;
  risks: InterviewRisksDto;
  followUps: InterviewFollowUpDto[];
  clarifier: InterviewClarifierDto;
  bilingualMeta?: BilingualMetaDto | null;
};

export type WorkConversationCard = LegacyAnalysisCard & {
  mode: "work";
};

export type InterviewAnalysisCard = LegacyAnalysisCard & {
  mode: "interview";
  interview: InterviewCardDto;
};

export type AnalysisCard = WorkConversationCard | InterviewAnalysisCard;

export type AnalysisCardDto = LegacyAnalysisCard & {
  interviewCard?: InterviewCardDto | null;
  interviewCardSchemaV1?: InterviewCardDto | null;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeLegacyInterviewCard(input: unknown): InterviewCardDto | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const question = (source.question as Record<string, unknown> | undefined) ?? {};
  const answer = (source.answer as Record<string, unknown> | undefined) ?? {};
  const signals = (source.signals as Record<string, unknown> | undefined) ?? {};
  const risks = (source.risks as Record<string, unknown> | undefined) ?? {};
  const clarifier = (source.clarifier as Record<string, unknown> | undefined) ?? {};
  const followUps = Array.isArray(source.followUps) ? source.followUps : [];
  const bilingualMeta = (source.bilingualMeta as Record<string, unknown> | undefined) ?? undefined;
  const structure = asString(answer.structure);
  const normalizedStructure: InterviewAnswerDto["structure"] =
    structure === "STAR" || structure === "CASE" || structure === "DIRECT" || structure === "CLARIFY"
      ? structure
      : "DIRECT";
  const clarifierText = asString(clarifier.text).trim();
  const legacyClarifierQuestion = asString(clarifier.question).trim();

  return {
    mode: "interview",
    answer: {
      main: asString(answer.main),
      short: asString(answer.short),
      strong: asString(answer.strong),
      structure: normalizedStructure,
    },
    question: {
      rawTranscript: asString(question.rawTranscript),
      cleanQuestion: asString(question.cleanQuestion),
      interviewerIntent: asString(question.interviewerIntent),
      questionType: asString(question.questionType),
      confidence:
        asString(question.confidence) === "low" ||
        asString(question.confidence) === "medium" ||
        asString(question.confidence) === "high"
          ? (asString(question.confidence) as InterviewQuestionDto["confidence"])
          : "low",
    },
    signals: {
      mustMention: asStringArray(signals.mustMention),
      keywords: asStringArray(signals.keywords),
      metrics: asStringArray(signals.metrics),
      resumeAnchors: asStringArray(signals.resumeAnchors),
    },
    risks: {
      weakPoints: asStringArray(risks.weakPoints),
      avoid: asStringArray(risks.avoid),
      safeReframe: asString(risks.safeReframe),
    },
    followUps: followUps
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        return {
          question: asString(row.question),
          bridgeAnswer: asString(row.bridgeAnswer),
        };
      })
      .filter((item): item is InterviewFollowUpDto => Boolean(item)),
    clarifier: {
      needed: Boolean(clarifier.needed),
      text: clarifierText || legacyClarifierQuestion || null,
    },
    bilingualMeta: bilingualMeta
      ? {
          sessionId: asString(bilingualMeta.sessionId),
          sourceSegmentIds: asStringArray(bilingualMeta.sourceSegmentIds),
          questionRu: asString(bilingualMeta.questionRu) || null,
          listeningStatus: asString(bilingualMeta.listeningStatus),
        }
      : null,
  };
}

export function asAnalysisCard(input: AnalysisCardDto): AnalysisCard {
  const interview =
    normalizeLegacyInterviewCard(input.interviewCardSchemaV1) ??
    normalizeLegacyInterviewCard(input.interviewCard) ??
    null;
  if (interview) {
    return {
      ...input,
      mode: "interview",
      interview,
      // Keep action semantics stable: primary copy always mirrors interview answer.
      sayNow: interview.answer.main?.trim() || input.sayNow,
    };
  }
  return {
    ...input,
    mode: "work",
  };
}

export type StatusEvent = {
  runId?: string;
  phase: string;
  detail?: string | null;
};

/** Mirrors Rust CheckItemDto for runtime preflight checks. */
export type CheckItemDto = {
  ok: boolean;
  code: string;
  message: string;
  action?: string | null;
};

/** Mirrors Rust RuntimeCheckDto for setup wizard diagnostics. */
export type RuntimeCheckDto = {
  stt: CheckItemDto;
  llm: CheckItemDto;
  settings: CheckItemDto;
  runtimeReady: boolean;
};

export type SetupStatusDto = {
  deepgramKeyPresent: boolean;
  llmKeyPresent: boolean;
  llmRouteConfigured: boolean;
  runtimePathReady: boolean;
};

export type SetupReadinessState = "checking" | "ready" | "missing" | "error";

export type PersistenceDiagnosticsDto = {
  settingsPath: string;
  settingsPathHash: string;
  settingsFileExists: boolean;
  settingsFileSize: number;
  settingsFileModifiedAt?: string | null;
  settingsParseOk: boolean;
  settingsValidationOk: boolean;
  settingsSchemaVersion: number;
  llmBaseUrlPresent: boolean;
  llmBaseUrlHost?: string | null;
  llmModelPresent: boolean;
  selectedModelPreset: string;
  activeAnswerProfile: string;
  hotkey: string;
  captureMaxSeconds: number;
  corruptBackups: string[];
  corruptBackupsCount: number;
  keyringServiceName: string;
  deepgramKeyPresent: boolean;
  llmKeyPresent: boolean;
  runtimePathReady: boolean;
  appLogPath?: string | null;
  appLogExists: boolean;
  lastLogEventTime?: string | null;
};

export type InterviewQuestionReportDto = {
  timestamp: string;
  rawTranscript: string;
  cleanQuestion: string;
  questionType: string;
  answerMain: string;
  hints: string[];
  signals: string[];
};

export type InterviewReportDto = {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  language: string;
  questions: InterviewQuestionReportDto[];
  fullTranscript: string;
  scores: {
    clarity: number;
    relevance: number;
    accuracy: number;
  };
  feedback: {
    strengths: string[];
    improvements: string[];
    missingExamples: string[];
  };
};

export type InterviewSessionStateDto = {
  active: boolean;
  sessionId: string;
  startedAt: string;
  language: string;
  questions: InterviewQuestionReportDto[];
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

export type CandidatePackDraftFact = {
  fact: string;
  evidence: string;
  strength: "strong" | "medium" | "weak";
  metrics: string[];
};

export type CandidatePackDraft = {
  packQualityScore: number;
  missingDataWarnings: string[];
  suggestedMissingInfo: string[];
  candidateFacts: CandidatePackDraftFact[];
  roleKeywords: string[];
  companyValues: string[];
};

export type MainUiState = "idle" | "capturing" | "transcribing" | "analyzing" | "ready" | "error";

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 10,
  hotkey: "Ctrl+Alt+Space",
  llmBaseUrl: "",
  llmModel: "gpt-4o-mini",
  selectedModelPreset: "custom_openai_compatible",
  captureMaxSeconds: 45,
  activeAnswerProfile: "interview_default",
  windowOpacity: 100,
  hideToTrayOnClose: true,
  keepOnTopDuringCapture: false,
  interviewCompactMode: false,
  interviewReportRetentionDays: 0,
  debugTraceMode: "redacted",
  debugTraceRetentionDays: 3,
  bilingualInterviewEnabled: false,
  interviewInputLanguage: "en",
  translationLanguage: "ru",
  liveTranslationEnabled: true,
  translationDebounceMs: 600,
  translationMinWordCount: 3,
  bilingualRetentionBehavior: "session_only",
  bilingualAnswerStyle: "b2_conversational",
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

export function isConfiguredLlmRoute(baseUrl: string, model: string): boolean {
  return Boolean(baseUrl.trim() && model.trim());
}

export type LlmRouteMode = "local" | "cloud" | "unknown";

export function detectLlmRouteModeFromHost(host?: string | null): LlmRouteMode {
  const normalized = (host ?? "").trim().toLowerCase();
  if (!normalized) return "unknown";
  if (normalized === "localhost" || normalized.endsWith(".local")) return "local";
  if (normalized === "::1") return "local";
  const ipv4Match = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const nums = ipv4Match.slice(1).map((v) => Number.parseInt(v, 10));
    if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return "cloud";
    const [a, b] = nums;
    if (a === 127 || a === 10) return "local";
    if (a === 192 && b === 168) return "local";
    if (a === 172 && b >= 16 && b <= 31) return "local";
    if (a === 169 && b === 254) return "local";
  }
  return "cloud";
}

function normalizeHotkeyKey(key: string): string | null {
  if (key === " ") return "Space";
  if (key === "Escape") return "Esc";
  if (/^F\d{1,2}$/i.test(key)) return key.toUpperCase();
  if (/^[a-zA-Z]$/.test(key)) return key.toUpperCase();
  if (/^[0-9]$/.test(key)) return key;
  if (key.startsWith("Arrow")) return key.replace("Arrow", "");
  if (["Tab", "Enter", "Backspace", "Delete", "Home", "End", "PageUp", "PageDown"].includes(key))
    return key;
  return null;
}

export function formatHotkeyFromEvent(ev: KeyboardEvent): string | null {
  const key = normalizeHotkeyKey(ev.key);
  const parts: string[] = [];
  if (ev.ctrlKey) parts.push("Ctrl");
  if (ev.altKey) parts.push("Alt");
  if (ev.shiftKey) parts.push("Shift");
  if (ev.metaKey) parts.push("Meta");
  if (key && !["Control", "Alt", "Shift", "Meta"].includes(key)) {
    parts.push(key);
  }
  return parts.length >= 2 ? parts.join("+") : null;
}

export function userSafeCaptureStartError(): string {
  return "Запись не началась. Повторите удержание горячей клавиши.";
}

export function userSafePipelineError(err: unknown): string {
  const s = invokeErrorMessage(err);
  if (/Nothing to retry|nothing to retry/i.test(s)) {
    return "Сначала сделайте захват — пересобирать пока нечего.";
  }
  if (/Deepgram|API key|missing|распознаван/i.test(s)) {
    return "Нет текста из звука: проверьте ключ Deepgram.";
  }
  if (/LLM|gateway|401|403|http|timeout/i.test(s)) {
    return "Нет ответа LLM-шлюза: проверьте URL, модель и ключ.";
  }
  if (/SHORT_CAPTURE|слишком короткий фрагмент/i.test(s)) {
    return "Слишком короткий фрагмент, запишите 5-10 секунд. Этот кусок будет учтен в следующем захвате.";
  }
  return "Цепочка прервалась. Повторите захват.";
}

export function userSafeBootstrapLoadError(): string {
  return "Не удалось загрузить приложение. Повторите и проверьте настройки.";
}

export function userSafeClearContextError(): string {
  return "Сброс контекста не выполнен. Повторите.";
}

export function mapSettingsSaveError(err: unknown): string | null {
  const s = invokeErrorMessage(err);
  if (s.includes("HOTKEY_REQUIRED")) return "Укажите горячую клавишу.";
  if (s.includes("MODEL_REQUIRED")) return "Укажите модель LLM.";
  if (s.includes("INVALID_URL") || /^URL:/i.test(s)) return "Неверный URL LLM.";
  if (s.includes("CAPTURE_RANGE_INVALID")) return "Лимит записи: 5-180 секунд.";
  if (s.includes("EMPTY_SECRET_NOT_SAVED")) return "Пустой ключ не сохранён. Введите значение.";
  return null;
}
