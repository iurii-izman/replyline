import { Show } from "solid-js";
import type { ReplylineController } from "../controller";

export function InsightStrip(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  return (
    <section class="secondary-insights" data-testid="secondary-insight-cards">
      {/* Gist — one-line question context */}
      <section
        class="result-section result-section--compact insight-section--gist"
        data-testid="section-gist"
        title={st().card.gistHint}
      >
        <div class="result-label">{st().card.gistLabel}</div>
        <p class="result-text">{controller().card()?.gist?.trim() || st().card.emptyGistCompact}</p>
      </section>

      {/* Next move — what to do next */}
      <section
        class="result-section result-section--compact insight-section--next"
        data-testid="section-next-move"
        title={st().card.nextMoveHint}
      >
        <div class="result-label">{st().card.nextMoveLabel}</div>
        <p class="result-text">
          {controller().card()?.nextMove?.trim() || st().card.emptyNextMoveCompact}
        </p>
      </section>

      {/* Evidence — supporting facts */}
      <Show when={controller().card()?.starEvidence?.trim()}>
        <section
          class="result-section result-section--compact insight-section--evidence"
          data-testid="section-star-evidence"
        >
          <div class="result-label">{st().card.starEvidenceLabel}</div>
          <p class="result-text">{controller().card()?.starEvidence?.trim()}</p>
        </section>
      </Show>

      {/* Risk / clarifier */}
      <Show when={controller().card()?.riskOrClarifier?.trim()}>
        <section
          class="result-section result-section--compact insight-section--risk"
          data-testid="section-risk-clarifier"
        >
          <div class="result-label">{st().card.riskOrClarifierLabel}</div>
          <p class="result-text">{controller().card()?.riskOrClarifier?.trim()}</p>
        </section>
      </Show>
    </section>
  );
}
