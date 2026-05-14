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
  type MainUiState,
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
  const [captureQuality, setCaptureQuality] = createSignal<"short" | "normal" | "long">("normal");
  const [deepgramSaved, setDeepgramSaved] = createSignal(false);
  const [llmKeySaved, setLlmKeySaved] = createSignal(false);
  const [contextActive, setContextActive] = createSignal(false);
  const [contextEntryCount, setContextEntryCount] = createSignal(0);
  const [saving, setSaving] = createSignal(false);
  const [notice, setNotice] = createSignal<{ tone: "info" | "error"; message: string } | null>(null);
  const [hotkeyFailed, setHotkeyFailed] = createSignal(false);
  const [settingsFormHint, setSettingsFormHint] = createSignal<string | null>(null);
  const [lastCommandErrorKind, setLastCommandErrorKind] = createSignal<CommandErrorKind | null>(null);

  const [settings, setSettings] = createStore<AppSettings>({ ...DEFAULT_SETTINGS });
  const [draftSecrets, setDraftSecrets] = createStore({ deepgramApiKey: "", llmApiKey: "" });

  const strings: Accessor<UiStrings> = createMemo(() => getUi("ru"));
  const setupRequired = createMemo(() => !deepgramSaved() || !isConfiguredLlmRoute(settings.llmBaseUrl, settings.llmModel));
  const phaseLabel = createMemo(() => phaseLabelFor(phase(), setupRequired(), hotkeyFailed(), strings()));
  const pipelineActive = createMemo(() => ["capturing", "transcribing", "analyzing"].includes(phase()));
  const mainUiState = createMemo<MainUiState>(() => {
    if (phase() === "capturing") return "capturing";
    if (phase() === "transcribing") return "transcribing";
    if (phase() === "analyzing") return "analyzing";
    if (phase() === "ready" && card()) return "ready";
    if (error()) return "error";
    return "idle";
  });
  const canCopySayNow = createMemo(() => mainUiState() === "ready" && Boolean(card()?.sayNow?.trim()));
  const canRetry = createMemo(() => !pipelineActive() && Boolean(card()));
  const canClear = createMemo(() => !pipelineActive() && (contextActive() || Boolean(card())));
  const copyDisabledReason = createMemo(() => (canCopySayNow() ? null : strings().card.copyDisabledNoCard));
  const retryDisabledReason = createMemo(() => {
    if (canRetry()) return null;
    return pipelineActive() ? strings().card.retryDisabledBusy : strings().card.retryDisabledNoCard;
  });
  const clearDisabledReason = createMemo(() => {
    if (canClear()) return null;
    return pipelineActive() ? strings().card.clearDisabledBusy : strings().card.clearDisabledNoCard;
  });

  let noticeTimer: ReturnType<typeof setTimeout> | null = null;

  function clearNoticeTimer() {
    if (!noticeTimer) return;
    clearTimeout(noticeTimer);
    noticeTimer = null;
  }

  function pushNotice(next: { tone: "info" | "error"; message: string }, durationMs = 2800) {
    clearNoticeTimer();
    setNotice(next);
    noticeTimer = setTimeout(() => {
      setNotice(null);
      noticeTimer = null;
    }, durationMs);
  }

  function dismissNotice() {
    clearNoticeTimer();
    setNotice(null);
  }

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
        dismissNotice();
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
          pushNotice({ tone: "error", message: userSafeCaptureStartError() });
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
          setCaptureQuality(result.charsBand === "short" ? "short" : result.charsBand === "long" ? "long" : "normal");
          setContextActive(true);
          const status = await platform.invoke<ContextStatusDto>("get_context_status");
          applyContextStatus(status);
          setPhase("ready");
        } catch (err) {
          setCommandErrorKind(err);
          setError(userSafePipelineError(err));
          if (invokeErrorMessage(err).includes("SHORT_CAPTURE")) setCaptureQuality("short");
          pushNotice({ tone: "error", message: userSafePipelineError(err) });
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
      pushNotice({
        tone: "info",
        message: setupRequired() ? strings().notices.settingsSavedPartial : strings().notices.settingsSaved,
      });
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
      setError(null);
      const status = await platform.invoke<ContextStatusDto>("clear_context");
      applyContextStatus(status);
      setCard(null);
      setPhase("idle");
      pushNotice({ tone: "info", message: strings().notices.contextCleared });
    } catch (err) {
      setError(userSafeClearContextError());
      pushNotice({ tone: "error", message: userSafeClearContextError() });
      setCommandErrorKind(err);
    }
  }

  async function retryAnalysis() {
    setError(null);
    setPhase("analyzing");
    pushNotice({ tone: "info", message: strings().notices.retrying });
    setStatusDetail(strings().notices.retrying);
    try {
      const result = await platform.invoke<AnalysisCard>("retry_last_analysis");
      setCard(result);
      setCaptureQuality(result.charsBand === "short" ? "short" : result.charsBand === "long" ? "long" : "normal");
      const status = await platform.invoke<ContextStatusDto>("get_context_status");
      applyContextStatus(status);
      setPhase("ready");
      setStatusDetail(null);
      pushNotice({ tone: "info", message: strings().notices.retryDone });
    } catch (err) {
      setError(userSafePipelineError(err));
      pushNotice({ tone: "error", message: userSafePipelineError(err) });
      setCommandErrorKind(err);
      setPhase("idle");
    }
  }

  async function copySection(section: "sayNow") {
    setError(null);
    const value = card()?.[section]?.trim();
    if (!value || !canCopySayNow()) return;
    await platform.clipboard.writeText(value);
    pushNotice({ tone: "info", message: strings().notices.sayNowCopied });
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
      clearNoticeTimer();
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
          setCard(null);
          setPhase("idle");
          pushNotice({ tone: "info", message: strings().notices.contextCleared });
        }),
      );
    })();
  });

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const editable =
        target instanceof Element
          ? Boolean(target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"))
          : false;
      if (event.key === "Escape") {
        dismissNotice();
        setError(null);
        return;
      }
      if (panel() !== "main" || editable) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        if (!canCopySayNow()) return;
        event.preventDefault();
        void copySection("sayNow");
        return;
      }
      if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "r") {
        if (!canRetry()) return;
        event.preventDefault();
        void retryAnalysis();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
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
    captureQuality,
    deepgramSaved,
    llmKeySaved,
    contextActive,
    contextEntryCount,
    saving,
    notice,
    hotkeyFailed,
    settingsFormHint,
    settings,
    draftSecrets,
    setupRequired,
    phaseLabel,
    pipelineActive,
    mainUiState,
    canCopySayNow,
    canRetry,
    canClear,
    copyDisabledReason,
    retryDisabledReason,
    clearDisabledReason,
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
    dismissNotice,
  };
}

export type ReplylineController = ReturnType<typeof useReplylineController>;
