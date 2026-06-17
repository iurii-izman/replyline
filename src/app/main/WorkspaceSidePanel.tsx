import { Show } from "solid-js";
import type { ReplylineController } from "../controller";
import { formatDurationLabel } from "./helpers";

export function WorkspaceSidePanel(props: Readonly<{ controller: ReplylineController }>) {
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
