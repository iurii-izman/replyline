import { For, Show } from "solid-js";
import type { ReplylineController } from "./controller";

export function MainSurface(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const pipelineStages = () => [
    st().pipeline.capture,
    st().pipeline.text,
    st().pipeline.reply,
    st().pipeline.card,
  ];
  const activeStageIndex = () => {
    switch (controller().phase()) {
      case "capturing":
        return 0;
      case "transcribing":
        return 1;
      case "analyzing":
        return 2;
      case "ready":
        return 3;
      default:
        return -1;
    }
  };
  const pipelineStageClass = (index: number) => {
    const active = activeStageIndex();
    if (active === index) return "pipeline-stage is-active";
    if (active > index) return "pipeline-stage is-done";
    return "pipeline-stage";
  };
  const statusTone = () => {
    if (controller().mainUiState() === "error") return "is-error";
    if (controller().hotkeyFailed()) return "is-hotkey-fail";
    if (controller().setupRequired()) return "is-setup-needed";
    if (controller().phase() === "capturing") return "is-capturing";
    if (controller().phase() === "transcribing") return "is-transcribing";
    if (controller().phase() === "analyzing") return "is-analyzing";
    if (controller().phase() === "ready") return "is-ready";
    return "";
  };
  const statusHint = () => {
    if (controller().mainUiState() === "error") return st().card.errorHint;
    if (controller().mainUiState() === "ready") return st().card.readyHint;
    if (controller().pipelineActive())
      return controller().statusDetail() ?? st().card.processingHint;
    return st().card.emptyFlow;
  };
  const qualityLabel = () => {
    if (controller().captureQuality() === "short") return st().captureQuality.short;
    if (controller().captureQuality() === "long") return st().captureQuality.long;
    return st().captureQuality.normal;
  };

  return (
    <Show when={controller().panel() === "main"}>
      <section
        class={`main-card main-card--${controller().mainUiState()}`}
        data-testid="main-surface"
      >
        <div class="main-card-top" data-testid="main-card-top">
          <div class="main-status-row">
            <div class={`status-pill ${statusTone()}`}>{controller().phaseLabel()}</div>
          </div>
          <ol class="pipeline-timeline" aria-label={st().pipeline.label}>
            <For each={pipelineStages()}>
              {(label, index) => <li class={pipelineStageClass(index())}>{label}</li>}
            </For>
          </ol>
          <Show
            when={controller().setupRequired()}
            fallback={<p class="empty-flow-hint">{statusHint()}</p>}
          >
            <p class="empty-flow-hint">
              {st().setup.body}{" "}
              <button
                class="inline-link-btn"
                type="button"
                onClick={() => controller().openSettingsPanel()}
              >
                {st().setup.openSetup}
              </button>
            </p>
          </Show>
          <Show when={controller().card() !== null}>
            <p class="empty-flow-hint">
              {st().captureQuality.label}: {qualityLabel()}
              <Show when={controller().captureQuality() === "short"}>
                {" "}
                {st().card.shortCaptureHint}
              </Show>
            </p>
          </Show>
        </div>

        <div class="main-card-body" data-testid="main-card-body">
          <article class="result-card" data-testid="main-card-shell">
            <Show
              when={controller().card()?.mode === "interview"}
              fallback={
                <>
                  <section class="result-section" data-testid="section-gist">
                    <div class="result-label">{st().card.gistLabel}</div>
                    <p
                      class={`result-text ${controller().card()?.gist?.trim() ? "" : "result-text--placeholder"}`}
                    >
                      {controller().card()?.gist?.trim() || st().card.emptyGist}
                    </p>
                  </section>

                  <section class="result-section result-section--primary" data-testid="section-say-now">
                    <div class="result-label">{st().card.sayNowLabel}</div>
                    <p
                      class={`result-text result-text--speak ${controller().card()?.sayNow?.trim() ? "" : "result-text--placeholder"}`}
                    >
                      {controller().card()?.sayNow?.trim() || st().card.emptySayNow}
                    </p>
                  </section>

                  <section class="result-section" data-testid="section-next-move">
                    <div class="result-label">{st().card.nextMoveLabel}</div>
                    <p
                      class={`result-text ${controller().card()?.nextMove?.trim() ? "" : "result-text--placeholder"}`}
                    >
                      {controller().card()?.nextMove?.trim() || st().card.emptyNextMove}
                    </p>
                  </section>
                </>
              }
            >
              <section class="result-section result-section--primary" data-testid="section-interview-answer">
                <div class="result-label">{st().card.interview.answer}</div>
                <p class="result-text result-text--speak">
                  {controller().card()?.mode === "interview" ? controller().card().interview.answer.main : ""}
                </p>
                <Show
                  when={
                    controller().card()?.mode === "interview" &&
                    (controller().card().interview.answer.short?.length ?? 0) > 0
                  }
                >
                  <div class="result-label">{st().card.interview.answerShort}</div>
                  <p class="result-text">
                    {controller().card()?.mode === "interview"
                      ? controller().card().interview.answer.short?.join(" • ")
                      : ""}
                  </p>
                </Show>
                <Show
                  when={
                    controller().card()?.mode === "interview" &&
                    (controller().card().interview.answer.strong?.length ?? 0) > 0
                  }
                >
                  <div class="result-label">{st().card.interview.answerStrong}</div>
                  <p class="result-text">
                    {controller().card()?.mode === "interview"
                      ? controller().card().interview.answer.strong?.join(" • ")
                      : ""}
                  </p>
                </Show>
              </section>

              <section class="result-section" data-testid="section-interview-question">
                <div class="result-label">{st().card.interview.question}</div>
                <p class="result-text">
                  {st().card.interview.rawTranscript}:{" "}
                  {controller().card()?.mode === "interview"
                    ? controller().card().interview.question.rawTranscript
                    : ""}
                </p>
                <p class="result-text">
                  {st().card.interview.cleanQuestion}:{" "}
                  {controller().card()?.mode === "interview"
                    ? controller().card().interview.question.cleanQuestion
                    : ""}
                </p>
                <p class="result-text">
                  {st().card.interview.interviewerIntent}:{" "}
                  {controller().card()?.mode === "interview"
                    ? controller().card().interview.question.interviewerIntent
                    : ""}
                </p>
                <p class="result-text">
                  {st().card.interview.questionType}:{" "}
                  <strong>
                    {controller().card()?.mode === "interview"
                      ? controller().card().interview.question.questionType
                      : ""}
                  </strong>
                </p>
              </section>

              <section class="result-section" data-testid="section-interview-signals">
                <div class="result-label">{st().card.interview.signals}</div>
                <p class="result-text">
                  {st().card.interview.mustMention}:{" "}
                  {controller().card()?.mode === "interview"
                    ? controller().card().interview.signals.mustMention.join(" • ")
                    : ""}
                </p>
                <p class="result-text">
                  {st().card.interview.keywords}:{" "}
                  {controller().card()?.mode === "interview"
                    ? controller().card().interview.signals.keywords.join(" • ")
                    : ""}
                </p>
                <Show
                  when={
                    controller().card()?.mode === "interview" &&
                    (controller().card().interview.signals.metrics?.length ?? 0) > 0
                  }
                >
                  <p class="result-text">
                    {st().card.interview.metrics}:{" "}
                    {controller().card()?.mode === "interview"
                      ? controller().card().interview.signals.metrics?.join(" • ")
                      : ""}
                  </p>
                </Show>
                <Show
                  when={
                    controller().card()?.mode === "interview" &&
                    (controller().card().interview.signals.resumeAnchors?.length ?? 0) > 0
                  }
                >
                  <p class="result-text">
                    {st().card.interview.resumeAnchors}:{" "}
                    {controller().card()?.mode === "interview"
                      ? controller().card().interview.signals.resumeAnchors?.join(" • ")
                      : ""}
                  </p>
                </Show>
              </section>

              <section class="result-section" data-testid="section-interview-risks">
                <div class="result-label">{st().card.interview.risks}</div>
                <p class="result-text">
                  {st().card.interview.weakPoints}:{" "}
                  {controller().card()?.mode === "interview"
                    ? controller().card().interview.risks.weakPoints.join(" • ")
                    : ""}
                </p>
                <p class="result-text">
                  {st().card.interview.avoid}:{" "}
                  {controller().card()?.mode === "interview"
                    ? controller().card().interview.risks.avoid.join(" • ")
                    : ""}
                </p>
                <p class="result-text">
                  {st().card.interview.safeReframe}:{" "}
                  {controller().card()?.mode === "interview"
                    ? controller().card().interview.risks.safeReframe.join(" • ")
                    : ""}
                </p>
              </section>

              <section class="result-section" data-testid="section-interview-followups">
                <div class="result-label">{st().card.interview.followUps}</div>
                <Show when={controller().card()?.mode === "interview"}>
                  <For each={controller().card()?.mode === "interview" ? controller().card().interview.followUps : []}>
                    {(item) => (
                      <p class="result-text">
                        {item.question} ({st().card.interview.bridgeAnswer}: {item.bridgeAnswer})
                      </p>
                    )}
                  </For>
                </Show>
              </section>

              <Show
                when={
                  controller().card()?.mode === "interview" &&
                  controller().card().interview.clarifier?.needed
                }
              >
                <section class="result-section" data-testid="section-interview-clarifier">
                  <div class="result-label">{st().card.interview.clarifier}</div>
                  <p class="result-text">
                    {controller().card()?.mode === "interview"
                      ? controller().card().interview.clarifier?.question
                      : ""}
                  </p>
                </section>
              </Show>
            </Show>
          </article>
        </div>

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
