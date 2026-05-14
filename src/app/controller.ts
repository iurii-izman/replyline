import { createEffect, createMemo, createSignal, onCleanup, onMount, type Accessor } from "solid-js";
import { createStore } from "solid-js/store";
import {
  DEFAULT_SETTINGS,
  formatHotkeyFromEvent,
  invokeErrorMessage,
  isConfiguredLlmRoute,
  mapSettingsSaveError,
  parseCommandInvokeError,
  userSafeBootstrapLoadError,
  userSafeCaptureStartError,
  userSafeClearContextError,
  userSafePipelineError,
  type AnalysisCard,
  type AppSettings,
  type BootstrapDto,
  type CommandErrorKind,
  type ContextStatusDto,
  type Panel,
  type Phase,
  type StatusEvent,
} from "./model";
import { getUi, type UiStrings } from "./locale";
import { phaseLabelFor, traySyncPayload } from "./controller_status";
import type { AppPlatform } from "./platform";

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
  const [copyNotice, setCopyNotice] = createSignal<string | null>(null);
  const [hotkeyFailed, setHotkeyFailed] = createSignal(false);
  const [settingsFormHint, setSettingsFormHint] = createSignal<string | null>(null);
  const [lastCommandErrorKind, setLastCommandErrorKind] = createSignal<CommandErrorKind | null>(null);

  const [settings, setSettings] = createStore<AppSettings>({ ...DEFAULT_SETTINGS });
  const [draftSecrets, setDraftSecrets] = createStore({ deepgramApiKey: "", llmApiKey: "" });

  const strings: Accessor<UiStrings> = createMemo(() => getUi("ru"));
  const setupRequired = createMemo(() => !deepgramSaved() || !isConfiguredLlmRoute(settings.llmBaseUrl, settings.llmModel));
  const phaseLabel = createMemo(() => phaseLabelFor(phase(), setupRequired(), hotkeyFailed(), strings()));
  const pipelineActive = createMemo(() => ["capturing", "transcribing", "analyzing"].includes(phase()));

  function setCommandErrorKind(err: unknown | null) {
    if (err == null) return setLastCommandErrorKind(null);
    setLastCommandErrorKind(parseCommandInvokeError(err)?.kind ?? null);
  }

  function applyContextStatus(status: ContextStatusDto) {
    setContextActive(status.contextActive);
    setContextEntryCount(status.entryCount);
  }

  async function showWindow(panelName?: Panel) {
    if (panelName) setPanel(panelName);
    await platform.window.show();
    await platform.window.setFocus();
  }

  async function registerCurrentHotkey(hotkey: string) {
    await platform.shortcuts.unregisterAll();
    const alreadyRegistered = await platform.shortcuts.isRegistered(hotkey);
    if (alreadyRegistered) throw new Error(strings().notices.hotkeyAlreadyRegistered);
    let armed = false;
    await platform.shortcuts.register(hotkey, async (event) => {
      if (event.state === "Pressed") {
        if (pipelineActive()) return;
        setError(null);
        setCopyNotice(null);
        if (setupRequired()) {
          setPanel("settings");
          setPhase("idle");
          await showWindow("settings");
          return;
        }
        setPhase("capturing");
        try {
          await platform.invoke("capture_start");
          armed = true;
          setCard(null);
        } catch (err) {
          armed = false;
          setError(userSafeCaptureStartError());
          setCommandErrorKind(err);
          setPhase("idle");
        }
      }
      if (event.state === "Released") {
        if (!armed) return;
        armed = false;
        setPhase("transcribing");
        try {
          const result = await platform.invoke<AnalysisCard>("capture_stop_and_analyze");
          setCard(result);
          setContextActive(true);
          const status = await platform.invoke<ContextStatusDto>("get_context_status");
          applyContextStatus(status);
          setPhase("ready");
        } catch (err) {
          setCommandErrorKind(err);
          setError(userSafePipelineError(err));
          setPhase("idle");
        }
      }
    });
  }

  async function reloadBootstrap() {
    setPhase("booting");
    setError(null);
    try {
      const boot = await platform.invoke<BootstrapDto>("load_bootstrap");
      setSettings({ ...DEFAULT_SETTINGS, ...boot.settings });
      setDeepgramSaved(boot.deepgramKeyPresent);
      setLlmKeySaved(boot.llmKeyPresent);
      setContextActive(boot.contextActive);
      setContextEntryCount(boot.contextEntryCount);
      setPanel(boot.runtimeReady ? "main" : "settings");
      await registerCurrentHotkey(boot.settings.hotkey);
      setPhase("idle");
    } catch (err) {
      setError(userSafeBootstrapLoadError());
      setCommandErrorKind(err);
      setPhase("error");
    }
  }

  async function persistSettings() {
    setSaving(true);
    setSettingsFormHint(null);
    try {
      const input: AppSettings = { ...settings };
      await platform.invoke("save_settings", { input });
      if (draftSecrets.deepgramApiKey.trim()) {
        await platform.invoke("save_secret", { slot: "deepgramApiKey", value: draftSecrets.deepgramApiKey });
        setDraftSecrets("deepgramApiKey", "");
        setDeepgramSaved(true);
      }
      if (draftSecrets.llmApiKey.trim()) {
        await platform.invoke("save_secret", { slot: "llmApiKey", value: draftSecrets.llmApiKey });
        setDraftSecrets("llmApiKey", "");
        setLlmKeySaved(true);
      }
      await registerCurrentHotkey(input.hotkey);
      setHotkeyFailed(false);
      setCopyNotice(setupRequired() ? strings().notices.settingsSavedPartial : strings().notices.settingsSaved);
      if (!setupRequired()) setPanel("main");
    } catch (err) {
      setCommandErrorKind(err);
      setSettingsFormHint(mapSettingsSaveError(err) ?? invokeErrorMessage(err));
      setHotkeyFailed(true);
    } finally {
      setSaving(false);
    }
  }

  async function clearContext() {
    try {
      const status = await platform.invoke<ContextStatusDto>("clear_context");
      applyContextStatus(status);
      setCopyNotice(strings().notices.contextCleared);
    } catch (err) {
      setError(userSafeClearContextError());
      setCommandErrorKind(err);
    }
  }

  async function retryAnalysis() {
    setPhase("analyzing");
    setStatusDetail(strings().notices.retrying);
    try {
      const result = await platform.invoke<AnalysisCard>("retry_last_analysis");
      setCard(result);
      const status = await platform.invoke<ContextStatusDto>("get_context_status");
      applyContextStatus(status);
      setPhase("ready");
      setStatusDetail(null);
    } catch (err) {
      setError(userSafePipelineError(err));
      setCommandErrorKind(err);
      setPhase("idle");
    }
  }

  async function copySection(section: "sayNow") {
    const value = card()?.[section]?.trim();
    if (!value) return;
    await platform.clipboard.writeText(value);
    setCopyNotice(strings().notices.sayNowCopied);
  }

  function captureHotkeyInput(event: KeyboardEvent) {
    event.preventDefault();
    const hotkey = formatHotkeyFromEvent(event);
    if (hotkey) setSettings("hotkey", hotkey);
  }

  onMount(() => {
    const cleanups: Array<() => void> = [];
    onCleanup(() => {
      for (const c of cleanups) c();
      void platform.shortcuts.unregisterAll();
    });
    void reloadBootstrap();
    void (async () => {
      cleanups.push(
        await platform.listen<StatusEvent>("replyline://status", (event) => {
          const nextPhase = event.payload.phase as Phase;
          if (["transcribing", "analyzing", "ready"].includes(nextPhase)) setPhase(nextPhase);
          setStatusDetail(event.payload.detail ?? null);
        }),
      );
      cleanups.push(
        await platform.listen("replyline://open-settings", async () => {
          await showWindow("settings");
        }),
      );
      cleanups.push(
        await platform.listen("replyline://context-cleared", () => {
          setContextActive(false);
          setContextEntryCount(0);
          setCopyNotice(strings().notices.contextCleared);
        }),
      );
    })();
  });

  createEffect(() => {
    if (phase() === "booting") return;
    const { phase: trayPhase, detail } = traySyncPayload({
      phase: phase(),
      statusDetail: statusDetail(),
      setupRequired: setupRequired(),
      hotkeyFailed: hotkeyFailed(),
      hasError: Boolean(error()),
    });
    void platform.invoke("sync_tray_ui_phase", { phase: trayPhase, detail }).catch(() => undefined);
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
    saving,
    copyNotice,
    hotkeyFailed,
    settingsFormHint,
    settings,
    draftSecrets,
    setupRequired,
    phaseLabel,
    pipelineActive,
    lastCommandErrorKind,
    reloadBootstrap,
    persistSettings,
    clearContext,
    retryAnalysis,
    copySection,
    toggleSettingsPanel: () => setPanel(panel() === "settings" ? "main" : "settings"),
    openSettingsPanel: () => setPanel("settings"),
    openMainPanel: () => setPanel("main"),
    hideWindow: () => platform.window.hide(),
    quitApp: () => platform.invoke("quit_app"),
    startDragging: () => platform.window.startDragging(),
    captureHotkeyInput,
    setHotkeyFromInput: (value: string) => setSettings("hotkey", value),
    setCaptureMaxSecondsFromInput: (value: string) => {
      const next = Number.parseInt(value, 10);
      setSettings("captureMaxSeconds", Number.isFinite(next) ? next : DEFAULT_SETTINGS.captureMaxSeconds);
    },
    setDeepgramApiKeyDraft: (value: string) => setDraftSecrets("deepgramApiKey", value),
    setLlmApiKeyDraft: (value: string) => setDraftSecrets("llmApiKey", value),
    setLlmBaseUrl: (value: string) => setSettings("llmBaseUrl", value),
    setLlmModel: (value: string) => setSettings("llmModel", value),
    setError,
    setCopyNotice,
  };
}

export type ReplylineController = ReturnType<typeof useReplylineController>;
