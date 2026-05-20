import { For, Show, createMemo, createSignal } from "solid-js";
import type { ReplylineController } from "./controller";
import type { UiStrings } from "./locale";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from "./ui/icons";

type CandidatePackStudioProps = {
  controller: ReplylineController;
  st: UiStrings;
};

type StudioSectionId =
  | "summary"
  | "roleCompany"
  | "resumeFacts"
  | "requirements"
  | "constraints"
  | "preferredExamples";

export function CandidatePackStudio(props: CandidatePackStudioProps) {
  const controller = () => props.controller;
  const st = () => props.st;
  Object.freeze([
    st().settings.candidatePackTitle,
    st().settings.prepTitle,
    st().settings.previewTitle,
  ]);

  const hasSourceInputs = createMemo(
    () =>
      Boolean(controller().candidateRawResume().trim()) ||
      Boolean(controller().candidateJobDescription().trim()) ||
      Boolean(controller().candidateCompanyValues().trim()),
  );
  const previewWeakFacts = createMemo(
    () =>
      controller()
        .candidatePackPreview()
        ?.candidateFacts.filter((fact) => fact.strength === "weak").length ?? 0,
  );
  const canSavePrepared = createMemo(
    () => Boolean(controller().candidatePackPreview()) && !controller().candidatePackSaving(),
  );
  const hasDraftContent = createMemo(() => {
    const draft = controller().candidatePackDraft;
    return Boolean(
      draft.candidateSummary.trim() ||
      draft.targetRole.trim() ||
      draft.jobTitle.trim() ||
      draft.jobCompany.trim() ||
      draft.factsText.trim() ||
      draft.requirementsText.trim() ||
      draft.responsibilitiesText.trim() ||
      draft.keywordsText.trim() ||
      draft.companyValuesText.trim() ||
      draft.avoidClaimsText.trim() ||
      draft.preferredExamplesText.trim(),
    );
  });
  const hasPreview = createMemo(() => Boolean(controller().candidatePackPreview()));
  const stepIndex = createMemo(() => {
    if (controller().candidatePackStatus().exists || hasDraftContent()) return 3;
    if (hasPreview()) return 2;
    return 1;
  });
  const canSaveDraft = createMemo(() => hasDraftContent() && !controller().candidatePackSaving());
  const saveDraftDisabledReason = createMemo(() => {
    if (controller().candidatePackSaving()) return st().settings.candidatePackDisabledSaving;
    if (!hasDraftContent()) return st().settings.candidatePackDisabledNoDraft;
    return "";
  });
  const savePreparedDisabledReason = createMemo(() => {
    if (controller().candidatePackSaving()) return st().settings.candidatePackDisabledSaving;
    if (!controller().candidatePackPreview()) return st().settings.candidatePackDisabledNoPreview;
    return "";
  });

  const [openSection, setOpenSection] = createSignal<StudioSectionId>("summary");
  const toggleSection = (id: StudioSectionId) => {
    setOpenSection((current) => (current === id ? "summary" : id));
  };
  const accordionIcon = (isOpen: boolean) => {
    if (isOpen) return <ChevronDownIcon class="ui-icon--16" />;
    return <ChevronRightIcon class="ui-icon--16" />;
  };

  return (
    <div class="candidate-pack-studio" data-testid="candidate-pack-studio">
      <nav
        class="candidate-pack-stepper"
        aria-label={st().settings.candidateStudioStepperLabel}
        data-testid="candidate-pack-stepper"
      >
        <ol class="candidate-pack-stepper-list">
          <For each={st().settings.candidateStudioSteps}>
            {(step, index) => {
              const stepNumber = index() + 1;
              const isCurrent = stepIndex() === stepNumber;
              const isComplete = stepIndex() > stepNumber;
              return (
                <li
                  class={`candidate-pack-stepper-item ${isCurrent ? "is-current" : ""} ${isComplete ? "is-complete" : ""}`}
                  data-testid={`candidate-pack-stepper-item-${stepNumber}`}
                >
                  <span class="candidate-pack-stepper-dot" aria-hidden="true">
                    <Show when={isComplete} fallback={<span>{stepNumber}</span>}>
                      <CheckIcon class="ui-icon--16" />
                    </Show>
                  </span>
                  <span class="candidate-pack-stepper-text">{step}</span>
                </li>
              );
            }}
          </For>
        </ol>
      </nav>

      <div class="candidate-pack-studio-grid" data-testid="candidate-pack-studio-grid">
        <section
          class={`candidate-pack-panel ${stepIndex() === 1 ? "is-active" : ""}`}
          data-testid="candidate-pack-ai-section"
        >
          <h4 class="candidate-pack-panel-title">{st().settings.inputPanelTitle}</h4>
          <p class="field-help">{st().settings.inputPanelHint}</p>
          <label class="field">
            <span class="field-label">{st().settings.resumeLabel}</span>
            <textarea
              class="field-input field-textarea candidate-pack-input-lg"
              value={controller().candidateRawResume()}
              onInput={(event) => controller().setCandidateRawResume(event.currentTarget.value)}
            />
          </label>
          <label class="field">
            <span class="field-label">{st().settings.jdLabel}</span>
            <textarea
              class="field-input field-textarea candidate-pack-input-lg"
              value={controller().candidateJobDescription()}
              onInput={(event) =>
                controller().setCandidateJobDescription(event.currentTarget.value)
              }
            />
          </label>
          <label class="field">
            <span class="field-label">{st().settings.valuesLabel}</span>
            <textarea
              class="field-input field-textarea candidate-pack-input-md"
              value={controller().candidateCompanyValues()}
              onInput={(event) => controller().setCandidateCompanyValues(event.currentTarget.value)}
            />
          </label>
          <p class="candidate-pack-privacy-note">{st().settings.privacyNote}</p>
        </section>

        <section
          class={`candidate-pack-panel ${stepIndex() === 2 ? "is-active" : ""}`}
          data-testid="candidate-pack-preview"
        >
          <h4 class="candidate-pack-panel-title">{st().settings.previewPanelTitle}</h4>
          <p class="field-help">
            {st().settings.candidatePackStatus}:{" "}
            {controller().candidatePackStatus().exists
              ? `${controller().candidatePackStatus().factCount} / weak ${controller().candidatePackStatus().weakFactCount}`
              : st().settings.candidatePackEmpty}
          </p>
          <Show
            when={controller().candidatePackPreview()}
            fallback={
              <div class="candidate-pack-empty-state" data-testid="candidate-pack-empty-state">
                <p class="candidate-pack-empty-title">{st().settings.noPreviewTitle}</p>
                <p class="field-help">{st().settings.noPreview}</p>
                <ul class="candidate-pack-empty-list">
                  <li>{st().settings.noPreviewStepInput}</li>
                  <li>{st().settings.noPreviewStepPrepare}</li>
                  <li>{st().settings.noPreviewStepResult}</li>
                </ul>
              </div>
            }
          >
            <div
              class="preview-grid candidate-pack-quality-card"
              data-testid="candidate-pack-quality-card"
            >
              <p>
                {st().settings.candidatePackPreview.score}:{" "}
                <strong>{controller().candidatePackPreview()!.packQualityScore}</strong>
              </p>
              <p>
                {st().settings.candidatePackPreview.facts}:{" "}
                {controller().candidatePackPreview()!.candidateFacts.length}
              </p>
              <p>
                {st().settings.candidatePackPreview.weakFacts}: {previewWeakFacts()}
              </p>
            </div>
            <Show when={controller().candidatePackPreview()!.missingDataWarnings.length > 0}>
              <div
                class="candidate-pack-warning-list"
                data-testid="candidate-pack-preview-warnings"
              >
                <span class="field-label">{st().settings.candidatePackPreview.warnings}</span>
                <For each={controller().candidatePackPreview()!.missingDataWarnings}>
                  {(warning) => <p class="field-help">{warning}</p>}
                </For>
              </div>
            </Show>
            <div class="candidate-pack-chip-group">
              <span class="field-label">{st().settings.candidatePackPreview.roleKeywords}</span>
              <div class="candidate-pack-chips">
                <For each={controller().candidatePackPreview()!.roleKeywords}>
                  {(keyword) => <span class="candidate-pack-chip">{keyword}</span>}
                </For>
              </div>
            </div>
            <div class="candidate-pack-chip-group">
              <span class="field-label">{st().settings.candidatePackPreview.companyValues}</span>
              <div class="candidate-pack-chips">
                <For each={controller().candidatePackPreview()!.companyValues}>
                  {(value) => <span class="candidate-pack-chip">{value}</span>}
                </For>
              </div>
            </div>
          </Show>
        </section>

        <section
          class={`candidate-pack-saved ${stepIndex() === 3 ? "is-active" : ""}`}
          data-testid="candidate-pack-section"
        >
          <h4 class="candidate-pack-panel-title">{st().settings.savedProfileTitle}</h4>
          <p class="field-help">{st().settings.savedProfileHint}</p>
          <div class="studio-accordion" data-testid="studio-accordion-root">
            <section
              class={`studio-accordion-item ${openSection() === "summary" ? "is-open" : ""}`}
              data-testid="studio-accordion-summary"
            >
              <button
                class="studio-accordion-trigger"
                type="button"
                onClick={() => toggleSection("summary")}
                aria-expanded={openSection() === "summary"}
              >
                <span>{st().settings.savedSections.summary}</span>
                <span class="studio-accordion-icon" aria-hidden="true">
                  {accordionIcon(openSection() === "summary")}
                </span>
              </button>
              <Show when={openSection() === "summary"}>
                <div class="studio-accordion-body">
                  <label class="field">
                    <span class="field-label">{st().settings.candidateSummaryLabel}</span>
                    <textarea
                      class="field-input candidate-pack-input-md"
                      value={controller().candidatePackDraft.candidateSummary}
                      onInput={(event) =>
                        controller().setCandidatePackDraft(
                          "candidateSummary",
                          event.currentTarget.value,
                        )
                      }
                    />
                  </label>
                </div>
              </Show>
            </section>

            <section
              class={`studio-accordion-item ${openSection() === "roleCompany" ? "is-open" : ""}`}
              data-testid="studio-accordion-role-company"
            >
              <button
                class="studio-accordion-trigger"
                type="button"
                onClick={() => toggleSection("roleCompany")}
                aria-expanded={openSection() === "roleCompany"}
              >
                <span>{st().settings.savedSections.roleCompany}</span>
                <span class="studio-accordion-icon" aria-hidden="true">
                  {accordionIcon(openSection() === "roleCompany")}
                </span>
              </button>
              <Show when={openSection() === "roleCompany"}>
                <div class="studio-accordion-body">
                  <label class="field">
                    <span class="field-label">{st().settings.targetRoleLabel}</span>
                    <input
                      class="field-input"
                      value={controller().candidatePackDraft.targetRole}
                      onInput={(event) =>
                        controller().setCandidatePackDraft("targetRole", event.currentTarget.value)
                      }
                    />
                  </label>
                  <label class="field">
                    <span class="field-label">{st().settings.jobTitleLabel}</span>
                    <input
                      class="field-input"
                      value={controller().candidatePackDraft.jobTitle}
                      onInput={(event) =>
                        controller().setCandidatePackDraft("jobTitle", event.currentTarget.value)
                      }
                    />
                  </label>
                  <label class="field">
                    <span class="field-label">{st().settings.jobCompanyLabel}</span>
                    <input
                      class="field-input"
                      value={controller().candidatePackDraft.jobCompany}
                      onInput={(event) =>
                        controller().setCandidatePackDraft("jobCompany", event.currentTarget.value)
                      }
                    />
                  </label>
                  <label class="field">
                    <span class="field-label">{st().settings.companyValuesLabel}</span>
                    <textarea
                      class="field-input candidate-pack-input-sm"
                      value={controller().candidatePackDraft.companyValuesText}
                      onInput={(event) =>
                        controller().setCandidatePackDraft(
                          "companyValuesText",
                          event.currentTarget.value,
                        )
                      }
                    />
                  </label>
                  <label class="field">
                    <span class="field-label">{st().settings.profileLanguageLabel}</span>
                    <input
                      class="field-input"
                      value={controller().candidatePackDraft.language}
                      onInput={(event) =>
                        controller().setCandidatePackDraft("language", event.currentTarget.value)
                      }
                    />
                  </label>
                </div>
              </Show>
            </section>

            <section
              class={`studio-accordion-item ${openSection() === "resumeFacts" ? "is-open" : ""}`}
            >
              <button
                class="studio-accordion-trigger"
                type="button"
                onClick={() => toggleSection("resumeFacts")}
                aria-expanded={openSection() === "resumeFacts"}
              >
                <span>{st().settings.savedSections.resumeFacts}</span>
                <span class="studio-accordion-icon" aria-hidden="true">
                  {accordionIcon(openSection() === "resumeFacts")}
                </span>
              </button>
              <Show when={openSection() === "resumeFacts"}>
                <div class="studio-accordion-body">
                  <label class="field">
                    <span class="field-label">{st().settings.factsLabel}</span>
                    <textarea
                      class="field-input candidate-pack-input-md candidate-pack-facts"
                      placeholder={st().settings.factsHint}
                      value={controller().candidatePackDraft.factsText}
                      onInput={(event) =>
                        controller().setCandidatePackDraft("factsText", event.currentTarget.value)
                      }
                    />
                  </label>
                </div>
              </Show>
            </section>

            <section
              class={`studio-accordion-item ${openSection() === "requirements" ? "is-open" : ""}`}
            >
              <button
                class="studio-accordion-trigger"
                type="button"
                onClick={() => toggleSection("requirements")}
                aria-expanded={openSection() === "requirements"}
              >
                <span>{st().settings.savedSections.requirements}</span>
                <span class="studio-accordion-icon" aria-hidden="true">
                  {accordionIcon(openSection() === "requirements")}
                </span>
              </button>
              <Show when={openSection() === "requirements"}>
                <div class="studio-accordion-body">
                  <label class="field">
                    <span class="field-label">{st().settings.requirementsLabel}</span>
                    <textarea
                      class="field-input candidate-pack-input-sm"
                      value={controller().candidatePackDraft.requirementsText}
                      onInput={(event) =>
                        controller().setCandidatePackDraft(
                          "requirementsText",
                          event.currentTarget.value,
                        )
                      }
                    />
                  </label>
                  <label class="field">
                    <span class="field-label">{st().settings.responsibilitiesLabel}</span>
                    <textarea
                      class="field-input candidate-pack-input-sm"
                      value={controller().candidatePackDraft.responsibilitiesText}
                      onInput={(event) =>
                        controller().setCandidatePackDraft(
                          "responsibilitiesText",
                          event.currentTarget.value,
                        )
                      }
                    />
                  </label>
                  <label class="field">
                    <span class="field-label">{st().settings.keywordsLabel}</span>
                    <textarea
                      class="field-input candidate-pack-input-sm"
                      value={controller().candidatePackDraft.keywordsText}
                      onInput={(event) =>
                        controller().setCandidatePackDraft(
                          "keywordsText",
                          event.currentTarget.value,
                        )
                      }
                    />
                  </label>
                </div>
              </Show>
            </section>

            <section
              class={`studio-accordion-item ${openSection() === "constraints" ? "is-open" : ""}`}
            >
              <button
                class="studio-accordion-trigger"
                type="button"
                onClick={() => toggleSection("constraints")}
                aria-expanded={openSection() === "constraints"}
              >
                <span>{st().settings.savedSections.constraints}</span>
                <span class="studio-accordion-icon" aria-hidden="true">
                  {accordionIcon(openSection() === "constraints")}
                </span>
              </button>
              <Show when={openSection() === "constraints"}>
                <div class="studio-accordion-body">
                  <label class="field">
                    <span class="field-label">{st().settings.avoidClaimsLabel}</span>
                    <textarea
                      class="field-input candidate-pack-input-sm"
                      value={controller().candidatePackDraft.avoidClaimsText}
                      onInput={(event) =>
                        controller().setCandidatePackDraft(
                          "avoidClaimsText",
                          event.currentTarget.value,
                        )
                      }
                    />
                  </label>
                </div>
              </Show>
            </section>

            <section
              class={`studio-accordion-item ${openSection() === "preferredExamples" ? "is-open" : ""}`}
              data-testid="studio-accordion-preferred-examples"
            >
              <button
                class="studio-accordion-trigger"
                type="button"
                onClick={() => toggleSection("preferredExamples")}
                aria-expanded={openSection() === "preferredExamples"}
              >
                <span>{st().settings.savedSections.preferredExamples}</span>
                <span class="studio-accordion-icon" aria-hidden="true">
                  {accordionIcon(openSection() === "preferredExamples")}
                </span>
              </button>
              <Show when={openSection() === "preferredExamples"}>
                <div class="studio-accordion-body">
                  <label class="field">
                    <span class="field-label">{st().settings.preferredExamplesLabel}</span>
                    <textarea
                      class="field-input candidate-pack-input-sm"
                      value={controller().candidatePackDraft.preferredExamplesText}
                      onInput={(event) =>
                        controller().setCandidatePackDraft(
                          "preferredExamplesText",
                          event.currentTarget.value,
                        )
                      }
                    />
                  </label>
                </div>
              </Show>
            </section>
          </div>
        </section>
      </div>

      <div
        class="action-bar sticky-action-footer app-sticky-footer settings-sticky-footer candidate-pack-footer"
        data-testid="candidate-pack-studio-footer"
      >
        <button
          class="btn-primary"
          type="button"
          disabled={
            stepIndex() >= 2
              ? !canSavePrepared()
              : controller().candidatePackPreparing() || !hasSourceInputs()
          }
          title={
            stepIndex() >= 2
              ? savePreparedDisabledReason() || st().settings.savePackDisabled
              : !hasSourceInputs()
                ? st().settings.candidatePackDisabledMissingInput
                : undefined
          }
          onClick={() =>
            stepIndex() >= 2
              ? void controller().savePreparedCandidatePack()
              : void controller().prepareCandidatePack()
          }
        >
          {stepIndex() >= 2
            ? st().settings.saveCandidatePack
            : controller().candidatePackPreparing()
              ? st().settings.preparing
              : st().settings.prepare}
        </button>
        <button
          class="btn-secondary"
          type="button"
          disabled={!canSaveDraft()}
          title={saveDraftDisabledReason() || st().settings.savePackDisabled}
          onClick={() => void controller().saveCandidatePack()}
        >
          {st().settings.saveDraftProfile}
        </button>
        <button
          class="btn-danger btn-ghost"
          type="button"
          onClick={() => void controller().clearCandidatePack()}
        >
          {st().settings.clearCandidatePack}
        </button>
        <button
          class="btn-ghost"
          type="button"
          onClick={() => controller().openSettingsPanel("candidatePack")}
        >
          {st().settings.backToSettings}
        </button>
      </div>
    </div>
  );
}
