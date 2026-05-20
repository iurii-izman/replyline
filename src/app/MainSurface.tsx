import { For, Show, createMemo } from "solid-js";
import type { ReplylineController } from "./controller";

function valueOrDash(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : fallback;
}

function phaseTone(controller: ReplylineController): string {
  if (controller.mainUiState() === "error") return "is-error";
  if (controller.hotkeyFailed()) return "is-hotkey-fail";
  if (controller.setupRequired()) return "is-setup-needed";
  if (controller.phase() === "capturing") return "is-capturing";
  if (controller.phase() === "transcribing") return "is-transcribing";
  if (controller.phase() === "analyzing") return "is-analyzing";
  if (controller.phase() === "ready") return "is-ready";
  return "";
}

function nextActionText(controller: ReplylineController): string {
  const st = controller.strings();
  if (controller.mainUiState() === "error") return st.card.nextActionFix;
  if (controller.setupRequired()) return st.card.nextActionSetup;
  if (controller.pipelineActive()) return st.card.nextActionWait;
  if (!controller.card()) return st.card.nextActionCapture;
  return st.card.nextActionCopy;
}

function phaseStateText(controller: ReplylineController): string {
  const st = controller.strings();
  if (controller.mainUiState() === "error") return st.phase.error;
  if (controller.setupRequired()) return st.phase.setupNeeded;
  if (controller.phase() === "capturing") return st.phase.capturing;
  if (controller.phase() === "transcribing") return st.phase.transcribing;
  if (controller.phase() === "analyzing") return st.phase.analyzing;
  if (controller.phase() === "ready") return st.phase.ready;
  if (controller.phase() === "booting")
    return controller.pipelineActive() ? st.phase.booting : st.phase.idleReady;
  return st.phase.idleReady;
}

function statusHint(controller: ReplylineController): string {
  const st = controller.strings();
  if (controller.mainUiState() === "error") return st.card.errorHint;
  if (controller.mainUiState() === "ready") return st.card.readyHint;
  if (controller.pipelineActive()) return controller.statusDetail() ?? st.card.processingHint;
  return st.card.emptyFlow;
}

function MainStatusStrip(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  return (
    <section class="status-strip" data-testid="main-status-strip">
      <div class={`status-pill status-badge ${phaseTone(controller())}`}>
        {controller().phaseLabel()}
      </div>
      <span class="status-strip-phase" data-testid="status-strip-phase">
        {st().card.phasePrefix}: {phaseStateText(controller())}
      </span>
      <span class="status-strip-next" data-testid="status-strip-next">
        {st().card.nextActionLabel}: {nextActionText(controller())}
      </span>
      <Show when={controller().pipelineActive()}>
        <span class="status-strip-next" data-testid="status-strip-detail">
          {controller().statusDetail() ?? st().card.processingHint}
        </span>
      </Show>
    </section>
  );
}

function SetupBanner(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const missingSteps = createMemo(() =>
    controller()
      .setupSteps()
      .filter((step) => !step.ready),
  );

  return (
    <Show when={controller().setupRequired()}>
      <section class="setup-banner" data-testid="main-empty-state-setup">
        <p class="setup-banner-title">{st().setup.wizardTitle}</p>
        <p class="empty-flow-hint">{st().card.setupRequiredHint}</p>
        <div class="setup-banner-tags" data-testid="setup-banner-missing-steps">
          <For each={missingSteps()}>
            {(step) => <span class="setup-missing-chip">{step.label}</span>}
          </For>
        </div>
        <button
          class="btn-ghost btn-compact"
          type="button"
          onClick={() => controller().openSettingsPanel()}
        >
          {st().settings.openFirstMissing}
        </button>
      </section>
    </Show>
  );
}

function AnswerHeroCard(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  const copyReason = createMemo(
    () => controller().copyDisabledReason() ?? st().card.copyDisabledNoCard,
  );

  return (
    <div data-testid="answer-hero-card">
      <article
        class="result-section result-section--primary answer-hero"
        data-testid="section-say-now"
      >
        <div class="result-label">{st().card.sayNowLabel}</div>
        <Show
          when={controller().card()?.sayNow?.trim()}
          fallback={
            <div class="answer-empty-state" data-testid="answer-empty-state">
              <p class="result-text result-text--placeholder">{st().card.emptySayNow}</p>
              <p class="empty-flow-hint">{st().card.idleRecordHint}</p>
              <p class="empty-flow-hint">{st().card.idlePipelineHint}</p>
              <p class="empty-flow-hint">{st().card.copyUnavailableHint}</p>
              <p class="empty-flow-hint">{copyReason()}</p>
            </div>
          }
        >
          <p class="result-text result-text--speak">{controller().card()?.sayNow?.trim()}</p>
        </Show>
      </article>
    </div>
  );
}

function SecondaryInsightCards(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  return (
    <section class="secondary-insights" data-testid="secondary-insight-cards">
      <section class="result-section result-section--compact" data-testid="section-gist">
        <div class="result-label">{st().card.gistLabel}</div>
        <p
          class={`result-text ${controller().card()?.gist?.trim() ? "" : "result-text--placeholder"}`}
        >
          {controller().card()?.gist?.trim() || st().card.emptyGist}
        </p>
      </section>
      <section class="result-section result-section--compact" data-testid="section-next-move">
        <div class="result-label">{st().card.nextMoveLabel}</div>
        <p
          class={`result-text ${controller().card()?.nextMove?.trim() ? "" : "result-text--placeholder"}`}
        >
          {controller().card()?.nextMove?.trim() || st().card.emptyNextMove}
        </p>
      </section>
    </section>
  );
}

function interviewCardLabel(
  controller: ReplylineController,
  key: "answer" | "question" | "signals" | "risks" | "followUps" | "clarifier",
) {
  const st = controller.strings();
  if (key === "answer") return st.card.interview.cardLabels.answer;
  if (key === "question") return st.card.interview.cardLabels.question;
  if (key === "signals") return st.card.interview.cardLabels.signals;
  if (key === "risks") return st.card.interview.cardLabels.risks;
  if (key === "followUps") return st.card.interview.cardLabels.followUps;
  return st.card.interview.cardLabels.clarifier;
}

function clarifierText(controller: ReplylineController): string {
  const st = controller.strings();
  if (controller.card()?.mode !== "interview") return st.card.interview.notAvailable;
  const clarifier = controller.card().interview.clarifier as Record<string, unknown>;
  const text = typeof clarifier.text === "string" ? clarifier.text.trim() : "";
  if (text) return text;
  const question = typeof clarifier.question === "string" ? clarifier.question.trim() : "";
  return question || st.card.interview.notAvailable;
}

function WorkspaceSidePanel(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const hasInterviewReport = () => Boolean(controller().interviewReport());
  const exportDisabledReason = () =>
    hasInterviewReport() ? "" : st().card.interview.sessionActions.exportDisabledNoReport;

  return (
    <aside class="cockpit-side app-page-aside app-sidebar" data-testid="main-side-panel">
      <div class="workspace-aside-stack" data-testid="workspace-aside-stack">
        <section class="result-section result-section--compact" data-testid="session-panel">
          <div class="result-label">{st().card.interview.report.session}</div>
          <div class="action-group side-panel-actions">
            <button
              class="btn-secondary"
              type="button"
              onClick={() => void controller().startInterviewSession()}
            >
              {st().card.interview.sessionActions.start}
            </button>
            <button
              class="btn-secondary"
              type="button"
              onClick={() => void controller().endInterviewSession()}
            >
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
          <Show
            when={controller().interviewReport()}
            fallback={
              <p class="result-text result-text--placeholder">
                {st().card.interview.sessionActions.noReportHint}
              </p>
            }
          >
            <p class="result-text">
              {st().card.interview.report.questions}:{" "}
              {controller().interviewReport()?.questions.length ?? 0}
            </p>
            <p class="result-text">
              {st().card.interview.report.scores}: {st().card.interview.report.clarity}{" "}
              {controller().interviewReport()?.scores?.clarity ?? 0},{" "}
              {st().card.interview.report.relevance}{" "}
              {controller().interviewReport()?.scores?.relevance ?? 0},{" "}
              {st().card.interview.report.accuracy}{" "}
              {controller().interviewReport()?.scores?.accuracy ?? 0}
            </p>
          </Show>
        </section>
        <Show when={controller().interviewReport()}>
          <section
            class="result-section result-section--compact"
            data-testid="interview-report-summary"
          >
            <p class="result-text">
              {st().card.interview.report.session}:{" "}
              {valueOrDash(
                controller().interviewReport()?.sessionId,
                st().card.interview.notAvailable,
              )}
            </p>
          </section>
        </Show>

        <section class="result-section result-section--compact" data-testid="export-panel">
          <div class="result-label">{st().card.interview.report.markdown}</div>
          <div class="action-group side-panel-actions">
            <button
              class="btn-warning"
              type="button"
              disabled={!hasInterviewReport()}
              title={
                hasInterviewReport()
                  ? st().card.interview.sessionActions.exportFullWarning
                  : exportDisabledReason()
              }
              aria-label={st().card.interview.sessionActions.exportMarkdown}
              onClick={() => void controller().exportInterviewReportMarkdown()}
            >
              {st().card.interview.sessionActions.exportMarkdown}
            </button>
            <button
              class="btn-secondary"
              type="button"
              disabled={!hasInterviewReport()}
              title={
                hasInterviewReport()
                  ? st().card.interview.sessionActions.exportRedactedRecommended
                  : exportDisabledReason()
              }
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
          <section
            class="result-section result-section--compact"
            data-testid="transcript-preview-panel"
          >
            <div class="result-label">{st().card.lastTranscriptLabel}</div>
            <p class="result-text">{controller().lastTranscriptPreview?.()}</p>
          </section>
        </Show>

        <Show when={controller().interviewReportMarkdownPath()}>
          <section
            class="result-section result-section--compact"
            data-testid="export-full-path-panel"
          >
            <div class="result-label">{st().card.interview.report.markdown}</div>
            <p class="result-text">
              {valueOrDash(
                controller().interviewReportMarkdownPath(),
                st().card.interview.notAvailable,
              )}
            </p>
          </section>
        </Show>

        <Show when={controller().interviewReportRedactedMarkdownPath()}>
          <section
            class="result-section result-section--compact"
            data-testid="export-redacted-path-panel"
          >
            <div class="result-label">{st().card.interview.report.markdownRedacted}</div>
            <p class="result-text">
              {valueOrDash(
                controller().interviewReportRedactedMarkdownPath(),
                st().card.interview.notAvailable,
              )}
            </p>
          </section>
        </Show>
      </div>
    </aside>
  );
}

function MainActionBar(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  const copyReason = createMemo(() => controller().copyDisabledReason() ?? "");
  const retryReason = createMemo(() => controller().retryDisabledReason() ?? "");
  const clearReason = createMemo(() => controller().clearDisabledReason() ?? "");

  return (
    <div class="action-bar sticky-action-footer app-sticky-footer" data-testid="action-row">
      <button
        class="btn-primary"
        disabled={!controller().canCopySayNow()}
        title={copyReason()}
        aria-label={st().card.copySayNow}
        onClick={() => void controller().copyCurrentCard()}
      >
        {st().card.copySayNow}
      </button>
      <button
        class="btn-secondary"
        disabled={!controller().canRetry()}
        title={retryReason()}
        aria-label={st().card.retryCard}
        onClick={() => void controller().retryAnalysis()}
      >
        {st().card.retryCard}
      </button>
      <button
        class="btn-danger btn-ghost"
        disabled={!controller().canClear()}
        title={clearReason()}
        aria-label={st().card.clearContext}
        onClick={() => void controller().clearContext()}
      >
        {st().card.clearContext}
      </button>
      <Show when={controller().setupRequired()}>
        <button class="btn-ghost" type="button" onClick={() => controller().openSettingsPanel()}>
          {st().setup.continueSetup}
        </button>
      </Show>
    </div>
  );
}

export function MainSurface(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const compactLayout = createMemo(() => controller().compactMode());
  const localeCoverage = createMemo(() => [
    st().card.errorHint,
    st().card.readyHint,
    st().card.emptyFlow,
    st().card.starEvidenceLabel,
    st().card.nextActionSetup,
    st().card.nextActionCapture,
    st().card.nextActionWait,
    st().card.nextActionCopy,
    st().card.nextActionFix,
    st().card.phaseStatusIdle,
    st().card.phaseStatusCapturing,
    st().card.phaseStatusTranscribing,
    st().card.phaseStatusAnalyzing,
    st().card.phaseStatusReady,
    st().card.interview.answerShort,
    st().card.interview.answerStrong,
    st().card.interview.question,
    st().card.interview.rawTranscript,
    st().card.interview.interviewerIntent,
    st().card.interview.questionType,
    st().card.interview.confidence,
    st().card.interview.signals,
    st().card.interview.keywords,
    st().card.interview.metrics,
    st().card.interview.resumeAnchors,
    st().card.interview.risks,
    st().card.interview.weakPoints,
    st().card.interview.avoid,
    st().card.interview.safeReframe,
    st().card.interview.followUps,
    st().card.interview.bridgeAnswer,
    st().card.interview.clarifier,
    st().card.interview.cardLabels.answer,
    st().card.interview.cardLabels.question,
    st().card.interview.cardLabels.signals,
    st().card.interview.cardLabels.risks,
    st().card.interview.cardLabels.followUps,
    st().card.interview.cardLabels.clarifier,
    st().card.interview.sessionActions.noReportTitle,
    st().card.interview.sessionActions.noReportAction,
    st().pipeline.label,
    st().pipeline.capture,
    st().pipeline.text,
    st().pipeline.reply,
    st().pipeline.card,
  ]);
  void localeCoverage();

  const compactInterview = () =>
    controller().card()?.mode === "interview" && controller().compactMode();

  const qualityLabel = () => {
    if (controller().captureQuality() === "short") return st().captureQuality.short;
    if (controller().captureQuality() === "long") return st().captureQuality.long;
    return st().captureQuality.normal;
  };

  return (
    <Show when={controller().panel() === "main"}>
      <section
        class={`main-card surface-card app-page app-page--workspace main-card--${controller().mainUiState()} ${compactInterview() ? "main-card--compact" : ""}`}
        data-testid="main-surface"
      >
        <div class="main-card-top app-page-header" data-testid="main-card-top">
          <MainStatusStrip controller={controller()} />
          <SetupBanner controller={controller()} />
          <Show
            when={
              !controller().setupRequired() &&
              controller().mainUiState() === "idle" &&
              !controller().card()
            }
          >
            <div class="empty-state" data-testid="main-empty-state-work">
              <p class="empty-flow-hint">{st().card.idleRecordHint}</p>
              <p class="empty-flow-hint">{st().card.idlePipelineHint}</p>
            </div>
          </Show>
          <Show when={controller().card() !== null}>
            <p class="empty-flow-hint" data-testid="capture-quality-hint">
              {st().captureQuality.label}: {qualityLabel()}
              <Show when={controller().captureQuality() === "short"}>
                {" "}
                {st().card.shortCaptureHint}
              </Show>
            </p>
          </Show>
          <p class="empty-flow-hint" data-testid="main-status-hint">
            {statusHint(controller())}
          </p>
        </div>

        <div class="main-card-body app-page-body" data-testid="main-card-body">
          <div
            class={`main-cockpit-layout ${compactLayout() ? "is-compact" : "is-wide"}`}
            data-testid="workspace-layout"
          >
            <article class="result-card cockpit-main app-page-main" data-testid="main-card-shell">
              <Show
                when={controller().card()?.mode !== "interview"}
                fallback={
                  <>
                    <div class="interview-card-controls" data-testid="interview-card-controls">
                      <button
                        class="btn-ghost"
                        type="button"
                        aria-label={st().card.interview.prevCard}
                        onClick={() => controller().prevInterviewCard()}
                      >
                        ←
                      </button>
                      <div
                        class="interview-card-tabs"
                        role="tablist"
                        aria-label={st().card.interview.carouselLabel}
                      >
                        <For each={controller().interviewCardKeys()}>
                          {(key, index) => (
                            <button
                              class={`interview-card-tab ${controller().activeInterviewCardIndex() === index() ? "is-active" : ""}`}
                              type="button"
                              role="tab"
                              aria-selected={controller().activeInterviewCardIndex() === index()}
                              aria-label={`${index() + 1}. ${interviewCardLabel(controller(), key)}`}
                              onClick={() => controller().selectInterviewCardIndex(index())}
                            >
                              {index() + 1}. {interviewCardLabel(controller(), key)}
                            </button>
                          )}
                        </For>
                      </div>
                      <button
                        class="btn-ghost"
                        type="button"
                        aria-label={st().card.interview.nextCard}
                        onClick={() => controller().nextInterviewCard()}
                      >
                        →
                      </button>
                      <button
                        class="btn-ghost"
                        type="button"
                        aria-label={st().card.interview.pinCard}
                        aria-pressed={Boolean(controller().pinnedInterviewCard())}
                        onClick={() => controller().togglePinInterviewCard()}
                      >
                        {controller().pinnedInterviewCard()
                          ? st().card.interview.unpinCard
                          : st().card.interview.pinCard}
                      </button>
                    </div>
                    <Show when={controller().activeInterviewCardKey() === "answer"}>
                      <section
                        class="result-section result-section--primary"
                        data-testid="section-interview-answer"
                      >
                        <div class="result-label">{st().card.interview.answer}</div>
                        <p class="result-text result-text--speak">
                          {controller().card()?.mode === "interview"
                            ? controller().card().interview.answer.main
                            : ""}
                        </p>
                      </section>
                    </Show>
                    <Show when={controller().activeInterviewCardKey() === "question"}>
                      <section class="result-section" data-testid="section-interview-question">
                        <p class="result-text">
                          {st().card.interview.cleanQuestion}:{" "}
                          {controller().card()?.mode === "interview"
                            ? controller().card().interview.question.cleanQuestion
                            : ""}
                        </p>
                      </section>
                    </Show>
                    <Show when={controller().activeInterviewCardKey() === "signals"}>
                      <section class="result-section" data-testid="section-interview-signals">
                        <p class="result-text">
                          {st().card.interview.mustMention}:{" "}
                          {controller().card()?.mode === "interview"
                            ? valueOrDash(
                                controller().card().interview.signals.mustMention,
                                st().card.interview.notAvailable,
                              )
                            : ""}
                        </p>
                      </section>
                    </Show>
                    <Show when={controller().activeInterviewCardKey() === "risks"}>
                      <section class="result-section" data-testid="section-interview-risks">
                        <p class="result-text">
                          {controller().card()?.mode === "interview"
                            ? valueOrDash(
                                controller().card().interview.risks.safeReframe,
                                st().card.interview.notAvailable,
                              )
                            : ""}
                        </p>
                      </section>
                    </Show>
                    <Show when={controller().activeInterviewCardKey() === "followUps"}>
                      <section class="result-section" data-testid="section-interview-followups">
                        <Show when={controller().card()?.mode === "interview"}>
                          <For
                            each={
                              controller().card()?.mode === "interview"
                                ? controller().card().interview.followUps
                                : []
                            }
                          >
                            {(item) => (
                              <p class="result-text">
                                {item.question} ({item.bridgeAnswer})
                              </p>
                            )}
                          </For>
                        </Show>
                      </section>
                    </Show>
                    <Show when={controller().activeInterviewCardKey() === "clarifier"}>
                      <section class="result-section" data-testid="section-interview-clarifier">
                        <p class="result-text">{clarifierText(controller())}</p>
                      </section>
                    </Show>
                  </>
                }
              >
                <AnswerHeroCard controller={controller()} />
                <SecondaryInsightCards controller={controller()} />
              </Show>
            </article>
            <WorkspaceSidePanel controller={controller()} />
          </div>
        </div>

        <MainActionBar controller={controller()} />
      </section>
    </Show>
  );
}
