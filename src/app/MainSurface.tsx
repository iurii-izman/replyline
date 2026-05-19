import { For, Show, createMemo } from "solid-js";
import type { ReplylineController } from "./controller";

function valueOrDash(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : fallback;
}

function listText(value: unknown): string {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .join(" • ")
    : "";
}

export function MainSurface(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const compactInterview = () =>
    controller().card()?.mode === "interview" && controller().compactMode();
  const compactLayout = createMemo(() => controller().compactMode());

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
    if (controller().pipelineActive()) return controller().statusDetail() ?? st().card.processingHint;
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

  const clarifierText = (): string => {
    if (controller().card()?.mode !== "interview") return "";
    const clarifier = controller().card().interview.clarifier as Record<string, unknown>;
    const text = typeof clarifier.text === "string" ? clarifier.text.trim() : "";
    if (text) return text;
    const question = typeof clarifier.question === "string" ? clarifier.question.trim() : "";
    return question;
  };
  const hasInterviewReport = () => Boolean(controller().interviewReport());
  const exportDisabledReason = () =>
    hasInterviewReport() ? "" : st().card.interview.sessionActions.exportDisabledNoReport;

  return (
    <Show when={controller().panel() === "main"}>
      <section
        class={`main-card surface-card app-main-column main-card--${controller().mainUiState()} ${compactInterview() ? "main-card--compact" : ""}`}
        data-testid="main-surface"
      >
        <div class="main-card-top" data-testid="main-card-top">
          <div class="main-status-row">
            <div class={`status-pill ${statusTone()}`}>{controller().phaseLabel()}</div>
          </div>
          <Show when={!compactInterview()}>
            <ol class="pipeline-timeline pipeline-timeline--compact" aria-label={st().pipeline.label} data-testid="pipeline-timeline">
              <For each={pipelineStages()}>{(label, index) => <li class={pipelineStageClass(index())}>{label}</li>}</For>
            </ol>
          </Show>
          <Show when={controller().setupRequired()} fallback={<p class="empty-flow-hint">{statusHint()}</p>}>
            <div class="empty-state setup-card" data-testid="main-empty-state-setup">
              <p class="setup-card-title">{st().setup.wizardTitle}</p>
              <p class="empty-flow-hint">{st().card.setupRequiredHint}</p>
              <ul class="setup-card-steps" data-testid="main-setup-steps">
                <For each={controller().setupSteps()}>
                  {(step) => (
                    <li class="setup-card-step">
                      <span class={step.ready ? "setup-step-status is-done" : "setup-step-status is-pending"} aria-hidden="true">
                        {step.ready ? "✓" : "○"}
                      </span>
                      <span>{step.label}</span>
                    </li>
                  )}
                </For>
              </ul>
              <button class="btn-ghost" type="button" onClick={() => controller().openSettingsPanel()}>
                {st().setup.continueSetup}
              </button>
            </div>
          </Show>
          <Show when={!controller().setupRequired() && controller().mainUiState() === "idle" && !controller().card()}>
            <div class="empty-state" data-testid="main-empty-state-work">
              <p class="empty-flow-hint">{st().card.idleRecordHint}</p>
              <p class="empty-flow-hint">{st().card.idlePipelineHint}</p>
            </div>
          </Show>
          <Show when={controller().card() !== null && !compactInterview()}>
            <p class="empty-flow-hint">
              {st().captureQuality.label}: {qualityLabel()}
              <Show when={controller().captureQuality() === "short"}> {st().card.shortCaptureHint}</Show>
            </p>
          </Show>
        </div>

        <div class="main-card-body" data-testid="main-card-body">
          <div class={`main-cockpit-layout ${compactLayout() ? "is-compact" : "is-wide"}`}>
            <article class="result-card cockpit-main" data-testid="main-card-shell">
              <Show
                when={controller().card()?.mode === "interview"}
                fallback={
                  <>
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

                    <Show when={controller().card()?.starEvidence?.trim()}>
                      <section class="result-section result-section--compact" data-testid="section-star-evidence">
                        <div class="result-label">{st().card.starEvidenceLabel}</div>
                        <p class="result-text">{controller().card()?.starEvidence?.trim()}</p>
                      </section>
                    </Show>

                    <section class="result-section" data-testid="section-next-move">
                      <div class="result-label">{st().card.nextMoveLabel}</div>
                      <p class={`result-text ${controller().card()?.nextMove?.trim() ? "" : "result-text--placeholder"}`}>
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
                    <Show when={controller().card()?.mode === "interview" && controller().card().interview.answer.short.trim().length > 0}>
                      <div class="result-label">{st().card.interview.answerShort}</div>
                      <p class="result-text">{controller().card()?.mode === "interview" ? controller().card().interview.answer.short : ""}</p>
                    </Show>
                    <Show when={controller().card()?.mode === "interview" && controller().card().interview.answer.strong.trim().length > 0}>
                      <div class="result-label">{st().card.interview.answerStrong}</div>
                      <p class="result-text">{controller().card()?.mode === "interview" ? controller().card().interview.answer.strong : ""}</p>
                    </Show>
                    <Show when={controller().card()?.mode === "interview" && controller().card().interview.signals.mustMention.length > 0}>
                      <section class="result-section result-section--compact" data-testid="section-interview-hints">
                        <div class="result-label">{st().card.interview.mustMention}</div>
                        <p class="result-text">{listText(controller().card()?.mode === "interview" ? controller().card().interview.signals.mustMention : [])}</p>
                      </section>
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
                    <Show when={controller().card()?.mode === "interview" && controller().card().interview.question.confidence}>
                      <p class="result-text">{st().card.interview.confidence}: {controller().card()?.mode === "interview" ? controller().card().interview.question.confidence : ""}</p>
                    </Show>
                  </section>
                </Show>

                <Show when={controller().activeInterviewCardKey() === "signals"}>
                  <section class="result-section" data-testid="section-interview-signals">
                    <div class="result-label">{st().card.interview.signals}</div>
                    <p class="result-text">{st().card.interview.mustMention}: {controller().card()?.mode === "interview" ? listText(controller().card().interview.signals.mustMention) : ""}</p>
                    <p class="result-text">{st().card.interview.keywords}: {controller().card()?.mode === "interview" ? listText(controller().card().interview.signals.keywords) : ""}</p>
                    <Show when={controller().card()?.mode === "interview" && (controller().card().interview.signals.metrics?.length ?? 0) > 0}>
                      <p class="result-text">{st().card.interview.metrics}: {controller().card()?.mode === "interview" ? listText(controller().card().interview.signals.metrics) : ""}</p>
                    </Show>
                    <Show when={controller().card()?.mode === "interview" && (controller().card().interview.signals.resumeAnchors?.length ?? 0) > 0}>
                      <p class="result-text">{st().card.interview.resumeAnchors}: {controller().card()?.mode === "interview" ? listText(controller().card().interview.signals.resumeAnchors) : ""}</p>
                    </Show>
                  </section>
                </Show>

                <Show when={controller().activeInterviewCardKey() === "risks"}>
                  <section class="result-section" data-testid="section-interview-risks">
                    <div class="result-label">{st().card.interview.risks}</div>
                    <p class="result-text">{st().card.interview.weakPoints}: {controller().card()?.mode === "interview" ? listText(controller().card().interview.risks.weakPoints) : ""}</p>
                    <p class="result-text">{st().card.interview.avoid}: {controller().card()?.mode === "interview" ? listText(controller().card().interview.risks.avoid) : ""}</p>
                    <p class="result-text">{st().card.interview.safeReframe}: {controller().card()?.mode === "interview" ? valueOrDash(controller().card().interview.risks.safeReframe, st().card.interview.notAvailable) : ""}</p>
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
                    <p class="result-text">{clarifierText()}</p>
                  </section>
                </Show>
              </Show>
            </article>

            <aside class="cockpit-side" data-testid="main-side-panel">
              <section class="result-section result-section--compact" data-testid="session-panel">
                <div class="result-label">{st().card.interview.report.session}</div>
                <div class="action-group side-panel-actions">
                  <button class="btn-secondary" type="button" onClick={() => void controller().startInterviewSession()}>
                    {st().card.interview.sessionActions.start}
                  </button>
                  <button class="btn-secondary" type="button" onClick={() => void controller().endInterviewSession()}>
                    {st().card.interview.sessionActions.end}
                  </button>
                  <button
                    class="btn-ghost"
                    type="button"
                    disabled={!hasInterviewReport()}
                    title={exportDisabledReason()}
                    aria-label={st().card.interview.sessionActions.openReport}
                    onClick={() => void controller().openInterviewReport()}
                  >
                    {st().card.interview.sessionActions.openReport}
                  </button>
                </div>
              </section>

              <section class="result-section result-section--compact" data-testid="report-panel">
                <div class="result-label">{st().card.interview.report.title}</div>
                <div class="action-group side-panel-actions">
                  <button
                    class="btn-warning"
                    type="button"
                    disabled={!hasInterviewReport()}
                    title={hasInterviewReport() ? st().card.interview.sessionActions.exportFullWarning : exportDisabledReason()}
                    aria-label={st().card.interview.sessionActions.exportMarkdown}
                    onClick={() => void controller().exportInterviewReportMarkdown()}
                  >
                    {st().card.interview.sessionActions.exportMarkdown}
                  </button>
                  <button
                    class="btn-secondary"
                    type="button"
                    disabled={!hasInterviewReport()}
                    title={hasInterviewReport() ? st().card.interview.sessionActions.exportRedactedRecommended : exportDisabledReason()}
                    aria-label={st().card.interview.sessionActions.exportMarkdownRedacted}
                    onClick={() => void controller().exportInterviewReportRedactedMarkdown()}
                  >
                    {st().card.interview.sessionActions.exportMarkdownRedacted}
                  </button>
                  <button
                    class="btn-danger btn-ghost"
                    type="button"
                    title={st().card.interview.sessionActions.clearReportsDanger}
                    onClick={() => void controller().clearInterviewReports()}
                  >
                    {st().card.interview.sessionActions.clearReports}
                  </button>
                </div>
              </section>

              <Show when={controller().lastTranscriptPreview?.() ?? false}>
                <section class="result-section result-section--compact" data-testid="transcript-preview-panel">
                  <div class="result-label">{st().card.lastTranscriptLabel}</div>
                  <p class="result-text">{controller().lastTranscriptPreview?.()}</p>
                </section>
              </Show>

              <Show when={controller().interviewReport()}>
                <section class="result-section result-section--compact" data-testid="interview-report-summary">
                  <p class="result-text">{st().card.interview.report.session}: {valueOrDash(controller().interviewReport()?.sessionId, st().card.interview.notAvailable)}</p>
                  <p class="result-text">{st().card.interview.report.questions}: {controller().interviewReport()?.questions.length ?? 0}</p>
                  <p class="result-text">{st().card.interview.report.scores}: {st().card.interview.report.clarity} {controller().interviewReport()?.scores?.clarity ?? 0}, {st().card.interview.report.relevance} {controller().interviewReport()?.scores?.relevance ?? 0}, {st().card.interview.report.accuracy} {controller().interviewReport()?.scores?.accuracy ?? 0}</p>
                  <Show when={controller().interviewReportMarkdownPath()}>
                    <p class="result-text">{st().card.interview.report.markdown}: {valueOrDash(controller().interviewReportMarkdownPath(), st().card.interview.notAvailable)}</p>
                  </Show>
                  <Show when={controller().interviewReportRedactedMarkdownPath()}>
                    <p class="result-text">{st().card.interview.report.markdownRedacted}: {valueOrDash(controller().interviewReportRedactedMarkdownPath(), st().card.interview.notAvailable)}</p>
                  </Show>
                </section>
              </Show>
              <Show when={!controller().interviewReport()}>
                <section class="result-section result-section--compact" data-testid="interview-report-empty">
                  <div class="result-label">{st().card.interview.sessionActions.noReportTitle}</div>
                  <p class="result-text">{st().card.interview.sessionActions.noReportHint}</p>
                  <button class="btn-secondary btn-compact" type="button" onClick={() => void controller().endInterviewSession()}>
                    {st().card.interview.sessionActions.noReportAction}
                  </button>
                </section>
              </Show>
            </aside>
          </div>
        </div>

        <div class="action-bar sticky-action-footer" data-testid="action-row">
          <button
            class="btn-primary"
            disabled={!controller().canCopySayNow()}
            title={controller().copyDisabledReason() ?? ""}
            aria-label={st().card.copySayNow}
            onClick={() => void controller().copyCurrentCard()}
          >
            {st().card.copySayNow}
          </button>
          <button
            class="btn-secondary"
            disabled={!controller().canRetry()}
            title={controller().retryDisabledReason() ?? ""}
            aria-label={st().card.retryCard}
            onClick={() => void controller().retryAnalysis()}
          >
            {st().card.retryCard}
          </button>
          <button
            class="btn-danger btn-ghost"
            disabled={!controller().canClear()}
            title={controller().clearDisabledReason() ?? ""}
            aria-label={st().card.clearContext}
            onClick={() => void controller().clearContext()}
          >
            {st().card.clearContext}
          </button>
        </div>
      </section>
    </Show>
  );
}
