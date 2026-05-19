import { For, Show, createMemo } from "solid-js";
import type { ReplylineController } from "./controller";
import type { UiStrings } from "./locale";

type CandidatePackStudioProps = {
  controller: ReplylineController;
  st: UiStrings;
};

export function CandidatePackStudio(props: CandidatePackStudioProps) {
  const controller = () => props.controller;
  const st = () => props.st;
  void st().settings.candidatePackTitle;
  void st().settings.prepTitle;
  void st().settings.previewTitle;

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
  const savePreparedDisabledReason = createMemo(() => {
    if (controller().candidatePackSaving()) return st().settings.candidatePackDisabledSaving;
    if (!controller().candidatePackPreview()) return st().settings.candidatePackDisabledNoPreview;
    return "";
  });

  return (
    <div class="candidate-pack-studio" data-testid="candidate-pack-studio">
      <div class="candidate-pack-studio-grid" data-testid="candidate-pack-studio-grid">
        <section class="candidate-pack-panel" data-testid="candidate-pack-ai-section">
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

        <section class="candidate-pack-panel" data-testid="candidate-pack-preview">
          <h4 class="candidate-pack-panel-title">{st().settings.previewPanelTitle}</h4>
          <p class="field-help">
            {st().settings.candidatePackStatus}:{" "}
            {controller().candidatePackStatus().exists
              ? `${controller().candidatePackStatus().factCount} / weak ${controller().candidatePackStatus().weakFactCount}`
              : st().settings.candidatePackEmpty}
          </p>
          <Show
            when={controller().candidatePackPreview()}
            fallback={<p>{st().settings.noPreview}</p>}
          >
            <div class="preview-grid">
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

        <section class="candidate-pack-saved" data-testid="candidate-pack-section">
          <h4 class="candidate-pack-panel-title">{st().settings.savedProfileTitle}</h4>
          <details class="settings-collapsible" open>
            <summary>{st().settings.savedSections.summary}</summary>
            <div class="settings-collapsible-body">
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
          </details>
          <details class="settings-collapsible">
            <summary>{st().settings.savedSections.roleCompany}</summary>
            <div class="settings-collapsible-body">
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
          </details>
          <details class="settings-collapsible">
            <summary>{st().settings.savedSections.resumeFacts}</summary>
            <div class="settings-collapsible-body">
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
          </details>
          <details class="settings-collapsible">
            <summary>{st().settings.savedSections.requirements}</summary>
            <div class="settings-collapsible-body">
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
                    controller().setCandidatePackDraft("keywordsText", event.currentTarget.value)
                  }
                />
              </label>
            </div>
          </details>
          <details class="settings-collapsible">
            <summary>{st().settings.savedSections.constraints}</summary>
            <div class="settings-collapsible-body">
              <label class="field">
                <span class="field-label">{st().settings.avoidClaimsLabel}</span>
                <textarea
                  class="field-input candidate-pack-input-sm"
                  value={controller().candidatePackDraft.avoidClaimsText}
                  onInput={(event) =>
                    controller().setCandidatePackDraft("avoidClaimsText", event.currentTarget.value)
                  }
                />
              </label>
            </div>
          </details>
          <details class="settings-collapsible">
            <summary>{st().settings.savedSections.preferredExamples}</summary>
            <div class="settings-collapsible-body">
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
          </details>
        </section>
      </div>

      <div
        class="action-bar sticky-action-footer app-sticky-footer settings-sticky-footer"
        data-testid="candidate-pack-studio-footer"
      >
        <button
          class="btn-primary"
          type="button"
          disabled={controller().candidatePackPreparing() || !hasSourceInputs()}
          title={!hasSourceInputs() ? st().settings.candidatePackDisabledMissingInput : undefined}
          onClick={() => void controller().prepareCandidatePack()}
        >
          {controller().candidatePackPreparing() ? st().settings.preparing : st().settings.prepare}
        </button>
        <button
          class="btn-secondary"
          type="button"
          disabled={!canSavePrepared()}
          title={savePreparedDisabledReason() || st().settings.savePackDisabled}
          onClick={() => void controller().savePreparedCandidatePack()}
        >
          {st().settings.savePack}
        </button>
        <button
          class="btn-secondary"
          type="button"
          onClick={() => void controller().saveCandidatePack()}
        >
          {st().settings.saveCandidatePack}
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
