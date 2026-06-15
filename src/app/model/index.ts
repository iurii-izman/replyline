export type { Phase, SettingsSectionId, Panel, AppSettings, MainUiState } from "./settings";
export { DEFAULT_SETTINGS } from "./settings";

export type { CommandErrorKind, ErrorSettingsAnchor, ParsedCommandError } from "./errors";
export {
  settingsAnchorForCommandErrorKind,
  parseCommandInvokeError,
  invokeErrorMessage,
  userSafeCaptureStartError,
  userSafePipelineError,
  userSafeBootstrapLoadError,
  userSafeClearContextError,
  mapSettingsSaveError,
} from "./errors";

export type {
  LegacyAnalysisCard,
  InterviewAnswerDto,
  InterviewQuestionDto,
  InterviewSignalsDto,
  InterviewRisksDto,
  InterviewFollowUpDto,
  InterviewClarifierDto,
  InterviewCardDto,
  WorkConversationCard,
  InterviewAnalysisCard,
  AnalysisCard,
  AnalysisCardDto,
  StatusEvent,
} from "./cards";
export { asAnalysisCard } from "./cards";

export type {
  InterviewQuestionReportDto,
  InterviewReportDto,
  InterviewSessionStateDto,
} from "./interview";

export type { ContextPackDto, ContextPackStatusDto, ContextPackListDto } from "./contextPack";

export type {
  LogStatusDto,
  BootstrapDto,
  ContextStatusDto,
  CheckItemDto,
  RuntimeCheckDto,
  SetupStatusDto,
  SetupReadinessState,
  PersistenceDiagnosticsDto,
} from "./diagnostics";

export { formatHotkeyFromEvent } from "./hotkeys";

export { isConfiguredLlmRoute } from "./routeMode";
export type { LlmRouteMode } from "./routeMode";
export { detectLlmRouteModeFromHost } from "./routeMode";

export type {
  BilingualMetaDto,
  SpeakerSource,
  TranslationStrategy,
  ExportType,
  BilingualSessionSettings,
  LiveTranscriptSegmentDto,
  LiveTranslationSegmentDto,
  BilingualErrorDto,
  BilingualSessionStatus,
  BilingualLaneStatus,
  BilingualLatencyMetricsDto,
  BilingualAnswerReadyDto,
  BilingualAnswerChunkDto,
  BilingualDisplaySegment,
  ExportSummary,
  BilingualInterviewState,
} from "./bilingualExperimental";
export { initialBilingualInterviewState } from "./bilingualExperimental";
