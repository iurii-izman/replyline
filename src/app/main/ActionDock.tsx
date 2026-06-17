import type { ReplylineController } from "../controller";

export function ActionDock(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  return (
    <div class="action-bar sticky-action-footer app-sticky-footer" data-testid="action-row">
      <button
        class="btn-secondary"
        type="button"
        disabled={!controller().canRetry()}
        title={controller().retryDisabledReason() ?? ""}
        aria-label={st().card.retryCard}
        onClick={() => void controller().retryAnalysis()}
      >
        {st().card.retryCard}
      </button>
      <button
        class="btn-danger btn-ghost"
        type="button"
        disabled={!controller().canClear()}
        title={controller().clearDisabledReason() ?? ""}
        aria-label={st().card.clearContext}
        onClick={() => void controller().clearContext()}
      >
        {st().card.clearContext}
      </button>
    </div>
  );
}
