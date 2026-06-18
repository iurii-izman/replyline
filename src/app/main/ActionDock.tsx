import { Show } from "solid-js";
import type { ReplylineController } from "../controller";

export function ActionDock(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  return (
    <div class="action-bar sticky-action-footer app-sticky-footer" data-testid="action-row">
      <div class="action-dock-item">
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
        <Show when={!controller().canRetry() && controller().retryDisabledReason()}>
          <span class="action-disabled-reason" data-testid="retry-disabled-reason">
            {controller().retryDisabledReason()}
          </span>
        </Show>
      </div>
      <div class="action-dock-item">
        <button
          class="btn-ghost"
          type="button"
          disabled={!controller().canClear()}
          title={controller().clearDisabledReason() ?? ""}
          aria-label={st().card.clearContext}
          onClick={() => void controller().clearContext()}
        >
          {st().card.clearContext}
        </button>
        <Show when={!controller().canClear() && controller().clearDisabledReason()}>
          <span class="action-disabled-reason" data-testid="clear-disabled-reason">
            {controller().clearDisabledReason()}
          </span>
        </Show>
      </div>
    </div>
  );
}
