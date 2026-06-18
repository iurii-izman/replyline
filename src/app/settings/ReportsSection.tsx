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
        {st().settings.navAdvanced}{" "}
        <span class={setupStatusClass("optional")}>{setupStatusLabel(st(), "optional")}</span>
      </h3>

      {/* ── Window behavior ──────────────────────────────── */}
      <section class="settings-subsection" data-testid="advanced-window-behavior">
        <h4 class="settings-subsection-title">{st().settings.windowBehaviorTitle}</h4>
        <p class="field-help">{st().settings.windowBehaviorHint}</p>

        <label class="field">
          <span class="field-label">{st().settings.windowOpacityLabel}</span>
          <select
            class="field-input"
            value={String(controller().settings.windowOpacity)}
            onInput={(event) =>
              void controller().setWindowOpacity(
                Number.parseInt(event.currentTarget.value, 10) as 100 | 90 | 80 | 70,
              )
            }
          >
            <option value="100">100%</option>
            <option value="90">90%</option>
            <option value="80">80%</option>
            <option value="70">70%</option>
          </select>
        </label>

        <label class="field field-checkbox-row settings-checkbox-row">
          <input
            type="checkbox"
            aria-label={st().settings.hideToTrayOnCloseLabel}
            checked={controller().settings.hideToTrayOnClose}
            onInput={(event) => controller().setHideToTrayOnClose(event.currentTarget.checked)}
          />
          <span class="field-label">{st().settings.hideToTrayOnCloseLabel}</span>
          <span class="field-help">{st().settings.hideToTrayOnCloseHint}</span>
        </label>

        <label class="field field-checkbox-row settings-checkbox-row">
          <input
            type="checkbox"
            aria-label={st().settings.keepOnTopDuringCaptureLabel}
            checked={controller().settings.keepOnTopDuringCapture}
            onInput={(event) => controller().setKeepOnTopDuringCapture(event.currentTarget.checked)}
          />
          <span class="field-label">{st().settings.keepOnTopDuringCaptureLabel}</span>
          <span class="field-help">{st().settings.keepOnTopDuringCaptureHint}</span>
        </label>

        <label
          class="field field-checkbox-row settings-checkbox-row"
          data-testid="advanced-compact-row"
        >
          <input
            type="checkbox"
            aria-label={st().settings.compactModeLabel}
            checked={controller().settings.interviewCompactMode}
            onInput={(event) => controller().setCompactMode(event.currentTarget.checked)}
          />
          <span class="field-label">{st().settings.compactModeLabel}</span>
        </label>
      </section>

      {/* ── Interview reports ────────────────────────────── */}
      <section class="settings-subsection" data-testid="advanced-reports">
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

      {/* ── Bilingual (experimental, gated) ──────────────── */}
      <Show when={controller().experimentalBilingualAllowed()}>
        <section class="settings-subsection" data-testid="advanced-bilingual">
          <h4 class="settings-subsection-title">{st().settings.reportsSectionHint}</h4>
          <Show when={controller().settings.bilingualInterviewEnabled}>
            <label class="field field-checkbox-row settings-checkbox-row">
              <input
                type="checkbox"
                aria-label={st().settings.bilingualInterviewEnabledLabel}
                checked={controller().settings.bilingualInterviewEnabled}
                onInput={(event) =>
                  controller().setBilingualInterviewEnabled(event.currentTarget.checked)
                }
              />
              <span class="field-label">{st().settings.bilingualInterviewEnabledLabel}</span>
            </label>

            <label class="field field-checkbox-row settings-checkbox-row">
              <input
                type="checkbox"
                aria-label={st().settings.liveTranslationEnabledLabel}
                checked={controller().settings.liveTranslationEnabled}
                onInput={(event) =>
                  controller().setLiveTranslationEnabled(event.currentTarget.checked)
                }
              />
              <span class="field-label">{st().settings.liveTranslationEnabledLabel}</span>
            </label>

            <p class="settings-note settings-note-warning">
              {st().settings.bilingualInterviewDisclaimer}
            </p>
          </Show>
        </section>
      </Show>

      {/* ── Debug traces ─────────────────────────────────── */}
      <section class="settings-subsection settings-subsection--ops" data-testid="advanced-debug">
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
