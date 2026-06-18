import type { ReplylineController } from "../controller";
import {
  setupStatusClass,
  setupStatusLabel,
  type SetupStatusTone,
} from "../settings/settingsViewModel";

export function HotkeySection(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();

  const status = (): SetupStatusTone => {
    const setupSteps = controller().setupSteps();
    const runtimeResult = controller().runtimeCheckResult();
    const ready = setupSteps[2]?.ready ?? false;
    if (!ready) return "missing";
    if (controller().hotkeyFailed()) return "check_failed";
    if (runtimeResult && !runtimeResult.settings.ok) return "check_failed";
    return runtimeResult?.settings.ok ? "ready" : "configured";
  };

  return (
    <article
      id="settings-panel-hotkey"
      class="settings-section-card section-card"
      data-testid="settings-section-hotkey"
    >
      <h3 class="settings-section-title">
        {st().settings.navHotkey}{" "}
        <span class={setupStatusClass(status())}>{setupStatusLabel(st(), status())}</span>
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
          onInput={(event) => controller().setCaptureMaxSecondsFromInput(event.currentTarget.value)}
        />
      </label>
    </article>
  );
}
