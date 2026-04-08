import { Show } from "solid-js";

import type { ReplylineController } from "./controller";
import { ui } from "./locale";
import { settingsAnchorForCommandErrorKind, type CommandErrorKind } from "./model";

export function ShellChrome(props: { controller: ReplylineController }) {
  const controller = () => props.controller;

  return (
    <div class="shell-chrome">
      <header class="shell-header">
        <div
          class="shell-header-drag"
          onMouseDown={() => {
            void controller().startDragging();
          }}
        >
          <div class="app-name">{ui.appName}</div>
          <div class="app-subtitle">{ui.appSubtitle}</div>
        </div>
        <div class="header-actions">
          <button
            class="icon-btn"
            type="button"
            title={ui.tray.settings}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              controller().toggleSettingsPanel();
            }}
          >
            ⚙
          </button>
          <button
            class="icon-btn"
            type="button"
            title={ui.chrome.hideToTray}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void controller().hideWindow();
            }}
          >
            ⤓
          </button>
          <button
            class="icon-btn"
            type="button"
            title={ui.chrome.closeApp}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void controller().quitApp();
            }}
          >
            ×
          </button>
        </div>
      </header>

      <section class="status-strip">
        <div class={`status-pill ${controller().statusPillClass()}`}>{controller().phaseLabel()}</div>
        <div class="hotkey-pill">
          {controller().settings.hotkey} · ≤ {controller().settings.captureMaxSeconds}с
        </div>
      </section>

      <Show
        when={
          controller().phase() !== "booting" &&
          controller().phase() !== "error" &&
          !controller().settings.trayIntroSeen
        }
      >
        <div class="intro-banner" role="status">
          <p class="intro-banner-copy">{ui.chrome.trayIntroCopy}</p>
          <button
            class="btn-secondary intro-banner-btn"
            type="button"
            disabled={controller().saving()}
            onClick={() => void controller().acknowledgeTrayIntro()}
          >
            {ui.chrome.trayIntroHide}
          </button>
        </div>
      </Show>
    </div>
  );
}

export function MessagesAndFooter(props: { controller: ReplylineController }) {
  const controller = () => props.controller;

  return (
    <>
      <div class="shell-messages">
        <Show when={controller().error()}>
          <div class="error-bar" role="alert">
            <span class="error-bar-text">{controller().error()}</span>
            <div class="error-bar-actions">
              <Show when={controller().hotkeyFailed() && controller().phase() !== "error"}>
                <button
                  type="button"
                  class="error-bar-action"
                  onClick={() => controller().openSettingsPanel()}
                >
                  {ui.startError.toSetup}
                </button>
              </Show>
              <Show when={controller().lastCommandErrorKind()}>
                {(kind) => {
                  const anchor = settingsAnchorForCommandErrorKind(kind as CommandErrorKind);
                  const label =
                    anchor === "stt"
                      ? ui.errorRoute.toStt
                      : anchor === "llm"
                        ? ui.errorRoute.toLlm
                        : anchor === "memory"
                          ? ui.errorRoute.toMemory
                          : ui.errorRoute.toHotkey;
                  return (
                    <button
                      type="button"
                      class="error-bar-action"
                      onClick={() => controller().openSettingsToAnchor(anchor)}
                    >
                      {label}
                    </button>
                  );
                }}
              </Show>
            </div>
          </div>
        </Show>
        <Show when={controller().copyNotice()}>
          <div class="notice-bar" role="status">
            {controller().copyNotice()}
          </div>
        </Show>
      </div>

      <footer class="footer-strip">
        <div class="footer-copy">
          {controller().phase() === "booting"
            ? ui.footer.loading
            : controller().phase() === "error"
              ? ui.footer.errorHint
              : controller().pipelineActive()
                ? (controller().statusDetail() ?? controller().livePhaseSub())
                : controller().statusDetail() ??
                  (controller().contextActive()
                    ? ui.footer.contextActive
                    : ui.footer.contextEmpty)}
        </div>
      </footer>
    </>
  );
}
