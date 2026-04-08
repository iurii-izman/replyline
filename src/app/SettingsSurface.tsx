import { For, Show, createEffect, createSignal } from "solid-js";

import type { ReplylineController } from "./controller";
import { ui, fmtContextDraftActive, fmtSecondsSuffix } from "./locale";
import fixtureSnippets from "../../fixtures/ru-work-snippets.json";

export function SettingsSurface(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const [devFixtureId, setDevFixtureId] = createSignal(fixtureSnippets[0]?.id ?? "");

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
            <p class="settings-hotkey-nudge-copy">{ui.settings.hotkeyNudge}</p>
          </div>
        </Show>
        <Show when={controller().phase() === "error"}>
          <div class="settings-bootstrap-fail" role="alert">
            <p class="settings-bootstrap-fail-copy">{ui.settings.bootstrapFail}</p>
            <button class="btn-primary" type="button" onClick={() => void controller().reloadBootstrap()}>
              {ui.settings.retryLoad}
            </button>
          </div>
        </Show>
        <h2 class="section-title">{ui.settings.title}</h2>
        <p class="section-copy settings-lead">{ui.settings.lead}</p>

        <div class="readiness-panel" role="region" aria-label={ui.settings.readinessTitle}>
          <div class="readiness-panel-title">{ui.settings.readinessTitle}</div>
          <ul class="readiness-list">
            <li
              class={
                controller().deepgramSaved() ? "readiness-item is-met" : "readiness-item is-missing"
              }
            >
              <span class="readiness-item-label">{ui.settings.readinessLabel.stt}</span>
              <span class="readiness-item-state">
                {controller().deepgramSaved()
                  ? ui.settings.readinessState.deepgramMet
                  : ui.settings.readinessState.deepgramMissing}
              </span>
            </li>
            <li
              class={
                controller().llmRouteConfigured() ? "readiness-item is-met" : "readiness-item is-missing"
              }
            >
              <span class="readiness-item-label">{ui.settings.readinessLabel.llm}</span>
              <span class="readiness-item-state">
                {controller().llmRouteConfigured()
                  ? ui.settings.readinessState.llmMet
                  : controller().llmRouteIsPlaceholder()
                    ? ui.settings.readinessState.llmPlaceholder
                    : ui.settings.readinessState.llmMissing}
              </span>
            </li>
            <li
              class={controller().llmKeySaved() ? "readiness-item is-met" : "readiness-item is-optional"}
            >
              <span class="readiness-item-label">{ui.settings.readinessLabel.llmKey}</span>
              <span class="readiness-item-state">
                {controller().llmKeySaved()
                  ? ui.settings.readinessState.llmKeyMet
                  : ui.settings.readinessState.llmKeyOptional}
              </span>
            </li>
            <li
              class={controller().hotkeyFilled() ? "readiness-item is-met" : "readiness-item is-missing"}
            >
              <span class="readiness-item-label">{ui.settings.readinessLabel.hotkey}</span>
              <span class="readiness-item-state">
                {controller().hotkeyFilled()
                  ? ui.settings.readinessState.hotkeyMet
                  : ui.settings.readinessState.hotkeyMissing}
              </span>
            </li>
          </ul>
          <p class="readiness-foot">{ui.settings.readinessFoot}</p>
          <div class="readiness-health-row">
            <button
              class="btn-secondary"
              type="button"
              disabled={controller().healthCheckBusy()}
              onClick={() => void controller().runHealthCheck()}
            >
              {controller().healthCheckBusy() ? ui.settings.healthCheckBusy : ui.settings.healthCheck}
            </button>
            <Show when={controller().healthCheck()}>
              {(result) => (
                <span class={`health-indicator ${result().deepgramOk && result().llmOk ? "is-ok" : "is-warn"}`}>
                  {result().detail}
                </span>
              )}
            </Show>
          </div>
        </div>

        <div class="settings-section settings-section--snapshot">
          <h3 class="settings-section-title">{ui.settings.snapshotTitle}</h3>
          <p class="settings-section-intro settings-section-intro--tight">
            {ui.settings.snapshotIntro}
          </p>
          <dl class="runtime-snapshot">
            <div class="runtime-snapshot-row">
              <dt>{ui.settings.snapshotLabel.gateway}</dt>
              <dd title={controller().settings.llmBaseUrl}>
                {controller().shortUrlForUi(controller().settings.llmBaseUrl)}
              </dd>
            </div>
            <div class="runtime-snapshot-row">
              <dt>{ui.settings.snapshotLabel.model}</dt>
              <dd>{controller().settings.llmModel.trim() || "—"}</dd>
            </div>
            <div class="runtime-snapshot-row">
              <dt>{ui.settings.snapshotLabel.deepgram}</dt>
              <dd>{controller().settings.deepgramModel.trim() || "—"}</dd>
            </div>
            <div class="runtime-snapshot-row">
              <dt>{ui.settings.snapshotLabel.notebookLm}</dt>
              <dd>
                {controller().settings.notebookLmEnabled
                  ? ui.settings.snapshotValue.enabled
                  : ui.settings.snapshotValue.disabled}
              </dd>
            </div>
            <div class="runtime-snapshot-row">
              <dt>{ui.settings.snapshotLabel.notebookLmUrl}</dt>
              <dd title={controller().settings.notebookLmLaunchUrl}>
                {controller().shortUrlForUi(controller().settings.notebookLmLaunchUrl)}
              </dd>
            </div>
            <div class="runtime-snapshot-row">
              <dt>{ui.settings.snapshotLabel.fragmentLimit}</dt>
              <dd>{fmtSecondsSuffix(controller().settings.captureMaxSeconds)}</dd>
            </div>
            <div class="runtime-snapshot-row">
              <dt>{ui.settings.snapshotLabel.cardLanguage}</dt>
              <dd>{controller().alphaLanguageLabel(controller().settings.primaryLanguage)}</dd>
            </div>
            <div class="runtime-snapshot-row">
              <dt>{ui.settings.snapshotLabel.contextDraft}</dt>
              <dd>
                {controller().contextActive()
                  ? fmtContextDraftActive(controller().contextEntryCount())
                  : ui.settings.snapshotValue.empty}
              </dd>
            </div>
            <div class="runtime-snapshot-row">
              <dt>{ui.settings.snapshotLabel.appVersion}</dt>
              <dd>{controller().runtimeReadiness()?.appVersion ?? "—"}</dd>
            </div>
            <div class="runtime-snapshot-row">
              <dt>{ui.settings.snapshotLabel.settingsSchema}</dt>
              <dd>
                {controller().runtimeReadiness() != null
                  ? String(controller().runtimeReadiness()!.settingsSchemaVersion)
                  : "—"}
              </dd>
            </div>
            <div class="runtime-snapshot-row">
              <dt>{ui.settings.snapshotLabel.transcriptChars}</dt>
              <dd>
                {controller().runtimeReadiness()?.lastTranscriptCharCount != null
                  ? String(controller().runtimeReadiness()!.lastTranscriptCharCount)
                  : "—"}
              </dd>
            </div>
            <div class="runtime-snapshot-row">
              <dt>{ui.settings.snapshotLabel.localLog}</dt>
              <dd title={controller().logStatus()?.logPath ?? ui.settings.snapshotValue.notYetReceived}>
                {controller().logStatus()?.logPath
                  ? controller().shortUrlForUi(controller().logStatus()!.logPath, 42)
                  : ui.settings.snapshotValue.notYetReceived}
              </dd>
            </div>
            <div class="runtime-snapshot-row">
              <dt>{ui.settings.snapshotLabel.lastLine}</dt>
              <dd title={controller().logStatus()?.lastLine ?? ui.settings.snapshotValue.noEntries}>
                {controller().logStatus()?.lastLine
                  ? controller().shortUrlForUi(controller().logStatus()!.lastLine!, 52)
                  : ui.settings.snapshotValue.noEntries}
              </dd>
            </div>
            <div class="runtime-snapshot-row">
              <dt>{ui.settings.snapshotLabel.lastDebugWav}</dt>
              <dd title={controller().logStatus()?.lastDebugWavPath ?? ui.settings.snapshotValue.noEntries}>
                {controller().logStatus()?.lastDebugWavPath
                  ? controller().shortUrlForUi(controller().logStatus()!.lastDebugWavPath!, 42)
                  : ui.settings.snapshotValue.noEntries}
              </dd>
            </div>
          </dl>
          <div class="runtime-snapshot-actions">
            <button class="btn-secondary" type="button" onClick={() => void controller().copyLogPath()}>
              {ui.settings.copyLogPath}
            </button>
            <button
              class="btn-secondary"
              type="button"
              onClick={() => void controller().copyRuntimeReadinessJson()}
            >
              {ui.settings.copyReadinessJson}
            </button>
          </div>
        </div>

        <div class="settings-section settings-section--snapshot">
          <h3 class="settings-section-title">{ui.settings.supportTitle}</h3>
          <p class="settings-section-intro settings-section-intro--tight">
            {ui.settings.supportIntro}
          </p>
          <button
            class="btn-secondary"
            type="button"
            disabled={controller().diagnosticBusy()}
            onClick={() => void controller().collectSupportBundle()}
          >
            {controller().diagnosticBusy() ? ui.settings.collectingBundle : ui.settings.collectBundle}
          </button>
          <button
            class="btn-secondary"
            type="button"
            disabled={controller().diagnosticBusy()}
            onClick={() => void controller().collectTicketSupportPackage()}
          >
            {ui.settings.collectTicketPackage}
          </button>
          <Show when={controller().diagnosticLocalError()}>
            <p class="diagnostic-error" role="alert">
              {controller().diagnosticLocalError()}
            </p>
          </Show>
        </div>

        <div class="settings-section" id="settings-anchor-hotkey">
          <h3 class="settings-section-title">{ui.settings.hotkeySectionTitle}</h3>
          <p class="settings-section-intro">{ui.settings.hotkeySectionIntro}</p>
          <label class="field">
            <span class="field-label">{ui.settings.hotkeyLabel}</span>
            <span class="field-hint field-hint--tight">{ui.settings.hotkeyHint}</span>
            <input
              class="field-input"
              value={controller().settings.hotkey}
              onKeyDown={(event) => controller().captureHotkeyInput(event as KeyboardEvent)}
              onInput={(event) => controller().setHotkeyFromInput(event.currentTarget.value)}
            />
          </label>

          <label class="field">
            <span class="field-label">{ui.settings.captureMaxLabel}</span>
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
            <span class="field-hint">{ui.settings.captureMaxHint}</span>
          </label>
        </div>

        <div class="settings-section" id="settings-anchor-stt">
          <h3 class="settings-section-title">{ui.settings.sttSectionTitle}</h3>
          <p class="settings-section-intro">{ui.settings.sttSectionIntro}</p>
          <label class="field">
            <span class="field-label">
              {ui.settings.deepgramKeyLabel}{" "}
              {controller().deepgramSaved() ? <span class="saved-badge">{ui.settings.savedBadge}</span> : null}
            </span>
            <input
              class="field-input"
              type="password"
              value={controller().draftSecrets.deepgramApiKey}
              placeholder={controller().deepgramSaved() ? ui.settings.deepgramPlaceholderSaved : ui.settings.deepgramPlaceholderNew}
              onInput={(event) => controller().setDeepgramApiKeyDraft(event.currentTarget.value)}
            />
          </label>
        </div>

        <div class="settings-section" id="settings-anchor-llm">
          <h3 class="settings-section-title">{ui.settings.llmSectionTitle}</h3>
          <p class="settings-section-intro">{ui.settings.llmSectionIntro}</p>
          <label class="field">
            <span class="field-label">{ui.settings.llmBaseUrlLabel}</span>
            <input
              class="field-input"
              value={controller().settings.llmBaseUrl}
              onInput={(event) => controller().setLlmBaseUrl(event.currentTarget.value)}
            />
            <span class="field-hint">
              <code>{ui.settings.llmBaseUrlHint}</code>
            </span>
          </label>

          <label class="field">
            <span class="field-label">{ui.settings.llmModelLabel}</span>
            <input
              class="field-input"
              value={controller().settings.llmModel}
              onInput={(event) => controller().setLlmModel(event.currentTarget.value)}
            />
          </label>

          <label class="field">
            <span class="field-label">
              {ui.settings.llmKeyLabel}{" "}
              {controller().llmKeySaved() ? (
                <span class="saved-badge">{ui.settings.savedBadge}</span>
              ) : (
                <span class="saved-badge is-muted">{ui.settings.llmKeyIfNeeded}</span>
              )}
            </span>
            <input
              class="field-input"
              type="password"
              value={controller().draftSecrets.llmApiKey}
              placeholder={ui.settings.llmKeyPlaceholder}
              onInput={(event) => controller().setLlmApiKeyDraft(event.currentTarget.value)}
            />
          </label>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">{ui.settings.notebookLmSectionTitle}</h3>
          <p class="settings-section-intro">{ui.settings.notebookLmSectionIntro}</p>

          <label class="field-checkbox">
            <input
              type="checkbox"
              checked={controller().settings.notebookLmEnabled}
              onChange={(event) => controller().setNotebookLmEnabled(event.currentTarget.checked)}
            />
            <span>{ui.settings.notebookLmEnable}</span>
          </label>

          <label class="field">
            <span class="field-label">{ui.settings.notebookLmUrlLabel}</span>
            <input
              class="field-input"
              value={controller().settings.notebookLmLaunchUrl}
              onInput={(event) => controller().setNotebookLmLaunchUrl(event.currentTarget.value)}
            />
            <span class="field-hint">{ui.settings.notebookLmUrlHint}</span>
          </label>

          <div class="runtime-snapshot-actions">
            <button
              class="btn-secondary"
              type="button"
              disabled={!controller().notebookLmLaunchReady()}
              onClick={() => void controller().openNotebookLm()}
            >
              {ui.settings.openNotebookLm}
            </button>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">{ui.advanced.sectionTitle}</h3>

          <label class="field">
            <span class="field-label">{ui.advanced.customPromptLabel}</span>
            <textarea
              class="field-input field-textarea"
              rows={4}
              value={controller().settings.customSystemPrompt ?? ""}
              onInput={(e) => {
                const val = e.currentTarget.value.trim() || null;
                controller().setCustomSystemPrompt(val);
              }}
            />
            <span class="field-hint">{ui.advanced.customPromptHint}</span>
          </label>

          <label class="field-checkbox">
            <input
              type="checkbox"
              checked={controller().settings.useStreamingStt}
              onChange={(e) => controller().setUseStreamingStt(e.currentTarget.checked)}
            />
            <span>{ui.advanced.streamingSttLabel}</span>
          </label>

          <Show when={import.meta.env.DEV}>
            <div class="dev-fixture-panel">
              <p class="field-label">{ui.advanced.devFixtureTitle}</p>
              <p class="field-hint field-hint--tight">{ui.advanced.devFixtureIntro}</p>
              <div class="dev-fixture-row">
                <select
                  class="field-input dev-fixture-select"
                  value={devFixtureId()}
                  onChange={(e) => setDevFixtureId(e.currentTarget.value)}
                >
                  <For each={fixtureSnippets}>{(row) => <option value={row.id}>{row.id}</option>}</For>
                </select>
                <button
                  class="btn-secondary"
                  type="button"
                  disabled={controller().devFixtureBusy() || !devFixtureId()}
                  onClick={() => void controller().runDevFixtureAnalysis(devFixtureId())}
                >
                  {controller().devFixtureBusy() ? ui.advanced.devFixtureBusy : ui.advanced.devFixtureRun}
                </button>
              </div>
            </div>
          </Show>
        </div>

        <div class="settings-section" id="settings-anchor-memory">
          <h3 class="settings-section-title">{ui.memory.sectionTitle}</h3>
          <p class="settings-section-intro">{ui.memory.sectionIntro}</p>

          <Show
            when={controller().memorySpaces().length > 0}
            fallback={<p class="settings-memory-empty">{ui.memory.noSpaces}</p>}
          >
            <div class="memory-space-list">
              <label class="field">
                <span class="field-label">{ui.memory.selectSpace}</span>
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
                <div class="memory-saved-card-preview" role="region" aria-label={ui.memory.lastSavedFromCard}>
                  <p class="field-hint field-hint--tight">{ui.memory.lastSavedFromCard}</p>
                  <p class="memory-saved-card-text">{controller().memorySavedCardPreview()}</p>
                  <button
                    class="btn-ghost"
                    type="button"
                    onClick={() => void controller().removeLastSavedCardFromMemory()}
                  >
                    {ui.memory.removeLastSavedCard}
                  </button>
                </div>
              </Show>
            </div>
          </Show>

          <MemorySpaceCreator controller={controller()} />
        </div>

        <Show when={controller().settingsFormHint()}>
          <div class="settings-form-hint" role="alert">
            {controller().settingsFormHint()}
          </div>
        </Show>

        <div
          class="settings-actions"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !controller().saving()) {
              e.preventDefault();
              void controller().persistSettings();
            }
          }}
        >
          <button
            class="btn-primary"
            type="button"
            disabled={controller().saving()}
            onClick={() => void controller().persistSettings()}
          >
            {controller().saving() ? ui.settings.saving : ui.settings.save}
          </button>
          <button class="btn-ghost" type="button" onClick={() => controller().openMainPanel()}>
            {ui.settings.toCard}
          </button>
        </div>
      </section>
    </Show>
  );
}

function MemorySpaceCreator(props: { controller: ReplylineController }) {
  const [label, setLabel] = createSignal("");
  const [kind, setKind] = createSignal<"team" | "thread" | "contact">("team");

  async function handleCreate() {
    const name = label().trim();
    if (!name) return;
    await props.controller.createMemorySpace(name, kind());
    setLabel("");
  }

  return (
    <div class="memory-create-row">
      <input
        class="field-input memory-create-input"
        placeholder={ui.memory.createLabel}
        value={label()}
        onInput={(e) => setLabel(e.currentTarget.value)}
      />
      <select
        class="field-input memory-create-kind"
        value={kind()}
        onChange={(e) => setKind(e.currentTarget.value as "team" | "thread" | "contact")}
      >
        <option value="team">{ui.memory.kindTeam}</option>
        <option value="thread">{ui.memory.kindThread}</option>
        <option value="contact">{ui.memory.kindContact}</option>
      </select>
      <button class="btn-secondary" type="button" disabled={!label().trim()} onClick={() => void handleCreate()}>
        {ui.memory.createButton}
      </button>
    </div>
  );
}
