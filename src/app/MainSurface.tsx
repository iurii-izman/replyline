import { Show } from "solid-js";
import type { ReplylineController } from "./controller";

export function MainSurface(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  return (
    <Show when={controller().panel() === "main"}>
      <section class="main-card">
        <div class="status-pill">{controller().phaseLabel()}</div>
        <Show when={controller().mainUiState() === "idle" && !controller().setupRequired()}>
          <p class="empty-flow-hint">{st().card.emptyFlow}</p>
        </Show>
        <Show when={controller().setupRequired()}>
          <p class="empty-flow-hint">
            {st().setup.body}{" "}
            <button class="inline-link-btn" type="button" onClick={() => controller().openSettingsPanel()}>
              {st().setup.openSetup}
            </button>
          </p>
        </Show>

        <article class="result-card" data-testid="main-card-shell">
          <section class="result-section" data-testid="section-gist">
            <div class="result-label">{st().card.gistLabel}</div>
            <p class={`result-text ${controller().card()?.gist?.trim() ? "" : "result-text--placeholder"}`}>
              {controller().card()?.gist?.trim() || st().card.emptyGist}
            </p>
          </section>

          <section class="result-section result-section--primary" data-testid="section-say-now">
            <div class="result-label">{st().card.sayNowLabel}</div>
            <p class={`result-text result-text--speak ${controller().card()?.sayNow?.trim() ? "" : "result-text--placeholder"}`}>
              {controller().card()?.sayNow?.trim() || st().card.emptySayNow}
            </p>
          </section>

          <section class="result-section" data-testid="section-next-move">
            <div class="result-label">{st().card.nextMoveLabel}</div>
            <p class={`result-text ${controller().card()?.nextMove?.trim() ? "" : "result-text--placeholder"}`}>
              {controller().card()?.nextMove?.trim() || st().card.emptyNextMove}
            </p>
          </section>
        </article>

        <div class="result-actions" data-testid="action-row">
          <button
            class="btn-primary"
            type="button"
            disabled={!controller().canCopySayNow()}
            title={controller().copyDisabledReason() ?? ""}
            onClick={() => void controller().copySection("sayNow")}
          >
            {st().card.copySayNow}
          </button>
          <button
            class="btn-secondary"
            type="button"
            disabled={!controller().canRetry()}
            title={controller().retryDisabledReason() ?? ""}
            onClick={() => void controller().retryAnalysis()}
          >
            {st().card.retryCard}
          </button>
          <button
            class="btn-ghost"
            type="button"
            disabled={!controller().canClear()}
            title={controller().clearDisabledReason() ?? ""}
            onClick={() => void controller().clearContext()}
          >
            {st().card.clearContext}
          </button>
        </div>
      </section>
    </Show>
  );
}
