import { For, Show, createMemo } from "solid-js";
import type { ReplylineController } from "../controller";
import { mapSetupStepToSection } from "./helpers";

export function SetupFocusState(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  const steps = createMemo(() => controller().setupSteps());
  const readyCount = createMemo(() => steps().filter((s) => s.ready).length);
  const totalCount = createMemo(() => steps().length);
  const allReady = createMemo(() => readyCount() === totalCount());
  const missingSteps = createMemo(() => steps().filter((step) => !step.ready));
  const firstMissingSection = createMemo(() => {
    const first = missingSteps()[0];
    return first ? mapSetupStepToSection(first.label) : undefined;
  });

  const progressText = createMemo(() => {
    const tpl = st().setup.setupProgress;
    return tpl.replace("{{done}}", String(readyCount())).replace("{{total}}", String(totalCount()));
  });

  return (
    <section class="setup-focus-state" data-testid="main-state-setup">
      <h2 class="setup-focus-title">{st().setup.wizardTitle}</h2>
      <p class="setup-focus-subtitle" data-testid="setup-overall-hint">
        {st().setup.focusSubtitle}
      </p>
      <p class="setup-progress" data-testid="setup-progress">
        {progressText()}
      </p>
      <ul class="setup-focus-list" data-testid="setup-focus-list">
        <For each={steps()}>
          {(step) => (
            <li class={`setup-focus-row ${step.ready ? "is-ready" : "is-missing"}`}>
              <div class="setup-focus-copy">
                <strong>{step.label}</strong>
                <span class="empty-flow-hint">
                  {step.ready ? step.readyLabel : step.missingLabel}
                </span>
                <p class="setup-focus-why" data-testid={`setup-why-${step.label}`}>
                  {step.label.startsWith("1.")
                    ? st().setup.whySpeech
                    : step.label.startsWith("2.")
                      ? st().setup.whyLlm
                      : st().setup.whyHotkey}
                </p>
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
        <Show
          when={!allReady()}
          fallback={
            <>
              <button
                class="btn-primary"
                data-testid="setup-create-context-cta"
                type="button"
                onClick={() => controller().openContextPackPanel()}
              >
                {st().setup.setupActionCreateContext}
              </button>
              <button
                class="btn-secondary"
                data-testid="setup-start-empty-cta"
                type="button"
                onClick={() => controller().openMainPanel()}
              >
                {st().setup.setupActionStartEmpty}
              </button>
            </>
          }
        >
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
        </Show>
      </div>
      <Show when={controller().setupTroubleCount() >= 2}>
        <p class="empty-flow-hint">{st().settings.setupSmokeReportHint}</p>
      </Show>
      <p class="empty-flow-hint">{st().setup.focusLocalStorageHint}</p>
    </section>
  );
}
