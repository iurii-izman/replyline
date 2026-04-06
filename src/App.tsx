import { Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  isRegistered,
  register,
  unregisterAll,
} from "@tauri-apps/plugin-global-shortcut";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import "./App.css";

type Phase =
  | "booting"
  | "idle"
  | "capturing"
  | "transcribing"
  | "analyzing"
  | "ready"
  | "error";

type Panel = "main" | "settings";

type AppSettings = {
  schemaVersion: number;
  hotkey: string;
  llmBaseUrl: string;
  llmModel: string;
  primaryLanguage: string;
  deepgramModel: string;
  captureMaxSeconds: number;
};

type BootstrapDto = {
  settings: AppSettings;
  deepgramKeyPresent: boolean;
  llmKeyPresent: boolean;
  contextActive: boolean;
};

type AnalysisCard = {
  gist: string;
  sayNow: string;
  nextMove: string;
};

type StatusEvent = {
  phase: string;
  detail?: string | null;
};

const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 1,
  hotkey: "Ctrl+Shift+Space",
  llmBaseUrl: "http://127.0.0.1:4000/v1",
  llmModel: "gpt-4o-mini",
  primaryLanguage: "ru",
  deepgramModel: "nova-3",
  captureMaxSeconds: 30,
};

const windowRef = getCurrentWindow();

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

function formatHotkeyFromEvent(ev: KeyboardEvent): string | null {
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

function App() {
  const [phase, setPhase] = createSignal<Phase>("booting");
  const [panel, setPanel] = createSignal<Panel>("main");
  const [card, setCard] = createSignal<AnalysisCard | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [statusDetail, setStatusDetail] = createSignal<string | null>(null);
  const [deepgramSaved, setDeepgramSaved] = createSignal(false);
  const [llmKeySaved, setLlmKeySaved] = createSignal(false);
  const [contextActive, setContextActive] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [copyNotice, setCopyNotice] = createSignal<string | null>(null);

  const [settings, setSettings] = createStore<AppSettings>({ ...DEFAULT_SETTINGS });
  const [draftSecrets, setDraftSecrets] = createStore({
    deepgramApiKey: "",
    llmApiKey: "",
  });

  const setupRequired = createMemo(
    () => !deepgramSaved() || !settings.llmBaseUrl.trim() || !settings.llmModel.trim()
  );
  const phaseLabel = createMemo(() => {
    switch (phase()) {
      case "booting":
        return "Подготовка…";
      case "capturing":
        return "Запись фрагмента";
      case "transcribing":
        return "Распознаю фрагмент";
      case "analyzing":
        return "Собираю ответ";
      case "ready":
        return "Карточка готова";
      case "error":
        return "Нужна проверка";
      default:
        return "Готово";
    }
  });

  async function showWindow(panelName?: Panel, focus = true) {
    if (panelName) setPanel(panelName);
    await windowRef.show();
    if (focus) {
      await windowRef.setFocus();
    }
  }

  async function registerCurrentHotkey(hotkey: string) {
    await unregisterAll();
    const alreadyRegistered = await isRegistered(hotkey);
    if (alreadyRegistered) {
      throw new Error("Эта горячая клавиша уже занята внутри приложения.");
    }
    await register(hotkey, async (event) => {
      if (event.state === "Pressed") {
        try {
          setError(null);
          setCopyNotice(null);
          setStatusDetail(null);
          if (setupRequired()) {
            setPhase("idle");
            await showWindow("settings");
            return;
          }
          setPanel("main");
          setPhase("capturing");
          await invoke("capture_start");
          await showWindow(undefined, false);
        } catch (err) {
          setError(String(err));
          setPhase("error");
        }
      }
      if (event.state === "Released") {
        try {
          setPanel("main");
          setPhase("transcribing");
          await showWindow(undefined, false);
          const result = await invoke<AnalysisCard>("capture_stop_and_analyze");
          setCard(result);
          setContextActive(true);
          setPhase("ready");
        } catch (err) {
          setError(String(err));
          setPhase("error");
        }
      }
    });
  }

  async function reloadBootstrap() {
    const boot = await invoke<BootstrapDto>("load_bootstrap");
    setSettings(boot.settings);
    setDeepgramSaved(boot.deepgramKeyPresent);
    setLlmKeySaved(boot.llmKeyPresent);
    setContextActive(boot.contextActive);
    setPanel(boot.deepgramKeyPresent ? "main" : "settings");
    await registerCurrentHotkey(boot.settings.hotkey);
    setPhase("idle");
  }

  async function persistSettings() {
    setSaving(true);
    setError(null);
    try {
      await invoke("save_settings", { input: settings });
      if (draftSecrets.deepgramApiKey.trim()) {
        await invoke("save_secret", {
          slot: "deepgramApiKey",
          value: draftSecrets.deepgramApiKey,
        });
        setDraftSecrets("deepgramApiKey", "");
        setDeepgramSaved(true);
      }
      if (draftSecrets.llmApiKey.trim()) {
        await invoke("save_secret", {
          slot: "llmApiKey",
          value: draftSecrets.llmApiKey,
        });
        setDraftSecrets("llmApiKey", "");
        setLlmKeySaved(true);
      }
      await registerCurrentHotkey(settings.hotkey);
      setCopyNotice("Настройки сохранены.");
      if (!setupRequired()) {
        setPanel("main");
      }
    } catch (err) {
      setError(String(err));
      setPhase("error");
    } finally {
      setSaving(false);
    }
  }

  async function clearContext() {
    try {
      const status = await invoke<{ contextActive: boolean }>("clear_context");
      setContextActive(status.contextActive);
      setCopyNotice("Контекст очищен.");
    } catch (err) {
      setError(String(err));
      setPhase("error");
    }
  }

  async function retryAnalysis() {
    setError(null);
    setPhase("analyzing");
    setStatusDetail("Пробую ещё раз…");
    try {
      const result = await invoke<AnalysisCard>("retry_last_analysis");
      setCard(result);
      setPhase("ready");
    } catch (err) {
      setError(String(err));
      setPhase("error");
    }
  }

  async function copyAnswer() {
    const value = card()?.sayNow?.trim();
    if (!value) return;
    await writeText(value);
    setCopyNotice("Ответ скопирован.");
  }

  onMount(async () => {
    const unlistenClose = await windowRef.onCloseRequested(async (event) => {
      event.preventDefault();
      await windowRef.hide();
    });

    const unlistenStatus = await listen<StatusEvent>("replyline://status", (event) => {
      const nextPhase = event.payload.phase as Phase;
      if (["transcribing", "analyzing", "ready"].includes(nextPhase)) {
        setPhase(nextPhase);
      }
      setStatusDetail(event.payload.detail ?? null);
    });

    const unlistenOpenSettings = await listen("replyline://open-settings", async () => {
      await showWindow("settings");
    });

    const unlistenContextCleared = await listen("replyline://context-cleared", () => {
      setContextActive(false);
      setCopyNotice("Контекст очищен.");
    });

    onCleanup(() => {
      unlistenClose();
      unlistenStatus();
      unlistenOpenSettings();
      unlistenContextCleared();
      void unregisterAll();
    });

    await reloadBootstrap();
  });

  return (
    <main class="shell">
      <header
        class="shell-header"
        onMouseDown={() => {
          void windowRef.startDragging();
        }}
      >
        <div>
          <div class="app-name">Replyline</div>
          <div class="app-subtitle">snippet helper for hard work calls</div>
        </div>
        <div class="header-actions">
          <button
            class="icon-btn"
            type="button"
            title="Настройки"
            onClick={() => setPanel(panel() === "settings" ? "main" : "settings")}
          >
            ⚙
          </button>
          <button
            class="icon-btn"
            type="button"
            title="Скрыть"
            onClick={() => {
              void windowRef.hide();
            }}
          >
            ×
          </button>
        </div>
      </header>

      <section class="status-strip">
        <div class={`status-pill is-${phase()}`}>{phaseLabel()}</div>
        <div class="hotkey-pill">{settings.hotkey} · ≤ {settings.captureMaxSeconds}с</div>
      </section>

      <Show when={panel() === "settings"}>
        <section class="settings-card">
          <h2 class="section-title">Настройки</h2>
          <p class="section-copy">
            Захват идёт только пока вы удерживаете горячую клавишу. Фрагмент
            уходит во внешние STT/LLM сервисы, которые вы настраиваете сами.
          </p>

          <label class="field">
            <span class="field-label">Горячая клавиша</span>
            <input
              class="field-input"
              value={settings.hotkey}
              onKeyDown={(event) => {
                event.preventDefault();
                const hotkey = formatHotkeyFromEvent(event as KeyboardEvent);
                if (hotkey) {
                  setSettings("hotkey", hotkey);
                }
              }}
              onInput={(event) => setSettings("hotkey", event.currentTarget.value)}
            />
          </label>

          <label class="field">
            <span class="field-label">LLM base URL</span>
            <input
              class="field-input"
              value={settings.llmBaseUrl}
              onInput={(event) => setSettings("llmBaseUrl", event.currentTarget.value)}
            />
          </label>

          <label class="field">
            <span class="field-label">LLM model</span>
            <input
              class="field-input"
              value={settings.llmModel}
              onInput={(event) => setSettings("llmModel", event.currentTarget.value)}
            />
          </label>

          <label class="field">
            <span class="field-label">Лимит одного захвата, секунды</span>
            <input
              class="field-input"
              type="number"
              min="5"
              max="180"
              value={String(settings.captureMaxSeconds)}
              onInput={(event) => {
                const next = Number.parseInt(event.currentTarget.value, 10);
                setSettings(
                  "captureMaxSeconds",
                  Number.isFinite(next) ? next : DEFAULT_SETTINGS.captureMaxSeconds
                );
              }}
            />
            <span class="field-hint">
              Для live-ответа рекомендуем 5–60 секунд. 120–180 секунд оставлены как
              экспериментальный режим: контекста больше, но latency уже заметно хуже
              и менее предсказуем.
            </span>
          </label>

          <label class="field">
            <span class="field-label">
              Deepgram API key {deepgramSaved() ? <span class="saved-badge">сохранён</span> : null}
            </span>
            <input
              class="field-input"
              type="password"
              value={draftSecrets.deepgramApiKey}
              placeholder={deepgramSaved() ? "обновить ключ" : "вставьте ключ"}
              onInput={(event) =>
                setDraftSecrets("deepgramApiKey", event.currentTarget.value)
              }
            />
          </label>

          <label class="field">
            <span class="field-label">
              LLM API key {llmKeySaved() ? <span class="saved-badge">сохранён</span> : <span class="saved-badge is-muted">не обязателен</span>}
            </span>
            <input
              class="field-input"
              type="password"
              value={draftSecrets.llmApiKey}
              placeholder="если gateway требует bearer token"
              onInput={(event) => setDraftSecrets("llmApiKey", event.currentTarget.value)}
            />
          </label>

          <div class="settings-actions">
            <button class="btn-primary" type="button" disabled={saving()} onClick={() => void persistSettings()}>
              {saving() ? "Сохраняю…" : "Сохранить"}
            </button>
            <button class="btn-ghost" type="button" onClick={() => setPanel("main")}>
              Назад
            </button>
          </div>
        </section>
      </Show>

      <Show when={panel() === "main"}>
        <section class="main-card">
          <Show
            when={!setupRequired()}
            fallback={
              <div class="empty-card">
                <h2 class="section-title">Нужна настройка</h2>
                <p class="section-copy">
                  Сохраните как минимум hotkey, Deepgram key и LLM route, чтобы
                  включить живой snippet flow.
                </p>
                <button class="btn-primary" type="button" onClick={() => setPanel("settings")}>
                  Открыть настройки
                </button>
              </div>
            }
          >
            <Show
              when={card()}
              fallback={
                <div class="empty-card">
                  <h2 class="section-title">Готово к захвату</h2>
                  <p class="section-copy">
                    Удерживайте <strong>{settings.hotkey}</strong> во время сложной
                    реплики, отпустите и получите короткую карточку: суть, что
                    сказать сейчас и следующий ход. Текущий лимит одного захвата:
                    {" "}
                    <strong>{settings.captureMaxSeconds}с</strong>.
                  </p>
                </div>
              }
            >
              {(resolvedCard) => (
                <article class="result-card">
                  <section class="result-section">
                    <div class="result-label">Суть</div>
                    <p class="result-text">{resolvedCard().gist}</p>
                  </section>

                  <section class="result-section result-section--primary">
                    <div class="result-label">Скажи сейчас</div>
                    <p class="result-text result-text--speak">{resolvedCard().sayNow}</p>
                  </section>

                  <section class="result-section">
                    <div class="result-label">Дальше</div>
                    <p class="result-text">{resolvedCard().nextMove}</p>
                  </section>

                  <div class="result-actions">
                    <button class="btn-primary" type="button" onClick={() => void copyAnswer()}>
                      Копировать
                    </button>
                    <button class="btn-secondary" type="button" onClick={() => void retryAnalysis()}>
                      Повторить
                    </button>
                    <button class="btn-ghost" type="button" onClick={() => void clearContext()}>
                      Сбросить контекст
                    </button>
                  </div>
                </article>
              )}
            </Show>
          </Show>
        </section>
      </Show>

      <footer class="footer-strip">
        <div class="footer-copy">
          {statusDetail() ??
            (contextActive()
              ? "Эфемерный контекст активен. Он живёт только в памяти."
              : "Контекст пуст. Ничего не сохраняется на диск по умолчанию.")}
        </div>
      </footer>

      <Show when={copyNotice()}>
        <div class="notice-bar">{copyNotice()}</div>
      </Show>

      <Show when={error()}>
        <div class="error-bar">{error()}</div>
      </Show>
    </main>
  );
}

export default App;
