import { For, Show, createMemo, createSignal, onCleanup } from "solid-js";
import type { ReplylineController } from "./controller";

function valueOrDash(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : fallback;
}

function formatDurationLabel(startIso?: string | null, endIso?: string | null): string | null {
  if (!startIso) return null;
  const start = Date.parse(startIso);
  if (!Number.isFinite(start)) return null;
  const end = endIso ? Date.parse(endIso) : Date.now();
  if (!Number.isFinite(end)) return null;
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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

function phaseStateText(controller: ReplylineController): string {
  const st = controller.strings();
  if (controller.mainUiState() === "error") return st.phase.error;
  if (controller.setupRequired()) return st.phase.setupNeeded;
  if (controller.phase() === "capturing") return st.phase.capturing;
  if (controller.phase() === "transcribing") return st.phase.transcribing;
  if (controller.phase() === "analyzing") return st.phase.analyzing;
  if (controller.phase() === "ready") return st.phase.ready;
  if (controller.phase() === "booting") {
    return controller.pipelineActive() ? st.phase.booting : st.phase.idleReady;
  }
  return st.phase.idleReady;
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

function setupReadyMap(controller: ReplylineController) {
  const steps = controller.setupSteps();
  const findReady = (token: string) => steps.find((step) => step.label.includes(token))?.ready;
  return {
    speech: Boolean(findReady("1.")),
    llm: Boolean(findReady("2.")),
    hotkey: Boolean(findReady("3.")),
  };
}

function ReadinessState(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const readiness = createMemo(() => setupReadyMap(controller()));

  return (
    <section class="readiness-state" data-testid="main-empty-state-work">
      <div class={`status-pill status-badge ${phaseTone(controller())}`}>
        {st().card.readinessLabel}
      </div>
      <p class="readiness-instruction" data-testid="readiness-instruction">
        {st().card.idleReadyInstruction}
      </p>
      <div class="status-rail" data-testid="readiness-status-rail">
        <span class={`status-rail-chip ${readiness().speech ? "is-ready" : ""}`}>
          {st().card.readinessSpeech}
        </span>
        <span class={`status-rail-chip ${readiness().llm ? "is-ready" : ""}`}>
          {st().card.readinessReply}
        </span>
        <span class={`status-rail-chip ${readiness().hotkey ? "is-ready" : ""}`}>
          {st().card.readinessHotkey}
        </span>
      </div>
    </section>
  );
}

function SetupChecklistBanner(props: { controller: ReplylineController }) {
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
        <div class="setup-banner-tags" data-testid="setup-banner-missing-steps">
          <For each={missingSteps()}>
            {(step) => <span class="setup-missing-chip">{step.label}</span>}
          </For>
        </div>
        <p class="empty-flow-hint">{st().card.setupCompactHint}</p>
        <button
          class="btn-secondary btn-compact"
          type="button"
          onClick={() => controller().openSettingsPanel()}
        >
          {st().settings.openFirstMissing}
        </button>
      </section>
    </Show>
  );
}

function RecordingState(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  return (
    <Show when={controller().phase() === "capturing"}>
      <section class="phase-card phase-card--recording" data-testid="recording-state-card">
        <div class="phase-card-row">
          <strong>{st().card.recordingLabel}</strong>
          <span>{controller().phaseLabel()}</span>
        </div>
        <p class="empty-flow-hint">{st().card.releaseToAnalyze}</p>
      </section>
    </Show>
  );
}

function ProcessingState(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  return (
    <Show when={controller().phase() === "transcribing" || controller().phase() === "analyzing"}>
      <section class="phase-card" data-testid="processing-state-card">
        <div class="status-rail" data-testid="processing-rail">
          <span
            class={`status-rail-chip ${controller().phase() === "transcribing" ? "is-active" : "is-ready"}`}
          >
            {st().card.processingSpeech}
          </span>
          <span
            class={`status-rail-chip ${controller().phase() === "analyzing" ? "is-active" : ""}`}
          >
            {st().card.processingReply}
          </span>
        </div>
        <Show when={controller().statusDetail()}>
          <p class="empty-flow-hint">{controller().statusDetail()}</p>
        </Show>
      </section>
    </Show>
  );
}

function ErrorRecoveryCard(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  return (
    <Show when={controller().mainUiState() === "error"}>
      <section class="phase-card phase-card--error" data-testid="error-recovery-card">
        <strong>{st().phase.error}</strong>
        <p class="empty-flow-hint">{st().card.errorHint}</p>
        <div class="action-group">
          <button
            class="btn-secondary"
            type="button"
            onClick={() => controller().openSettingsPanel()}
          >
            {st().card.errorFixAction}
          </button>
          <Show when={controller().canRetry()}>
            <button
              class="btn-ghost"
              type="button"
              title={controller().retryDisabledReason() ?? ""}
              onClick={() => void controller().retryAnalysis()}
            >
              {st().card.retryCard}
            </button>
          </Show>
        </div>
      </section>
    </Show>
  );
}

function LiveAnswerCard(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const [copied, setCopied] = createSignal(false);
  let copiedTimer: ReturnType<typeof setTimeout> | null = null;

  const handleCopy = async () => {
    await controller().copyCurrentCard();
    setCopied(true);
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => setCopied(false), 1200);
  };

  onCleanup(() => {
    if (copiedTimer) clearTimeout(copiedTimer);
  });

  return (
    <article
      class="result-section result-section--primary answer-hero"
      data-testid="answer-hero-card"
    >
      <div class="answer-hero-header">
        <div class="result-label">{st().card.sayNowLabel}</div>
        <button
          class="btn-primary"
          disabled={!controller().canCopySayNow()}
          title={controller().copyDisabledReason() ?? ""}
          aria-label={st().card.copySayNow}
          onClick={() => void handleCopy()}
        >
          {copied() ? st().card.copiedLabel : st().card.copySayNow}
        </button>
      </div>
      <Show
        when={controller().card()?.sayNow?.trim()}
        fallback={<p class="result-text result-text--placeholder">{st().card.emptySayNow}</p>}
      >
        <p class="result-text result-text--speak" data-testid="section-say-now">
          {controller().card()?.sayNow?.trim()}
        </p>
      </Show>
    </article>
  );
}

function InsightStrip(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  return (
    <section class="secondary-insights" data-testid="secondary-insight-cards">
      <section class="result-section result-section--compact" data-testid="section-gist">
        <div class="result-label">{st().card.gistLabel}</div>
        <p class="result-text">{controller().card()?.gist?.trim() || st().card.emptyGistCompact}</p>
      </section>
      <section class="result-section result-section--compact" data-testid="section-next-move">
        <div class="result-label">{st().card.nextMoveLabel}</div>
        <p class="result-text">
          {controller().card()?.nextMove?.trim() || st().card.emptyNextMoveCompact}
        </p>
      </section>
    </section>
  );
}

function WorkspaceSidePanel(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const hasInterviewReport = () => Boolean(controller().interviewReport());
  const hasInterviewSession = () => Boolean(controller().interviewSession());
  const questionCount = () =>
    controller().interviewSession()?.questions.length ??
    controller().interviewReport()?.questions.length ??
    0;
  const durationLabel = () =>
    formatDurationLabel(
      controller().interviewSession()?.startedAt ?? controller().interviewReport()?.startedAt,
      controller().interviewReport()?.endedAt,
    );
  const exportDisabledReason = () =>
    hasInterviewReport() ? "" : st().card.interview.sessionActions.exportDisabledNoReport;

  return (
    <aside class="cockpit-side app-page-aside app-sidebar" data-testid="main-side-panel">
      <div class="workspace-aside-stack" data-testid="workspace-aside-stack">
        <section class="result-section result-section--compact" data-testid="session-panel">
          <div class="result-label">{st().card.interview.report.session}</div>
          <div class="session-metrics" data-testid="session-metrics">
            <span
              class={`status-rail-chip ${hasInterviewSession() ? "is-active" : ""}`}
              data-testid="session-active-chip"
            >
              {hasInterviewSession()
                ? st().card.interview.sessionState.active
                : st().card.interview.sessionState.inactive}
            </span>
            <span class="session-meta">
              {st().card.interview.report.questions}: {questionCount()}
            </span>
            <Show when={durationLabel()}>
              <span class="session-meta">
                {st().card.interview.report.duration}: {durationLabel()}
              </span>
            </Show>
          </div>
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

        <Show when={controller().interviewReport()}>
          <section class="result-section result-section--compact" data-testid="report-panel">
            <div class="result-label">{st().card.interview.report.title}</div>
            <p class="result-text">
              {st().card.interview.report.questions}:{" "}
              {controller().interviewReport()?.questions.length ?? 0}
            </p>
            <p class="result-text">{st().card.interview.report.scores}</p>
            <div class="score-stack">
              <div class="score-row">
                <span class="score-label">{st().card.interview.report.clarity}</span>
                <div class="score-track">
                  <div
                    class="score-fill"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, controller().interviewReport()?.scores?.clarity ?? 0),
                      )}%`,
                    }}
                  />
                </div>
                <span class="score-value">
                  {controller().interviewReport()?.scores?.clarity ?? 0}
                </span>
              </div>
              <div class="score-row">
                <span class="score-label">{st().card.interview.report.relevance}</span>
                <div class="score-track">
                  <div
                    class="score-fill"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, controller().interviewReport()?.scores?.relevance ?? 0),
                      )}%`,
                    }}
                  />
                </div>
                <span class="score-value">
                  {controller().interviewReport()?.scores?.relevance ?? 0}
                </span>
              </div>
              <div class="score-row">
                <span class="score-label">{st().card.interview.report.accuracy}</span>
                <div class="score-track">
                  <div
                    class="score-fill"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, controller().interviewReport()?.scores?.accuracy ?? 0),
                      )}%`,
                    }}
                  />
                </div>
                <span class="score-value">
                  {controller().interviewReport()?.scores?.accuracy ?? 0}
                </span>
              </div>
            </div>
            <button
              class="btn-ghost"
              type="button"
              aria-label={st().card.interview.sessionActions.openReport}
              onClick={() => void controller().openInterviewReport()}
            >
              {st().card.interview.sessionActions.openReport}
            </button>
          </section>
        </Show>
        <Show when={!controller().interviewReport()}>
          <section class="result-section result-section--compact" data-testid="report-panel-empty">
            <div class="result-label">{st().card.interview.report.title}</div>
            <p class="result-text result-text--placeholder">
              {st().card.interview.sessionActions.noReportHint}
            </p>
          </section>
        </Show>

        <section class="result-section result-section--compact" data-testid="export-panel">
          <div class="result-label">{st().card.interview.report.markdown}</div>
          <p class="empty-flow-hint">
            {st().card.interview.sessionActions.exportRedactedRecommended}
          </p>
          <div class="action-group side-panel-actions">
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
              class="btn-danger btn-ghost"
              type="button"
              title={st().card.interview.sessionActions.clearReportsDanger}
              onClick={() => void controller().clearInterviewReports()}
            >
              {st().card.interview.sessionActions.clearReports}
            </button>
          </div>
          <Show when={!controller().interviewReport()}>
            <p class="result-text result-text--placeholder">
              {st().card.interview.report.noReport}
            </p>
          </Show>
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

function ActionDock(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const showDockCopy = () =>
    controller().mainUiState() === "error" || controller().card()?.mode === "interview";

  return (
    <div class="action-bar sticky-action-footer app-sticky-footer" data-testid="action-row">
      <Show when={showDockCopy()}>
        <button
          class="btn-ghost"
          disabled={!controller().canCopySayNow()}
          title={controller().copyDisabledReason() ?? ""}
          aria-label={st().card.copySayNow}
          onClick={() => void controller().copyCurrentCard()}
        >
          {st().card.copySayNow}
        </button>
      </Show>
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
      <Show when={controller().setupRequired()}>
        <button class="btn-ghost" type="button" onClick={() => controller().openSettingsPanel()}>
          {st().setup.continueSetup}
        </button>
      </Show>
    </div>
  );
}

function LiveAssistShell(props: { controller: ReplylineController; compactLayout: boolean }) {
  const controller = () => props.controller;

  return (
    <div
      class={`main-cockpit-layout ${props.compactLayout ? "is-compact" : "is-wide"}`}
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
                  aria-label={controller().strings().card.interview.prevCard}
                  onClick={() => controller().prevInterviewCard()}
                >
                  ←
                </button>
                <div
                  class="interview-card-tabs"
                  role="tablist"
                  aria-label={controller().strings().card.interview.carouselLabel}
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
                  aria-label={controller().strings().card.interview.nextCard}
                  onClick={() => controller().nextInterviewCard()}
                >
                  →
                </button>
                <button
                  class="btn-ghost"
                  type="button"
                  aria-label={controller().strings().card.interview.pinCard}
                  aria-pressed={Boolean(controller().pinnedInterviewCard())}
                  onClick={() => controller().togglePinInterviewCard()}
                >
                  {controller().pinnedInterviewCard()
                    ? controller().strings().card.interview.unpinCard
                    : controller().strings().card.interview.pinCard}
                </button>
              </div>
              <Show when={controller().activeInterviewCardKey() === "answer"}>
                <section
                  class="result-section result-section--primary"
                  data-testid="section-interview-answer"
                >
                  <div class="result-label">{controller().strings().card.interview.answer}</div>
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
                    {controller().strings().card.interview.cleanQuestion}:{" "}
                    {controller().card()?.mode === "interview"
                      ? controller().card().interview.question.cleanQuestion
                      : ""}
                  </p>
                </section>
              </Show>
              <Show when={controller().activeInterviewCardKey() === "signals"}>
                <section class="result-section" data-testid="section-interview-signals">
                  <p class="result-text">
                    {controller().strings().card.interview.mustMention}:{" "}
                    {controller().card()?.mode === "interview"
                      ? valueOrDash(
                          controller().card().interview.signals.mustMention,
                          controller().strings().card.interview.notAvailable,
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
                          controller().strings().card.interview.notAvailable,
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
          <LiveAnswerCard controller={controller()} />
          <InsightStrip controller={controller()} />
        </Show>
      </article>
      <WorkspaceSidePanel controller={controller()} />
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
    st().card.processingHint,
    st().card.emptyFlow,
    st().card.emptyGist,
    st().card.emptyNextMove,
    st().card.setupRequiredHint,
    st().card.idleRecordHint,
    st().card.idlePipelineHint,
    st().card.copyUnavailableHint,
    st().card.shortCaptureHint,
    st().card.starEvidenceLabel,
    st().card.nextActionLabel,
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
    st().card.readinessLabel,
    st().card.idleReadyInstruction,
    st().card.readinessSpeech,
    st().card.readinessReply,
    st().card.readinessHotkey,
    st().card.recordingLabel,
    st().card.releaseToAnalyze,
    st().card.processingSpeech,
    st().card.processingReply,
    st().card.setupCompactHint,
    st().card.errorFixAction,
    st().card.copiedLabel,
    st().card.emptyGistCompact,
    st().card.emptyNextMoveCompact,
    st().captureQuality.label,
    st().captureQuality.short,
    st().captureQuality.normal,
    st().captureQuality.long,
  ]);
  void localeCoverage();

  const compactInterview = () =>
    controller().card()?.mode === "interview" && controller().compactMode();
  const showIdleReadiness = () =>
    !controller().setupRequired() &&
    !controller().card() &&
    controller().mainUiState() !== "error" &&
    controller().phase() !== "capturing" &&
    controller().phase() !== "transcribing" &&
    controller().phase() !== "analyzing";

  return (
    <Show when={controller().panel() === "main"}>
      <section
        class={`main-card surface-card app-page app-page--workspace main-card--${controller().mainUiState()} ${compactInterview() ? "main-card--compact" : ""}`}
        data-testid="main-surface"
      >
        <div class="main-card-top app-page-header" data-testid="main-card-top">
          <section class="status-strip" data-testid="main-status-strip">
            <div class={`status-pill status-badge ${phaseTone(controller())}`}>
              {controller().phaseLabel()}
            </div>
            <span class="status-strip-phase" data-testid="status-strip-phase">
              {st().card.phasePrefix}: {phaseStateText(controller())}
            </span>
          </section>

          <SetupChecklistBanner controller={controller()} />
          <Show when={showIdleReadiness()}>
            <ReadinessState controller={controller()} />
          </Show>
          <RecordingState controller={controller()} />
          <ProcessingState controller={controller()} />
          <ErrorRecoveryCard controller={controller()} />
          <Show when={controller().mainUiState() === "ready"}>
            <p class="empty-flow-hint">{st().card.readyHint}</p>
          </Show>
        </div>

        <div class="main-card-body app-page-body" data-testid="main-card-body">
          <Show when={controller().mainUiState() !== "error"}>
            <LiveAssistShell controller={controller()} compactLayout={compactLayout()} />
          </Show>
        </div>

        <ActionDock controller={controller()} />
      </section>
    </Show>
  );
}
