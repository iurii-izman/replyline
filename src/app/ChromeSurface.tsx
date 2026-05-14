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
    <div class="notice-center">
      <Show when={controller().copyNotice()}>
        <div class="notice-item is-info" role="status">
          <span class="error-bar-text">{controller().copyNotice()}</span>
        </div>
      </Show>
      <Show when={controller().error()}>
        <div class="notice-item is-error" role="alert">
          <span class="error-bar-text">{controller().error()}</span>
        </div>
      </Show>
    </div>
  );
}
