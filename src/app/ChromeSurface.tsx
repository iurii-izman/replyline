import { Show } from "solid-js";

import type { ReplylineController } from "./controller";
import { GearIcon, HideTrayIcon } from "./ui/icons";

export function ShellChrome(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const settingsSectionLabel = () => {
    const settingsSection = controller().settingsActiveSection();
    if (settingsSection === "speech") return st().settings.navSpeech;
    if (settingsSection === "llm") return st().settings.navLlm;
    if (settingsSection === "hotkey") return st().settings.navHotkey;
    if (settingsSection === "reports") return st().settings.navReports;
    if (settingsSection === "candidatePack") return st().settings.navCandidatePack;
    return st().settings.navOverview;
  };
  const activeSection = () => {
    if (controller().panel() === "settings") {
      const activeSettings = controller().settingsActiveSection();
      if (activeSettings === "overview") return st().header.sectionSettings;
      return `${st().header.sectionSettings} ${st().header.breadcrumbDivider} ${settingsSectionLabel()}`;
    }
    if (controller().panel() === "candidatePackStudio") return st().header.sectionStudio;
    return st().header.sectionMain;
  };
  const headerStatus = () => {
    if (controller().setupReadinessState() === "checking") return st().phase.booting;
    if (controller().phase() === "capturing") return st().header.statusCapturing;
    if (controller().phase() === "transcribing") return st().header.statusTranscribing;
    if (controller().phase() === "analyzing") return st().header.statusAnalyzing;
    if (controller().phase() === "error" || controller().error()) return st().header.statusError;
    if (controller().card()?.sayNow?.trim()) return st().header.statusAnswerReady;
    if (controller().setupRequired()) return st().header.statusSetup;
    return st().header.statusReady;
  };
  const phaseTone = () => {
    if (controller().setupReadinessState() === "checking") return "busy";
    if (controller().phase() === "capturing") return "capturing";
    if (controller().phase() === "transcribing" || controller().phase() === "analyzing")
      return "busy";
    if (controller().phase() === "error" || controller().error()) return "error";
    if (controller().card()?.sayNow?.trim()) return "ready";
    if (controller().setupRequired()) return "setup";
    return "idle";
  };
  const hotkeyHint = () => controller().settings.hotkey || "Ctrl+Alt+Space";

  return (
    <div class="shell-chrome">
      <header class="shell-header app-header">
        <div class="shell-header-drag app-header-brand" data-testid="app-header-brand">
          <div class="app-name">{st().appName}</div>
          <div class="app-subtitle">{st().appSubtitle}</div>
        </div>
        <div class="app-header-context" data-testid="app-header-context">
          <span class="app-header-section" data-testid="app-header-section">
            {activeSection()}
          </span>
        </div>
        <div class="app-header-phase-wrap">
          <span
            class={`app-header-phase app-header-phase--${phaseTone()}`}
            data-testid="app-header-phase"
          >
            <span class="app-header-phase-dot" aria-hidden="true" />
            <span class="app-header-phase-text">{headerStatus()}</span>
          </span>
          <span
            class="app-header-hotkey"
            data-testid="app-header-hotkey"
            aria-label={st().settings.hotkeyLabel}
          >
            {hotkeyHint()}
          </span>
        </div>
        <div class="header-actions">
          <button
            class="icon-btn"
            type="button"
            title={st().settings.title}
            aria-label={st().settings.title}
            data-testid="app-header-settings-action"
            onClick={() => controller().toggleSettingsPanel()}
          >
            <GearIcon class="ui-icon--18" />
          </button>
          <button
            class="icon-btn"
            type="button"
            title={st().chrome.hideToTray}
            aria-label={st().chrome.hideToTray}
            data-testid="app-header-hide-action"
            onClick={() => void controller().hideWindow()}
          >
            <HideTrayIcon class="ui-icon--18" />
          </button>
        </div>
      </header>
    </div>
  );
}

export function MessagesAndFooter(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  return (
    <Show when={controller().notice()}>
      {(notice) => (
        <div class="notice-center">
          <div class={`notice-item ${notice().tone === "error" ? "is-error" : "is-info"}`}>
            <output
              class="notice-item-text"
              aria-live={notice().tone === "error" ? "assertive" : "polite"}
              aria-atomic="true"
              role={notice().tone === "error" ? "alert" : "status"}
            >
              {notice().message}
            </output>
          </div>
        </div>
      )}
    </Show>
  );
}
