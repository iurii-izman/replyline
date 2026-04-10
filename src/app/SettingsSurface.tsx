import { For, Show, createEffect, createSignal } from "solid-js";

import type { ReplylineController } from "./controller";
import { fmtContextDraftActive, fmtSecondsSuffix } from "./locale";
import fixtureSnippets from "../../fixtures/ru-work-snippets.json";

export function SettingsSurface(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();
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
              <dt>{st().settings.snapshotLabel.notebookLm}</dt>
              <dd>
                {controller().settings.notebookLmEnabled
                  ? st().settings.snapshotValue.enabled
                  : st().settings.snapshotValue.disabled}
              </dd>
            </div>
            <div class="runtime-snapshot-row">
              <dt>{st().settings.snapshotLabel.notebookLmUrl}</dt>
              <dd title={controller().settings.notebookLmLaunchUrl}>
                {controller().shortUrlForUi(controller().settings.notebookLmLaunchUrl)}
              </dd>
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

        <div class="settings-section" id="settings-anchor-hotkey">
          <h3 class="settings-section-title">{st().settings.hotkeySectionTitle}</h3>
          <p class="settings-section-intro">{st().settings.hotkeySectionIntro}</p>
          <label class="field">
            <span class="field-label">{st().settings.hotkeyLabel}</span>
            <span class="field-hint field-hint--tight">{st().settings.hotkeyHint}</span>
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
            <span class="field-hint">{st().settings.captureMaxHint}</span>
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
              onInput={(event) => controller().setLlmBaseUrl(event.currentTarget.value)}
            />
            <span class="field-hint">
              <code>{st().settings.llmBaseUrlHint}</code>
            </span>
          </label>

          <label class="field">
            <span class="field-label">{st().settings.llmModelLabel}</span>
            <input
              class="field-input"
              value={controller().settings.llmModel}
              onInput={(event) => controller().setLlmModel(event.currentTarget.value)}
            />
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

        <div class="settings-section">
          <h3 class="settings-section-title">{st().settings.notebookLmSectionTitle}</h3>
          <p class="settings-section-intro">{st().settings.notebookLmSectionIntro}</p>

          <label class="field-checkbox">
            <input
              type="checkbox"
              checked={controller().settings.notebookLmEnabled}
              onChange={(event) => controller().setNotebookLmEnabled(event.currentTarget.checked)}
            />
            <span>{st().settings.notebookLmEnable}</span>
          </label>

          <label class="field">
            <span class="field-label">{st().settings.notebookLmUrlLabel}</span>
            <input
              class="field-input"
              value={controller().settings.notebookLmLaunchUrl}
              onInput={(event) => controller().setNotebookLmLaunchUrl(event.currentTarget.value)}
            />
            <span class="field-hint">{st().settings.notebookLmUrlHint}</span>
          </label>

          <div class="runtime-snapshot-actions">
            <button
              class="btn-secondary"
              type="button"
              disabled={!controller().notebookLmLaunchReady()}
              onClick={() => void controller().openNotebookLm()}
            >
              {st().settings.openNotebookLm}
            </button>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">{st().advanced.sectionTitle}</h3>

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
            {controller().saving() ? st().settings.saving : st().settings.save}
          </button>
          <button class="btn-ghost" type="button" onClick={() => controller().openMainPanel()}>
            {st().settings.toCard}
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
        placeholder={st().memory.createLabel}
        value={label()}
        onInput={(e) => setLabel(e.currentTarget.value)}
      />
      <select
        class="field-input memory-create-kind"
        value={kind()}
        onChange={(e) => setKind(e.currentTarget.value as "team" | "thread" | "contact")}
      >
        <option value="team">{st().memory.kindTeam}</option>
        <option value="thread">{st().memory.kindThread}</option>
        <option value="contact">{st().memory.kindContact}</option>
      </select>
      <button
        class="btn-secondary"
        type="button"
        disabled={!label().trim()}
        onClick={() => void handleCreate()}
      >
        {st().memory.createButton}
      </button>
    </div>
  );
}
