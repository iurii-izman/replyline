import { For, Show } from "solid-js";
import { ANSWER_PROFILE_OPTIONS, resolveAnswerProfileOption } from "./answerProfiles";
import type { ReplylineController } from "./controller";
import { MODEL_PRESETS, resolveModelPreset } from "./modelPresets";
import { detectLlmRouteModeFromHost, type SettingsSectionId } from "./model";
import { CheckIcon, CircleIcon, XIcon } from "./ui/icons";
import { SettingsNav } from "./settings/SettingsNav";
import {
  checkItemLabel,
  checkItemClass,
  type SetupStatusTone,
  setupStatusLabel,
  setupStatusClass,
  runtimeCheckSection,
  runtimeCheckMessage,
  runtimeCheckActionLabel,
} from "./settings/settingsViewModel";

export function SettingsSurface(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  Object.freeze([
    st().setup.focusSmokeReportHint,
    st().settings.openSpeechSection,
    st().settings.openReplySection,
    st().settings.openHotkeySection,
    st().settings.runtimeCheckOk,
    st().settings.runtimeCheckSkipped,
    st().settings.runtimeSummaryNotRun,
    st().settings.setupIssueHintMissing,
    st().settings.setupIssueHintNone,
    st().settings.setupIssueHintOpenSettings,
    st().settings.setupIssueHintRunCheck,
    st().settings.setupIssueHintRuntime,
    st().settings.setupIssueHintSmokeReport,
    st().settings.setupIssueHintSteps,
    st().settings.setupIssueHintTitle,
    st().settings.statusCheckFailed,
    st().settings.statusOptional,
    st().errors.missingDeepgramKey,
    st().errors.runtimeCheckAuth,
    st().errors.runtimeCheckEndpoint,
    st().errors.runtimeCheckFailed,
    st().errors.runtimeCheckNetwork,
    st().errors.settingsCorruptRecovered,
  ]);
  Object.freeze([
    st().checks.code.ok,
    st().checks.code.missing_key,
    st().checks.code.config_error,
    st().checks.code.auth_error,
    st().checks.code.endpoint_error,
    st().checks.code.network_error,
    st().checks.code.skipped,
    st().checks.code.error,
  ]);

  const selectedPreset = () => resolveModelPreset(controller().settings.selectedModelPreset);
  const setupSteps = () => controller().setupSteps();

  const firstMissingSection = (): SettingsSectionId | null => {
    const firstMissingIndex = setupSteps().findIndex((step) => !step.ready);
    if (firstMissingIndex === 0) return "speech";
    if (firstMissingIndex === 1) return "llm";
    if (firstMissingIndex === 2) return "hotkey";
    return null;
  };

  const sectionStatus = (id: SettingsSectionId): SetupStatusTone => {
    const runtimeResult = controller().runtimeCheckResult();
    if (id === "speech") {
      if (!controller().deepgramSaved()) return "missing";
      if (runtimeResult && !runtimeResult.stt.ok) return "check_failed";
      return runtimeResult?.stt.ok ? "ready" : "configured";
    }
    if (id === "llm") {
      const ready = setupSteps()[1]?.ready ?? false;
      if (!ready) return "missing";
      if (runtimeResult && !runtimeResult.llm.ok) return "check_failed";
      return runtimeResult?.llm.ok ? "ready" : "needs_check";
    }
    if (id === "hotkey") {
      const ready = setupSteps()[2]?.ready ?? false;
      if (!ready) return "missing";
      if (controller().hotkeyFailed()) return "check_failed";
      if (runtimeResult && !runtimeResult.settings.ok) return "check_failed";
      return runtimeResult?.settings.ok ? "ready" : "configured";
    }
    if (id === "overview") {
      if (runtimeResult?.runtimeReady) return "ready";
      if (runtimeResult) return "needs_check";
      return controller().allSetupReady() ? "configured" : "missing";
    }
    if (id === "reports") return "optional";
    return "optional";
  };

  const stepSectionFromIndex = (index: number): SettingsSectionId => {
    if (index === 0) return "speech";
    if (index === 1) return "llm";
    if (index === 2) return "hotkey";
    return "overview";
  };
  const runtimeSummary = () => {
    const result = controller().runtimeCheckResult();
    if (!result) return null;
    if (result.runtimeReady) return { ok: true, text: st().settings.runtimeSummaryReady };
    const firstErrorIndex = [result.stt, result.llm, result.settings].findIndex((item) => !item.ok);
    return {
      ok: false,
      text: st().settings.runtimeSummaryNeedsFix,
      section: stepSectionFromIndex(firstErrorIndex),
    };
  };

  const sections: Array<{ id: SettingsSectionId; label: string }> = [
    { id: "overview", label: st().settings.navOverview },
    { id: "speech", label: st().settings.navSpeech },
    { id: "llm", label: st().settings.navLlm },
    { id: "hotkey", label: st().settings.navHotkey },
    { id: "reports", label: st().settings.navReports },
  ];

  const activeSection = () => controller().settingsActiveSection();
  const persistenceDiagnostics = () =>
    controller().persistenceDiagnostics ? controller().persistenceDiagnostics() : null;
  const persistenceDiagnosticsError = () =>
    controller().persistenceDiagnosticsError ? controller().persistenceDiagnosticsError() : null;
  const refreshPersistenceDiagnostics = () => {
    if (controller().refreshPersistenceDiagnostics) {
      void controller().refreshPersistenceDiagnostics();
    }
  };
  const yesNo = (value: boolean): string =>
    value ? st().settings.persistenceValueYes : st().settings.persistenceValueNo;

  const focusSectionByIndex = (index: number, refs: HTMLButtonElement[]) => {
    const nextSection = sections[index];
    if (!nextSection) return;
    controller().setSettingsActiveSection(nextSection.id);
    refs[index]?.focus();
  };

  const focusSectionByOffset = (delta: number, refs: HTMLButtonElement[]) => {
    const currentIndex = sections.findIndex((section) => section.id === activeSection());
    const safeIndex = Math.max(currentIndex, 0);
    const nextIndex = (safeIndex + delta + sections.length) % sections.length;
    focusSectionByIndex(nextIndex, refs);
  };

  const handleSectionKeyDown = (event: KeyboardEvent, refs: HTMLButtonElement[]) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusSectionByOffset(1, refs);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusSectionByOffset(-1, refs);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusSectionByIndex(0, refs);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      focusSectionByIndex(sections.length - 1, refs);
    }
  };

  return (
    <Show when={controller().panel() === "settings"}>
      <section
        class="settings-card surface-panel app-page app-page--settings settings-layout"
        data-testid="settings-surface"
      >
        <div class="app-page-header">
          <h2 class="section-title">{st().settings.title}</h2>
        </div>

        <SettingsNav
          sections={sections}
          activeSection={activeSection}
          sectionStatus={sectionStatus}
          focusSectionByIndex={focusSectionByIndex}
          handleSectionKeyDown={handleSectionKeyDown}
          st={st}
        />

        <div class="settings-grid app-page-body">
          <form
            class="settings-content app-page-main"
            onSubmit={(event) => {
              event.preventDefault();
              if (!controller().saving()) void controller().persistSettings();
            }}
          >
            <Show when={activeSection() === "overview"}>
              <article
                id="settings-panel-overview"
                class="settings-section-card section-card"
                data-testid="settings-section-overview"
              >
                <h3 class="settings-section-title">
                  {st().settings.overviewTitle}{" "}
                  <span class={setupStatusClass(sectionStatus("overview"))}>
                    {setupStatusLabel(st(), sectionStatus("overview"))}
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
                          class={
                            step.ready
                              ? "setup-step-status is-done"
                              : "setup-step-status is-pending"
                          }
                          aria-hidden="true"
                        >
                          {step.ready ? (
                            <CheckIcon class="ui-icon--16" />
                          ) : (
                            <CircleIcon class="ui-icon--16" />
                          )}
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
                  {(firstMissing) => (
                    <button
                      class="btn-secondary btn-compact settings-cta"
                      type="button"
                      data-testid="setup-first-missing-cta"
                      onClick={() => controller().setSettingsActiveSection(firstMissing())}
                    >
                      {st().settings.openFirstMissing}
                    </button>
                  )}
                </Show>

                <article class="settings-section-card settings-section-card--compact">
                  <h4 class="settings-section-title">
                    {st().settings.persistenceTitle}{" "}
                    <span
                      class={setupStatusClass(
                        controller().setupTroubleCount() >= 2 ? "needs_check" : "configured",
                      )}
                    >
                      {controller().setupTroubleCount() >= 2
                        ? st().settings.statusNeedsCheck
                        : st().settings.statusConfigured}
                    </span>
                  </h4>
                  <Show when={persistenceDiagnosticsError()}>
                    <p class="settings-note settings-note-warning">
                      {st().settings.persistenceUnavailable}
                    </p>
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
                          <p
                            class={`settings-note ${stateHealthy() ? "" : "settings-note-warning"}`}
                          >
                            {stateHealthy()
                              ? st().settings.persistenceStateOk
                              : st().settings.persistenceStateNeedsAttention}
                          </p>
                          <div class="field-help">
                            {st().settings.persistenceFieldSettingsFile}:{" "}
                            {yesNo(diag().settingsFileExists)} ·{" "}
                            {st().settings.persistenceFieldSettingsParse}:{" "}
                            {yesNo(diag().settingsParseOk)} ·{" "}
                            {st().settings.persistenceFieldSettingsValidation}:{" "}
                            {yesNo(diag().settingsValidationOk)}
                          </div>
                          <div class="field-help">
                            {st().settings.persistenceFieldLlmRoute}:{" "}
                            {yesNo(diag().llmBaseUrlPresent && diag().llmModelPresent)} ·{" "}
                            {st().settings.persistenceFieldLlmHost}: {diag().llmBaseUrlHost ?? "-"}{" "}
                            · {st().settings.persistenceFieldLlmImplication}:{" "}
                            {(() => {
                              const mode = detectLlmRouteModeFromHost(diag().llmBaseUrlHost);
                              if (mode === "local") return st().settings.persistenceLlmModeLocal;
                              if (mode === "cloud") return st().settings.persistenceLlmModeCloud;
                              return st().settings.persistenceLlmModeUnknown;
                            })()}{" "}
                            · {st().settings.persistenceFieldLlmKey}: {yesNo(diag().llmKeyPresent)}{" "}
                            · {st().settings.persistenceFieldDeepgramKey}:{" "}
                            {yesNo(diag().deepgramKeyPresent)} ·{" "}
                            {st().settings.persistenceFieldRuntimeReady}:{" "}
                            {yesNo(diag().runtimePathReady)}
                          </div>
                          <div class="field-help">
                            {st().settings.persistenceFieldCorruptBackups}:{" "}
                            {String(diag().corruptBackupsCount)}
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
                    <button
                      class="btn-secondary btn-compact"
                      type="button"
                      onClick={refreshPersistenceDiagnostics}
                    >
                      {st().settings.persistenceRefresh}
                    </button>
                    <button
                      class="btn-secondary btn-compact"
                      type="button"
                      onClick={() => void controller().checkRuntimeConfig()}
                    >
                      {st().settings.runCheck}
                    </button>
                    <button
                      class="btn-ghost btn-compact"
                      type="button"
                      onClick={() => controller().openMainPanel()}
                    >
                      {st().settings.openMain}
                    </button>
                    <Show when={controller().setupTroubleCount() >= 2}>
                      <button
                        class="btn-ghost btn-compact"
                        type="button"
                        onClick={() => void controller().copySetupIssueHint()}
                      >
                        {st().settings.copyIssueHint}
                      </button>
                    </Show>
                  </div>
                </article>
              </article>
            </Show>

            <Show when={activeSection() === "speech"}>
              <article
                id="settings-panel-speech"
                class="settings-section-card section-card settings-section-card--compact"
                data-testid="settings-section-speech"
              >
                <h3 class="settings-section-title">
                  {st().settings.navSpeech}{" "}
                  <span class={setupStatusClass(sectionStatus("speech"))}>
                    {setupStatusLabel(st(), sectionStatus("speech"))}
                  </span>
                </h3>
                <p class="settings-section-hint">{st().settings.speechHint}</p>
                <p class="settings-note" data-testid="speech-helper-note">
                  {st().setup.deepgramHint}
                </p>
                <label class="field">
                  <span class="field-label">
                    {st().settings.deepgramKeyLabel}{" "}
                    {controller().deepgramSaved() ? (
                      <span class="saved-badge">{st().settings.savedBadge}</span>
                    ) : null}
                  </span>
                  <input
                    class={`field-input ${
                      controller().deepgramSaved() && !controller().draftSecrets.deepgramApiKey
                        ? "field-input-secret-saved"
                        : ""
                    }`}
                    type="password"
                    placeholder={
                      controller().deepgramSaved() ? st().setup.sttReady : st().setup.sttMissing
                    }
                    value={controller().draftSecrets.deepgramApiKey}
                    onInput={(event) =>
                      controller().setDeepgramApiKeyDraft(event.currentTarget.value)
                    }
                  />
                </label>
              </article>
            </Show>

            <Show when={activeSection() === "llm"}>
              <article
                id="settings-panel-llm"
                class="settings-section-card section-card"
                data-testid="settings-section-llm"
              >
                <h3 class="settings-section-title">
                  {st().settings.navLlm}{" "}
                  <span class={setupStatusClass(sectionStatus("llm"))}>
                    {setupStatusLabel(st(), sectionStatus("llm"))}
                  </span>
                </h3>
                <p class="settings-section-hint">{st().settings.llmSectionHint}</p>
                <p class="settings-note">{st().setup.llmHint}</p>

                <div class="settings-form-stack">
                  <label class="field">
                    <span class="field-label">{st().settings.modelPresetLabel}</span>
                    <select
                      class="field-input"
                      value={controller().settings.selectedModelPreset}
                      onInput={(event) =>
                        controller().setSelectedModelPreset(event.currentTarget.value)
                      }
                    >
                      <For each={MODEL_PRESETS}>
                        {(preset) => <option value={preset.id}>{preset.title}</option>}
                      </For>
                    </select>
                  </label>

                  <details class="settings-collapsible settings-collapsible--caveats">
                    <summary>{st().settings.providerNotesTitle}</summary>
                    <div class="settings-collapsible-body">
                      <div class="field-help">
                        {st().settings.modelPresetProvider}: {selectedPreset().providerKind} ·{" "}
                        {st().settings.modelPresetCost}: {selectedPreset().costTier} ·{" "}
                        {st().settings.modelPresetLatency}: {selectedPreset().latencyTier}
                      </div>
                      <div class="field-help">
                        {st().settings.modelPresetBaseUrl}: {selectedPreset().baseUrl || "manual"}
                      </div>
                      <div class="field-help">
                        {st().settings.modelPresetPrimary}:{" "}
                        {selectedPreset().primaryModel || "manual"}
                      </div>
                      <div class="field-help">
                        {st().settings.modelPresetFallback}:{" "}
                        {selectedPreset().fallbackModels.length
                          ? selectedPreset().fallbackModels.join(" -> ")
                          : st().settings.modelPresetNoFallback}
                      </div>
                      <Show when={selectedPreset().freeTierCaveats}>
                        <div class="field-help">{selectedPreset().freeTierCaveats}</div>
                      </Show>
                      <Show when={selectedPreset().requiresCredits}>
                        <div class="field-help">{st().settings.modelPresetCreditsCaveat}</div>
                      </Show>
                      <div class="field-help">
                        {st().settings.modelPresetSnapshotPrefix} {selectedPreset().lastReviewedAt}.{" "}
                        {st().settings.modelPresetSnapshotNote}
                      </div>
                    </div>
                  </details>

                  <label class="field">
                    <span class="field-label">{st().settings.llmBaseUrlLabel}</span>
                    <input
                      class="field-input"
                      placeholder={st().settings.llmBaseUrlPlaceholder}
                      value={controller().settings.llmBaseUrl}
                      onInput={(event) => controller().setLlmBaseUrl(event.currentTarget.value)}
                    />
                  </label>

                  <label class="field">
                    <span class="field-label">{st().settings.llmModelLabel}</span>
                    <input
                      class="field-input"
                      value={controller().settings.llmModel}
                      onInput={(event) => controller().setLlmModel(event.currentTarget.value)}
                    />
                  </label>

                  <label class="field" data-testid="answer-profile-field">
                    <span class="field-label">{st().settings.answerProfileLabel}</span>
                    <select
                      class="field-input"
                      value={controller().settings.activeAnswerProfile}
                      onInput={(event) =>
                        controller().setActiveAnswerProfile(event.currentTarget.value)
                      }
                    >
                      <For each={ANSWER_PROFILE_OPTIONS}>
                        {(profile) => <option value={profile.id}>{profile.title}</option>}
                      </For>
                    </select>
                    <span class="field-help">
                      {
                        resolveAnswerProfileOption(controller().settings.activeAnswerProfile)
                          .description
                      }
                    </span>
                  </label>

                  <label class="field">
                    <span class="field-label">
                      {st().settings.llmKeyLabel}{" "}
                      {controller().llmKeySaved() ? (
                        <span class="saved-badge">{st().settings.savedBadge}</span>
                      ) : null}
                    </span>
                    <input
                      class={`field-input ${
                        controller().llmKeySaved() && !controller().draftSecrets.llmApiKey
                          ? "field-input-secret-saved"
                          : ""
                      }`}
                      type="password"
                      value={controller().draftSecrets.llmApiKey}
                      onInput={(event) => controller().setLlmApiKeyDraft(event.currentTarget.value)}
                    />
                  </label>
                </div>
              </article>
            </Show>

            <Show when={activeSection() === "hotkey"}>
              <article
                id="settings-panel-hotkey"
                class="settings-section-card section-card"
                data-testid="settings-section-hotkey"
              >
                <h3 class="settings-section-title">
                  {st().settings.navHotkey}{" "}
                  <span class={setupStatusClass(sectionStatus("hotkey"))}>
                    {setupStatusLabel(st(), sectionStatus("hotkey"))}
                  </span>
                </h3>
                <p class="settings-section-hint">{st().settings.hotkeySectionHint}</p>
                <p class="settings-note">{st().setup.hotkeyHint}</p>
                <label class="field">
                  <span class="field-label">{st().settings.hotkeyLabel}</span>
                  <input
                    class="field-input"
                    value={controller().settings.hotkey}
                    onKeyDown={(event) => controller().captureHotkeyInput(event as KeyboardEvent)}
                    onInput={(event) => controller().setHotkeyFromInput(event.currentTarget.value)}
                  />
                </label>

                <label class="field">
                  <span class="field-label">{st().settings.captureMaxLabel}</span>
                  <input
                    class="field-input"
                    type="number"
                    min="5"
                    max="180"
                    value={String(controller().settings.captureMaxSeconds)}
                    onInput={(event) =>
                      controller().setCaptureMaxSecondsFromInput(event.currentTarget.value)
                    }
                  />
                </label>

                <label
                  class="field field-checkbox-row settings-checkbox-row"
                  data-testid="hotkey-compact-row"
                >
                  <input
                    type="checkbox"
                    aria-label={st().settings.compactModeLabel}
                    checked={controller().settings.interviewCompactMode}
                    onInput={(event) => controller().setCompactMode(event.currentTarget.checked)}
                  />
                  <span class="field-label">{st().settings.compactModeLabel}</span>
                </label>

                <Show when={controller().experimentalBilingualAllowed()}>
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
                      <span class="field-label">
                        {st().settings.bilingualInterviewEnabledLabel}
                      </span>
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
                </Show>

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

                <section class="setup-fieldset settings-window-card">
                  <h4 class="setup-legend">{st().settings.windowBehaviorTitle}</h4>
                  <p class="field-help">{st().settings.windowBehaviorHint}</p>

                  <label class="field field-checkbox-row settings-checkbox-row">
                    <input
                      type="checkbox"
                      aria-label={st().settings.hideToTrayOnCloseLabel}
                      checked={controller().settings.hideToTrayOnClose}
                      onInput={(event) =>
                        controller().setHideToTrayOnClose(event.currentTarget.checked)
                      }
                    />
                    <span class="field-label">{st().settings.hideToTrayOnCloseLabel}</span>
                    <span class="field-help">{st().settings.hideToTrayOnCloseHint}</span>
                  </label>

                  <label class="field field-checkbox-row settings-checkbox-row">
                    <input
                      type="checkbox"
                      aria-label={st().settings.keepOnTopDuringCaptureLabel}
                      checked={controller().settings.keepOnTopDuringCapture}
                      onInput={(event) =>
                        controller().setKeepOnTopDuringCapture(event.currentTarget.checked)
                      }
                    />
                    <span class="field-label">{st().settings.keepOnTopDuringCaptureLabel}</span>
                    <span class="field-help">{st().settings.keepOnTopDuringCaptureHint}</span>
                  </label>
                </section>
              </article>
            </Show>

            <Show when={activeSection() === "reports"}>
              <article
                id="settings-panel-reports"
                class="settings-section-card section-card settings-section-card--compact"
                data-testid="settings-section-reports"
              >
                <h3 class="settings-section-title">
                  {st().settings.navReports}{" "}
                  <span class={setupStatusClass(sectionStatus("reports"))}>
                    {setupStatusLabel(st(), sectionStatus("reports"))}
                  </span>
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
                      <option value="0">
                        {st().settings.interviewReportRetentionOptionManual}
                      </option>
                      <option value="7">{st().settings.interviewReportRetentionOption7d}</option>
                      <option value="30">{st().settings.interviewReportRetentionOption30d}</option>
                      <option value="90">{st().settings.interviewReportRetentionOption90d}</option>
                    </select>
                    <span class="field-help">{st().settings.interviewReportRetentionHint}</span>
                  </label>
                  <p class="settings-note settings-note-warning">
                    {st().settings.interviewReportClearHint}
                  </p>
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
                    <p class="settings-note settings-note-warning">
                      {st().settings.debugTraceFullWarning}
                    </p>
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
            </Show>

            <Show when={controller().settingsFormHint()}>
              <div class="settings-form-hint" role="alert">
                {controller().settingsFormHint()}
              </div>
            </Show>

            <Show when={controller().runtimeCheckResult()}>
              <div class="check-results check-results-card" data-testid="check-results">
                <h3 class="check-results-title">{st().checks.title}</h3>
                <div class={checkItemClass(controller().runtimeCheckResult()!.stt)}>
                  <span class="check-item-icon" aria-hidden="true">
                    {controller().runtimeCheckResult()!.stt.ok ? (
                      <CheckIcon class="ui-icon--16" />
                    ) : (
                      <XIcon class="ui-icon--16" />
                    )}
                  </span>
                  <span class="check-item-label">{st().setup.stepSpeech}</span>
                  <span class="check-item-status">
                    {checkItemLabel(controller().runtimeCheckResult()!.stt, st())}
                  </span>
                  <span class="check-item-msg">
                    {runtimeCheckMessage(st(), controller().runtimeCheckResult()!.stt)}
                  </span>
                  <span class="check-item-action-wrap">
                    <button
                      class="btn-secondary btn-compact check-item-action"
                      type="button"
                      onClick={() =>
                        controller().setSettingsActiveSection(
                          runtimeCheckSection(controller().runtimeCheckResult()!.stt),
                        )
                      }
                    >
                      {runtimeCheckActionLabel(st(), controller().runtimeCheckResult()!.stt)}
                    </button>
                  </span>
                </div>
                <div class={checkItemClass(controller().runtimeCheckResult()!.llm)}>
                  <span class="check-item-icon" aria-hidden="true">
                    {controller().runtimeCheckResult()!.llm.ok ? (
                      <CheckIcon class="ui-icon--16" />
                    ) : (
                      <XIcon class="ui-icon--16" />
                    )}
                  </span>
                  <span class="check-item-label">{st().setup.stepReply}</span>
                  <span class="check-item-status">
                    {checkItemLabel(controller().runtimeCheckResult()!.llm, st())}
                  </span>
                  <span class="check-item-msg">
                    {runtimeCheckMessage(st(), controller().runtimeCheckResult()!.llm)}
                  </span>
                  <span class="check-item-action-wrap">
                    <button
                      class="btn-secondary btn-compact check-item-action"
                      type="button"
                      onClick={() =>
                        controller().setSettingsActiveSection(
                          runtimeCheckSection(controller().runtimeCheckResult()!.llm),
                        )
                      }
                    >
                      {runtimeCheckActionLabel(st(), controller().runtimeCheckResult()!.llm)}
                    </button>
                  </span>
                </div>
                <div class={checkItemClass(controller().runtimeCheckResult()!.settings)}>
                  <span class="check-item-icon" aria-hidden="true">
                    {controller().runtimeCheckResult()!.settings.ok ? (
                      <CheckIcon class="ui-icon--16" />
                    ) : (
                      <XIcon class="ui-icon--16" />
                    )}
                  </span>
                  <span class="check-item-label">{st().setup.stepHotkey}</span>
                  <span class="check-item-status">
                    {checkItemLabel(controller().runtimeCheckResult()!.settings, st())}
                  </span>
                  <span class="check-item-msg">
                    {runtimeCheckMessage(st(), controller().runtimeCheckResult()!.settings)}
                  </span>
                  <span class="check-item-action-wrap">
                    <button
                      class="btn-secondary btn-compact check-item-action"
                      type="button"
                      onClick={() =>
                        controller().setSettingsActiveSection(
                          runtimeCheckSection(controller().runtimeCheckResult()!.settings),
                        )
                      }
                    >
                      {runtimeCheckActionLabel(st(), controller().runtimeCheckResult()!.settings)}
                    </button>
                  </span>
                </div>
                <p class="check-overall" data-testid="check-overall">
                  {controller().runtimeCheckResult()!.runtimeReady
                    ? st().setup.ready
                    : st().setup.notReady}
                </p>
                <Show when={controller().setupTroubleCount() >= 2}>
                  <p class="settings-note settings-note-warning">
                    {st().settings.setupSmokeReportHint}
                  </p>
                </Show>
                <Show when={runtimeSummary()}>
                  {(summary) => (
                    <p
                      class={`check-summary ${summary().ok ? "is-ok" : "is-fail"}`}
                      data-testid="runtime-check-summary"
                    >
                      {summary().text}{" "}
                      <Show when={summary().section}>
                        <button
                          class="btn-secondary btn-compact check-item-action"
                          type="button"
                          onClick={() => {
                            const section = summary().section;
                            if (section) controller().setSettingsActiveSection(section);
                          }}
                        >
                          {st().settings.openStep}
                        </button>
                      </Show>
                    </p>
                  )}
                </Show>
                <div class="settings-form-stack">
                  <button
                    class="btn-secondary btn-compact"
                    type="button"
                    disabled={controller().runtimeCheckRunning()}
                    onClick={() => void controller().checkRuntimeConfig()}
                  >
                    {controller().runtimeCheckRunning()
                      ? st().settings.checking
                      : st().settings.runCheck}
                  </button>
                  <button
                    class="btn-ghost btn-compact"
                    type="button"
                    onClick={() => controller().openMainPanel()}
                  >
                    {st().settings.openMain}
                  </button>
                  <Show when={controller().setupTroubleCount() >= 2}>
                    <button
                      class="btn-ghost btn-compact"
                      type="button"
                      onClick={() => void controller().copySetupIssueHint()}
                    >
                      {st().settings.copyIssueHint}
                    </button>
                  </Show>
                </div>
              </div>
            </Show>

            <div
              class="action-bar sticky-action-footer app-sticky-footer settings-sticky-footer settings-sticky-footer--section"
              data-testid="settings-sticky-footer"
            >
              <button class="btn-primary" type="submit" disabled={controller().saving()}>
                {controller().saving() ? st().settings.saving : st().settings.save}
              </button>
              <button
                class="btn-secondary btn-compact"
                type="button"
                disabled={controller().runtimeCheckRunning()}
                title={st().settings.checkSettingsHint}
                onClick={() => void controller().checkRuntimeConfig()}
                data-testid="check-settings-btn"
              >
                {controller().runtimeCheckRunning()
                  ? st().settings.checking
                  : st().settings.checkSettings}
              </button>
              <button
                class="btn-ghost btn-compact"
                type="button"
                onClick={() => controller().openMainPanel()}
              >
                {st().settings.back}
              </button>
            </div>
          </form>
        </div>
      </section>
    </Show>
  );
}
