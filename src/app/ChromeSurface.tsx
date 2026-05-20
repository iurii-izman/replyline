import { Show } from "solid-js";

import type { ReplylineController } from "./controller";

export function ShellChrome(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const activeSection = () => {
    if (controller().panel() === "settings") return st().header.sectionSettings;
    if (controller().panel() === "candidatePackStudio") return st().header.sectionStudio;
    return st().header.sectionMain;
  };
  const headerStatus = () => {
    if (controller().phase() === "capturing") return st().header.statusCapturing;
    if (controller().pipelineActive()) return st().header.statusAnalyzing;
    if (controller().card()?.sayNow?.trim()) return st().header.statusAnswerReady;
    if (controller().setupRequired()) return st().header.statusSetup;
    return st().header.statusReady;
  };

  return (
    <div class="shell-chrome">
      <header class="shell-header app-header">
        <div class="shell-header-drag app-header-brand" data-testid="app-header-brand">
          <div class="app-name">{st().appName}</div>
          <div class="app-subtitle">{st().appSubtitle}</div>
        </div>
        <div class="app-header-context" data-testid="app-header-context">
          <span class="app-header-section">{activeSection()}</span>
          <span class="app-header-divider" aria-hidden="true">
            ·
          </span>
          <span class="app-header-status">{headerStatus()}</span>
        </div>
        <div class="header-actions">
          <button
            class="icon-btn"
            type="button"
            title={st().settings.title}
            onClick={() => controller().toggleSettingsPanel()}
          >
            ⚙
          </button>
          <button
            class="icon-btn"
            type="button"
            title={st().chrome.hideToTray}
            onClick={() => void controller().hideWindow()}
          >
            ⤓
          </button>
        </div>
      </header>
    </div>
  );
}

export function MessagesAndFooter(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  return (
    <Show when={controller().notice()}>
      {(notice) => (
        <div class="notice-center" aria-live="polite" aria-atomic="true">
          <div
            class={`notice-item ${notice().tone === "error" ? "is-error" : "is-info"}`}
            role={notice().tone === "error" ? "alert" : "status"}
          >
            <span class="notice-item-text">{notice().message}</span>
          </div>
        </div>
      )}
    </Show>
  );
}
