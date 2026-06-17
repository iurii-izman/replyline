import type { ReplylineController } from "../controller";
import { setupStatusClass, setupStatusLabel, type SetupStatusTone } from "../settings/settingsViewModel";

export function SpeechSection(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  const status = (): SetupStatusTone => {
    const runtimeResult = controller().runtimeCheckResult();
    if (!controller().deepgramSaved()) return "missing";
    if (runtimeResult && !runtimeResult.stt.ok) return "check_failed";
    return runtimeResult?.stt.ok ? "ready" : "configured";
  };

  return (
    <article
      id="settings-panel-speech"
      class="settings-section-card section-card settings-section-card--compact"
      data-testid="settings-section-speech"
    >
      <h3 class="settings-section-title">
        {st().settings.navSpeech}{" "}
        <span class={setupStatusClass(status())}>{setupStatusLabel(st(), status())}</span>
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
            controller().deepgramSaved() && !controller().draftSecrets.deepgramApiKey ? "field-input-secret-saved" : ""
          }`}
          type="password"
          placeholder={controller().deepgramSaved() ? st().setup.sttReady : st().setup.sttMissing}
          value={controller().draftSecrets.deepgramApiKey}
          onInput={(event) => controller().setDeepgramApiKeyDraft(event.currentTarget.value)}
        />
      </label>
    </article>
  );
}
