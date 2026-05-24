import type { Accessor, Setter } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import type {
  Phase,
  Panel,
  AppSettings,
  BootstrapDto,
  CommandErrorKind,
  PersistenceDiagnosticsDto,
  SetupStatusDto,
  SetupReadinessState,
} from "../model";
import type { UiStrings } from "../locale";
import type { AppPlatform } from "../platform";
import type { NoticeApi } from "./notices";
import type { HotkeyApi } from "./hotkeys";
import { emitUiEvent } from "../observability";
import {
  DEFAULT_SETTINGS,
  parseCommandInvokeError,
  invokeErrorMessage,
  userSafeBootstrapLoadError,
  mapSettingsSaveError,
} from "../model";

export interface SettingsActionDeps {
  platform: AppPlatform;
  strings: Accessor<UiStrings>;
  setupRequired: Accessor<boolean>;
  panel: Accessor<Panel>;
  settings: AppSettings;
  setSettings: SetStoreFunction<AppSettings>;
  draftSecrets: { deepgramApiKey: string; llmApiKey: string };
  setDraftSecrets: SetStoreFunction<{
    deepgramApiKey: string;
    llmApiKey: string;
  }>;
  setError: Setter<string | null>;
  setPhase: Setter<Phase>;
  setPanel: Setter<Panel>;
  setDeepgramSaved: Setter<boolean>;
  setLlmKeySaved: Setter<boolean>;
  setLlmRouteConfigured: Setter<boolean>;
  setContextActive: Setter<boolean>;
  setContextEntryCount: Setter<number>;
  setLastTranscriptPreview: Setter<string | null>;
  setPersistenceDiagnostics: Setter<PersistenceDiagnosticsDto | null>;
  setPersistenceDiagnosticsError: Setter<string | null>;
  setSaving: Setter<boolean>;
  setSettingsFormHint: Setter<string | null>;
  setHotkeyFailed: Setter<boolean>;
  setLastCommandErrorKind: Setter<CommandErrorKind | null>;
  setupReadinessState: Accessor<SetupReadinessState>;
  setSetupReadinessState: Setter<SetupReadinessState>;
  startupPanelDecisionPending: Accessor<boolean>;
  setStartupPanelDecisionPending: Setter<boolean>;
  userSelectedPanel: Accessor<boolean>;
  notices: NoticeApi;
  hotkeys: HotkeyApi;
  loadCandidatePack: () => Promise<void>;
}

export interface SettingsActions {
  reloadBootstrap: () => Promise<void>;
  refreshSetupStatus: () => Promise<void>;
  persistSettings: () => Promise<void>;
}

export function createSettingsActions(deps: SettingsActionDeps): SettingsActions {
  async function reloadBootstrap() {
    await emitUiEvent(deps.platform, "startup_readiness_check_start", { phase: "boot" });
    deps.setSetupReadinessState("checking");
    deps.setPhase("booting");
    deps.setError(null);
    try {
      const boot = await deps.platform.invoke<BootstrapDto>("load_bootstrap");
      await emitUiEvent(deps.platform, "startup_bootstrap_loaded", {
        phase: "boot",
        runtime_ready: String(boot.runtimeReady),
      });
      deps.setSettings({ ...DEFAULT_SETTINGS, ...boot.settings });
      deps.setDeepgramSaved(boot.deepgramKeyPresent);
      deps.setLlmKeySaved(boot.llmKeyPresent);
      deps.setLlmRouteConfigured(
        Boolean(boot.settings.llmBaseUrl.trim() && boot.settings.llmModel.trim()),
      );
      deps.setContextActive(boot.contextActive);
      deps.setContextEntryCount(boot.contextEntryCount);
      deps.setLastTranscriptPreview(boot.lastTranscriptPreview ?? null);
      deps.setPersistenceDiagnosticsError(null);
      try {
        const diagnostics = await deps.platform.invoke<PersistenceDiagnosticsDto>(
          "get_persistence_diagnostics",
        );
        deps.setPersistenceDiagnostics(diagnostics);
      } catch {
        deps.setPersistenceDiagnostics(null);
        deps.setPersistenceDiagnosticsError("diag_unavailable");
      }
      let runtimePathReady = boot.runtimeReady;
      try {
        const status = await deps.platform.invoke<SetupStatusDto>("get_setup_status");
        deps.setDeepgramSaved(status.deepgramKeyPresent);
        deps.setLlmKeySaved(status.llmKeyPresent);
        deps.setLlmRouteConfigured(status.llmRouteConfigured);
        runtimePathReady = status.runtimePathReady;
        await emitUiEvent(deps.platform, "startup_setup_status_checked", {
          phase: "boot",
          deepgram_key_present: String(status.deepgramKeyPresent),
          llm_key_present: String(status.llmKeyPresent),
          llm_route_configured: String(status.llmRouteConfigured),
          runtime_path_ready: String(status.runtimePathReady),
        });
      } catch {
        deps.setSetupReadinessState("error");
        deps.setPhase("idle");
        await emitUiEvent(deps.platform, "startup_readiness_failed", { phase: "boot" });
        return;
      }

      deps.setSetupReadinessState(runtimePathReady ? "ready" : "missing");
      await emitUiEvent(
        deps.platform,
        runtimePathReady ? "startup_readiness_ready" : "startup_readiness_missing",
        { phase: "boot" },
      );
      if (deps.startupPanelDecisionPending() && !deps.userSelectedPanel()) {
        const targetPanel = runtimePathReady ? "main" : "settings";
        deps.setPanel(targetPanel);
        deps.setStartupPanelDecisionPending(false);
        await emitUiEvent(deps.platform, "startup_panel_decision", {
          phase: "boot",
          panel: targetPanel,
          reason: runtimePathReady ? "runtime_ready" : "runtime_missing",
        });
      }
      await deps.loadCandidatePack();
      await deps.hotkeys.registerCurrentHotkey(boot.settings.hotkey);
      deps.setPhase("idle");
    } catch (err) {
      deps.setError(userSafeBootstrapLoadError());
      deps.setLastCommandErrorKind(parseCommandInvokeError(err)?.kind ?? null);
      deps.setPhase("error");
    }
  }

  async function persistSettings() {
    deps.setSaving(true);
    deps.setSettingsFormHint(null);
    try {
      const input: AppSettings = { ...deps.settings };
      await emitUiEvent(deps.platform, "settings_save_attempt", {
        phase: "settings",
        llm_url_present: Boolean(input.llmBaseUrl.trim()),
        llm_model_present: Boolean(input.llmModel.trim()),
        hotkey_present: Boolean(input.hotkey.trim()),
        model_preset: input.selectedModelPreset,
      });
      const saved = await deps.platform.invoke<AppSettings>("save_settings", { input });
      deps.setSettings({ ...DEFAULT_SETTINGS, ...saved });
      if (deps.draftSecrets.deepgramApiKey.trim()) {
        await deps.platform.invoke("save_secret", {
          slot: "deepgramApiKey",
          value: deps.draftSecrets.deepgramApiKey,
        });
        deps.setDraftSecrets("deepgramApiKey", "");
      }
      if (deps.draftSecrets.llmApiKey.trim()) {
        await deps.platform.invoke("save_secret", {
          slot: "llmApiKey",
          value: deps.draftSecrets.llmApiKey,
        });
        deps.setDraftSecrets("llmApiKey", "");
      }
      const boot = await deps.platform.invoke<BootstrapDto>("load_bootstrap");
      deps.setSettings({ ...DEFAULT_SETTINGS, ...boot.settings });
      deps.setDeepgramSaved(boot.deepgramKeyPresent);
      deps.setLlmKeySaved(boot.llmKeyPresent);
      deps.setLlmRouteConfigured(
        Boolean(boot.settings.llmBaseUrl.trim() && boot.settings.llmModel.trim()),
      );
      deps.setContextActive(boot.contextActive);
      deps.setContextEntryCount(boot.contextEntryCount);
      deps.setLastTranscriptPreview(boot.lastTranscriptPreview ?? null);
      deps.setPersistenceDiagnosticsError(null);
      try {
        const diagnostics = await deps.platform.invoke<PersistenceDiagnosticsDto>(
          "get_persistence_diagnostics",
        );
        deps.setPersistenceDiagnostics(diagnostics);
      } catch {
        deps.setPersistenceDiagnostics(null);
        deps.setPersistenceDiagnosticsError("diag_unavailable");
      }
      await deps.hotkeys.registerCurrentHotkey(boot.settings.hotkey);
      const setupRequiredFromBoot =
        !boot.deepgramKeyPresent ||
        !(boot.settings.llmBaseUrl.trim() && boot.settings.llmModel.trim());
      deps.setHotkeyFailed(false);
      deps.notices.pushNotice({
        tone: "info",
        message: setupRequiredFromBoot
          ? deps.strings().notices.settingsSavedPartial
          : deps.strings().notices.settingsSaved,
      });
      if (boot.runtimeReady && !setupRequiredFromBoot) deps.setPanel("main");
    } catch (err) {
      deps.setLastCommandErrorKind(parseCommandInvokeError(err)?.kind ?? null);
      deps.setSettingsFormHint(mapSettingsSaveError(err) ?? invokeErrorMessage(err));
      deps.setHotkeyFailed(true);
    } finally {
      deps.setSaving(false);
    }
  }

  async function refreshSetupStatus() {
    try {
      const status = await deps.platform.invoke<SetupStatusDto>("get_setup_status");
      deps.setDeepgramSaved(status.deepgramKeyPresent);
      deps.setLlmKeySaved(status.llmKeyPresent);
      deps.setLlmRouteConfigured(status.llmRouteConfigured);
      deps.setSetupReadinessState(status.runtimePathReady ? "ready" : "missing");
      deps.setPhase("idle");
    } catch {
      if (deps.setupReadinessState() === "checking") deps.setSetupReadinessState("error");
    }
  }

  return { reloadBootstrap, refreshSetupStatus, persistSettings };
}
