import { For, Show, createMemo } from "solid-js";
import type { ReplylineController } from "../controller";
import { mapSetupStepToSection } from "./helpers";

export function SetupFocusState(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const missingSteps = createMemo(() =>
    controller()
      .setupSteps()
      .filter((step) => !step.ready),
  );
  const firstMissingSection = createMemo(() => {
    const first = missingSteps()[0];
    return first ? mapSetupStepToSection(first.label) : undefined;
  });

  return (
    <section class="setup-focus-state" data-testid="main-state-setup">
      <h2 class="setup-focus-title">{st().setup.wizardTitle}</h2>
      <p class="setup-focus-subtitle" data-testid="setup-overall-hint">
        {st().setup.focusSubtitle}
      </p>
      <ul class="setup-focus-list" data-testid="setup-focus-list">
        <For each={controller().setupSteps()}>
          {(step) => (
            <li class={`setup-focus-row ${step.ready ? "is-ready" : "is-missing"}`}>
              <div class="setup-focus-copy">
                <strong>{step.label}</strong>
                <span class="empty-flow-hint">
                  {step.ready ? step.readyLabel : step.missingLabel}
                </span>
              </div>
              <span>{step.ready ? st().settings.statusReady : st().settings.statusMissing}</span>
              <button
                class="btn-ghost btn-compact"
                type="button"
                onClick={() => controller().openSettingsPanel(mapSetupStepToSection(step.label))}
              >
                {st().settings.openStep}
              </button>
            </li>
          )}
        </For>
      </ul>
      <div class="action-group">
        <button
          class="btn-primary"
          data-testid="setup-first-missing-cta"
          type="button"
          onClick={() => controller().openSettingsPanel(firstMissingSection())}
        >
          {st().settings.openFirstMissing}
        </button>
        <button
          class="btn-secondary"
          type="button"
          onClick={() => void controller().checkRuntimeConfig()}
        >
          {st().settings.runCheck}
        </button>
        <button class="btn-ghost" type="button" onClick={() => controller().openSettingsPanel()}>
          {st().settings.openSettings}
        </button>
        <Show when={controller().setupTroubleCount() >= 2}>
          <button
            class="btn-ghost"
            type="button"
            onClick={() => void controller().copySetupIssueHint()}
          >
            {st().settings.copyIssueHint}
          </button>
        </Show>
      </div>
      <Show when={controller().setupTroubleCount() >= 2}>
        <p class="empty-flow-hint">{st().settings.setupSmokeReportHint}</p>
      </Show>
      <p class="empty-flow-hint">{st().setup.focusLocalStorageHint}</p>
    </section>
  );
}
