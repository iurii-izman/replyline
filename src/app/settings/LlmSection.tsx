import { For, Show } from "solid-js";
import type { ReplylineController } from "../controller";
import { ANSWER_PROFILE_OPTIONS, resolveAnswerProfileOption } from "../answerProfiles";
import { MODEL_PRESETS, resolveModelPreset } from "../modelPresets";
import { setupStatusClass, setupStatusLabel, type SetupStatusTone } from "../settings/settingsViewModel";

export function LlmSection(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const selectedPreset = () => resolveModelPreset(controller().settings.selectedModelPreset);

  const status = (): SetupStatusTone => {
    const setupSteps = controller().setupSteps();
    const runtimeResult = controller().runtimeCheckResult();
    const ready = setupSteps[1]?.ready ?? false;
    if (!ready) return "missing";
    if (runtimeResult && !runtimeResult.llm.ok) return "check_failed";
    return runtimeResult?.llm.ok ? "ready" : "needs_check";
  };

  return (
    <article id="settings-panel-llm" class="settings-section-card section-card" data-testid="settings-section-llm">
      <h3 class="settings-section-title">
        {st().settings.navLlm}{" "}
        <span class={setupStatusClass(status())}>{setupStatusLabel(st(), status())}</span>
      </h3>
      <p class="settings-section-hint">{st().settings.llmSectionHint}</p>
      <p class="settings-note">{st().setup.llmHint}</p>

      <div class="settings-form-stack">
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
              {st().settings.modelPresetPrimary}: {selectedPreset().primaryModel || "manual"}
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
            onInput={(event) => controller().setActiveAnswerProfile(event.currentTarget.value)}
          >
            <For each={ANSWER_PROFILE_OPTIONS}>{(p) => <option value={p.id}>{p.title}</option>}</For>
          </select>
          <span class="field-help">
            {resolveAnswerProfileOption(controller().settings.activeAnswerProfile).description}
          </span>
        </label>

        <label class="field">
          <span class="field-label">
            {st().settings.llmKeyLabel}{" "}
            {controller().llmKeySaved() ? <span class="saved-badge">{st().settings.savedBadge}</span> : null}
          </span>
          <input
            class={`field-input ${controller().llmKeySaved() && !controller().draftSecrets.llmApiKey ? "field-input-secret-saved" : ""}`}
            type="password"
            value={controller().draftSecrets.llmApiKey}
            onInput={(event) => controller().setLlmApiKeyDraft(event.currentTarget.value)}
          />
        </label>
      </div>
    </article>
  );
}
