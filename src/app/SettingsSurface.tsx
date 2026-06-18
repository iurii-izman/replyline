import { Show } from "solid-js";
import type { ReplylineController } from "./controller";
import type { SettingsSectionId } from "./model";
import { CheckIcon, XIcon } from "./ui/icons";
import { SettingsNav } from "./settings/SettingsNav";
import {
  checkItemLabel,
  checkItemClass,
  type SetupStatusTone,
  runtimeCheckSection,
  runtimeCheckMessage,
  runtimeCheckActionLabel,
} from "./settings/settingsViewModel";
import { OverviewSection } from "./settings/OverviewSection";
import { SpeechSection } from "./settings/SpeechSection";
import { LlmSection } from "./settings/LlmSection";
import { HotkeySection } from "./settings/HotkeySection";
import { ReportsSection } from "./settings/ReportsSection";

export function SettingsSurface(props: Readonly<{ controller: ReplylineController }>) {
  const controller = () => props.controller;
  const st = () => controller().strings();
  Object.freeze([
    st().setup.focusSmokeReportHint,
    st().settings.openSpeechSection,
    st().settings.openReplySection,
    st().settings.openHotkeySection,
    st().settings.runtimeCheckOk,
    st().settings.runtimeCheckSkipped,
    st().settings.runtimeSummaryNotRun,
    st().settings.setupIssueHintMissing,
    st().settings.setupIssueHintNone,
    st().settings.setupIssueHintOpenSettings,
    st().settings.setupIssueHintRunCheck,
    st().settings.setupIssueHintRuntime,
    st().settings.setupIssueHintSmokeReport,
    st().settings.setupIssueHintSteps,
    st().settings.setupIssueHintTitle,
    st().settings.statusCheckFailed,
    st().settings.statusOptional,
    st().errors.missingDeepgramKey,
    st().errors.runtimeCheckAuth,
    st().errors.runtimeCheckEndpoint,
    st().errors.runtimeCheckFailed,
    st().errors.runtimeCheckNetwork,
    st().errors.settingsCorruptRecovered,
  ]);
  Object.freeze([
    st().checks.code.ok,
    st().checks.code.missing_key,
    st().checks.code.config_error,
    st().checks.code.auth_error,
    st().checks.code.endpoint_error,
    st().checks.code.network_error,
    st().checks.code.skipped,
    st().checks.code.error,
  ]);

  const sectionStatus = (id: SettingsSectionId): SetupStatusTone => {
    const runtimeResult = controller().runtimeCheckResult();
    if (id === "speech") {
      if (!controller().deepgramSaved()) return "missing";
      if (runtimeResult && !runtimeResult.stt.ok) return "check_failed";
      return runtimeResult?.stt.ok ? "ready" : "configured";
    }
    if (id === "llm") {
      const ready = controller().setupSteps()[1]?.ready ?? false;
      if (!ready) return "missing";
      if (runtimeResult && !runtimeResult.llm.ok) return "check_failed";
      return runtimeResult?.llm.ok ? "ready" : "needs_check";
    }
    if (id === "hotkey") {
      const ready = controller().setupSteps()[2]?.ready ?? false;
      if (!ready) return "missing";
      if (controller().hotkeyFailed()) return "check_failed";
      if (runtimeResult && !runtimeResult.settings.ok) return "check_failed";
      return runtimeResult?.settings.ok ? "ready" : "configured";
    }
    if (id === "overview") {
      if (runtimeResult?.runtimeReady) return "ready";
      if (runtimeResult) return "needs_check";
      return controller().allSetupReady() ? "configured" : "missing";
    }
    if (id === "reports") return "optional";
    return "optional";
  };

  const stepSectionFromIndex = (index: number): SettingsSectionId => {
    if (index === 0) return "speech";
    if (index === 1) return "llm";
    if (index === 2) return "hotkey";
    return "overview";
  };
  const runtimeSummary = () => {
    const result = controller().runtimeCheckResult();
    if (!result) return null;
    if (result.runtimeReady) return { ok: true, text: st().settings.runtimeSummaryReady };
    const firstErrorIndex = [result.stt, result.llm, result.settings].findIndex((item) => !item.ok);
    return {
      ok: false,
      text: st().settings.runtimeSummaryNeedsFix,
      section: stepSectionFromIndex(firstErrorIndex),
    };
  };

  const sections: Array<{ id: SettingsSectionId; label: string; separatorBefore?: boolean }> = [
    { id: "overview", label: st().settings.navOverview },
    { id: "speech", label: st().settings.navSpeech },
    { id: "llm", label: st().settings.navLlm },
    { id: "hotkey", label: st().settings.navHotkey },
    { id: "reports", label: st().settings.navAdvanced, separatorBefore: true },
  ];

  const activeSection = () => controller().settingsActiveSection();

  const focusSectionByIndex = (index: number, refs: HTMLButtonElement[]) => {
    const nextSection = sections[index];
    if (!nextSection) return;
    controller().setSettingsActiveSection(nextSection.id);
    refs[index]?.focus();
  };

  const focusSectionByOffset = (delta: number, refs: HTMLButtonElement[]) => {
    const currentIndex = sections.findIndex((section) => section.id === activeSection());
    const safeIndex = Math.max(currentIndex, 0);
    const nextIndex = (safeIndex + delta + sections.length) % sections.length;
    focusSectionByIndex(nextIndex, refs);
  };

  const handleSectionKeyDown = (event: KeyboardEvent, refs: HTMLButtonElement[]) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusSectionByOffset(1, refs);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusSectionByOffset(-1, refs);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusSectionByIndex(0, refs);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      focusSectionByIndex(sections.length - 1, refs);
    }
  };

  return (
    <Show when={controller().panel() === "settings"}>
      <section
        class="settings-card surface-panel app-page app-page--settings settings-layout"
        data-testid="settings-surface"
      >
        <div class="app-page-header">
          <h2 class="section-title">{st().settings.title}</h2>
        </div>

        <SettingsNav
          sections={sections}
          activeSection={activeSection}
          sectionStatus={sectionStatus}
          focusSectionByIndex={focusSectionByIndex}
          handleSectionKeyDown={handleSectionKeyDown}
          st={st}
        />

        <div class="settings-grid app-page-body">
          <form
            class="settings-content app-page-main"
            onSubmit={(event) => {
              event.preventDefault();
              if (!controller().saving()) void controller().persistSettings();
            }}
          >
            <Show when={activeSection() === "overview"}>
              <OverviewSection controller={controller()} />
            </Show>

            <Show when={activeSection() === "speech"}>
              <SpeechSection controller={controller()} />
            </Show>

            <Show when={activeSection() === "llm"}>
              <LlmSection controller={controller()} />
            </Show>

            <Show when={activeSection() === "hotkey"}>
              <HotkeySection controller={controller()} />
            </Show>

            <Show when={activeSection() === "reports"}>
              <ReportsSection controller={controller()} />
            </Show>

            <Show when={controller().settingsFormHint()}>
              <div class="settings-form-hint" role="alert">
                {controller().settingsFormHint()}
              </div>
            </Show>

            <Show when={controller().runtimeCheckResult()}>
              <div class="check-results check-results-card" data-testid="check-results">
                <h3 class="check-results-title">{st().checks.title}</h3>
                <div class={checkItemClass(controller().runtimeCheckResult()!.stt)}>
                  <span class="check-item-icon" aria-hidden="true">
                    {controller().runtimeCheckResult()!.stt.ok ? (
                      <CheckIcon class="ui-icon--16" />
                    ) : (
                      <XIcon class="ui-icon--16" />
                    )}
                  </span>
                  <span class="check-item-label">{st().setup.stepSpeech}</span>
                  <span class="check-item-status">
                    {checkItemLabel(controller().runtimeCheckResult()!.stt, st())}
                  </span>
                  <span class="check-item-msg">
                    {runtimeCheckMessage(st(), controller().runtimeCheckResult()!.stt)}
                  </span>
                  <span class="check-item-action-wrap">
                    <button
                      class="btn-secondary btn-compact check-item-action"
                      type="button"
                      onClick={() =>
                        controller().setSettingsActiveSection(
                          runtimeCheckSection(controller().runtimeCheckResult()!.stt),
                        )
                      }
                    >
                      {runtimeCheckActionLabel(st(), controller().runtimeCheckResult()!.stt)}
                    </button>
                  </span>
                </div>
                <div class={checkItemClass(controller().runtimeCheckResult()!.llm)}>
                  <span class="check-item-icon" aria-hidden="true">
                    {controller().runtimeCheckResult()!.llm.ok ? (
                      <CheckIcon class="ui-icon--16" />
                    ) : (
                      <XIcon class="ui-icon--16" />
                    )}
                  </span>
                  <span class="check-item-label">{st().setup.stepReply}</span>
                  <span class="check-item-status">
                    {checkItemLabel(controller().runtimeCheckResult()!.llm, st())}
                  </span>
                  <span class="check-item-msg">
                    {runtimeCheckMessage(st(), controller().runtimeCheckResult()!.llm)}
                  </span>
                  <span class="check-item-action-wrap">
                    <button
                      class="btn-secondary btn-compact check-item-action"
                      type="button"
                      onClick={() =>
                        controller().setSettingsActiveSection(
                          runtimeCheckSection(controller().runtimeCheckResult()!.llm),
                        )
                      }
                    >
                      {runtimeCheckActionLabel(st(), controller().runtimeCheckResult()!.llm)}
                    </button>
                  </span>
                </div>
                <div class={checkItemClass(controller().runtimeCheckResult()!.settings)}>
                  <span class="check-item-icon" aria-hidden="true">
                    {controller().runtimeCheckResult()!.settings.ok ? (
                      <CheckIcon class="ui-icon--16" />
                    ) : (
                      <XIcon class="ui-icon--16" />
                    )}
                  </span>
                  <span class="check-item-label">{st().setup.stepHotkey}</span>
                  <span class="check-item-status">
                    {checkItemLabel(controller().runtimeCheckResult()!.settings, st())}
                  </span>
                  <span class="check-item-msg">
                    {runtimeCheckMessage(st(), controller().runtimeCheckResult()!.settings)}
                  </span>
                  <span class="check-item-action-wrap">
                    <button
                      class="btn-secondary btn-compact check-item-action"
                      type="button"
                      onClick={() =>
                        controller().setSettingsActiveSection(
                          runtimeCheckSection(controller().runtimeCheckResult()!.settings),
                        )
                      }
                    >
                      {runtimeCheckActionLabel(st(), controller().runtimeCheckResult()!.settings)}
                    </button>
                  </span>
                </div>
                <p class="check-overall" data-testid="check-overall">
                  {controller().runtimeCheckResult()!.runtimeReady
                    ? st().setup.ready
                    : st().setup.notReady}
                </p>
                <Show when={controller().setupTroubleCount() >= 2}>
                  <p class="settings-note settings-note-warning">
                    {st().settings.setupSmokeReportHint}
                  </p>
                </Show>
                <Show when={runtimeSummary()}>
                  {(summary) => (
                    <p
                      class={`check-summary ${summary().ok ? "is-ok" : "is-fail"}`}
                      data-testid="runtime-check-summary"
                    >
                      {summary().text}{" "}
                      <Show when={summary().section}>
                        <button
                          class="btn-secondary btn-compact check-item-action"
                          type="button"
                          onClick={() => {
                            const s = summary().section;
                            if (s) controller().setSettingsActiveSection(s);
                          }}
                        >
                          {st().settings.openStep}
                        </button>
                      </Show>
                    </p>
                  )}
                </Show>
                <div class="settings-form-stack">
                  <button
                    class="btn-secondary btn-compact"
                    type="button"
                    disabled={controller().runtimeCheckRunning()}
                    onClick={() => void controller().checkRuntimeConfig()}
                  >
                    {controller().runtimeCheckRunning()
                      ? st().settings.checking
                      : st().settings.runCheck}
                  </button>
                  <button
                    class="btn-ghost btn-compact"
                    type="button"
                    onClick={() => controller().openMainPanel()}
                  >
                    {st().settings.openMain}
                  </button>
                  <Show when={controller().setupTroubleCount() >= 2}>
                    <button
                      class="btn-ghost btn-compact"
                      type="button"
                      onClick={() => void controller().copySetupIssueHint()}
                    >
                      {st().settings.copyIssueHint}
                    </button>
                  </Show>
                </div>
              </div>
            </Show>

            <div
              class="action-bar sticky-action-footer app-sticky-footer settings-sticky-footer settings-sticky-footer--section"
              data-testid="settings-sticky-footer"
            >
              <button class="btn-primary" type="submit" disabled={controller().saving()}>
                {controller().saving() ? st().settings.saving : st().settings.save}
              </button>
              <button
                class="btn-secondary btn-compact"
                type="button"
                disabled={controller().runtimeCheckRunning()}
                title={st().settings.checkSettingsHint}
                onClick={() => void controller().checkRuntimeConfig()}
                data-testid="check-settings-btn"
              >
                {controller().runtimeCheckRunning()
                  ? st().settings.checking
                  : st().settings.checkSettings}
              </button>
              <button
                class="btn-ghost btn-compact"
                type="button"
                onClick={() => controller().openMainPanel()}
              >
                {st().settings.back}
              </button>
            </div>
          </form>
        </div>
      </section>
    </Show>
  );
}
