import { For, Show, createEffect, createSignal } from "solid-js";

import type { ReplylineController } from "./controller";
import { fmtContextDraftActive, fmtSecondsSuffix } from "./locale";
import fixtureSnippets from "../../fixtures/ru-work-snippets.json";

export function SettingsSurface(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const [devFixtureId, setDevFixtureId] = createSignal(fixtureSnippets[0]?.id ?? "");
  const hotkeyInvalid = () => !controller().settings.hotkey.trim();
  const llmModelInvalid = () => !controller().settings.llmModel.trim();
  const llmUrlInvalid = () => {
    const value = controller().settings.llmBaseUrl.trim();
    if (!value) return false;
    try {
      const parsed = new URL(value);
      return parsed.protocol !== "http:" && parsed.protocol !== "https:";
    } catch {
      return true;
    }
  };
  const captureMaxInvalid = () =>
    controller().settings.captureMaxSeconds < 5 || controller().settings.captureMaxSeconds > 180;

  createEffect(() => {
    if (controller().panel() !== "settings") return;
    const anchor = controller().settingsScrollAnchor();
    if (anchor == null) return;
    queueMicrotask(() => {
      document.getElementById(`settings-anchor-${anchor}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      controller().clearSettingsScrollAnchor();
    });
  });

  return (
    <Show when={controller().phase() !== "booting" && controller().panel() === "settings"}>
      <section class="settings-card">
        <Show when={controller().setupHotkeyNudge()}>
          <div class="settings-hotkey-nudge" role="status">
            <p class="settings-hotkey-nudge-copy">{st().settings.hotkeyNudge}</p>
          </div>
        </Show>
        <Show when={controller().phase() === "error"}>
          <div class="settings-bootstrap-fail" role="alert">
            <p class="settings-bootstrap-fail-copy">{st().settings.bootstrapFail}</p>
            <button
              class="btn-primary"
              type="button"
              onClick={() => void controller().reloadBootstrap()}
            >
              {st().settings.retryLoad}
            </button>
          </div>
        </Show>
        <h2 class="section-title">{st().settings.title}</h2>
        <p class="section-copy settings-lead">{st().settings.lead}</p>
        <Show when={controller().setupRequired()}>
          <div class="setup-guide" role="status">
            <p class="settings-section-title">{st().setup.title}</p>
            <ol class="setup-steps">
              <li>{st().setup.step1}</li>
              <li>{st().setup.step2}</li>
              <li>{st().setup.step3}</li>
            </ol>
            <div class="result-actions">
              <button
                class="btn-secondary"
                type="button"
                disabled={controller().healthCheckBusy()}
                onClick={() => void controller().runHealthCheck()}
              >
                {controller().healthCheckBusy() ? st().settings.healthCheckBusy : st().settings.healthCheck}
              </button>
              <button class="btn-ghost" type="button" onClick={() => controller().openMainPanel()}>
                {st().settings.testCapture}
              </button>
            </div>
          </div>
        </Show>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!controller().saving()) {
              void controller().persistSettings();
            }
          }}
        >
        <div class="settings-section">
          <h3 class="settings-section-title">{st().settings.basicTitle}</h3>
          <label class="field-checkbox">
            <input
              type="checkbox"
              checked={controller().settings.showAdvanced}
              onChange={(e) => controller().setShowAdvanced(e.currentTarget.checked)}
            />
            <span style="font-weight: 600;">{st().advanced.showAdvancedLabel}</span>
          </label>
          <p class="field-hint field-hint--tight">{st().advanced.showAdvancedHint}</p>
        </div>

        <div class="readiness-panel" role="region" aria-label={st().settings.readinessTitle}>
            <div class="readiness-panel-title">{st().settings.readinessTitle}</div>
            <ul class="readiness-list">
              <li
                class={
                  controller().deepgramSaved() ? "readiness-item is-met" : "readiness-item is-missing"
                }
              >
                <span class="readiness-item-label">{st().settings.readinessLabel.stt}</span>
                <span class="readiness-item-state">
                  {controller().deepgramSaved()
                    ? st().settings.readinessState.deepgramMet
                    : st().settings.readinessState.deepgramMissing}
                </span>
              </li>
              <li
                class={
                  controller().llmRouteConfigured()
                    ? "readiness-item is-met"
                    : "readiness-item is-missing"
                }
              >
                <span class="readiness-item-label">{st().settings.readinessLabel.llm}</span>
                <span class="readiness-item-state">
                  {controller().llmRouteConfigured()
                    ? st().settings.readinessState.llmMet
                    : controller().llmRouteIsPlaceholder()
                      ? st().settings.readinessState.llmPlaceholder
                      : st().settings.readinessState.llmMissing}
                </span>
              </li>
              <li
                class={
                  controller().llmKeySaved() ? "readiness-item is-met" : "readiness-item is-optional"
                }
              >
                <span class="readiness-item-label">{st().settings.readinessLabel.llmKey}</span>
                <span class="readiness-item-state">
                  {controller().llmKeySaved()
                    ? st().settings.readinessState.llmKeyMet
                    : st().settings.readinessState.llmKeyOptional}
                </span>
              </li>
              <li
                class={
                  controller().hotkeyFilled() ? "readiness-item is-met" : "readiness-item is-missing"
                }
              >
                <span class="readiness-item-label">{st().settings.readinessLabel.hotkey}</span>
                <span class="readiness-item-state">
                  {controller().hotkeyFilled()
                    ? st().settings.readinessState.hotkeyMet
                    : st().settings.readinessState.hotkeyMissing}
                </span>
              </li>
            </ul>
            <p class="readiness-foot">{st().settings.readinessFoot}</p>
            <div class="readiness-health-row">
              <button
                class="btn-secondary"
                type="button"
                disabled={controller().healthCheckBusy()}
                onClick={() => void controller().runHealthCheck()}
              >
                {controller().healthCheckBusy()
                  ? st().settings.healthCheckBusy
                  : st().settings.healthCheck}
              </button>
              <Show when={controller().healthCheck()}>
                {(result) => (
                  <span
                    class={`health-indicator ${result().deepgramOk && result().llmOk ? "is-ok" : "is-warn"}`}
                  >
                    {result().detail}
                  </span>
                )}
              </Show>
            </div>
          </div>

        <Show when={controller().settings.showAdvanced}>
          <div class="settings-section settings-section--snapshot">
            <h3 class="settings-section-title">{st().settings.snapshotTitle}</h3>
            <p class="settings-section-intro settings-section-intro--tight">
              {st().settings.snapshotIntro}
            </p>
            <dl class="runtime-snapshot">
              <div class="runtime-snapshot-row">
                <dt>{st().settings.snapshotLabel.gateway}</dt>
                <dd title={controller().settings.llmBaseUrl}>
                  {controller().shortUrlForUi(controller().settings.llmBaseUrl)}
                </dd>
              </div>
              <div class="runtime-snapshot-row">
                <dt>{st().settings.snapshotLabel.model}</dt>
                <dd>{controller().settings.llmModel.trim() || "—"}</dd>
              </div>
              <div class="runtime-snapshot-row">
                <dt>{st().settings.snapshotLabel.deepgram}</dt>
                <dd>{controller().settings.deepgramModel.trim() || "—"}</dd>
              </div>
              <div class="runtime-snapshot-row">
                <dt>{st().settings.snapshotLabel.fragmentLimit}</dt>
                <dd>
                  {fmtSecondsSuffix(controller().settings.captureMaxSeconds, controller().strings())}
                </dd>
              </div>
              <div class="runtime-snapshot-row">
                <dt>{st().settings.snapshotLabel.cardLanguage}</dt>
                <dd>{controller().alphaLanguageLabel(controller().settings.primaryLanguage)}</dd>
              </div>
              <div class="runtime-snapshot-row">
                <dt>{st().settings.snapshotLabel.contextDraft}</dt>
                <dd>
                  {controller().contextActive()
                    ? fmtContextDraftActive(controller().contextEntryCount(), controller().strings())
                    : st().settings.snapshotValue.empty}
                </dd>
              </div>
              <div class="runtime-snapshot-row">
                <dt>{st().settings.snapshotLabel.appVersion}</dt>
                <dd>{controller().runtimeReadiness()?.appVersion ?? "—"}</dd>
              </div>
              <div class="runtime-snapshot-row">
                <dt>{st().settings.snapshotLabel.settingsSchema}</dt>
                <dd>
                  {controller().runtimeReadiness() != null
                    ? String(controller().runtimeReadiness()!.settingsSchemaVersion)
                    : "—"}
                </dd>
              </div>
              <div class="runtime-snapshot-row">
                <dt>{st().settings.snapshotLabel.promptContract}</dt>
                <dd>{controller().runtimeReadiness()?.promptContractVersion ?? "—"}</dd>
              </div>
              <div class="runtime-snapshot-row">
                <dt>{st().settings.snapshotLabel.transcriptChars}</dt>
                <dd>
                  {controller().runtimeReadiness()?.lastTranscriptCharCount != null
                    ? String(controller().runtimeReadiness()!.lastTranscriptCharCount)
                    : "—"}
                </dd>
              </div>
              <div class="runtime-snapshot-row">
                <dt>{st().settings.snapshotLabel.localLog}</dt>
                <dd
                  title={
                    controller().logStatus()?.logPath ?? st().settings.snapshotValue.notYetReceived
                  }
                >
                  {controller().logStatus()?.logPath
                    ? controller().shortUrlForUi(controller().logStatus()!.logPath, 42)
                    : st().settings.snapshotValue.notYetReceived}
                </dd>
              </div>
              <div class="runtime-snapshot-row">
                <dt>{st().settings.snapshotLabel.lastLine}</dt>
                <dd
                  title={controller().logStatus()?.lastLine ?? st().settings.snapshotValue.noEntries}
                >
                  {controller().logStatus()?.lastLine
                    ? controller().shortUrlForUi(controller().logStatus()!.lastLine!, 52)
                    : st().settings.snapshotValue.noEntries}
                </dd>
              </div>
              <div class="runtime-snapshot-row">
                <dt>{st().settings.snapshotLabel.lastDebugWav}</dt>
                <dd
                  title={
                    controller().logStatus()?.lastDebugWavPath ??
                    st().settings.snapshotValue.noEntries
                  }
                >
                  {controller().logStatus()?.lastDebugWavPath
                    ? controller().shortUrlForUi(controller().logStatus()!.lastDebugWavPath!, 42)
                    : st().settings.snapshotValue.noEntries}
                </dd>
              </div>
            </dl>
            <div class="runtime-snapshot-actions">
              <button
                class="btn-secondary"
                type="button"
                onClick={() => void controller().copyLogPath()}
              >
                {st().settings.copyLogPath}
              </button>
              <button
                class="btn-secondary"
                type="button"
                onClick={() => void controller().copyRuntimeReadinessJson()}
              >
                {st().settings.copyReadinessJson}
              </button>
            </div>
          </div>

          <div class="settings-section settings-section--snapshot">
            <h3 class="settings-section-title">{st().settings.supportTitle}</h3>
            <p class="settings-section-intro settings-section-intro--tight">
              {st().settings.supportIntro}
            </p>
            <button
              class="btn-secondary"
              type="button"
              disabled={controller().diagnosticBusy()}
              onClick={() => void controller().collectSupportBundle()}
            >
              {controller().diagnosticBusy()
                ? st().settings.collectingBundle
                : st().settings.collectBundle}
            </button>
            <button
              class="btn-secondary"
              type="button"
              disabled={controller().diagnosticBusy()}
              onClick={() => void controller().collectTicketSupportPackage()}
            >
              {st().settings.collectTicketPackage}
            </button>
            <Show when={controller().diagnosticLocalError()}>
              <p class="diagnostic-error" role="alert">
                {controller().diagnosticLocalError()}
              </p>
            </Show>
          </div>
        </Show>

        <div class="settings-section" id="settings-anchor-hotkey">
          <h3 class="settings-section-title">{st().settings.hotkeySectionTitle}</h3>
          <p class="settings-section-intro">{st().settings.hotkeySectionIntro}</p>
          <label class="field">
            <span class="field-label">{st().settings.hotkeyLabel}</span>
            <span class="field-hint field-hint--tight">{st().settings.hotkeyHint}</span>
            <input
              class="field-input"
              value={controller().settings.hotkey}
              aria-invalid={hotkeyInvalid()}
              aria-describedby={hotkeyInvalid() ? "settings-hotkey-inline-error" : undefined}
              onKeyDown={(event) => controller().captureHotkeyInput(event as KeyboardEvent)}
              onInput={(event) => controller().setHotkeyFromInput(event.currentTarget.value)}
            />
            <Show when={hotkeyInvalid()}>
              <span id="settings-hotkey-inline-error" class="field-error" role="alert">
                {st().settings.hotkeyInlineRequired}
              </span>
            </Show>
          </label>

          <label class="field">
            <span class="field-label">{st().settings.captureMaxLabel}</span>
            <input
              class="field-input"
              type="number"
              min="5"
              max="180"
              value={String(controller().settings.captureMaxSeconds)}
              aria-invalid={captureMaxInvalid()}
              aria-describedby={captureMaxInvalid() ? "settings-capture-inline-error" : undefined}
              onInput={(event) =>
                controller().setCaptureMaxSecondsFromInput(event.currentTarget.value)
              }
            />
            <span class="field-hint">{st().settings.captureMaxHint}</span>
            <Show when={captureMaxInvalid()}>
              <span id="settings-capture-inline-error" class="field-error" role="alert">
                {st().settings.captureMaxInlineInvalid}
              </span>
            </Show>
          </label>
        </div>

        <div class="settings-section" id="settings-anchor-stt">
          <h3 class="settings-section-title">{st().settings.sttSectionTitle}</h3>
          <p class="settings-section-intro">{st().settings.sttSectionIntro}</p>
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
              value={controller().draftSecrets.deepgramApiKey}
              placeholder={
                controller().deepgramSaved()
                  ? st().settings.deepgramPlaceholderSaved
                  : st().settings.deepgramPlaceholderNew
              }
              onInput={(event) => controller().setDeepgramApiKeyDraft(event.currentTarget.value)}
            />
          </label>
        </div>

        <div class="settings-section" id="settings-anchor-llm">
          <h3 class="settings-section-title">{st().settings.llmSectionTitle}</h3>
          <p class="settings-section-intro">{st().settings.llmSectionIntro}</p>
          <label class="field">
            <span class="field-label">{st().settings.llmBaseUrlLabel}</span>
            <input
              class="field-input"
              value={controller().settings.llmBaseUrl}
              aria-invalid={llmUrlInvalid()}
              aria-describedby={llmUrlInvalid() ? "settings-llm-url-inline-error" : undefined}
              onInput={(event) => controller().setLlmBaseUrl(event.currentTarget.value)}
              placeholder="https://api.openai.com/v1"
            />
            <span class="field-hint">
              <code>{st().settings.llmBaseUrlHint}</code>
            </span>
            <Show when={llmUrlInvalid()}>
              <span id="settings-llm-url-inline-error" class="field-error" role="alert">
                {st().settings.llmUrlInlineInvalid}
              </span>
            </Show>
          </label>

          <label class="field">
            <span class="field-label">{st().settings.llmModelLabel}</span>
            <input
              class="field-input"
              value={controller().settings.llmModel}
              aria-invalid={llmModelInvalid()}
              aria-describedby={llmModelInvalid() ? "settings-llm-model-inline-error" : undefined}
              onInput={(event) => controller().setLlmModel(event.currentTarget.value)}
            />
            <Show when={llmModelInvalid()}>
              <span id="settings-llm-model-inline-error" class="field-error" role="alert">
                {st().settings.llmModelInlineRequired}
              </span>
            </Show>
          </label>

          <label class="field">
            <span class="field-label">
              {st().settings.llmKeyLabel}{" "}
              {controller().llmKeySaved() ? (
                <span class="saved-badge">{st().settings.savedBadge}</span>
              ) : (
                <span class="saved-badge is-muted">{st().settings.llmKeyIfNeeded}</span>
              )}
            </span>
            <input
              class="field-input"
              type="password"
              value={controller().draftSecrets.llmApiKey}
              placeholder={st().settings.llmKeyPlaceholder}
              onInput={(event) => controller().setLlmApiKeyDraft(event.currentTarget.value)}
            />
          </label>
        </div>

        <Show when={controller().settings.showAdvanced}>
          <div class="settings-section">
            <h3 class="settings-section-title">{st().settings.advancedTitle}</h3>
            <p class="settings-section-intro">{st().advanced.governancePurpose}</p>
            <p class="field-hint field-hint--tight">{st().advanced.governanceRisks}</p>
            <p class="field-hint field-hint--tight">{st().advanced.governanceVisible}</p>
            <p class="field-hint field-hint--tight">{st().advanced.governanceEnable}</p>
            <p class="field-hint field-hint--tight">{st().advanced.governanceDisable}</p>

            <label class="field">
              <span class="field-label">{st().advanced.customPromptLabel}</span>
              <textarea
                class="field-input field-textarea"
                rows={4}
                value={controller().settings.customSystemPrompt ?? ""}
                onInput={(e) => {
                  const val = e.currentTarget.value.trim() || null;
                  controller().setCustomSystemPrompt(val);
                }}
              />
              <span class="field-hint">{st().advanced.customPromptHint}</span>
            </label>

            <label class="field-checkbox">
              <input
                type="checkbox"
                checked={controller().settings.useStreamingStt}
                onChange={(e) => controller().setUseStreamingStt(e.currentTarget.checked)}
              />
              <span>{st().advanced.streamingSttLabel}</span>
            </label>

            <label class="field">
              <span class="field-label">{st().advanced.densityPresetLabel}</span>
              <select
                class="field-input"
                value={controller().settings.uiDensity}
                onChange={(e) =>
                  controller().setUiDensity(
                    e.currentTarget.value as "compact" | "default" | "comfortable",
                  )
                }
              >
                <option value="compact">compact</option>
                <option value="default">default</option>
                <option value="comfortable">comfortable</option>
              </select>
            </label>

            <Show when={import.meta.env.DEV}>
              <div class="dev-fixture-panel">
                <p class="field-label">{st().advanced.devFixtureTitle}</p>
                <p class="field-hint field-hint--tight">{st().advanced.devFixtureIntro}</p>
                <div class="dev-fixture-row">
                  <select
                    class="field-input dev-fixture-select"
                    value={devFixtureId()}
                    onChange={(e) => setDevFixtureId(e.currentTarget.value)}
                  >
                    <For each={fixtureSnippets}>
                      {(row) => <option value={row.id}>{row.id}</option>}
                    </For>
                  </select>
                  <button
                    class="btn-secondary"
                    type="button"
                    disabled={controller().devFixtureBusy() || !devFixtureId()}
                    onClick={() => void controller().runDevFixtureAnalysis(devFixtureId())}
                  >
                    {controller().devFixtureBusy()
                      ? st().advanced.devFixtureBusy
                      : st().advanced.devFixtureRun}
                  </button>
                </div>
              </div>
            </Show>
          </div>
        </Show>

        <Show when={controller().settings.showAdvanced && controller().memorySpaces().length > 0}>
          <div class="settings-section" id="settings-anchor-memory">
            <h3 class="settings-section-title">{st().memory.sectionTitle}</h3>
            <p class="settings-section-intro">{st().memory.sectionIntro}</p>

            <Show
              when={controller().memorySpaces().length > 0}
              fallback={<p class="settings-memory-empty">{st().memory.noSpaces}</p>}
            >
              <div class="memory-space-list">
                <label class="field">
                  <span class="field-label">{st().memory.selectSpace}</span>
                  <select
                    class="field-input"
                    value={controller().activeSpaceId() ?? ""}
                    onChange={(e) => controller().setActiveSpaceId(e.currentTarget.value || null)}
                  >
                    <For each={controller().memorySpaces()}>
                      {(space) => (
                        <option value={space.id}>
                          {space.label} ({space.kind})
                        </option>
                      )}
                    </For>
                  </select>
                </label>
                <Show when={controller().memorySavedCardPreview()}>
                  <div
                    class="memory-saved-card-preview"
                    role="region"
                    aria-label={st().memory.lastSavedFromCard}
                  >
                    <p class="field-hint field-hint--tight">{st().memory.lastSavedFromCard}</p>
                    <p class="memory-saved-card-text">{controller().memorySavedCardPreview()}</p>
                    <button
                      class="btn-ghost"
                      type="button"
                      onClick={() => void controller().removeLastSavedCardFromMemory()}
                    >
                      {st().memory.removeLastSavedCard}
                    </button>
                  </div>
                </Show>
              </div>
            </Show>

          </div>
        </Show>

        <Show when={controller().settingsFormHint()}>
          <div class="settings-form-hint" role="alert" aria-live="assertive">
            {controller().settingsFormHint()}
          </div>
        </Show>

        <div class="settings-actions">
          <button
            class="btn-primary"
            type="submit"
            disabled={controller().saving()}
          >
            {controller().saving() ? st().settings.saving : st().settings.save}
          </button>
          <button class="btn-ghost" type="button" onClick={() => controller().openMainPanel()}>
            {st().settings.toCard}
          </button>
        </div>
        </form>
      </section>
    </Show>
  );
}
