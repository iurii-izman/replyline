import { For, Show } from "solid-js";
import type { ReplylineController } from "./controller";

export function MainSurface(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const compactInterview = () =>
    controller().card()?.mode === "interview" && controller().compactMode();
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
  const interviewCardLabel = (
    key: "answer" | "question" | "signals" | "risks" | "followUps" | "clarifier",
  ) => {
    if (key === "answer") return st().card.interview.cardLabels.answer;
    if (key === "question") return st().card.interview.cardLabels.question;
    if (key === "signals") return st().card.interview.cardLabels.signals;
    if (key === "risks") return st().card.interview.cardLabels.risks;
    if (key === "followUps") return st().card.interview.cardLabels.followUps;
    return st().card.interview.cardLabels.clarifier;
  };

  return (
    <Show when={controller().panel() === "main"}>
      <section
        class={`main-card main-card--${controller().mainUiState()} ${compactInterview() ? "main-card--compact" : ""}`}
        data-testid="main-surface"
      >
        <div class="main-card-top" data-testid="main-card-top">
          <div class="main-status-row">
            <div class={`status-pill ${statusTone()}`}>{controller().phaseLabel()}</div>
          </div>
          <Show when={!compactInterview()}>
            <ol class="pipeline-timeline" aria-label={st().pipeline.label} data-testid="pipeline-timeline">
              <For each={pipelineStages()}>
                {(label, index) => <li class={pipelineStageClass(index())}>{label}</li>}
              </For>
            </ol>
          </Show>
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
          <Show when={controller().card() !== null && !compactInterview()}>
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
              <div class="interview-card-controls" data-testid="interview-card-controls">
                <button class="btn-ghost" type="button" aria-label={st().card.interview.prevCard} onClick={() => controller().prevInterviewCard()}>
                  ←
                </button>
                <div class="interview-card-tabs" role="tablist" aria-label={st().card.interview.carouselLabel}>
                  <For each={controller().interviewCardKeys()}>
                    {(key, index) => (
                      <button
                        class={`interview-card-tab ${controller().activeInterviewCardIndex() === index() ? "is-active" : ""}`}
                        type="button"
                        role="tab"
                        aria-selected={controller().activeInterviewCardIndex() === index()}
                        aria-label={`${index() + 1}. ${interviewCardLabel(key)}`}
                        onClick={() => controller().selectInterviewCardIndex(index())}
                      >
                        {index() + 1}. {interviewCardLabel(key)}
                      </button>
                    )}
                  </For>
                </div>
                <button class="btn-ghost" type="button" aria-label={st().card.interview.nextCard} onClick={() => controller().nextInterviewCard()}>
                  →
                </button>
                <button
                  class="btn-ghost"
                  type="button"
                  aria-label={st().card.interview.pinCard}
                  aria-pressed={Boolean(controller().pinnedInterviewCard())}
                  onClick={() => controller().togglePinInterviewCard()}
                >
                  {controller().pinnedInterviewCard() ? st().card.interview.unpinCard : st().card.interview.pinCard}
                </button>
              </div>

              <Show when={controller().activeInterviewCardKey() === "answer"}>
                <section class="result-section result-section--primary" data-testid="section-interview-answer">
                  <div class="result-label">{st().card.interview.answer}</div>
                  <p class="result-text result-text--speak">
                    {controller().card()?.mode === "interview" ? controller().card().interview.answer.main : ""}
                  </p>
                  <Show
                    when={
                      controller().card()?.mode === "interview" &&
                      controller().card().interview.answer.short.trim().length > 0
                    }
                  >
                    <div class="result-label">{st().card.interview.answerShort}</div>
                    <p class="result-text">
                      {controller().card()?.mode === "interview"
                        ? controller().card().interview.answer.short
                        : ""}
                    </p>
                  </Show>
                  <Show
                    when={
                      controller().card()?.mode === "interview" &&
                      controller().card().interview.answer.strong.trim().length > 0
                    }
                  >
                    <div class="result-label">{st().card.interview.answerStrong}</div>
                    <p class="result-text">
                      {controller().card()?.mode === "interview"
                        ? controller().card().interview.answer.strong
                        : ""}
                    </p>
                  </Show>
                </section>
              </Show>

              <Show when={controller().activeInterviewCardKey() === "question"}>
                <section class="result-section" data-testid="section-interview-question">
                  <div class="result-label">{st().card.interview.question}</div>
                  <p class="result-text">{st().card.interview.rawTranscript}: {controller().card()?.mode === "interview" ? controller().card().interview.question.rawTranscript : ""}</p>
                  <p class="result-text">{st().card.interview.cleanQuestion}: {controller().card()?.mode === "interview" ? controller().card().interview.question.cleanQuestion : ""}</p>
                  <p class="result-text">{st().card.interview.interviewerIntent}: {controller().card()?.mode === "interview" ? controller().card().interview.question.interviewerIntent : ""}</p>
                  <p class="result-text">{st().card.interview.questionType}: {controller().card()?.mode === "interview" ? controller().card().interview.question.questionType : ""}</p>
                </section>
              </Show>

              <Show when={controller().activeInterviewCardKey() === "signals"}>
                <section class="result-section" data-testid="section-interview-signals">
                  <div class="result-label">{st().card.interview.signals}</div>
                  <p class="result-text">{st().card.interview.mustMention}: {controller().card()?.mode === "interview" ? controller().card().interview.signals.mustMention.join(" • ") : ""}</p>
                  <p class="result-text">{st().card.interview.keywords}: {controller().card()?.mode === "interview" ? controller().card().interview.signals.keywords.join(" • ") : ""}</p>
                  <Show
                    when={
                      controller().card()?.mode === "interview" &&
                      (controller().card().interview.signals.metrics?.length ?? 0) > 0
                    }
                  >
                    <p class="result-text">{st().card.interview.metrics}: {controller().card()?.mode === "interview" ? controller().card().interview.signals.metrics?.join(" • ") : ""}</p>
                  </Show>
                  <Show
                    when={
                      controller().card()?.mode === "interview" &&
                      (controller().card().interview.signals.resumeAnchors?.length ?? 0) > 0
                    }
                  >
                    <p class="result-text">{st().card.interview.resumeAnchors}: {controller().card()?.mode === "interview" ? controller().card().interview.signals.resumeAnchors?.join(" • ") : ""}</p>
                  </Show>
                </section>
              </Show>

              <Show when={controller().activeInterviewCardKey() === "risks"}>
                <section class="result-section" data-testid="section-interview-risks">
                  <div class="result-label">{st().card.interview.risks}</div>
                  <p class="result-text">{st().card.interview.weakPoints}: {controller().card()?.mode === "interview" ? controller().card().interview.risks.weakPoints.join(" • ") : ""}</p>
                  <p class="result-text">{st().card.interview.avoid}: {controller().card()?.mode === "interview" ? controller().card().interview.risks.avoid.join(" • ") : ""}</p>
                  <p class="result-text">{st().card.interview.safeReframe}: {controller().card()?.mode === "interview" ? controller().card().interview.risks.safeReframe : ""}</p>
                </section>
              </Show>

              <Show when={controller().activeInterviewCardKey() === "followUps"}>
                <section class="result-section" data-testid="section-interview-followups">
                  <div class="result-label">{st().card.interview.followUps}</div>
                  <Show when={controller().card()?.mode === "interview"}>
                    <For each={controller().card()?.mode === "interview" ? controller().card().interview.followUps : []}>
                      {(item) => <p class="result-text">{item.question} ({st().card.interview.bridgeAnswer}: {item.bridgeAnswer})</p>}
                    </For>
                  </Show>
                </section>
              </Show>

              <Show when={controller().activeInterviewCardKey() === "clarifier"}>
                <section class="result-section" data-testid="section-interview-clarifier">
                  <div class="result-label">{st().card.interview.clarifier}</div>
                  <p class="result-text">
                    {controller().card()?.mode === "interview" ? controller().card().interview.clarifier.text ?? "" : ""}
                  </p>
                </section>
              </Show>
            </Show>
          </article>
        </div>

        <div class="result-actions" data-testid="action-row">
          <button class="btn-ghost" type="button" onClick={() => void controller().startInterviewSession()}>
            Start session
          </button>
          <button class="btn-ghost" type="button" onClick={() => void controller().endInterviewSession()}>
            End session
          </button>
          <button class="btn-ghost" type="button" onClick={() => void controller().openInterviewReport()}>
            Open report
          </button>
          <button class="btn-ghost" type="button" onClick={() => void controller().exportInterviewReportMarkdown()}>
            Export markdown
          </button>
          <button class="btn-ghost" type="button" onClick={() => void controller().clearInterviewReports()}>
            Clear reports
          </button>
          <button
            class="btn-primary"
            disabled={!controller().canCopySayNow()}
            title={controller().copyDisabledReason() ?? ""}
            onClick={() => void controller().copyCurrentCard()}
          >
            {st().card.copySayNow}
          </button>
          <button
            class="btn-secondary"
            disabled={!controller().canRetry()}
            title={controller().retryDisabledReason() ?? ""}
            onClick={() => void controller().retryAnalysis()}
          >
            {st().card.retryCard}
          </button>
          <button
            class="btn-ghost"
            disabled={!controller().canClear()}
            title={controller().clearDisabledReason() ?? ""}
            onClick={() => void controller().clearContext()}
          >
            {st().card.clearContext}
          </button>
        </div>
        <Show when={controller().interviewReport()}>
          <section class="result-section" data-testid="interview-report-summary">
            <div class="result-label">Interview report</div>
            <p class="result-text">Session: {controller().interviewReport()!.sessionId}</p>
            <p class="result-text">Questions: {controller().interviewReport()!.questions.length}</p>
            <p class="result-text">
              Scores: clarity {controller().interviewReport()!.scores.clarity}, relevance {controller().interviewReport()!.scores.relevance}, accuracy {controller().interviewReport()!.scores.accuracy}
            </p>
            <Show when={controller().interviewReportMarkdownPath()}>
              <p class="result-text">Markdown: {controller().interviewReportMarkdownPath()}</p>
            </Show>
          </section>
        </Show>
      </section>
    </Show>
  );
}
