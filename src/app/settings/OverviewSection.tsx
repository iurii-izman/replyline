import { For, Show } from "solid-js";
import type { ReplylineController } from "../controller";
import { detectLlmRouteModeFromHost } from "../model";
import { CheckIcon, CircleIcon } from "../ui/icons";
import { setupStatusClass, setupStatusLabel, type SetupStatusTone } from "../settings/settingsViewModel";

export function OverviewSection(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  const sectionStatus = (): SetupStatusTone => {
    const runtimeResult = controller().runtimeCheckResult();
    if (runtimeResult?.runtimeReady) return "ready";
    if (runtimeResult) return "needs_check";
    return controller().allSetupReady() ? "configured" : "missing";
  };

  const setupSteps = () => controller().setupSteps();
  const firstMissingSection = () => {
    const idx = setupSteps().findIndex((s) => !s.ready);
    if (idx === 0) return "speech" as const;
    if (idx === 1) return "llm" as const;
    if (idx === 2) return "hotkey" as const;
    return null;
  };

  const persistenceDiagnostics = () =>
    controller().persistenceDiagnostics ? controller().persistenceDiagnostics() : null;
  const persistenceDiagnosticsError = () =>
    controller().persistenceDiagnosticsError ? controller().persistenceDiagnosticsError() : null;
  const yesNo = (v: boolean) =>
    v ? st().settings.persistenceValueYes : st().settings.persistenceValueNo;
  const refreshPersistenceDiagnostics = () => {
    if (controller().refreshPersistenceDiagnostics) void controller().refreshPersistenceDiagnostics();
  };

  return (
    <article
      id="settings-panel-overview"
      class="settings-section-card section-card"
      data-testid="settings-section-overview"
    >
      <h3 class="settings-section-title">
        {st().settings.overviewTitle}{" "}
        <span class={setupStatusClass(sectionStatus())}>
          {setupStatusLabel(st(), sectionStatus())}
        </span>
      </h3>
      <p class="settings-section-hint" data-testid="setup-overall-hint">
        {st().settings.overviewHint}
      </p>
      <div class="setup-progress setup-progress-compact" aria-label={st().setup.progress}>
        <For each={setupSteps()}>
          {(step) => (
            <div class="setup-step setup-step-compact">
              <span
                class={step.ready ? "setup-step-status is-done" : "setup-step-status is-pending"}
                aria-hidden="true"
              >
                {step.ready ? <CheckIcon class="ui-icon--16" /> : <CircleIcon class="ui-icon--16" />}
              </span>
              <span class="setup-step-label">{step.label}</span>
              <span class="setup-step-hint setup-step-hint-inline">
                {step.ready ? step.readyLabel : step.missingLabel}
              </span>
            </div>
          )}
        </For>
      </div>

      <Show when={firstMissingSection()}>
        {(section) => (
          <button
            class="btn-secondary btn-compact settings-cta"
            type="button"
            data-testid="setup-first-missing-cta"
            onClick={() => controller().setSettingsActiveSection(section())}
          >
            {st().settings.openFirstMissing}
          </button>
        )}
      </Show>

      <article class="settings-section-card settings-section-card--compact">
        <h4 class="settings-section-title">
          {st().settings.persistenceTitle}{" "}
          <span class={setupStatusClass(controller().setupTroubleCount() >= 2 ? "needs_check" : "configured")}>
            {controller().setupTroubleCount() >= 2
              ? st().settings.statusNeedsCheck
              : st().settings.statusConfigured}
          </span>
        </h4>
        <Show when={persistenceDiagnosticsError()}>
          <p class="settings-note settings-note-warning">{st().settings.persistenceUnavailable}</p>
        </Show>
        <Show when={persistenceDiagnostics()}>
          {(diag) => {
            const stateHealthy = () =>
              diag().settingsFileExists &&
              diag().settingsParseOk &&
              diag().settingsValidationOk &&
              diag().runtimePathReady &&
              diag().corruptBackupsCount === 0;
            return (
              <>
                <p class={`settings-note ${stateHealthy() ? "" : "settings-note-warning"}`}>
                  {stateHealthy() ? st().settings.persistenceStateOk : st().settings.persistenceStateNeedsAttention}
                </p>
                <div class="field-help">
                  {st().settings.persistenceFieldSettingsFile}: {yesNo(diag().settingsFileExists)} ·{" "}
                  {st().settings.persistenceFieldSettingsParse}: {yesNo(diag().settingsParseOk)} ·{" "}
                  {st().settings.persistenceFieldSettingsValidation}: {yesNo(diag().settingsValidationOk)}
                </div>
                <div class="field-help">
                  {st().settings.persistenceFieldLlmRoute}:{" "}
                  {yesNo(diag().llmBaseUrlPresent && diag().llmModelPresent)} ·{" "}
                  {st().settings.persistenceFieldLlmHost}: {diag().llmBaseUrlHost ?? "-"} ·{" "}
                  {st().settings.persistenceFieldLlmImplication}:{" "}
                  {(() => {
                    const mode = detectLlmRouteModeFromHost(diag().llmBaseUrlHost);
                    if (mode === "local") return st().settings.persistenceLlmModeLocal;
                    if (mode === "cloud") return st().settings.persistenceLlmModeCloud;
                    return st().settings.persistenceLlmModeUnknown;
                  })()}{" "}
                  · {st().settings.persistenceFieldLlmKey}: {yesNo(diag().llmKeyPresent)} ·{" "}
                  {st().settings.persistenceFieldDeepgramKey}: {yesNo(diag().deepgramKeyPresent)} ·{" "}
                  {st().settings.persistenceFieldRuntimeReady}: {yesNo(diag().runtimePathReady)}
                </div>
                <div class="field-help">
                  {st().settings.persistenceFieldCorruptBackups}: {String(diag().corruptBackupsCount)}
                </div>
                <div class="field-help">
                  {st().settings.persistenceFieldSettingsPath}: {diag().settingsPath}
                </div>
                <Show when={diag().appLogPath}>
                  <div class="field-help">
                    {st().settings.persistenceFieldAppLogPath}: {diag().appLogPath}
                  </div>
                </Show>
              </>
            );
          }}
        </Show>
        <Show when={!controller().allSetupReady()}>
          <div class="settings-note settings-note-warning">
            {st().settings.persistenceCauseTitle}
            <ul>
              <Show when={!controller().settings.llmBaseUrl.trim()}>
                <li>{st().settings.persistenceCauseLlmBaseUrlMissing}</li>
              </Show>
              <Show when={!controller().settings.llmModel.trim()}>
                <li>{st().settings.persistenceCauseLlmModelMissing}</li>
              </Show>
              <Show when={!controller().deepgramSaved()}>
                <li>{st().settings.persistenceCauseDeepgramMissing}</li>
              </Show>
              <Show when={!controller().llmKeySaved()}>
                <li>{st().settings.persistenceCauseLlmKeyMissing}</li>
              </Show>
              <Show when={controller().setupTroubleCount() >= 2}>
                <li>{st().settings.setupSmokeReportHint}</li>
              </Show>
            </ul>
          </div>
        </Show>
        <div class="settings-form-stack">
          <button class="btn-secondary btn-compact" type="button" onClick={refreshPersistenceDiagnostics}>
            {st().settings.persistenceRefresh}
          </button>
          <button class="btn-secondary btn-compact" type="button" onClick={() => void controller().checkRuntimeConfig()}>
            {st().settings.runCheck}
          </button>
          <button class="btn-ghost btn-compact" type="button" onClick={() => controller().openMainPanel()}>
            {st().settings.openMain}
          </button>
          <Show when={controller().setupTroubleCount() >= 2}>
            <button class="btn-ghost btn-compact" type="button" onClick={() => void controller().copySetupIssueHint()}>
              {st().settings.copyIssueHint}
            </button>
          </Show>
        </div>
      </article>
    </article>
  );
}
