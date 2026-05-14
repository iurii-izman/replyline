import { Show } from "solid-js";

import type { ReplylineController } from "./controller";

export function ShellChrome(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  return (
    <div class="shell-chrome">
      <header class="shell-header">
        <div class="shell-header-drag" onMouseDown={() => void controller().startDragging()}>
          <div class="app-name">{st().appName}</div>
          <div class="app-subtitle">{st().appSubtitle}</div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" type="button" title={st().startError.toSetup} onClick={() => controller().toggleSettingsPanel()}>⚙</button>
          <button class="icon-btn" type="button" title={st().chrome.hideToTray} onClick={() => void controller().hideWindow()}>⤓</button>
          <button class="icon-btn" type="button" title={st().chrome.closeApp} onClick={() => void controller().quitApp()}>×</button>
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
          <div class={`notice-item ${notice().tone === "error" ? "is-error" : "is-info"}`} role={notice().tone === "error" ? "alert" : "status"}>
            <span class="error-bar-text">{notice().message}</span>
          </div>
        </div>
      )}
    </Show>
  );
}
