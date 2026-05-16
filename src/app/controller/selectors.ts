import { createMemo, type Accessor } from "solid-js";
import type { Phase, AnalysisCard, MainUiState } from "../model";
import type { UiStrings } from "../locale";
import { isConfiguredLlmRoute } from "../model";
import { phaseLabelFor } from "../controller_status";

export interface SelectorDeps {
  phase: Accessor<Phase>;
  card: Accessor<AnalysisCard | null>;
  error: Accessor<string | null>;
  deepgramSaved: Accessor<boolean>;
  hotkeyFailed: Accessor<boolean>;
  contextActive: Accessor<boolean>;
  settingsLlmBaseUrl: Accessor<string>;
  settingsLlmModel: Accessor<string>;
  strings: Accessor<UiStrings>;
}

export interface Selectors {
  setupRequired: Accessor<boolean>;
  phaseLabel: Accessor<string>;
  pipelineActive: Accessor<boolean>;
  mainUiState: Accessor<MainUiState>;
  canCopySayNow: Accessor<boolean>;
  canRetry: Accessor<boolean>;
  canClear: Accessor<boolean>;
  copyDisabledReason: Accessor<string | null>;
  retryDisabledReason: Accessor<string | null>;
  clearDisabledReason: Accessor<string | null>;
}

export function createSelectors(deps: SelectorDeps): Selectors {
  const setupRequired = createMemo(
    () =>
      !deps.deepgramSaved() ||
      !isConfiguredLlmRoute(deps.settingsLlmBaseUrl(), deps.settingsLlmModel()),
  );

  const phaseLabel = createMemo(() =>
    phaseLabelFor(deps.phase(), setupRequired(), deps.hotkeyFailed(), deps.strings()),
  );

  const pipelineActive = createMemo(() =>
    ["capturing", "transcribing", "analyzing"].includes(deps.phase()),
  );

  const mainUiState = createMemo<MainUiState>(() => {
    if (deps.phase() === "capturing") return "capturing";
    if (deps.phase() === "transcribing") return "transcribing";
    if (deps.phase() === "analyzing") return "analyzing";
    if (deps.phase() === "ready" && deps.card()) return "ready";
    if (deps.error()) return "error";
    return "idle";
  });

  const canCopySayNow = createMemo(
    () => mainUiState() === "ready" && Boolean(deps.card()?.sayNow?.trim()),
  );

  const canRetry = createMemo(() => !pipelineActive() && Boolean(deps.card()));

  const canClear = createMemo(
    () => !pipelineActive() && (deps.contextActive() || Boolean(deps.card())),
  );

  const copyDisabledReason = createMemo(() =>
    canCopySayNow() ? null : deps.strings().card.copyDisabledNoCard,
  );

  const retryDisabledReason = createMemo(() => {
    if (canRetry()) return null;
    return pipelineActive()
      ? deps.strings().card.retryDisabledBusy
      : deps.strings().card.retryDisabledNoCard;
  });

  const clearDisabledReason = createMemo(() => {
    if (canClear()) return null;
    return pipelineActive()
      ? deps.strings().card.clearDisabledBusy
      : deps.strings().card.clearDisabledNoCard;
  });

  return {
    setupRequired,
    phaseLabel,
    pipelineActive,
    mainUiState,
    canCopySayNow,
    canRetry,
    canClear,
    copyDisabledReason,
    retryDisabledReason,
    clearDisabledReason,
  };
}
