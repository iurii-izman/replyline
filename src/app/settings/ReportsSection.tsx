import { Show } from "solid-js";
import type { ReplylineController } from "../controller";
import { setupStatusClass, setupStatusLabel } from "../settings/settingsViewModel";

export function ReportsSection(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  return (
    <article
      id="settings-panel-reports"
      class="settings-section-card section-card settings-section-card--compact"
      data-testid="settings-section-reports"
    >
      <h3 class="settings-section-title">
        {st().settings.navReports}{" "}
        <span class={setupStatusClass("optional")}>{setupStatusLabel(st(), "optional")}</span>
      </h3>
      <p class="settings-section-hint">{st().settings.reportsSectionHint}</p>
      <section class="settings-subsection">
        <h4 class="settings-subsection-title">{st().settings.reportsEverydayTitle}</h4>
        <p class="field-help">{st().settings.reportsEverydayHint}</p>
        <label class="field">
          <span class="field-label">{st().settings.interviewReportRetentionLabel}</span>
          <select
            class="field-input"
            value={String(controller().settings.interviewReportRetentionDays)}
            onInput={(event) =>
              controller().setInterviewReportRetentionDays(
                Number.parseInt(event.currentTarget.value, 10) as 0 | 7 | 30 | 90,
              )
            }
          >
            <option value="0">{st().settings.interviewReportRetentionOptionManual}</option>
            <option value="7">{st().settings.interviewReportRetentionOption7d}</option>
            <option value="30">{st().settings.interviewReportRetentionOption30d}</option>
            <option value="90">{st().settings.interviewReportRetentionOption90d}</option>
          </select>
          <span class="field-help">{st().settings.interviewReportRetentionHint}</span>
        </label>
        <p class="settings-note settings-note-warning">{st().settings.interviewReportClearHint}</p>
        <button
          class="btn-danger btn-ghost btn-compact"
          type="button"
          onClick={() => void controller().clearInterviewReports()}
        >
          {st().card.interview.sessionActions.clearReports}
        </button>
      </section>

      <section class="settings-subsection settings-subsection--ops">
        <h4 class="settings-subsection-title">{st().settings.reportsOpsTitle}</h4>
        <p class="field-help">{st().settings.reportsOpsHint}</p>
        <label class="field" data-testid="debug-trace-mode-field">
          <span class="field-label">{st().settings.debugTraceModeLabel}</span>
          <select
            class="field-input"
            value={controller().settings.debugTraceMode}
            onInput={(event) =>
              controller().setDebugTraceMode(
                event.currentTarget.value as "off" | "redacted" | "full_local",
              )
            }
          >
            <option value="off">{st().settings.debugTraceModeOff}</option>
            <option value="redacted">{st().settings.debugTraceModeRedacted}</option>
            <option value="full_local">{st().settings.debugTraceModeFull}</option>
          </select>
        </label>
        <Show when={controller().settings.debugTraceMode === "full_local"}>
          <p class="settings-note settings-note-warning">{st().settings.debugTraceFullWarning}</p>
        </Show>
        <label class="field" data-testid="debug-trace-retention-field">
          <span class="field-label">{st().settings.debugTraceRetentionLabel}</span>
          <select
            class="field-input"
            value={String(controller().settings.debugTraceRetentionDays)}
            onInput={(event) =>
              controller().setDebugTraceRetentionDays(
                Number.parseInt(event.currentTarget.value, 10) as 0 | 1 | 3 | 7,
              )
            }
          >
            <option value="1">{st().settings.debugTraceRetention1d}</option>
            <option value="3">{st().settings.debugTraceRetention3d}</option>
            <option value="7">{st().settings.debugTraceRetention7d}</option>
            <option value="0">{st().settings.debugTraceRetentionManual}</option>
          </select>
        </label>
        <div class="settings-form-stack">
          <button
            class="btn-secondary btn-compact"
            type="button"
            onClick={() => void controller().openTraceFolder()}
          >
            {st().settings.openTraceFolder}
          </button>
          <button
            class="btn-danger btn-ghost btn-compact"
            type="button"
            onClick={() => void controller().clearDebugTraces()}
          >
            {st().settings.clearDebugTraces}
          </button>
        </div>
      </section>
    </article>
  );
}
