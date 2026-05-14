import { Show } from "solid-js";
import type { ReplylineController } from "./controller";

export function MainSurface(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  return (
    <Show when={controller().panel() === "main"}>
      <section class="main-card">
        <div class="status-pill">{controller().phaseLabel()}</div>

        <Show when={controller().setupRequired()}>
          <div class="empty-card">
            <h2 class="section-title">{st().setup.title}</h2>
            <p class="section-copy">{st().setup.body}</p>
            <button class="btn-primary" type="button" onClick={() => controller().openSettingsPanel()}>
              {st().setup.openSetup}
            </button>
          </div>
        </Show>

        <Show when={controller().card()}>
          {(resolvedCard) => (
            <article class="result-card">
              <section class="result-section">
                <div class="result-label">{st().card.gistLabel}</div>
                <p class="result-text">{resolvedCard().gist}</p>
              </section>

              <section class="result-section result-section--primary">
                <div class="result-label">{st().card.sayNowLabel}</div>
                <p class="result-text result-text--speak">{resolvedCard().sayNow}</p>
              </section>

              <section class="result-section">
                <div class="result-label">{st().card.nextMoveLabel}</div>
                <p class="result-text">{resolvedCard().nextMove}</p>
              </section>
            </article>
          )}
        </Show>

        <div class="result-actions">
          <button class="btn-primary" type="button" onClick={() => void controller().copySection("sayNow")}>{st().card.copySayNow}</button>
          <button class="btn-secondary" type="button" onClick={() => void controller().retryAnalysis()}>{st().card.retryCard}</button>
          <button class="btn-ghost" type="button" onClick={() => void controller().clearContext()}>{st().card.clearContext}</button>
        </div>
      </section>
    </Show>
  );
}
