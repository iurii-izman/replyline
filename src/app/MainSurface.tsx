import { For, Show, createMemo, createSignal, onCleanup } from "solid-js";
import type { SettingsSectionId } from "./model";
import type { ReplylineController } from "./controller";
import { BilingualInterviewSurface } from "./BilingualInterviewSurface";

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

function mapSetupStepToSection(label: string): SettingsSectionId {
  if (label.startsWith("1.")) return "speech";
  if (label.startsWith("2.")) return "llm";
  return "hotkey";
}

function joinList(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join(" • ");
  }
  return typeof value === "string" ? value : "";
}

function SetupFocusState(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const missingSteps = createMemo(() =>
    controller()
      .setupSteps()
      .filter((step) => !step.ready),
  );
  const firstMissingSection = createMemo<SettingsSectionId | undefined>(() => {
    const first = missingSteps()[0];
    return first ? mapSetupStepToSection(first.label) : undefined;
  });

  return (
    <section class="setup-focus-state" data-testid="main-state-setup">
      <h2 class="setup-focus-title">{st().setup.wizardTitle}</h2>
      <p class="setup-focus-subtitle" data-testid="setup-overall-hint">
        {st().setup.focusSubtitle}
      </p>
      <ul class="setup-focus-list" data-testid="setup-focus-list">
        <For each={controller().setupSteps()}>
          {(step) => (
            <li class={`setup-focus-row ${step.ready ? "is-ready" : "is-missing"}`}>
              <div class="setup-focus-copy">
                <strong>{step.label}</strong>
                <span class="empty-flow-hint">
                  {step.ready ? step.readyLabel : step.missingLabel}
                </span>
              </div>
              <span>{step.ready ? st().settings.statusReady : st().settings.statusMissing}</span>
              <button
                class="btn-ghost btn-compact"
                type="button"
                onClick={() => controller().openSettingsPanel(mapSetupStepToSection(step.label))}
              >
                {st().settings.openStep}
              </button>
            </li>
          )}
        </For>
      </ul>
      <div class="action-group">
        <button
          class="btn-primary"
          data-testid="setup-first-missing-cta"
          type="button"
          onClick={() => controller().openSettingsPanel(firstMissingSection())}
        >
          {st().settings.openFirstMissing}
        </button>
        <button
          class="btn-secondary"
          type="button"
          onClick={() => void controller().checkRuntimeConfig()}
        >
          {st().settings.runCheck}
        </button>
        <button class="btn-ghost" type="button" onClick={() => controller().openSettingsPanel()}>
          {st().settings.openSettings}
        </button>
        <Show when={controller().setupTroubleCount() >= 2}>
          <button
            class="btn-ghost"
            type="button"
            onClick={() => void controller().copySetupIssueHint()}
          >
            {st().settings.copyIssueHint}
          </button>
        </Show>
      </div>
      <Show when={controller().setupTroubleCount() >= 2}>
        <p class="empty-flow-hint">{st().settings.setupSmokeReportHint}</p>
      </Show>
      <p class="empty-flow-hint">{st().setup.focusLocalStorageHint}</p>
    </section>
  );
}

function IdleReadyState(props: Readonly<{ controller: ReplylineController }>) {
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
      <Show when={controller().interviewSession()}>
        <p class="empty-flow-hint" data-testid="idle-session-chip">
          {st().card.interview.sessionChipPrefix} {activeSessionQuestions()}
        </p>
      </Show>
      <p class="empty-flow-hint" data-testid="interview-trust-note-idle">
        {st().card.interview.allowedUseBoundary}
      </p>
      <div class="action-group">
        <button
          class="btn-primary"
          type="button"
          onClick={() => void controller().startInterviewSession()}
        >
          {st().card.interview.sessionActions.start}
        </button>
        <button
          class="btn-secondary"
          type="button"
          onClick={() => controller().openSettingsPanel()}
        >
          {st().card.errorFixAction}
        </button>
      </div>
    </section>
  );
}

function ProcessingState(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const isRecording = () => controller().phase() === "capturing";
  const isAnalyzing = () => controller().phase() === "analyzing";

  return (
    <section
      class={`phase-card ${isRecording() ? "phase-card--recording" : "phase-card--analyzing"}`}
      data-testid="main-state-processing"
    >
      <Show
        when={isRecording()}
        fallback={
          <>
            <strong>{st().header.statusAnalyzing}</strong>
            <p class="empty-flow-hint">
              {st().card.processingSpeech} {"->"} {st().card.processingReply}
            </p>
          </>
        }
      >
        <div class="phase-card-row">
          <strong>{st().card.recordingLabel}</strong>
          <span>{controller().phaseLabel()}</span>
        </div>
        <p class="empty-flow-hint">{st().card.releaseToAnalyze}</p>
        <div class="phase-activity-pulse" aria-hidden="true" />
      </Show>
      <Show when={isAnalyzing()}>
        <div class="phase-progress-line" aria-hidden="true" />
      </Show>
      <Show when={controller().statusDetail()}>
        <p class="empty-flow-hint">{controller().statusDetail()}</p>
      </Show>
    </section>
  );
}

function LiveAnswerCard(props: Readonly<{ controller: ReplylineController }>) {
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
          class={`btn-primary answer-copy-btn ${copied() ? "is-copied" : ""}`}
          type="button"
          aria-label={st().card.copySayNow}
          onClick={() => void handleCopy()}
        >
          {copied() ? st().card.copiedLabel : st().card.copySayNow}
        </button>
      </div>
      <p class="result-text result-text--speak" data-testid="section-say-now">
        {controller().card()?.sayNow?.trim()}
      </p>
      <p class="empty-flow-hint">{st().card.sayNowHint}</p>
    </article>
  );
}

function InsightStrip(props: Readonly<{ controller: ReplylineController }>) {
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

function WorkspaceSidePanel(props: Readonly<{ controller: ReplylineController }>) {
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
  const modeToneClass = () => (hasInterviewSession() ? "is-interview" : "is-work");

  return (
    <aside class="cockpit-side app-page-aside app-sidebar" data-testid="main-side-panel">
      <div class="workspace-aside-stack" data-testid="workspace-aside-stack">
        <section
          class={`result-section result-section--compact mode-banner ${modeToneClass()}`}
          data-testid="mode-state-banner"
        >
          <div class="result-label">{st().card.modeStateLabel}</div>
          <p class="result-text">
            {hasInterviewSession() ? st().card.modeInterviewActive : st().card.modeWorkDefault}
          </p>
        </section>
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
            <p class="empty-flow-hint" data-testid="interview-trust-note-side">
              {st().card.interview.allowedUseBoundary}
            </p>
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
            <button
              class="btn-ghost"
              type="button"
              onClick={() => void controller().openInterviewReport()}
            >
              {st().card.interview.sessionActions.openReport}
            </button>
          </section>
        </Show>

        <Show
          when={
            hasInterviewReport() ||
            controller().interviewReportMarkdownPath() ||
            controller().interviewReportRedactedMarkdownPath()
          }
        >
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
          </section>
        </Show>
      </div>
    </aside>
  );
}

function ActionDock(props: Readonly<{ controller: ReplylineController }>) {
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

type InterviewCardKey = Parameters<typeof interviewCardLabel>[1];

function interviewCardTabId(key: InterviewCardKey): string {
  return `interview-card-tab-${key}`;
}

function interviewCardPanelId(key: InterviewCardKey): string {
  return `interview-card-panel-${key}`;
}

function LiveAssistShell(
  props: Readonly<{
    controller: ReplylineController;
    showSidePanel: boolean;
    compactLayout: boolean;
  }>,
) {
  const controller = () => props.controller;
  const interviewTabRefs: HTMLButtonElement[] = [];
  const focusInterviewCard = (nextIndex: number) => {
    const cardCount = controller().interviewCardKeys().length;
    const safeIndex = Math.min(Math.max(0, nextIndex), Math.max(0, cardCount - 1));
    controller().selectInterviewCardIndex(safeIndex);
    interviewTabRefs[safeIndex]?.focus();
  };
  return (
    <div
      class={`main-cockpit-layout ${props.showSidePanel && !props.compactLayout ? "is-wide" : "is-compact"} ${props.showSidePanel ? "has-side-panel" : "no-side-panel"}`}
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
                  onClick={() => focusInterviewCard(controller().activeInterviewCardIndex() - 1)}
                >
                  ←
                </button>
                <div
                  class="interview-card-tabs"
                  role="tablist"
                  aria-orientation="horizontal"
                  aria-label={controller().strings().card.interview.carouselLabel}
                >
                  <For each={controller().interviewCardKeys()}>
                    {(key, index) => {
                      const tabIndex = index();
                      const isActive = () => controller().activeInterviewCardIndex() === tabIndex;
                      return (
                        <button
                          ref={(element) => {
                            interviewTabRefs[tabIndex] = element;
                          }}
                          class={`interview-card-tab ${isActive() ? "is-active" : ""}`}
                          type="button"
                          role="tab"
                          id={interviewCardTabId(key)}
                          aria-selected={isActive()}
                          aria-controls={interviewCardPanelId(key)}
                          tabIndex={isActive() ? 0 : -1}
                          aria-label={`${tabIndex + 1}. ${interviewCardLabel(controller(), key)}`}
                          onClick={() => focusInterviewCard(tabIndex)}
                          onKeyDown={(event) => {
                            if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                              event.preventDefault();
                              focusInterviewCard(tabIndex + 1);
                            } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                              event.preventDefault();
                              focusInterviewCard(tabIndex - 1);
                            } else if (event.key === "Home") {
                              event.preventDefault();
                              focusInterviewCard(0);
                            } else if (event.key === "End") {
                              event.preventDefault();
                              focusInterviewCard(controller().interviewCardKeys().length - 1);
                            }
                          }}
                        >
                          {tabIndex + 1}. {interviewCardLabel(controller(), key)}
                        </button>
                      );
                    }}
                  </For>
                </div>
                <button
                  class="btn-ghost"
                  type="button"
                  aria-label={controller().strings().card.interview.nextCard}
                  onClick={() => focusInterviewCard(controller().activeInterviewCardIndex() + 1)}
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
                  id={interviewCardPanelId("answer")}
                  role="tabpanel"
                  aria-labelledby={interviewCardTabId("answer")}
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
                <section
                  class="result-section"
                  id={interviewCardPanelId("question")}
                  role="tabpanel"
                  aria-labelledby={interviewCardTabId("question")}
                  data-testid="section-interview-question"
                >
                  <p class="result-text">
                    {controller().strings().card.interview.cleanQuestion}:{" "}
                    {controller().card()?.mode === "interview"
                      ? controller().card().interview.question.cleanQuestion
                      : ""}
                  </p>
                </section>
              </Show>
              <Show when={controller().activeInterviewCardKey() === "signals"}>
                <section
                  class="result-section"
                  id={interviewCardPanelId("signals")}
                  role="tabpanel"
                  aria-labelledby={interviewCardTabId("signals")}
                  data-testid="section-interview-signals"
                >
                  <p class="result-text">
                    {controller().strings().card.interview.mustMention}:{" "}
                    {controller().card()?.mode === "interview"
                      ? joinList(controller().card().interview.signals.mustMention) ||
                        controller().strings().card.interview.notAvailable
                      : ""}
                  </p>
                </section>
              </Show>
              <Show when={controller().activeInterviewCardKey() === "risks"}>
                <section
                  class="result-section"
                  id={interviewCardPanelId("risks")}
                  role="tabpanel"
                  aria-labelledby={interviewCardTabId("risks")}
                  data-testid="section-interview-risks"
                >
                  <p class="result-text">
                    {controller().card()?.mode === "interview"
                      ? controller().card().interview.risks.safeReframe ||
                        controller().strings().card.interview.notAvailable
                      : ""}
                  </p>
                </section>
              </Show>
              <Show when={controller().activeInterviewCardKey() === "followUps"}>
                <section
                  class="result-section"
                  id={interviewCardPanelId("followUps")}
                  role="tabpanel"
                  aria-labelledby={interviewCardTabId("followUps")}
                  data-testid="section-interview-followups"
                >
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
                <section
                  class="result-section"
                  id={interviewCardPanelId("clarifier")}
                  role="tabpanel"
                  aria-labelledby={interviewCardTabId("clarifier")}
                  data-testid="section-interview-clarifier"
                >
                  <p class="result-text">
                    {controller().card()?.mode === "interview"
                      ? controller().card().interview.clarifier.text ||
                        (controller().card().interview.clarifier as { question?: string })
                          .question ||
                        controller().strings().card.interview.notAvailable
                      : ""}
                  </p>
                </section>
              </Show>
            </>
          }
        >
          <LiveAnswerCard controller={controller()} />
          <hr class="card-section-divider" aria-hidden="true" />
          <InsightStrip controller={controller()} />
        </Show>
      </article>
      <Show when={props.showSidePanel}>
        <WorkspaceSidePanel controller={controller()} />
      </Show>
    </div>
  );
}

export function MainSurface(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const localeCoverage = createMemo(() => [
    st().card.errorHint,
    st().card.readyHint,
    st().card.processingHint,
    st().card.emptyFlow,
    st().card.emptyGist,
    st().card.emptySayNow,
    st().card.emptyNextMove,
    st().card.setupRequiredHint,
    st().card.idleRecordHint,
    st().card.idlePipelineHint,
    st().card.copyUnavailableHint,
    st().card.shortCaptureHint,
    st().card.starEvidenceLabel,
    st().card.riskOrClarifierLabel,
    st().card.nextActionLabel,
    st().card.nextActionSetup,
    st().card.nextActionCapture,
    st().card.nextActionWait,
    st().card.nextActionCopy,
    st().card.nextActionFix,
    st().card.phasePrefix,
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
    st().card.interview.sessionActions.noReportHint,
    st().card.interview.sessionActions.noReportAction,
    st().card.interview.report.scores,
    st().card.interview.report.clarity,
    st().card.interview.report.relevance,
    st().card.interview.report.accuracy,
    st().card.interview.report.markdownRedacted,
    st().card.interview.report.noReport,
    st().pipeline.label,
    st().pipeline.capture,
    st().pipeline.text,
    st().pipeline.reply,
    st().pipeline.card,
    st().card.readinessLabel,
    st().card.readinessSpeech,
    st().card.readinessReply,
    st().card.readinessHotkey,
    st().card.setupCompactHint,
    st().card.lastTranscriptLabel,
    st().captureQuality.label,
    st().captureQuality.short,
    st().captureQuality.normal,
    st().captureQuality.long,
    st().setup.continueSetup,
    st().card.bilingual.headerTitle,
    st().card.bilingual.headerSubtitle,
    st().card.bilingual.liveTranscriptTitle,
    st().card.bilingual.liveTranslationTitle,
    st().card.bilingual.questionTitle,
    st().card.bilingual.answerTitle,
    st().card.bilingual.answerEmpty,
    st().card.bilingual.translationFallbackWarning,
    st().card.bilingual.sttLatencyLabel,
    st().card.bilingual.translationLatencyLabel,
    st().card.bilingual.answerLatencyLabel,
    st().card.bilingual.status.idle,
    st().card.bilingual.status.starting,
    st().card.bilingual.status.active,
    st().card.bilingual.status.reconnecting,
    st().card.bilingual.status.degraded,
    st().card.bilingual.status.stopping,
    st().card.bilingual.status.error,
    st().settings.bilingualInterviewEnabledLabel,
    st().settings.liveTranslationEnabledLabel,
    st().settings.bilingualInterviewDisclaimer,
    st().errors.captureStart,
    st().errors.pipelineNothingToRetry,
    st().errors.pipelineNoSpeech,
    st().errors.pipelineDeepgram,
    st().errors.pipelineLlm,
    st().errors.pipelineCardInvalid,
    st().errors.pipelineShortCapture,
    st().errors.pipelineGeneric,
    st().errors.bootstrapLoad,
    st().errors.clearContext,
    st().errors.settingsHotkeyRequired,
    st().errors.settingsModelRequired,
    st().errors.settingsInvalidUrl,
    st().errors.settingsCaptureRange,
    st().errors.settingsEmptySecret,
  ]);
  localeCoverage();
  const compactLayout = createMemo(() => controller().compactMode());
  const readinessState = createMemo(() => controller().setupReadinessState());
  const isStartupChecking = createMemo(() => readinessState() === "checking");
  const isStartupError = createMemo(() => readinessState() === "error");
  const isSetup = createMemo(() => controller().setupRequired());
  const isProcessing = createMemo(
    () =>
      controller().phase() === "capturing" ||
      controller().phase() === "transcribing" ||
      controller().phase() === "analyzing",
  );
  const isAnswerReady = createMemo(
    () => controller().mainUiState() === "ready" && Boolean(controller().card()?.sayNow?.trim()),
  );
  const isIdleReady = createMemo(
    () =>
      !isStartupChecking() &&
      !isStartupError() &&
      !isSetup() &&
      !isProcessing() &&
      !isAnswerReady() &&
      !controller().bilingualActive() &&
      controller().mainUiState() !== "error",
  );
  const isError = createMemo(() => controller().mainUiState() === "error");
  const showSidePanel = createMemo(
    () =>
      Boolean(controller().interviewSession()) ||
      Boolean(controller().interviewReport()) ||
      Boolean(controller().interviewReportMarkdownPath()) ||
      Boolean(controller().interviewReportRedactedMarkdownPath()) ||
      controller().card()?.mode === "interview",
  );
  const compactInterview = createMemo(
    () => controller().card()?.mode === "interview" && controller().compactMode(),
  );
  const showBilingualSurface = createMemo(
    () => controller().settings.bilingualInterviewEnabled && controller().bilingualActive(),
  );

  return (
    <Show when={controller().panel() === "main"}>
      <section
        class={`main-card surface-card app-page app-page--workspace main-card--${controller().mainUiState()} ${compactInterview() ? "main-card--compact" : ""}`}
        data-testid="main-surface"
      >
        <div class="main-card-top app-page-header" data-testid="main-card-top">
          <section class="status-strip status-strip--quiet" data-testid="main-status-strip">
            <span class="status-strip-phase">{controller().phaseLabel()}</span>
            <Show when={isIdleReady()}>
              <button
                type="button"
                class="btn btn-sm"
                data-testid="context-pack-open-btn"
                onClick={() => controller().openContextPackPanel()}
              >
                {st().contextPack.manageCtx}
              </button>
            </Show>
          </section>
          <Show when={controller().activeContextPack()}>
            {(pack) => (
              <div class="context-active-chip" data-testid="context-active-chip">
                <span class="context-chip-label">{st().contextPack.activeLabel}:</span>
                <span class="context-chip-title" data-testid="context-chip-title">
                  {pack().title}
                </span>
                <div class="context-chip-actions">
                  <button
                    type="button"
                    class="btn btn-sm"
                    data-testid="context-chip-change-btn"
                    onClick={() => controller().openContextPackPanel()}
                  >
                    {st().contextPack.changeCtx}
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-danger"
                    data-testid="context-chip-disable-btn"
                    onClick={() => controller().clearActiveContextPackAction()}
                  >
                    {st().contextPack.disableCtx}
                  </button>
                </div>
              </div>
            )}
          </Show>
        </div>
        <div class="main-card-body app-page-body" data-testid="main-card-body">
          <Show when={isStartupChecking()}>
            <section
              class="readiness-state readiness-state--centered"
              data-testid="startup-checking"
            >
              <h2 class="readiness-title">{st().phase.booting}</h2>
            </section>
          </Show>
          <Show when={isStartupError()}>
            <section class="phase-card phase-card--error" data-testid="startup-readiness-error">
              <strong>{controller().strings().phase.error}</strong>
              <p class="empty-flow-hint">
                {controller().error() ?? controller().strings().card.errorHint}
              </p>
              <div class="action-group">
                <button
                  class="btn-secondary"
                  type="button"
                  onClick={() => controller().openSettingsPanel()}
                >
                  {controller().strings().card.errorFixAction}
                </button>
                <button
                  class="btn-primary"
                  type="button"
                  onClick={() => void controller().reloadBootstrap()}
                >
                  {controller().strings().settings.runCheck}
                </button>
                <Show when={controller().setupTroubleCount() >= 2}>
                  <button
                    class="btn-ghost"
                    type="button"
                    onClick={() => void controller().copySetupIssueHint()}
                  >
                    {controller().strings().settings.copyIssueHint}
                  </button>
                </Show>
              </div>
              <Show when={controller().setupTroubleCount() >= 2}>
                <p class="empty-flow-hint">
                  {controller().strings().settings.setupSmokeReportHint}
                </p>
              </Show>
            </section>
          </Show>
          <Show when={!isStartupChecking() && !isStartupError() && isSetup()}>
            <SetupFocusState controller={controller()} />
          </Show>
          <Show when={isIdleReady()}>
            <IdleReadyState controller={controller()} />
          </Show>
          <Show when={showBilingualSurface()}>
            <BilingualInterviewSurface controller={controller()} />
          </Show>
          <Show when={isProcessing()}>
            <ProcessingState controller={controller()} />
          </Show>
          <Show when={isAnswerReady()}>
            <LiveAssistShell
              controller={controller()}
              compactLayout={compactLayout()}
              showSidePanel={showSidePanel()}
            />
          </Show>
          <Show when={isError()}>
            <section class="phase-card phase-card--error" data-testid="error-recovery-card">
              <strong>{controller().strings().phase.error}</strong>
              <p class="empty-flow-hint">
                {controller().error() ?? controller().strings().card.errorHint}
              </p>
              <div class="action-group">
                <button
                  class="btn-secondary"
                  type="button"
                  onClick={() => void controller().retryAnalysis()}
                  disabled={!controller().canRetry()}
                >
                  {controller().strings().card.retryCard}
                </button>
                <button
                  class="btn-secondary"
                  type="button"
                  onClick={() => controller().openSettingsPanel()}
                >
                  {controller().strings().card.errorFixAction}
                </button>
                <Show when={controller().setupTroubleCount() >= 2}>
                  <button
                    class="btn-ghost"
                    type="button"
                    onClick={() => void controller().copySetupIssueHint()}
                  >
                    {controller().strings().settings.copyIssueHint}
                  </button>
                </Show>
              </div>
              <Show when={controller().setupTroubleCount() >= 2}>
                <p class="empty-flow-hint">
                  {controller().strings().settings.setupSmokeReportHint}
                </p>
              </Show>
            </section>
          </Show>
        </div>
        <Show when={isAnswerReady()}>
          <ActionDock controller={controller()} />
        </Show>
      </section>
    </Show>
  );
}
