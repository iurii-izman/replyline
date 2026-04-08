import { Show } from "solid-js";

import type { ReplylineController } from "./controller";
import { ui } from "./locale";

export function MainSurface(props: { controller: ReplylineController }) {
  const controller = () => props.controller;

  return (
    <>
      <Show when={controller().phase() === "booting"}>
        <section class="main-card boot-card">
          <p class="section-copy boot-copy">{ui.boot.loading}</p>
        </section>
      </Show>

      <Show when={controller().phase() === "error" && controller().panel() !== "settings"}>
        <section class="main-card boot-card">
          <h2 class="section-title">{ui.startError.title}</h2>
          <p class="section-copy">{ui.startError.body}</p>
          <div class="settings-actions">
            <button class="btn-primary" type="button" onClick={() => void controller().reloadBootstrap()}>
              {ui.startError.retryLoad}
            </button>
            <button class="btn-ghost" type="button" onClick={() => controller().openSettingsPanel()}>
              {ui.startError.toSetup}
            </button>
          </div>
        </section>
      </Show>

      <Show
        when={
          controller().phase() !== "booting" &&
          controller().panel() === "main" &&
          controller().phase() !== "error"
        }
      >
        <section class="main-card">
          <Show
            when={!controller().setupRequired()}
            fallback={
              <div class="empty-card setup-needed-card">
                <h2 class="section-title">{ui.setup.title}</h2>
                <p class="section-copy">{ui.setup.body}</p>
                <ol class="setup-steps">
                  <li>{ui.setup.step1}</li>
                  <li>{ui.setup.step2}</li>
                  <li>{ui.setup.step3}</li>
                </ol>
                <button class="btn-primary" type="button" onClick={() => controller().openSettingsPanel()}>
                  {ui.setup.openSetup}
                </button>
                <Show when={controller().settings.notebookLmEnabled}>
                  <button class="btn-ghost" type="button" onClick={() => void controller().openNotebookLm()}>
                    {ui.card.openNotebookLm}
                  </button>
                </Show>
              </div>
            }
          >
            <Show when={controller().pipelineActive()}>
              <div class={`live-phase-block live-phase-block--${controller().phase()}`} aria-live="polite">
                <div class="live-phase-pulse" aria-hidden="true" />
                <div class="live-phase-headline">{controller().livePhaseHeadline()}</div>
                <p class="live-phase-sub">{controller().livePhaseSub()}</p>
              </div>
            </Show>

            <Show when={controller().card()}>
              {(resolvedCard) => (
                <article
                  class={`result-card${controller().pipelineActive() ? " is-superseded" : ""}`}
                  aria-busy={controller().pipelineActive()}
                >
                  <Show when={controller().pipelineActive()}>
                    <p class="result-superseded-hint">{ui.card.supersededHint}</p>
                  </Show>

                  <section class="result-section">
                    <div class="result-label-row">
                      <div class="result-label">{ui.card.gistLabel}</div>
                      <button
                        class="copy-section-btn"
                        type="button"
                        title={ui.card.copyToClipboardTitle}
                        onClick={() => void controller().copySection("gist")}
                      >
                        ⎘
                      </button>
                    </div>
                    <p class="result-text">{resolvedCard().gist}</p>
                  </section>

                  <section class="result-section result-section--primary">
                    <div class="result-label-row">
                      <div class="result-label">{ui.card.sayNowLabel}</div>
                      <button
                        class="copy-section-btn"
                        type="button"
                        title={ui.card.copyToClipboardTitle}
                        onClick={() => void controller().copySection("sayNow")}
                      >
                        ⎘
                      </button>
                    </div>
                    <p class="result-text result-text--speak">{resolvedCard().sayNow}</p>
                  </section>

                  <section class="result-section">
                    <div class="result-label-row">
                      <div class="result-label">{ui.card.nextMoveLabel}</div>
                      <button
                        class="copy-section-btn"
                        type="button"
                        title={ui.card.copyToClipboardTitle}
                        onClick={() => void controller().copySection("nextMove")}
                      >
                        ⎘
                      </button>
                    </div>
                    <p class="result-text">{resolvedCard().nextMove}</p>
                  </section>

                  <div class="result-actions">
                    <button
                      class="btn-primary"
                      type="button"
                      disabled={controller().pipelineActive()}
                      title={ui.card.copyToClipboardTitle}
                      onClick={() => void controller().copyAnswer()}
                    >
                      {ui.card.copySayNow}
                    </button>
                    <button
                      class="btn-secondary"
                      type="button"
                      disabled={controller().pipelineActive()}
                      title={ui.card.retryCardTitle}
                      onClick={() => void controller().retryAnalysis()}
                    >
                      {ui.card.retryCard}
                    </button>
                    <button
                      class="btn-ghost"
                      type="button"
                      disabled={controller().pipelineActive()}
                      title={ui.card.clearContextTitle}
                      onClick={() => void controller().clearContext()}
                    >
                      {ui.card.clearContext}
                    </button>
                    <Show when={controller().memorySpaces().length > 0}>
                      <button
                        class="btn-ghost"
                        type="button"
                        disabled={controller().pipelineActive() || !controller().activeSpaceId()}
                        onClick={() => void controller().saveCardToMemory()}
                      >
                        {ui.memory.saveToMemory}
                      </button>
                    </Show>
                    <Show when={controller().settings.notebookLmEnabled}>
                      <button
                        class="btn-ghost"
                        type="button"
                        disabled={controller().pipelineActive()}
                        onClick={() => void controller().openNotebookLm()}
                      >
                        {ui.card.openNotebookLm}
                      </button>
                    </Show>
                  </div>
                  <Show when={controller().contextTranscriptPreview()}>
                    <details class="last-transcript-block">
                      <summary>{ui.card.lastTranscriptLabel}</summary>
                      <p class="last-transcript-hint">{ui.card.lastTranscriptHint}</p>
                      <p class="last-transcript-text">{controller().contextTranscriptPreview()}</p>
                    </details>
                  </Show>
                </article>
              )}
            </Show>

            <Show when={!controller().card() && !controller().pipelineActive()}>
              <div class="empty-card">
                <h2 class="section-title">
                  {ui.idle.title}
                  <Show when={controller().contextActive()}>
                    <span class="context-badge">{controller().contextBadge()}</span>
                  </Show>
                </h2>
                <p class="section-copy">
                  <strong>Удержите</strong> <strong>{controller().settings.hotkey}</strong> на нужной реплике,
                  <strong> отпустите</strong> — звук → текст → одна карточка (суть, сейчас,
                  дальше). Максимум <strong>{controller().settings.captureMaxSeconds} с</strong> за раз.
                </p>
                <Show when={controller().settings.notebookLmEnabled}>
                  <div class="result-actions">
                    <button class="btn-ghost" type="button" onClick={() => void controller().openNotebookLm()}>
                      {ui.card.openNotebookLm}
                    </button>
                  </div>
                </Show>
                <Show when={controller().contextTranscriptPreview()}>
                  <details class="last-transcript-block last-transcript-block--idle">
                    <summary>{ui.card.lastTranscriptLabel}</summary>
                    <p class="last-transcript-hint">{ui.card.lastTranscriptHint}</p>
                    <p class="last-transcript-text">{controller().contextTranscriptPreview()}</p>
                  </details>
                </Show>
              </div>
            </Show>
          </Show>
        </section>
      </Show>
    </>
  );
}
