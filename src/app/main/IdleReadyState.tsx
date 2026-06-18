import { Show, createMemo } from "solid-js";
import type { ReplylineController } from "../controller";

export function IdleReadyState(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const steps = createMemo(() => controller().setupSteps());
  const activeSessionQuestions = createMemo(
    () => controller().interviewSession()?.questions.length ?? 0,
  );

  return (
    <section class="readiness-state readiness-state--centered" data-testid="main-state-idle">
      <div class="readiness-dot" aria-hidden="true" />
      <h2 class="readiness-title">{st().header.statusReady}</h2>
      <p class="readiness-instruction" data-testid="readiness-instruction">
        {st().card.idleReadyInstruction}
      </p>
      <div class="status-rail" data-testid="readiness-status-rail">
        <span class={`status-rail-chip ${steps()[0]?.ready ? "is-ready" : ""}`}>
          {st().card.readinessSpeech}
        </span>
        <span class={`status-rail-chip ${steps()[1]?.ready ? "is-ready" : ""}`}>
          {st().card.readinessReply}
        </span>
        <span class={`status-rail-chip ${steps()[2]?.ready ? "is-ready" : ""}`}>
          {st().card.readinessHotkey}
        </span>
      </div>
      <div class="action-group">
        <button
          class="btn-primary"
          type="button"
          data-testid="idle-open-context-btn"
          onClick={() => controller().openContextPackPanel()}
        >
          {st().contextPack.manageCtx}
        </button>
        <button
          class="btn-secondary"
          type="button"
          onClick={() => controller().openSettingsPanel()}
        >
          {st().card.errorFixAction}
        </button>
      </div>
      <p class="idle-context-hint" data-testid="idle-context-value-hint">
        {st().contextPack.idleValueHint}
      </p>
      <div class="idle-secondary-area" data-testid="idle-secondary-area">
        <Show when={controller().interviewSession()}>
          <p class="empty-flow-hint" data-testid="idle-session-chip">
            {st().card.interview.sessionChipPrefix} {activeSessionQuestions()}
          </p>
        </Show>
        <button
          class="btn-ghost btn-sm"
          type="button"
          data-testid="idle-interview-secondary-btn"
          onClick={() => void controller().startInterviewSession()}
        >
          {st().card.interview.secondaryOpen}
        </button>
        <span class="secondary-hint" data-testid="idle-interview-secondary-hint">
          {st().card.interview.secondaryHint}
        </span>
      </div>
    </section>
  );
}
