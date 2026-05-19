import { For, Show } from "solid-js";
import { ANSWER_PROFILE_OPTIONS, resolveAnswerProfileOption } from "./answerProfiles";
import { CandidatePackStudio } from "./CandidatePackStudio";
import type { ReplylineController } from "./controller";
import { MODEL_PRESETS, resolveModelPreset } from "./modelPresets";
import type { CheckItemDto } from "./model";
import type { UiStrings } from "./locale";

function checkItemLabel(item: CheckItemDto, st: UiStrings): string {
  switch (item.code) {
    case "ok":
      return st.checks.code.ok;
    case "missing_key":
      return st.checks.code.missing_key;
    case "config_error":
      return st.checks.code.config_error;
    case "auth_error":
      return st.checks.code.auth_error;
    case "endpoint_error":
      return st.checks.code.endpoint_error;
    case "network_error":
      return st.checks.code.network_error;
    case "skipped":
      return st.checks.code.skipped;
    case "error":
      return st.checks.code.error;
    default:
      return item.code;
  }
}

function checkItemClass(item: CheckItemDto): string {
  return item.ok ? "check-item is-ok" : "check-item is-fail";
}

type SettingsSectionId =
  | "overview"
  | "speech"
  | "reply"
  | "hotkey"
  | "reports"
  | "candidate-pack";

type SetupStatusTone = "missing" | "saved" | "ready";

export function SettingsSurface(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  void st().checks.code.ok;
  void st().checks.code.missing_key;
  void st().checks.code.config_error;
  void st().checks.code.auth_error;
  void st().checks.code.endpoint_error;
  void st().checks.code.network_error;
  void st().checks.code.skipped;
  void st().checks.code.error;

  const overallHint = () => {
    if (controller().allSetupReady()) return st().setup.ready;
    if (controller().setupRequired()) return st().setup.notReady;
    return st().setup.body;
  };

  const selectedPreset = () => resolveModelPreset(controller().settings.selectedModelPreset);
  const setupSteps = () => controller().setupSteps();

  const firstMissingSection = (): SettingsSectionId | null => {
    const firstMissingIndex = setupSteps().findIndex((step) => !step.ready);
    if (firstMissingIndex === 0) return "speech";
    if (firstMissingIndex === 1) return "reply";
    if (firstMissingIndex === 2) return "hotkey";
    return null;
  };

  const firstMissingHref = () => {
    const target = firstMissingSection();
    return target ? `#settings-${target}` : "#settings-overview";
  };
  const sectionStatus = (id: SettingsSectionId): { tone: SetupStatusTone; label: string } | null => {
    const allReady = controller().allSetupReady();
    if (id === "overview") {
      return {
        tone: allReady ? "ready" : "missing",
        label: allReady ? st().setup.statusReady : st().setup.statusMissing,
      };
    }
    if (id === "speech") {
      const ready = setupSteps()[0]?.ready ?? false;
      return {
        tone: ready ? "saved" : "missing",
        label: ready ? st().setup.statusSaved : st().setup.statusMissing,
      };
    }
    if (id === "reply") {
      const ready = setupSteps()[1]?.ready ?? false;
      return {
        tone: ready ? "saved" : "missing",
        label: ready ? st().setup.statusSaved : st().setup.statusMissing,
      };
    }
    if (id === "hotkey") {
      const ready = setupSteps()[2]?.ready ?? false;
      return {
        tone: ready ? "ready" : "missing",
        label: ready ? st().setup.statusReady : st().setup.statusMissing,
      };
    }
    return null;
  };
  const stepHrefFromIndex = (index: number) => {
    if (index === 0) return "#settings-speech";
    if (index === 1) return "#settings-reply";
    if (index === 2) return "#settings-hotkey";
    return "#settings-overview";
  };
  const runtimeSummary = () => {
    const result = controller().runtimeCheckResult();
    if (!result) return null;
    if (result.runtimeReady) return { ok: true, text: st().settings.runtimeSummaryReady };
    const firstErrorIndex = [result.stt, result.llm, result.settings].findIndex((item) => !item.ok);
    return { ok: false, text: st().settings.runtimeSummaryNeedsFix, href: stepHrefFromIndex(firstErrorIndex) };
  };

  const sections: Array<{ id: SettingsSectionId; label: string }> = [
    { id: "overview", label: st().settings.navOverview },
    { id: "speech", label: st().settings.navSpeech },
    { id: "reply", label: st().settings.navReply },
    { id: "hotkey", label: st().settings.navHotkey },
    { id: "reports", label: st().settings.navReports },
    { id: "candidate-pack", label: st().settings.navCandidatePack },
  ];

  return (
    <Show when={controller().panel() === "settings"}>
      <section class="settings-card surface-panel app-page app-page--settings settings-layout" data-testid="settings-surface">
        <div class="app-page-header">
          <h2 class="section-title">{st().settings.title}</h2>
        </div>

        <div class="settings-nav-mobile" data-testid="settings-nav-mobile">
          <For each={sections}>
            {(section) => (
              <a class="settings-nav-chip" href={`#settings-${section.id}`}>
                {section.label}
              </a>
            )}
          </For>
        </div>

        <div class="settings-grid app-page-body">
          <aside class="settings-sidebar app-page-aside app-sidebar" data-testid="settings-sidebar">
            <div class="settings-sidebar-inner">
              <For each={sections}>
                {(section) => (
                  <a class="settings-sidebar-link" href={`#settings-${section.id}`}>
                    {section.label}
                  </a>
                )}
              </For>
            </div>
          </aside>

          <form
            class="settings-content app-page-main"
            onSubmit={(event) => {
              event.preventDefault();
              if (!controller().saving()) void controller().persistSettings();
            }}
          >
            <article id="settings-overview" class="settings-section-card section-card" data-testid="settings-section-overview">
              <h3 class="settings-section-title">
                {st().settings.overviewTitle}
                <Show when={sectionStatus("overview")}>
                  {(status) => <span class={`saved-badge status-badge section-status section-status-${status().tone}`}>{status().label}</span>}
                </Show>
              </h3>
              <p class="settings-section-hint" data-testid="setup-overall-hint">
                {overallHint()}
              </p>
              <p class="settings-section-hint">{st().setup.progressiveOverviewHint}</p>

              <div class="setup-progress" aria-label={st().setup.progress}>
                <For each={setupSteps()}>
                  {(step, index) => (
                    <div class="setup-step">
                      <span class={step.ready ? "setup-step-status is-done" : "setup-step-status is-pending"} aria-hidden="true">
                        {step.ready ? "✓" : "○"}
                      </span>
                      <span class="setup-step-label">{step.label}</span>
                      <span class="setup-step-hint">{step.ready ? step.readyLabel : step.missingLabel}</span>
                      <Show when={!step.ready}>
                        <a class="setup-step-action" href={stepHrefFromIndex(index())}>{st().settings.openStep}</a>
                      </Show>
                    </div>
                  )}
                </For>
              </div>

              <Show when={firstMissingSection()}>
                <a class="btn-secondary settings-cta" href={firstMissingHref()} data-testid="setup-first-missing-cta">
                  {st().settings.openFirstMissing}
                </a>
              </Show>
            </article>

            <article id="settings-speech" class="settings-section-card section-card" data-testid="settings-section-speech">
              <h3 class="settings-section-title">
                {st().settings.navSpeech}
                <Show when={sectionStatus("speech")}>
                  {(status) => <span class={`saved-badge status-badge section-status section-status-${status().tone}`}>{status().label}</span>}
                </Show>
              </h3>
              <p class="settings-section-hint">{st().settings.speechHint}</p>
              <p class="field-help">{st().setup.deepgramHint}</p>
              <label class="field">
                <span class="field-label">
                  {st().settings.deepgramKeyLabel}{" "}
                  {controller().deepgramSaved() ? <span class="saved-badge">{st().settings.savedBadge}</span> : null}
                </span>
                <input
                  class="field-input"
                  type="password"
                  placeholder={controller().deepgramSaved() ? st().setup.sttReady : st().setup.sttMissing}
                  value={controller().draftSecrets.deepgramApiKey}
                  onInput={(event) => controller().setDeepgramApiKeyDraft(event.currentTarget.value)}
                />
              </label>
            </article>

            <article id="settings-reply" class="settings-section-card section-card" data-testid="settings-section-reply">
              <h3 class="settings-section-title">
                {st().settings.navReply}
                <Show when={sectionStatus("reply")}>
                  {(status) => <span class={`saved-badge status-badge section-status section-status-${status().tone}`}>{status().label}</span>}
                </Show>
              </h3>
              <p class="field-help">{st().setup.llmHint}</p>

              <label class="field">
                <span class="field-label">{st().settings.modelPresetLabel}</span>
                <select
                  class="field-input"
                  value={controller().settings.selectedModelPreset}
                  onInput={(event) => controller().setSelectedModelPreset(event.currentTarget.value)}
                >
                  <For each={MODEL_PRESETS}>{(preset) => <option value={preset.id}>{preset.title}</option>}</For>
                </select>
              </label>

              <details class="settings-collapsible">
                <summary>{st().settings.providerNotesTitle}</summary>
                <div class="settings-collapsible-body">
                  <div class="field-help">{st().settings.modelPresetProvider}: {selectedPreset().providerKind} · {st().settings.modelPresetCost}: {selectedPreset().costTier} · {st().settings.modelPresetLatency}: {selectedPreset().latencyTier}</div>
                  <div class="field-help">{st().settings.modelPresetBaseUrl}: {selectedPreset().baseUrl || "manual"}</div>
                  <div class="field-help">{st().settings.modelPresetPrimary}: {selectedPreset().primaryModel || "manual"}</div>
                  <div class="field-help">{st().settings.modelPresetFallback}: {selectedPreset().fallbackModels.length ? selectedPreset().fallbackModels.join(" → ") : st().settings.modelPresetNoFallback}</div>
                  <Show when={selectedPreset().freeTierCaveats}><div class="field-help">{selectedPreset().freeTierCaveats}</div></Show>
                  <Show when={selectedPreset().requiresCredits}><div class="field-help">{st().settings.modelPresetCreditsCaveat}</div></Show>
                  <div class="field-help">{st().settings.modelPresetSnapshotPrefix} {selectedPreset().lastReviewedAt}. Availability and rate limits can change.</div>
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
                  onInput={(event) => controller().setActiveAnswerProfile(event.currentTarget.value)}
                >
                  <For each={ANSWER_PROFILE_OPTIONS}>{(profile) => <option value={profile.id}>{profile.title}</option>}</For>
                </select>
                <span class="field-help">{resolveAnswerProfileOption(controller().settings.activeAnswerProfile).description}</span>
              </label>

              <label class="field">
                <span class="field-label">
                  {st().settings.llmKeyLabel}{" "}
                  {controller().llmKeySaved() ? <span class="saved-badge">{st().settings.savedBadge}</span> : null}
                </span>
                <input
                  class="field-input"
                  type="password"
                  value={controller().draftSecrets.llmApiKey}
                  onInput={(event) => controller().setLlmApiKeyDraft(event.currentTarget.value)}
                />
              </label>
            </article>

            <article id="settings-hotkey" class="settings-section-card section-card" data-testid="settings-section-hotkey">
              <h3 class="settings-section-title">
                {st().settings.navHotkey}
                <Show when={sectionStatus("hotkey")}>
                  {(status) => <span class={`saved-badge status-badge section-status section-status-${status().tone}`}>{status().label}</span>}
                </Show>
              </h3>
              <p class="field-help">{st().setup.hotkeyHint}</p>
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
                  onInput={(event) => controller().setCaptureMaxSecondsFromInput(event.currentTarget.value)}
                />
              </label>

              <label class="field">
                <span class="field-label">{st().settings.compactModeLabel}</span>
                <input
                  type="checkbox"
                  aria-label={st().settings.compactModeLabel}
                  checked={controller().settings.interviewCompactMode}
                  onInput={(event) => controller().setCompactMode(event.currentTarget.checked)}
                />
              </label>

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
            </article>

            <article id="settings-reports" class="settings-section-card section-card" data-testid="settings-section-reports">
              <h3 class="settings-section-title">{st().settings.navReports}</h3>
              <label class="field">
                <span class="field-label">{st().settings.interviewReportRetentionLabel}</span>
                <select
                  class="field-input"
                  value={String(controller().settings.interviewReportRetentionDays)}
                  onInput={(event) => controller().setInterviewReportRetentionDays(Number.parseInt(event.currentTarget.value, 10) as 0 | 7 | 30 | 90)}
                >
                  <option value="0">{st().settings.interviewReportRetentionOptionManual}</option>
                  <option value="7">{st().settings.interviewReportRetentionOption7d}</option>
                  <option value="30">{st().settings.interviewReportRetentionOption30d}</option>
                  <option value="90">{st().settings.interviewReportRetentionOption90d}</option>
                </select>
                <span class="field-help">{st().settings.interviewReportRetentionHint}</span>
                <span class="field-help">{st().settings.interviewReportClearHint}</span>
              </label>
            </article>

            <article id="settings-candidate-pack" class="settings-section-card section-card" data-testid="settings-section-candidate-pack">
              <h3 class="settings-section-title">{st().settings.navCandidatePack}</h3>
              <p class="settings-section-hint" data-testid="candidate-pack-summary">{st().settings.candidatePackStudioHint}</p>

              <details class="settings-candidate-pack-details" data-testid="candidate-pack-details">
                <summary>{st().settings.openCandidatePackStudio}</summary>
                <div class="settings-candidate-pack-body">
                  <CandidatePackStudio controller={controller()} st={st()} />
                </div>
              </details>
            </article>

            <Show when={controller().settingsFormHint()}>
              <div class="settings-form-hint" role="alert">
                {controller().settingsFormHint()}
              </div>
            </Show>

            <div class="runtime-check-section" data-testid="runtime-check-section">
              <button
                class="btn-secondary"
                type="button"
                disabled={controller().runtimeCheckRunning()}
                title={st().settings.checkSettingsHint}
                onClick={() => void controller().checkRuntimeConfig()}
                data-testid="check-settings-btn"
              >
                {controller().runtimeCheckRunning() ? st().settings.checking : st().settings.checkSettings}
              </button>

              <Show when={controller().runtimeCheckResult()}>
                <div class="check-results" data-testid="check-results">
                  <h3 class="check-results-title">{st().checks.title}</h3>
                  <div class={checkItemClass(controller().runtimeCheckResult()!.stt)}>
                    <span class="check-item-icon" aria-hidden="true">{controller().runtimeCheckResult()!.stt.ok ? "✓" : "✗"}</span>
                    <span class="check-item-label">{st().setup.stepSpeech}</span>
                    <span class="check-item-status">{checkItemLabel(controller().runtimeCheckResult()!.stt, st())}</span>
                    <span class="check-item-msg">{controller().runtimeCheckResult()!.stt.message}</span>
                    <Show when={!controller().runtimeCheckResult()!.stt.ok}>
                      <a class="check-item-action" href="#settings-speech">{controller().runtimeCheckResult()!.stt.action ?? st().settings.openStep}</a>
                    </Show>
                  </div>
                  <div class={checkItemClass(controller().runtimeCheckResult()!.llm)}>
                    <span class="check-item-icon" aria-hidden="true">{controller().runtimeCheckResult()!.llm.ok ? "✓" : "✗"}</span>
                    <span class="check-item-label">{st().setup.stepReply}</span>
                    <span class="check-item-status">{checkItemLabel(controller().runtimeCheckResult()!.llm, st())}</span>
                    <span class="check-item-msg">{controller().runtimeCheckResult()!.llm.message}</span>
                    <Show when={!controller().runtimeCheckResult()!.llm.ok}>
                      <a class="check-item-action" href="#settings-reply">{controller().runtimeCheckResult()!.llm.action ?? st().settings.openStep}</a>
                    </Show>
                  </div>
                  <div class={checkItemClass(controller().runtimeCheckResult()!.settings)}>
                    <span class="check-item-icon" aria-hidden="true">{controller().runtimeCheckResult()!.settings.ok ? "✓" : "✗"}</span>
                    <span class="check-item-label">{st().setup.stepHotkey}</span>
                    <span class="check-item-status">{checkItemLabel(controller().runtimeCheckResult()!.settings, st())}</span>
                    <span class="check-item-msg">{controller().runtimeCheckResult()!.settings.message}</span>
                    <Show when={!controller().runtimeCheckResult()!.settings.ok}>
                      <a class="check-item-action" href="#settings-hotkey">{controller().runtimeCheckResult()!.settings.action ?? st().settings.openStep}</a>
                    </Show>
                  </div>
                  <p class="check-overall" data-testid="check-overall">{controller().runtimeCheckResult()!.runtimeReady ? st().setup.ready : st().setup.notReady}</p>
                  <Show when={runtimeSummary()}>
                    {(summary) => (
                      <p class={`check-summary ${summary().ok ? "is-ok" : "is-fail"}`} data-testid="runtime-check-summary">
                        {summary().text}{" "}
                        <Show when={summary().href}>
                          <a href={summary().href!}>{st().settings.openStep}</a>
                        </Show>
                      </p>
                    )}
                  </Show>
                </div>
              </Show>
            </div>

            <div class="action-bar sticky-action-footer app-sticky-footer settings-sticky-footer" data-testid="settings-sticky-footer">
              <button class="btn-primary" type="submit" disabled={controller().saving()}>
                {controller().saving() ? st().settings.saving : st().settings.save}
              </button>
              <button class="btn-secondary" type="button" onClick={() => controller().openMainPanel()}>
                {st().settings.back}
              </button>
            </div>
          </form>
        </div>
      </section>
    </Show>
  );
}
