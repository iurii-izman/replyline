import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type PersistenceDiagnosticsDto,
} from "../../../src/app/model";
import { resolveModelPreset } from "../../../src/app/modelPresets";

export const WEB_E2E_PRESET_ID = "openrouter_free_dev";

export function createReplylineWebE2ESettings(
  overrides: Partial<AppSettings> = {},
): AppSettings {
  const presetId = overrides.selectedModelPreset ?? WEB_E2E_PRESET_ID;
  const preset = resolveModelPreset(presetId);

  return {
    ...DEFAULT_SETTINGS,
    selectedModelPreset: preset.id,
    llmBaseUrl: preset.baseUrl || DEFAULT_SETTINGS.llmBaseUrl,
    llmModel: preset.primaryModel || DEFAULT_SETTINGS.llmModel,
    ...overrides,
    schemaVersion: DEFAULT_SETTINGS.schemaVersion,
  };
}

export const REPLYLINE_WEB_E2E_SETTINGS = createReplylineWebE2ESettings();

export function createReplylineWebE2EPersistenceDiagnostics(
  settings: AppSettings,
): PersistenceDiagnosticsDto {
  return {
    settingsPath: "C:/Dev/replyline/settings.json",
    settingsPathHash: "test",
    settingsFileExists: true,
    settingsFileSize: 256,
    settingsParseOk: true,
    settingsValidationOk: true,
    settingsSchemaVersion: settings.schemaVersion,
    llmBaseUrlPresent: Boolean(settings.llmBaseUrl),
    llmModelPresent: Boolean(settings.llmModel),
    selectedModelPreset: settings.selectedModelPreset,
    activeAnswerProfile: settings.activeAnswerProfile,
    hotkey: settings.hotkey,
    captureMaxSeconds: settings.captureMaxSeconds,
    corruptBackups: [],
    corruptBackupsCount: 0,
    keyringServiceName: "replyline",
    deepgramKeyPresent: true,
    llmKeyPresent: false,
    runtimePathReady: true,
    appLogExists: false,
  };
}
