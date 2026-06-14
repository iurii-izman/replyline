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
  keyringServiceName: string;
  deepgramKeyPresent: boolean;
  llmKeyPresent: boolean;
  runtimePathReady: boolean;
  appLogPath?: string | null;
  appLogExists: boolean;
  lastLogEventTime?: string | null;
};
