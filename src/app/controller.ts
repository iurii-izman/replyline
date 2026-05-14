import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type Accessor,
} from "solid-js";
import { createStore } from "solid-js/store";

import {
  DEFAULT_SETTINGS,
  alphaLanguageLabel,
  formatHotkeyFromEvent,
  invokeErrorMessage,
  isConfiguredLlmRoute,
  isNotebookLmLaunchReady,
  mapSettingsSaveError,
  shortUrlForUi,
  userSafeBootstrapLoadError,
  userSafeCaptureStartError,
  userSafeHotkeyRegisterError,
  userSafePersistOuterError,
  userSafePipelineError,
  userSafeTrayAckSaveError,
  usesPlaceholderLlmRoute,
  parseCommandInvokeError,
  type AnalysisCard,
  type AppSettings,
  type BootstrapDto,
  type CommandErrorKind,
  type ContextStatusDto,
  type ErrorSettingsAnchor,
  type LogStatusDto,
  type RuntimeReadinessDto,
  type Panel,
  type Phase,
  type HealthCheckResult,
  type MemorySpace,
  type MemorySpaceRecord,
  type StatusEvent,
} from "./model";
import { fmtReadinessJsonCopied, fmtSettingsSavedButHotkey, getUi, type UiStrings } from "./locale";
import type { AppPlatform } from "./platform";
import {
  livePhaseHeadlineFor,
  livePhaseSubFor,
  phaseLabelFor,
  traySyncPayload,
} from "./controller_status";
import { createMemorySlice } from "./controller_memory";
import { createRuntimeSlice } from "./controller_runtime";

export function useReplylineController(platform: AppPlatform) {
  const [phase, setPhase] = createSignal<Phase>("booting");
  const [panel, setPanel] = createSignal<Panel>("main");
  const [card, setCard] = createSignal<AnalysisCard | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [statusDetail, setStatusDetail] = createSignal<string | null>(null);
  const [deepgramSaved, setDeepgramSaved] = createSignal(false);
  const [llmKeySaved, setLlmKeySaved] = createSignal(false);
  const [contextActive, setContextActive] = createSignal(false);
  const [contextEntryCount, setContextEntryCount] = createSignal(0);
  const [saving, setSaving] = createSignal(false);
  const [diagnosticBusy, setDiagnosticBusy] = createSignal(false);
  const [diagnosticLocalError, setDiagnosticLocalError] = createSignal<string | null>(null);
  const [copyNotice, setCopyNotice] = createSignal<string | null>(null);
  const [hotkeyFailed, setHotkeyFailed] = createSignal(false);
  const [setupHotkeyNudge, setSetupHotkeyNudge] = createSignal(false);
  const [settingsFormHint, setSettingsFormHint] = createSignal<string | null>(null);
  const [logStatus, setLogStatus] = createSignal<LogStatusDto | null>(null);
  const [healthCheck, setHealthCheck] = createSignal<HealthCheckResult | null>(null);
  const [healthCheckBusy, setHealthCheckBusy] = createSignal(false);
  const [memorySpaces, setMemorySpaces] = createSignal<MemorySpace[]>([]);
  const [activeSpaceId, setActiveSpaceId] = createSignal<string | null>(null);
  const [memorySavedCardPreview, setMemorySavedCardPreview] = createSignal<string | null>(null);
  const [contextTranscriptPreview, setContextTranscriptPreview] = createSignal<string | null>(null);
  const [canRetryLastTranscript, setCanRetryLastTranscript] = createSignal(false);
  const [runtimeReadiness, setRuntimeReadiness] = createSignal<RuntimeReadinessDto | null>(null);
  const [lastCommandErrorKind, setLastCommandErrorKind] = createSignal<CommandErrorKind | null>(
    null,
  );
  const [settingsScrollAnchor, setSettingsScrollAnchor] = createSignal<ErrorSettingsAnchor | null>(
    null,
  );
  const [devFixtureBusy, setDevFixtureBusy] = createSignal(false);

  const [settings, setSettings] = createStore<AppSettings>({ ...DEFAULT_SETTINGS });
  const [draftSecrets, setDraftSecrets] = createStore({
    deepgramApiKey: "",
    llmApiKey: "",
  });

  const setupRequired = createMemo(() => !deepgramSaved() || !llmRouteConfigured());
  const llmRouteIsPlaceholder = createMemo(() =>
    usesPlaceholderLlmRoute(settings.llmBaseUrl, settings.llmModel),
  );
  const llmRouteConfigured = createMemo(() =>
    isConfiguredLlmRoute(settings.llmBaseUrl, settings.llmModel),
  );
  const notebookLmLaunchReady = createMemo(() =>
    isNotebookLmLaunchReady(settings.notebookLmEnabled, settings.notebookLmLaunchUrl),
  );
  const hotkeyFilled = createMemo(() => Boolean(settings.hotkey.trim()));
  const pipelineActive = createMemo(() =>
    ["capturing", "transcribing", "analyzing"].includes(phase()),
  );

  const strings: Accessor<UiStrings> = createMemo(() => getUi(settings.primaryLanguage));

  function applyContextStatus(status: ContextStatusDto) {
    setContextActive(status.contextActive);
    setContextEntryCount(status.entryCount);
    setContextTranscriptPreview(status.lastTranscriptPreview ?? null);
    setCanRetryLastTranscript(status.canRetryLastTranscript);
  }

  async function refreshRuntimeReadiness() {
    try {
      const r = await platform.invoke<RuntimeReadinessDto>("get_runtime_readiness");
      setRuntimeReadiness(r);
    } catch {
      setRuntimeReadiness(null);
    }
  }

  async function copyRuntimeReadinessJson() {
    try {
      const r = await platform.invoke<RuntimeReadinessDto>("get_runtime_readiness");
      const text = JSON.stringify(r, null, 2);
      const ok = await tryWriteClipboard(text);
      setCopyNotice(fmtReadinessJsonCopied(ok, strings()));
    } catch (err) {
      setCopyNotice(null);
      showRecoverableError(strings().notices.readinessCopyFailed, err);
    }
  }

  async function copyTicketPayloadJson() {
    try {
      const readiness = await platform.invoke<RuntimeReadinessDto>("get_runtime_readiness");
      const latestLog = await platform.invoke<LogStatusDto>("get_log_status").catch(() => null);
      if (latestLog) setLogStatus(latestLog);
      const payload = {
        generatedAt: new Date().toISOString(),
        readiness,
        phase: phase(),
        panel: panel(),
        setupRequired: setupRequired(),
        hotkeyFailed: hotkeyFailed(),
        lastCommandErrorKind: lastCommandErrorKind(),
        logStatus: latestLog ?? logStatus(),
      };
      const ok = await tryWriteClipboard(JSON.stringify(payload, null, 2));
      setCopyNotice(
        ok ? strings().notices.ticketPayloadCopied : strings().notices.ticketPayloadCopyManual,
      );
    } catch (err) {
      setCopyNotice(null);
      showRecoverableError(strings().notices.ticketPayloadCopyFailed, err);
    }
  }

  async function collectTicketSupportPackage() {
    await collectSupportBundle();
    await copyTicketPayloadJson();
    setCopyNotice(strings().notices.ticketPackageReady);
  }

  function clearSettingsScrollAnchor() {
    setSettingsScrollAnchor(null);
  }

  function openSettingsToAnchor(anchor: ErrorSettingsAnchor) {
    setSettingsScrollAnchor(anchor);
    openSettingsPanel();
  }

  async function runDevFixtureAnalysis(fixtureId: string) {
    if (!import.meta.env.DEV) return;
    setDevFixtureBusy(true);
    setError(null);
    setLastCommandErrorKind(null);
    setStatusDetail(null);
    setPhase("analyzing");
    try {
      const card = await platform.invoke<AnalysisCard>("dev_analyze_fixture_snippet", {
        fixtureId,
      });
      setCard(card);
      setContextActive(true);
      setPhase("ready");
      setPanel("main");
      await showWindow("main");
      setCopyNotice(strings().advanced.devFixtureOk);
      try {
        const status = await platform.invoke<ContextStatusDto>("get_context_status");
        applyContextStatus(status);
      } catch {
        /* ignore */
      }
    } catch (err) {
      showRecoverableError(userSafePipelineError(err), err);
    } finally {
      setDevFixtureBusy(false);
    }
  }

  const phaseLabel = createMemo(() => {
    return phaseLabelFor(phase(), setupRequired(), hotkeyFailed(), strings());
  });

  const livePhaseHeadline = createMemo(() => livePhaseHeadlineFor(phase(), strings()));

  const livePhaseSub = createMemo(() => livePhaseSubFor(phase(), strings()));

  const statusPillClass = createMemo(() => {
    const currentPhase = phase();
    if (currentPhase === "idle") {
      if (hotkeyFailed()) return "is-hotkey-fail";
      if (setupRequired()) return "is-setup-needed";
    }
    return `is-${currentPhase}`;
  });

  function setCommandErrorKind(err: unknown | null) {
    if (err == null) {
      setLastCommandErrorKind(null);
      return;
    }
    const kind = parseCommandInvokeError(err)?.kind ?? null;
    setLastCommandErrorKind(kind);
    if (kind) {
      void platform
        .invoke("log_client_event", {
          event: `ui_error_kind_${kind.toLowerCase()}`,
          detail: invokeErrorMessage(err).slice(0, 240),
        })
        .catch(() => undefined);
    }
  }

  function showRecoverableError(message: string, invokeErr?: unknown) {
    setStatusDetail(null);
    setCopyNotice(null);
    setCommandErrorKind(invokeErr ?? null);
    setError(message);
    setPhase("idle");
    void platform
      .invoke<LogStatusDto>("get_log_status")
      .then(setLogStatus)
      .catch(() => undefined);
  }

  async function tryWriteClipboard(value: string): Promise<boolean> {
    try {
      await platform.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }

  async function showWindow(panelName?: Panel, focus = true) {
    if (panelName) setPanel(panelName);
    await platform.window.show();
    if (focus) {
      await platform.window.setFocus();
    }
  }

  async function registerCurrentHotkey(hotkey: string) {
    await platform
      .invoke("log_client_event", {
        event: "hotkey_register_attempt",
        detail: `hotkey=${hotkey}`,
      })
      .catch(() => undefined);
    await platform.shortcuts.unregisterAll();
    const alreadyRegistered = await platform.shortcuts.isRegistered(hotkey);
    if (alreadyRegistered) {
      throw new Error(strings().notices.hotkeyAlreadyRegistered);
    }
    setHotkeyFailed(false);
    let captureArmed = false;

    await platform.shortcuts.register(hotkey, async (event) => {
      if (event.state === "Pressed") {
        try {
          setError(null);
          setLastCommandErrorKind(null);
          setCopyNotice(null);
          setStatusDetail(null);
          captureArmed = false;
          if (setupRequired()) {
            setPhase("idle");
            setSetupHotkeyNudge(true);
            await showWindow("settings");
            return;
          }
          setSetupHotkeyNudge(false);
          setPanel("main");
          setPhase("capturing");
          await platform.invoke("capture_start");
          captureArmed = true;
          setCard(null);
          await showWindow(undefined, false);
        } catch (err) {
          captureArmed = false;
          showRecoverableError(userSafeCaptureStartError(err), err);
        }
      }

      if (event.state === "Released") {
        if (!captureArmed) {
          return;
        }
        captureArmed = false;
        try {
          setPanel("main");
          setPhase("transcribing");
          await showWindow(undefined, false);
          const result = await platform.invoke<AnalysisCard>("capture_stop_and_analyze");
          setCard(result);
          setContextActive(true);
          try {
            const status = await platform.invoke<ContextStatusDto>("get_context_status");
            applyContextStatus(status);
          } catch {
            setContextEntryCount((value) => Math.max(1, value + 1));
            setCanRetryLastTranscript(true);
          }
          setPhase("ready");
        } catch (err) {
          showRecoverableError(userSafePipelineError(err), err);
        }
      }
    });

    await platform
      .invoke("log_client_event", {
        event: "hotkey_register_ok",
        detail: `hotkey=${hotkey}`,
      })
      .catch(() => undefined);
  }

  async function reloadBootstrap() {
    setPhase("booting");
    setError(null);
    setCommandErrorKind(null);
    setCopyNotice(null);
    setStatusDetail(null);
    setHotkeyFailed(false);
    setSetupHotkeyNudge(false);
    setSettingsFormHint(null);
    setDiagnosticLocalError(null);
    try {
      const boot = await platform.invoke<BootstrapDto>("load_bootstrap");
      setSettings(boot.settings);
      setDeepgramSaved(boot.deepgramKeyPresent);
      setLlmKeySaved(boot.llmKeyPresent);
      applyContextStatus({
        contextActive: boot.contextActive,
        entryCount: boot.contextEntryCount,
        lastTranscriptPreview: boot.lastTranscriptPreview ?? null,
        canRetryLastTranscript: boot.canRetryLastTranscript,
      });
      setLogStatus(boot.logStatus);
      setPanel(boot.runtimeReady ? "main" : "settings");
      try {
        await registerCurrentHotkey(boot.settings.hotkey);
      } catch (err) {
        setHotkeyFailed(true);
        const hint = userSafeHotkeyRegisterError(err, boot.settings.hotkey);
        if (boot.settings.hotkey === "Ctrl+Shift+Space") {
          setSettings("hotkey", "Ctrl+Alt+Space");
        }
        setCommandErrorKind(null);
        setError(hint);
        setSettingsFormHint(hint);
        setPhase("idle");
        setPanel("settings");
        return;
      }
      setPhase("idle");
      void memorySlice.loadMemorySpaces();
      void refreshRuntimeReadiness();
    } catch (err) {
      setCommandErrorKind(err);
      setError(userSafeBootstrapLoadError(err));
      setPhase("error");
    }
  }

  async function acknowledgeTrayIntro() {
    setSaving(true);
    setError(null);
    setCommandErrorKind(null);
    try {
      const savedSettings = await platform.invoke<AppSettings>("acknowledge_tray_intro");
      setSettings(savedSettings);
      setCopyNotice(strings().notices.trayIntroHidden);
    } catch (err) {
      setCommandErrorKind(err);
      setError(userSafeTrayAckSaveError(err));
      setPhase("error");
    } finally {
      setSaving(false);
    }
  }

  async function persistSettings() {
    setSaving(true);
    setError(null);
    setCommandErrorKind(null);
    setSettingsFormHint(null);
    await platform
      .invoke("log_client_event", {
        event: "settings_save_attempt",
        detail: `hotkey=${settings.hotkey}`,
      })
      .catch(() => undefined);

    try {
      const input: AppSettings = {
        schemaVersion: settings.schemaVersion,
        hotkey: settings.hotkey,
        llmBaseUrl: settings.llmBaseUrl,
        llmModel: settings.llmModel,
        notebookLmEnabled: settings.notebookLmEnabled,
        notebookLmLaunchUrl: settings.notebookLmLaunchUrl,
        primaryLanguage: settings.primaryLanguage,
        deepgramModel: settings.deepgramModel,
        captureMaxSeconds: settings.captureMaxSeconds,
        llmTemperature: settings.llmTemperature,
        useStreamingStt: settings.useStreamingStt,
        customSystemPrompt: settings.customSystemPrompt,
        trayIntroSeen: settings.trayIntroSeen,
      };

      await platform.invoke("save_settings", { input });
      setSettings(input);
      void platform.invoke("refresh_tray_menu").catch(() => undefined);

      if (draftSecrets.deepgramApiKey.trim()) {
        await platform.invoke("save_secret", {
          slot: "deepgramApiKey",
          value: draftSecrets.deepgramApiKey,
        });
        setDraftSecrets("deepgramApiKey", "");
        setDeepgramSaved(true);
      }

      if (draftSecrets.llmApiKey.trim()) {
        await platform.invoke("save_secret", {
          slot: "llmApiKey",
          value: draftSecrets.llmApiKey,
        });
        setDraftSecrets("llmApiKey", "");
        setLlmKeySaved(true);
      }

      try {
        await registerCurrentHotkey(input.hotkey);
        setHotkeyFailed(false);
      } catch (err) {
        setHotkeyFailed(true);
        const hint = userSafeHotkeyRegisterError(err, input.hotkey);
        setCommandErrorKind(null);
        setError(fmtSettingsSavedButHotkey(hint, strings()));
        setSettingsFormHint(hint);
        await platform
          .invoke("log_client_event", {
            event: "hotkey_register_failed",
            detail: `${input.hotkey}: ${invokeErrorMessage(err)}`,
          })
          .catch(() => undefined);
        setPhase("idle");
        return;
      }

      const nextSetupRequired =
        !(deepgramSaved() || Boolean(draftSecrets.deepgramApiKey.trim())) ||
        !isConfiguredLlmRoute(input.llmBaseUrl, input.llmModel);

      setCopyNotice(
        nextSetupRequired
          ? strings().notices.settingsSavedPartial
          : strings().notices.settingsSaved,
      );
      setSettingsFormHint(null);
      if (!nextSetupRequired) {
        setSetupHotkeyNudge(false);
        setPanel("main");
      }
      const nextLogStatus = await platform.invoke<LogStatusDto>("get_log_status").catch(() => null);
      if (nextLogStatus) setLogStatus(nextLogStatus);
    } catch (err) {
      setCommandErrorKind(err);
      const mapped = mapSettingsSaveError(err);
      if (mapped) {
        setSettingsFormHint(mapped);
        setPhase("idle");
      } else {
        setError(userSafePersistOuterError(err));
        setPhase("idle");
      }
    } finally {
      setSaving(false);
    }
  }

  const contextBadge = createMemo(() => `${contextEntryCount()}/3`);

  async function refreshMemorySavedCardPreview() {
    const id = activeSpaceId();
    if (!id) {
      setMemorySavedCardPreview(null);
      return;
    }
    try {
      const record = await platform.invoke<MemorySpaceRecord>("memory_get_space_record", {
        spaceId: id,
      });
      const saved = record.facts.filter((f) => f.sourceKind === "saved_card");
      setMemorySavedCardPreview(saved.length > 0 ? saved[saved.length - 1]!.text : null);
    } catch {
      setMemorySavedCardPreview(null);
    }
  }

  const memorySlice = createMemorySlice({
    platform,
    strings,
    card,
    activeSpaceId,
    setMemorySpaces,
    setActiveSpaceId,
    setSettingsFormHint,
    setCopyNotice,
    setError,
    onMemoryRecordChanged: refreshMemorySavedCardPreview,
  });

  const runtimeSlice = createRuntimeSlice({
    platform,
    strings,
    panel,
    card,
    logStatus,
    tryWriteClipboard,
    showWindow,
    showRecoverableError,
    setError,
    setStatusDetail,
    setPhase,
    setCopyNotice,
    applyContextStatus,
    setSettingsFormHint,
    setHealthCheckBusy,
    setHealthCheck,
    setDiagnosticBusy,
    setDiagnosticLocalError,
    setPanel,
    setLogStatus,
  });

  async function clearContext() {
    await runtimeSlice.clearContext();
  }

  async function retryAnalysis() {
    setCommandErrorKind(null);
    const result = await runtimeSlice.retryAnalysis();
    if (result) {
      setCard(result);
    }
  }

  async function collectSupportBundle() {
    await runtimeSlice.collectSupportBundle();
  }

  async function copyLogPath() {
    await runtimeSlice.copyLogPath();
  }

  async function copyAnswer() {
    await runtimeSlice.copyAnswer();
  }

  async function copySection(section: "gist" | "sayNow" | "nextMove") {
    await runtimeSlice.copySection(section);
  }

  async function openNotebookLm() {
    await runtimeSlice.openNotebookLm(settings.notebookLmEnabled, settings.notebookLmLaunchUrl);
  }

  async function runHealthCheck() {
    await runtimeSlice.runHealthCheck();
  }

  async function quitApp() {
    await platform.invoke("quit_app");
  }

  async function hideWindow() {
    await platform.window.hide();
  }

  async function startDragging() {
    await platform.window.startDragging();
  }

  function toggleSettingsPanel() {
    const next = panel() === "settings" ? "main" : "settings";
    setPanel(next);
    if (next === "settings") {
      void refreshRuntimeReadiness();
    }
  }

  function openSettingsPanel() {
    setPanel("settings");
    void refreshRuntimeReadiness();
  }

  function openMainPanel() {
    void showWindow("main");
  }

  function setHotkeyFromInput(value: string) {
    setSettings("hotkey", value);
  }

  function captureHotkeyInput(event: KeyboardEvent) {
    event.preventDefault();
    const hotkey = formatHotkeyFromEvent(event);
    if (hotkey) {
      setSettings("hotkey", hotkey);
    }
  }

  function setCaptureMaxSecondsFromInput(value: string) {
    const next = Number.parseInt(value, 10);
    setSettings(
      "captureMaxSeconds",
      Number.isFinite(next) ? next : DEFAULT_SETTINGS.captureMaxSeconds,
    );
  }

  function setDeepgramApiKeyDraft(value: string) {
    setDraftSecrets("deepgramApiKey", value);
  }

  function setLlmApiKeyDraft(value: string) {
    setDraftSecrets("llmApiKey", value);
  }

  function setLlmBaseUrl(value: string) {
    setSettings("llmBaseUrl", value);
  }

  function setLlmModel(value: string) {
    setSettings("llmModel", value);
  }

  function setNotebookLmEnabled(value: boolean) {
    setSettings("notebookLmEnabled", value);
  }

  function setNotebookLmLaunchUrl(value: string) {
    setSettings("notebookLmLaunchUrl", value);
  }

  function setCustomSystemPrompt(value: string | null) {
    setSettings("customSystemPrompt", value);
  }

  function setUseStreamingStt(value: boolean) {
    setSettings("useStreamingStt", value);
  }

  function setShowAdvanced(value: boolean) {
    setSettings("showAdvanced", value);
  }

  onMount(() => {
    let disposed = false;
    const cleanups: Array<() => void> = [];

    onCleanup(() => {
      disposed = true;
      for (const cleanup of cleanups.splice(0)) {
        cleanup();
      }
      void platform.shortcuts.unregisterAll();
    });

    void (async () => {
      /* Bootstrap before event wiring so the UI (and tests) are not blocked on listen/setup ordering. */
      await reloadBootstrap();
      if (disposed) {
        return;
      }

      const unlistenClose = await platform.window.onCloseRequested(async (event) => {
        event.preventDefault();
        await platform.window.hide();
      });
      if (disposed) {
        unlistenClose();
        return;
      }
      cleanups.push(unlistenClose);

      const unlistenStatus = await platform.listen<StatusEvent>("replyline://status", (event) => {
        const nextPhase = event.payload.phase as Phase;
        if (["transcribing", "analyzing", "ready"].includes(nextPhase)) {
          setPhase(nextPhase);
        }
        setStatusDetail(event.payload.detail ?? null);
      });
      if (disposed) {
        unlistenStatus();
        return;
      }
      cleanups.push(unlistenStatus);

      const unlistenOpenSettings = await platform.listen("replyline://open-settings", async () => {
        await showWindow("settings");
        void refreshRuntimeReadiness();
      });
      if (disposed) {
        unlistenOpenSettings();
        return;
      }
      cleanups.push(unlistenOpenSettings);

      const unlistenContextCleared = await platform.listen("replyline://context-cleared", () => {
        setContextActive(false);
        setContextEntryCount(0);
        setContextTranscriptPreview(null);
        setCanRetryLastTranscript(false);
        setCopyNotice(strings().notices.contextCleared);
      });
      if (disposed) {
        unlistenContextCleared();
        return;
      }
      cleanups.push(unlistenContextCleared);

      const unlistenCollectDiagnostic = await platform.listen(
        "replyline://collect-diagnostic",
        async () => runtimeSlice.onCollectDiagnosticEvent(),
      );
      if (disposed) {
        unlistenCollectDiagnostic();
        return;
      }
      cleanups.push(unlistenCollectDiagnostic);

      const unlistenCopyReadiness = await platform.listen(
        "replyline://copy-runtime-readiness",
        () => {
          void copyRuntimeReadinessJson();
        },
      );
      if (disposed) {
        unlistenCopyReadiness();
        return;
      }
      cleanups.push(unlistenCopyReadiness);
    })();
  });

  createEffect(() => {
    activeSpaceId();
    void refreshMemorySavedCardPreview();
  });

  createEffect(() => {
    if (phase() === "booting") {
      return;
    }
    const { phase: trayPhase, detail } = traySyncPayload({
      phase: phase(),
      statusDetail: statusDetail(),
      setupRequired: setupRequired(),
      hotkeyFailed: hotkeyFailed(),
      hasError: Boolean(error()),
    });
    void platform.invoke("sync_tray_ui_phase", { phase: trayPhase, detail }).catch(() => {
      /* offline / teardown */
    });
  });

  return {
    strings,
    phase,
    panel,
    card,
    error,
    statusDetail,
    deepgramSaved,
    llmKeySaved,
    contextActive,
    contextEntryCount,
    contextTranscriptPreview,
    canRetryLastTranscript,
    runtimeReadiness,
    lastCommandErrorKind,
    settingsScrollAnchor,
    devFixtureBusy,
    saving,
    diagnosticBusy,
    diagnosticLocalError,
    copyNotice,
    hotkeyFailed,
    setupHotkeyNudge,
    settingsFormHint,
    logStatus,
    healthCheck,
    healthCheckBusy,
    settings,
    draftSecrets,
    setupRequired,
    llmRouteIsPlaceholder,
    llmRouteConfigured,
    notebookLmLaunchReady,
    hotkeyFilled,
    pipelineActive,
    phaseLabel,
    livePhaseHeadline,
    livePhaseSub,
    statusPillClass,
    alphaLanguageLabel,
    shortUrlForUi,
    reloadBootstrap,
    acknowledgeTrayIntro,
    persistSettings,
    clearContext,
    retryAnalysis,
    collectSupportBundle,
    copyLogPath,
    copyAnswer,
    copySection,
    contextBadge,
    openNotebookLm,
    runHealthCheck,
    quitApp,
    hideWindow,
    startDragging,
    toggleSettingsPanel,
    openSettingsPanel,
    openMainPanel,
    setHotkeyFromInput,
    captureHotkeyInput,
    setCaptureMaxSecondsFromInput,
    setDeepgramApiKeyDraft,
    setLlmApiKeyDraft,
    setLlmBaseUrl,
    setLlmModel,
    setNotebookLmEnabled,
    setNotebookLmLaunchUrl,
    setCustomSystemPrompt,
    setUseStreamingStt,
    setShowAdvanced,
    setPanel,
    memorySpaces,
    activeSpaceId,
    setActiveSpaceId,
    loadMemorySpaces: memorySlice.loadMemorySpaces,
    createMemorySpace: memorySlice.createMemorySpace,
    saveCardToMemory: memorySlice.saveCardToMemory,
    removeLastSavedCardFromMemory: memorySlice.removeLastSavedCardFromMemory,
    memorySavedCardPreview,
    copyRuntimeReadinessJson,
    copyTicketPayloadJson,
    openSettingsToAnchor,
    clearSettingsScrollAnchor,
    runDevFixtureAnalysis,
    collectTicketSupportPackage,
  };
}

export type ReplylineController = ReturnType<typeof useReplylineController>;
