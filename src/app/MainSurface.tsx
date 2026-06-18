import { Show, createMemo } from "solid-js";
import type { ReplylineController } from "./controller";
import { BilingualInterviewSurface } from "./BilingualInterviewSurface";
import { SetupFocusState } from "./main/SetupFocusState";
import { IdleReadyState } from "./main/IdleReadyState";
import { ProcessingState } from "./main/ProcessingState";
import { LiveAssistShell } from "./main/LiveAssistShell";
import { ActionDock } from "./main/ActionDock";

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
            <section
              class="phase-card phase-card--error"
              data-testid="startup-readiness-error"
              role="alert"
            >
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
            <section
              class="phase-card phase-card--error"
              data-testid="error-recovery-card"
              role="alert"
            >
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
