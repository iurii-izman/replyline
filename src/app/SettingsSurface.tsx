import { For, Show } from "solid-js";
import { ANSWER_PROFILE_OPTIONS, resolveAnswerProfileOption } from "./answerProfiles";
import type { ReplylineController } from "./controller";
import type { CheckItemDto } from "./model";
import type { UiStrings } from "./locale";

function checkItemLabel(item: CheckItemDto, st: UiStrings): string {
  // Explicit key access so locale-key checker can trace all code branches.
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

export function SettingsSurface(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  // Force locale-key checker to see check code keys via st() signal access.
  // The keys are used dynamically in checkItemLabel via UiStrings parameter.
  void st().checks.code.ok;
  void st().checks.code.missing_key;
  void st().checks.code.config_error;
  void st().checks.code.auth_error;
  void st().checks.code.endpoint_error;
  void st().checks.code.network_error;
  void st().checks.code.skipped;
  void st().checks.code.error;

  const stepStatusClass = (ready: boolean) =>
    ready ? "setup-step-status is-done" : "setup-step-status is-pending";

  const overallHint = () => {
    if (controller().allSetupReady()) return st().setup.ready;
    if (controller().setupRequired()) return st().setup.notReady;
    return st().setup.body;
  };

  return (
    <Show when={controller().panel() === "settings"}>
      <section class="settings-card">
        <h2 class="section-title">{st().settings.title}</h2>

        {/* ── Setup progress ─────────────────────────────────────── */}
        <div class="setup-progress" aria-label={st().setup.progress}>
          <For each={controller().setupSteps()}>
            {(step) => (
              <div class="setup-step">
                <span class={stepStatusClass(step.ready)} aria-hidden="true">
                  {step.ready ? "✓" : "○"}
                </span>
                <span class="setup-step-label">{step.label}</span>
                <span class="setup-step-hint">
                  {step.ready ? step.readyLabel : step.missingLabel}
                </span>
              </div>
            )}
          </For>
          <p class="setup-overall-hint" data-testid="setup-overall-hint">
            {overallHint()}
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!controller().saving()) void controller().persistSettings();
          }}
        >
          {/* ── 1. Речь / Speech ─────────────────────────────────── */}
          <fieldset class="setup-fieldset" data-testid="setup-section-speech">
            <legend class="setup-legend">{st().setup.stepSpeech}</legend>
            <label class="field">
              <span class="field-label">
                {st().settings.deepgramKeyLabel}{" "}
                {controller().deepgramSaved() ? (
                  <span class="saved-badge">{st().settings.savedBadge}</span>
                ) : null}
              </span>
              <input
                class="field-input"
                type="password"
                placeholder={
                  controller().deepgramSaved() ? st().setup.sttReady : st().setup.sttMissing
                }
                value={controller().draftSecrets.deepgramApiKey}
                onInput={(event) => controller().setDeepgramApiKeyDraft(event.currentTarget.value)}
              />
            </label>
          </fieldset>

          {/* ── 2. Ответ / Reply ─────────────────────────────────── */}
          <fieldset class="setup-fieldset" data-testid="setup-section-reply">
            <legend class="setup-legend">{st().setup.stepReply}</legend>
            <label class="field">
              <span class="field-label">{st().settings.llmBaseUrlLabel}</span>
              <input
                class="field-input"
                placeholder="https://api.example.com/v1"
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
                <For each={ANSWER_PROFILE_OPTIONS}>
                  {(profile) => <option value={profile.id}>{profile.title}</option>}
                </For>
              </select>
              <span class="field-help">
                {
                  resolveAnswerProfileOption(controller().settings.activeAnswerProfile).description
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
                class="field-input"
                type="password"
                value={controller().draftSecrets.llmApiKey}
                onInput={(event) => controller().setLlmApiKeyDraft(event.currentTarget.value)}
              />
            </label>
          </fieldset>

          {/* ── 3. Горячая клавиша / Hotkey ─────────────────────── */}
          <fieldset class="setup-fieldset" data-testid="setup-section-hotkey">
            <legend class="setup-legend">{st().setup.stepHotkey}</legend>
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
          </fieldset>

          <Show when={controller().settingsFormHint()}>
            <div class="settings-form-hint" role="alert">
              {controller().settingsFormHint()}
            </div>
          </Show>

          {/* ── Runtime preflight check ────────────────────────── */}
          <div class="runtime-check-section" data-testid="runtime-check-section">
            <button
              class="btn-ghost"
              type="button"
              disabled={controller().runtimeCheckRunning()}
              onClick={() => void controller().checkRuntimeConfig()}
              data-testid="check-settings-btn"
            >
              {controller().runtimeCheckRunning()
                ? st().settings.checking
                : st().settings.checkSettings}
            </button>

            <Show when={controller().runtimeCheckResult()}>
              <div class="check-results" data-testid="check-results">
                <h3 class="check-results-title">{st().checks.title}</h3>
                <div class={checkItemClass(controller().runtimeCheckResult()!.stt)}>
                  <span class="check-item-icon" aria-hidden="true">
                    {controller().runtimeCheckResult()!.stt.ok ? "\u2713" : "\u2717"}
                  </span>
                  <span class="check-item-label">{st().setup.stepSpeech}</span>
                  <span class="check-item-status">
                    {checkItemLabel(controller().runtimeCheckResult()!.stt, st())}
                  </span>
                  <span class="check-item-msg">
                    {controller().runtimeCheckResult()!.stt.message}
                  </span>
                  <Show when={controller().runtimeCheckResult()!.stt.action}>
                    <span class="check-item-action">
                      {controller().runtimeCheckResult()!.stt.action}
                    </span>
                  </Show>
                </div>
                <div class={checkItemClass(controller().runtimeCheckResult()!.llm)}>
                  <span class="check-item-icon" aria-hidden="true">
                    {controller().runtimeCheckResult()!.llm.ok ? "\u2713" : "\u2717"}
                  </span>
                  <span class="check-item-label">{st().setup.stepReply}</span>
                  <span class="check-item-status">
                    {checkItemLabel(controller().runtimeCheckResult()!.llm, st())}
                  </span>
                  <span class="check-item-msg">
                    {controller().runtimeCheckResult()!.llm.message}
                  </span>
                  <Show when={controller().runtimeCheckResult()!.llm.action}>
                    <span class="check-item-action">
                      {controller().runtimeCheckResult()!.llm.action}
                    </span>
                  </Show>
                </div>
                <div class={checkItemClass(controller().runtimeCheckResult()!.settings)}>
                  <span class="check-item-icon" aria-hidden="true">
                    {controller().runtimeCheckResult()!.settings.ok ? "\u2713" : "\u2717"}
                  </span>
                  <span class="check-item-label">{st().setup.stepHotkey}</span>
                  <span class="check-item-status">
                    {checkItemLabel(controller().runtimeCheckResult()!.settings, st())}
                  </span>
                  <span class="check-item-msg">
                    {controller().runtimeCheckResult()!.settings.message}
                  </span>
                  <Show when={controller().runtimeCheckResult()!.settings.action}>
                    <span class="check-item-action">
                      {controller().runtimeCheckResult()!.settings.action}
                    </span>
                  </Show>
                </div>
                <p class="check-overall" data-testid="check-overall">
                  {controller().runtimeCheckResult()!.runtimeReady
                    ? st().setup.ready
                    : st().setup.notReady}
                </p>
              </div>
            </Show>
          </div>

          <div class="settings-actions">
            <fieldset class="setup-fieldset" data-testid="candidate-pack-ai-section">
              <legend class="setup-legend">{st().settings.prepTitle}</legend>
              <label class="field">
                <span class="field-label">{st().settings.resumeLabel}</span>
                <textarea
                  class="field-input field-textarea"
                  value={controller().candidateRawResume()}
                  onInput={(event) => controller().setCandidateRawResume(event.currentTarget.value)}
                />
              </label>
              <label class="field">
                <span class="field-label">{st().settings.jdLabel}</span>
                <textarea
                  class="field-input field-textarea"
                  value={controller().candidateJobDescription()}
                  onInput={(event) =>
                    controller().setCandidateJobDescription(event.currentTarget.value)
                  }
                />
              </label>
              <label class="field">
                <span class="field-label">{st().settings.valuesLabel}</span>
                <textarea
                  class="field-input field-textarea"
                  value={controller().candidateCompanyValues()}
                  onInput={(event) =>
                    controller().setCandidateCompanyValues(event.currentTarget.value)
                  }
                />
              </label>
              <div class="settings-actions">
                <button
                  class="btn-secondary"
                  type="button"
                  disabled={controller().candidatePackPreparing()}
                  onClick={() => void controller().prepareCandidatePack()}
                >
                  {controller().candidatePackPreparing()
                    ? st().settings.preparing
                    : st().settings.prepare}
                </button>
                <button
                  class="btn-primary"
                  type="button"
                  disabled={!controller().candidatePackPreview() || controller().candidatePackSaving()}
                  onClick={() => void controller().savePreparedCandidatePack()}
                >
                  {st().settings.savePack}
                </button>
              </div>
              <div class="candidate-pack-preview" data-testid="candidate-pack-preview">
                <div class="field-label">{st().settings.previewTitle}</div>
                <Show when={controller().candidatePackPreview()} fallback={<p>{st().settings.noPreview}</p>}>
                  <div class="preview-grid">
                    <p>
                      Score: <strong>{controller().candidatePackPreview()!.packQualityScore}</strong>
                    </p>
                    <p>Facts: {controller().candidatePackPreview()!.candidateFacts.length}</p>
                    <p>Role keywords: {controller().candidatePackPreview()!.roleKeywords.join(", ")}</p>
                    <p>Company values: {controller().candidatePackPreview()!.companyValues.join(", ")}</p>
                  </div>
                </Show>
              </div>
            </fieldset>
            <button class="btn-primary" type="submit" disabled={controller().saving()}>
              {controller().saving() ? st().settings.saving : st().settings.save}
            </button>
            <button class="btn-ghost" type="button" onClick={() => controller().openMainPanel()}>
              {st().settings.back}
            </button>
          </div>
        </form>
        <fieldset class="setup-fieldset" data-testid="candidate-pack-section">
          <legend class="setup-legend">{st().settings.candidatePackTitle}</legend>
          <p class="setup-overall-hint">
            {st().settings.candidatePackStatus}:{" "}
            {controller().candidatePackStatus().exists
              ? `${controller().candidatePackStatus().factCount} / weak ${controller().candidatePackStatus().weakFactCount}`
              : st().settings.candidatePackEmpty}
          </p>
          <label class="field">
            <span class="field-label">{st().settings.candidateSummaryLabel}</span>
            <textarea
              class="field-input"
              value={controller().candidatePackDraft.candidateSummary}
              onInput={(event) =>
                controller().setCandidatePackDraft("candidateSummary", event.currentTarget.value)}
            />
          </label>
          <label class="field">
            <span class="field-label">{st().settings.targetRoleLabel}</span>
            <input
              class="field-input"
              value={controller().candidatePackDraft.targetRole}
              onInput={(event) =>
                controller().setCandidatePackDraft("targetRole", event.currentTarget.value)}
            />
          </label>
          <label class="field">
            <span class="field-label">{st().settings.factsLabel}</span>
            <textarea
              class="field-input"
              placeholder={st().settings.factsHint}
              value={controller().candidatePackDraft.factsText}
              onInput={(event) =>
                controller().setCandidatePackDraft("factsText", event.currentTarget.value)}
            />
          </label>
          <label class="field">
            <span class="field-label">{st().settings.jobTitleLabel}</span>
            <input
              class="field-input"
              value={controller().candidatePackDraft.jobTitle}
              onInput={(event) =>
                controller().setCandidatePackDraft("jobTitle", event.currentTarget.value)}
            />
          </label>
          <label class="field">
            <span class="field-label">{st().settings.jobCompanyLabel}</span>
            <input
              class="field-input"
              value={controller().candidatePackDraft.jobCompany}
              onInput={(event) =>
                controller().setCandidatePackDraft("jobCompany", event.currentTarget.value)}
            />
          </label>
          <label class="field">
            <span class="field-label">{st().settings.requirementsLabel}</span>
            <textarea
              class="field-input"
              value={controller().candidatePackDraft.requirementsText}
              onInput={(event) =>
                controller().setCandidatePackDraft("requirementsText", event.currentTarget.value)}
            />
          </label>
          <label class="field">
            <span class="field-label">{st().settings.responsibilitiesLabel}</span>
            <textarea
              class="field-input"
              value={controller().candidatePackDraft.responsibilitiesText}
              onInput={(event) =>
                controller().setCandidatePackDraft(
                  "responsibilitiesText",
                  event.currentTarget.value,
                )}
            />
          </label>
          <label class="field">
            <span class="field-label">{st().settings.keywordsLabel}</span>
            <textarea
              class="field-input"
              value={controller().candidatePackDraft.keywordsText}
              onInput={(event) =>
                controller().setCandidatePackDraft("keywordsText", event.currentTarget.value)}
            />
          </label>
          <label class="field">
            <span class="field-label">{st().settings.companyValuesLabel}</span>
            <textarea
              class="field-input"
              value={controller().candidatePackDraft.companyValuesText}
              onInput={(event) =>
                controller().setCandidatePackDraft("companyValuesText", event.currentTarget.value)}
            />
          </label>
          <label class="field">
            <span class="field-label">{st().settings.avoidClaimsLabel}</span>
            <textarea
              class="field-input"
              value={controller().candidatePackDraft.avoidClaimsText}
              onInput={(event) =>
                controller().setCandidatePackDraft("avoidClaimsText", event.currentTarget.value)}
            />
          </label>
          <label class="field">
            <span class="field-label">{st().settings.preferredExamplesLabel}</span>
            <textarea
              class="field-input"
              value={controller().candidatePackDraft.preferredExamplesText}
              onInput={(event) =>
                controller().setCandidatePackDraft(
                  "preferredExamplesText",
                  event.currentTarget.value,
                )}
            />
          </label>
          <label class="field">
            <span class="field-label">{st().settings.profileLanguageLabel}</span>
            <input
              class="field-input"
              value={controller().candidatePackDraft.language}
              onInput={(event) =>
                controller().setCandidatePackDraft("language", event.currentTarget.value)}
            />
          </label>
          <div class="settings-actions">
            <button class="btn-primary" type="button" onClick={() => void controller().saveCandidatePack()}>
              {st().settings.saveCandidatePack}
            </button>
            <button class="btn-ghost" type="button" onClick={() => void controller().clearCandidatePack()}>
              {st().settings.clearCandidatePack}
            </button>
          </div>
        </fieldset>
      </section>
    </Show>
  );
}
