/**
 * Mirrors Rust LogStatusDto for IPC deserialization.
 * Not surfaced in Slim Stable Beta UI — available for diagnostics via IPC only.
 */
export type LogStatusDto = {
  logPath: string;
  lastLine?: string | null;
  lastDebugWavPath?: string | null;
};

import type { AppSettings } from "./settings";

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
  /// Whether experimental bilingual features are allowed (REPLYLINE_EXPERIMENTAL_BILINGUAL=1).
  experimentalBilingualAllowed: boolean;
};

export type ContextStatusDto = {
  contextActive: boolean;
  entryCount: number;
  lastTranscriptPreview?: string | null;
  canRetryLastTranscript: boolean;
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
  /** ContextPack store diagnostics (safe — never contains raw pack content). */
  contextPacksFileExists: boolean;
  contextPacksCount: number;
  contextPacksActivePresent: boolean;
  contextPacksCorruptBackups: string[];
  contextPacksCorruptBackupsCount: number;
  keyringServiceName: string;
  deepgramKeyPresent: boolean;
  llmKeyPresent: boolean;
  runtimePathReady: boolean;
  appLogPath?: string | null;
  appLogExists: boolean;
  lastLogEventTime?: string | null;
};

export type SupportSnapshotProviderReadinessDto = {
  sttProvider: string;
  sttKeyPresent: boolean;
  llmRouteConfigured: boolean;
  llmKeyPresent: boolean;
  runtimePathReady: boolean;
  selectedModelPreset: string;
  llmRouteKind: string;
};

export type SupportSnapshotRuntimeCheckInputDto = {
  runtimeReady: boolean;
  sttOk: boolean;
  llmOk: boolean;
  settingsOk: boolean;
};

export type SupportSnapshotRuntimeDto = {
  os: string;
  arch: string;
  family: string;
  desktopRuntime: string;
};

export type SupportSnapshotRuntimeCheckDto = {
  status: string;
  runtimeReady: boolean;
  sttOk: boolean;
  llmOk: boolean;
  settingsOk: boolean;
};

export type SupportSnapshotFeatureGatesDto = {
  experimentalBilingualAllowed: boolean;
  bilingualInterviewEnabled: boolean;
  liveTranslationEnabled: boolean;
  debugTraceMode: string;
};

export type SupportSnapshotDto = {
  schemaVersion: number;
  generatedAt: string;
  appVersion: string;
  commitSha: string;
  currentPhase: string;
  setupReadiness: string;
  activeContextTitle?: string | null;
  lastErrorCategory?: string | null;
  providerReadiness: SupportSnapshotProviderReadinessDto;
  lastRuntimeCheck: SupportSnapshotRuntimeCheckDto;
  featureGates: SupportSnapshotFeatureGatesDto;
  runtime: SupportSnapshotRuntimeDto;
};

export type SupportSnapshotPayloadDto = {
  snapshot: SupportSnapshotDto;
  json: string;
  markdown: string;
};
