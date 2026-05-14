import { Show } from "solid-js";
import type { ReplylineController } from "./controller";

export function SettingsSurface(props: { controller: ReplylineController }) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  return (
    <Show when={controller().panel() === "settings"}>
      <section class="settings-card">
        <h2 class="section-title">{st().settings.title}</h2>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!controller().saving()) void controller().persistSettings();
          }}
        >
          <label class="field">
            <span class="field-label">{st().settings.hotkeyLabel}</span>
            <input class="field-input" value={controller().settings.hotkey} onKeyDown={(event) => controller().captureHotkeyInput(event as KeyboardEvent)} onInput={(event) => controller().setHotkeyFromInput(event.currentTarget.value)} />
          </label>

          <label class="field">
            <span class="field-label">{st().settings.captureMaxLabel}</span>
            <input class="field-input" type="number" min="5" max="180" value={String(controller().settings.captureMaxSeconds)} onInput={(event) => controller().setCaptureMaxSecondsFromInput(event.currentTarget.value)} />
          </label>

          <label class="field">
            <span class="field-label">{st().settings.deepgramKeyLabel} {controller().deepgramSaved() ? <span class="saved-badge">{st().settings.savedBadge}</span> : null}</span>
            <input class="field-input" type="password" value={controller().draftSecrets.deepgramApiKey} onInput={(event) => controller().setDeepgramApiKeyDraft(event.currentTarget.value)} />
          </label>

          <label class="field">
            <span class="field-label">{st().settings.llmBaseUrlLabel}</span>
            <input class="field-input" value={controller().settings.llmBaseUrl} onInput={(event) => controller().setLlmBaseUrl(event.currentTarget.value)} />
          </label>

          <label class="field">
            <span class="field-label">{st().settings.llmModelLabel}</span>
            <input class="field-input" value={controller().settings.llmModel} onInput={(event) => controller().setLlmModel(event.currentTarget.value)} />
          </label>

          <label class="field">
            <span class="field-label">{st().settings.llmKeyLabel} {controller().llmKeySaved() ? <span class="saved-badge">{st().settings.savedBadge}</span> : null}</span>
            <input class="field-input" type="password" value={controller().draftSecrets.llmApiKey} onInput={(event) => controller().setLlmApiKeyDraft(event.currentTarget.value)} />
          </label>

          <Show when={controller().settingsFormHint()}>
            <div class="settings-form-hint" role="alert">{controller().settingsFormHint()}</div>
          </Show>

          <div class="settings-actions">
            <button class="btn-primary" type="submit" disabled={controller().saving()}>{controller().saving() ? st().settings.saving : st().settings.save}</button>
            <button class="btn-ghost" type="button" onClick={() => controller().openMainPanel()}>{st().settings.back}</button>
          </div>
        </form>
      </section>
    </Show>
  );
}
