import { Show } from "solid-js";
import type { ReplylineController } from "../controller";
import { setupStatusClass, setupStatusLabel, type SetupStatusTone } from "../settings/settingsViewModel";

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
    <article id="settings-panel-hotkey" class="settings-section-card section-card" data-testid="settings-section-hotkey">
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

      <label class="field field-checkbox-row settings-checkbox-row" data-testid="hotkey-compact-row">
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
              onInput={(event) => controller().setBilingualInterviewEnabled(event.currentTarget.checked)}
            />
            <span class="field-label">{st().settings.bilingualInterviewEnabledLabel}</span>
          </label>

          <label class="field field-checkbox-row settings-checkbox-row">
            <input
              type="checkbox"
              aria-label={st().settings.liveTranslationEnabledLabel}
              checked={controller().settings.liveTranslationEnabled}
              onInput={(event) => controller().setLiveTranslationEnabled(event.currentTarget.checked)}
            />
            <span class="field-label">{st().settings.liveTranslationEnabledLabel}</span>
          </label>

          <p class="settings-note settings-note-warning">{st().settings.bilingualInterviewDisclaimer}</p>
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
            onInput={(event) => controller().setHideToTrayOnClose(event.currentTarget.checked)}
          />
          <span class="field-label">{st().settings.hideToTrayOnCloseLabel}</span>
          <span class="field-help">{st().settings.hideToTrayOnCloseHint}</span>
        </label>

        <label class="field field-checkbox-row settings-checkbox-row">
          <input
            type="checkbox"
            aria-label={st().settings.keepOnTopDuringCaptureLabel}
            checked={controller().settings.keepOnTopDuringCapture}
            onInput={(event) => controller().setKeepOnTopDuringCapture(event.currentTarget.checked)}
          />
          <span class="field-label">{st().settings.keepOnTopDuringCaptureLabel}</span>
          <span class="field-help">{st().settings.keepOnTopDuringCaptureHint}</span>
        </label>
      </section>
    </article>
  );
}
