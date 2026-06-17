import { Show } from "solid-js";
import type { ReplylineController } from "../controller";

export function InsightStrip(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  return (
    <section class="secondary-insights" data-testid="secondary-insight-cards">
      <section class="result-section result-section--compact" data-testid="section-gist">
        <div class="result-label">{st().card.gistLabel}</div>
        <p class="result-meta">{st().card.gistHint}</p>
        <p class="result-text">{controller().card()?.gist?.trim() || st().card.emptyGistCompact}</p>
      </section>
      <section class="result-section result-section--compact" data-testid="section-next-move">
        <div class="result-label">{st().card.nextMoveLabel}</div>
        <p class="result-meta">{st().card.nextMoveHint}</p>
        <p class="result-text">
          {controller().card()?.nextMove?.trim() || st().card.emptyNextMoveCompact}
        </p>
      </section>
      <Show when={controller().card()?.starEvidence?.trim()}>
        <section class="result-section result-section--compact" data-testid="section-star-evidence">
          <div class="result-label">{st().card.starEvidenceLabel}</div>
          <p class="result-text">{controller().card()?.starEvidence?.trim()}</p>
        </section>
      </Show>
      <Show when={controller().card()?.riskOrClarifier?.trim()}>
        <section
          class="result-section result-section--compact"
          data-testid="section-risk-clarifier"
        >
          <div class="result-label">{st().card.riskOrClarifierLabel}</div>
          <p class="result-text">{controller().card()?.riskOrClarifier?.trim()}</p>
        </section>
      </Show>
    </section>
  );
}
