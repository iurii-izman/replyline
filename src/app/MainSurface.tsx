import { Show } from "solid-js";

import type { ReplylineController } from "./controller";
import { pipelineStageForPhase } from "./model";

export function MainSurface(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  return (
    <>
      <Show when={controller().phase() === "booting"}>
        <section class="main-card boot-card">
          <p class="section-copy boot-copy">{st().boot.loading}</p>
        </section>
      </Show>

      <Show when={controller().phase() === "error" && controller().panel() !== "settings"}>
        <section class="main-card boot-card">
          <h2 class="section-title">{st().startError.title}</h2>
          <p class="section-copy">{controller().error() ?? st().startError.body}</p>
          <div class="settings-actions">
            <button
              class="btn-primary"
              type="button"
              onClick={() => void controller().reloadBootstrap()}
            >
              {st().startError.retryLoad}
            </button>
            <button
              class="btn-ghost"
              type="button"
              onClick={() => controller().openSettingsPanel()}
            >
              {st().startError.toSetup}
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
          <div class="main-focus-top">
            <div class={`status-pill ${controller().statusPillClass()}`}>{controller().phaseLabel()}</div>
            <ol class="pipeline-timeline" aria-label={st().pipeline.ariaLabel}>
              {(["capture", "stt", "llm", "card"] as const).map((stage) => {
                const current = pipelineStageForPhase(controller().phase());
                const done =
                  current === "card" ||
                  (current === "llm" && (stage === "capture" || stage === "stt")) ||
                  (current === "stt" && stage === "capture");
                const active = current === stage;
                return (
                  <li class={`pipeline-stage${done ? " is-done" : ""}${active ? " is-active" : ""}`}>
                    {st().pipeline[stage]}
                  </li>
                );
              })}
            </ol>
            <Show when={controller().pipelineActive()}>
              <p class="elapsed-chip" aria-live="polite">
                {st().livePhase.elapsedLabel}: {controller().elapsedSeconds()}s
              </p>
            </Show>
          </div>

          <Show
            when={!controller().setupRequired()}
            fallback={
              <div class="empty-card setup-needed-card">
                <h2 class="section-title">{st().setup.title}</h2>
                <p class="section-copy">{st().setup.body}</p>
                <ol class="setup-steps">
                  <li>{st().setup.step1}</li>
                  <li>{st().setup.step2}</li>
                  <li>{st().setup.step3}</li>
                </ol>
                <button
                  class="btn-primary"
                  type="button"
                  onClick={() => controller().openSettingsPanel()}
                >
                  {st().setup.openSetup}
                </button>
              </div>
            }
          >
            <Show when={controller().pipelineActive()}>
              <div
                class={`live-phase-block live-phase-block--${controller().phase()}`}
                aria-live="polite"
              >
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
                    <p class="result-superseded-hint">{st().card.supersededHint}</p>
                  </Show>

                  <section class="result-section">
                    <div class="result-label-row">
                      <div class="result-label">{st().card.gistLabel}</div>
                      <button
                        class="copy-section-btn"
                        type="button"
                        title={st().card.copyToClipboardTitle}
                        aria-label={`${st().card.copyToClipboardTitle}: ${st().card.gistLabel}`}
                        onClick={() => void controller().copySection("gist")}
                      >
                        ⎘
                      </button>
                    </div>
                    <p class="result-text">{resolvedCard().gist}</p>
                  </section>

                  <section class="result-section result-section--primary">
                    <div class="result-label-row">
                      <div class="result-label">{st().card.sayNowLabel}</div>
                      <button
                        class="copy-section-btn"
                        type="button"
                        title={st().card.copyToClipboardTitle}
                        aria-label={`${st().card.copyToClipboardTitle}: ${st().card.sayNowLabel}`}
                        onClick={() => void controller().copySection("sayNow")}
                      >
                        ⎘
                      </button>
                    </div>
                    <p class="result-text result-text--speak">{resolvedCard().sayNow}</p>
                  </section>

                  <section class="result-section">
                    <div class="result-label-row">
                      <div class="result-label">{st().card.nextMoveLabel}</div>
                      <button
                        class="copy-section-btn"
                        type="button"
                        title={st().card.copyToClipboardTitle}
                        aria-label={`${st().card.copyToClipboardTitle}: ${st().card.nextMoveLabel}`}
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
                      title={st().card.copyToClipboardTitle}
                      onClick={() => void controller().copyAnswer()}
                    >
                      {st().card.copySayNow}
                    </button>
                    <button
                      class="btn-secondary"
                      type="button"
                      disabled={controller().pipelineActive()}
                      title={st().card.retryCardTitle}
                      onClick={() => void controller().retryAnalysis()}
                    >
                      {st().card.retryCard}
                    </button>
                    <button
                      class="btn-ghost"
                      type="button"
                      disabled={controller().pipelineActive()}
                      title={st().card.clearContextTitle}
                      onClick={() => void controller().clearContext()}
                    >
                      {st().card.clearContext}
                    </button>
                    <Show when={controller().settings.showAdvanced && controller().memorySpaces().length > 0}>
                      <button
                        class="btn-ghost"
                        type="button"
                        disabled={controller().pipelineActive() || !controller().activeSpaceId()}
                        onClick={() => void controller().saveCardToMemory()}
                      >
                        {st().memory.saveToMemory}
                      </button>
                    </Show>
                  </div>
                  <Show when={controller().settings.showAdvanced && controller().contextTranscriptPreview()}>
                    <details class="last-transcript-block">
                      <summary>{st().card.lastTranscriptLabel}</summary>
                      <p class="last-transcript-hint">{st().card.lastTranscriptHint}</p>
                      <p class="last-transcript-text">{controller().contextTranscriptPreview()}</p>
                    </details>
                  </Show>
                </article>
              )}
            </Show>

            <Show when={!controller().card() && !controller().pipelineActive()}>
              <div class="empty-card">
                <h2 class="section-title">
                  {st().idle.title}
                  <Show when={controller().contextActive()}>
                    <span class="context-badge">{controller().contextBadge()}</span>
                  </Show>
                </h2>
                <p class="section-copy">
                  <strong>{st().idle.captureHold}</strong>{" "}
                  <strong>{controller().settings.hotkey}</strong> {st().idle.captureMid}{" "}
                  <strong>{st().idle.captureRelease}</strong> {st().idle.capturePipeline}{" "}
                  {st().idle.captureMaxPrefix}{" "}
                  <strong>
                    {controller().settings.captureMaxSeconds} {st().copyFmt.secondUnit}
                  </strong>{" "}
                  {st().idle.captureMaxSuffix}
                </p>
                <Show when={controller().settings.showAdvanced && controller().contextTranscriptPreview()}>
                  <details class="last-transcript-block last-transcript-block--idle">
                    <summary>{st().card.lastTranscriptLabel}</summary>
                    <p class="last-transcript-hint">{st().card.lastTranscriptHint}</p>
                    <p class="last-transcript-text">{controller().contextTranscriptPreview()}</p>
                  </details>
                </Show>
              </div>
            </Show>
          </Show>
          <div class="main-primary-actions">
            <button class="btn-primary" type="button" onClick={() => controller().openSettingsPanel()}>
              {st().startError.toSetup}
            </button>
            <Show when={!controller().card()}>
              <button
                class="btn-secondary"
                type="button"
                disabled={controller().pipelineActive()}
                onClick={() => void controller().retryAnalysis()}
              >
                {st().card.retryCard}
              </button>
            </Show>
          </div>
        </section>
      </Show>
    </>
  );
}
