import type { Accessor, Setter } from "solid-js";
import type {
  Phase,
  AnalysisCard,
  AnalysisCardDto,
  ContextStatusDto,
  CommandErrorKind,
} from "../model";
import type { UiStrings } from "../locale";
import type { AppPlatform } from "../platform";
import type { NoticeApi } from "./notices";
import {
  userSafeClearContextError,
  userSafePipelineError,
  parseCommandInvokeError,
  asAnalysisCard,
} from "../model";
import { emitUiEvent } from "../observability";

export type AnswerRewriteStyle = "shorter" | "more_detailed" | "more_direct" | "softer";

export interface PipelineActionDeps {
  platform: AppPlatform;
  canCopyCurrentCard: Accessor<boolean>;
  copyText: Accessor<string>;
  strings: Accessor<UiStrings>;
  setError: Setter<string | null>;
  setPhase: Setter<Phase>;
  setCard: (card: AnalysisCard | null) => void;
  setCaptureQuality: Setter<"short" | "normal" | "long">;
  setContextActive: Setter<boolean>;
  setStatusDetail: Setter<string | null>;
  setLastCommandErrorKind: Setter<CommandErrorKind | null>;
  setActiveRunId: Setter<string | null>;
  notices: NoticeApi;
  applyContextStatus: (status: ContextStatusDto) => void;
}

export interface PipelineActions {
  clearContext: () => Promise<void>;
  retryAnalysis: (styleOverride?: AnswerRewriteStyle) => Promise<void>;
  copyCurrentCard: () => Promise<void>;
  cancelPipeline: () => void;
}

export function createPipelineActions(deps: PipelineActionDeps): PipelineActions {
  const resolveCaptureQuality = (
    charsBand: AnalysisCard["charsBand"],
  ): "short" | "normal" | "long" => {
    if (charsBand === "short") return "short";
    if (charsBand === "long") return "long";
    return "normal";
  };
  async function clearContext() {
    try {
      void emitUiEvent(deps.platform, "clear_clicked", { phase: "ready" });
      deps.setError(null);
      const status = await deps.platform.invoke<ContextStatusDto>("clear_context");
      deps.applyContextStatus(status);
      deps.setCard(null);
      deps.setPhase("idle");
      deps.setActiveRunId(null);
      deps.notices.pushNotice({
        tone: "info",
        message: deps.strings().notices.contextCleared,
      });
    } catch (err) {
      const message = userSafeClearContextError(deps.strings());
      deps.setError(message);
      deps.notices.pushNotice({
        tone: "error",
        message,
      });
      deps.setLastCommandErrorKind(parseCommandInvokeError(err)?.kind ?? null);
    }
  }

  async function retryAnalysis(styleOverride?: AnswerRewriteStyle) {
    void emitUiEvent(deps.platform, "retry_clicked", {
      phase: "analyzing",
      style_override: styleOverride ?? "default",
    });
    deps.setError(null);
    deps.setPhase("analyzing");
    // Generate a client-side runId so the lifecycle listener can
    // distinguish retry status events from stale capture-pipeline events.
    const runId = `retry-${Date.now()}`;
    deps.setActiveRunId(runId);
    deps.notices.pushNotice({
      tone: "info",
      message: deps.strings().notices.retrying,
    });
    deps.setStatusDetail(deps.strings().notices.retrying);
    try {
      const result = await deps.platform.invoke<AnalysisCardDto>("retry_last_analysis", {
        runId,
        ...(styleOverride ? { styleOverride } : {}),
      });
      const card = asAnalysisCard(result);
      deps.setCard(card);
      deps.setCaptureQuality(resolveCaptureQuality(card.charsBand));
      const status = await deps.platform.invoke<ContextStatusDto>("get_context_status");
      deps.applyContextStatus(status);
      deps.setPhase("ready");
      deps.setStatusDetail(null);
      deps.setActiveRunId(null);
      deps.notices.pushNotice({
        tone: "info",
        message: deps.strings().notices.retryDone,
      });
    } catch (err) {
      try {
        const status = await deps.platform.invoke<ContextStatusDto>("get_context_status");
        deps.applyContextStatus(status);
      } catch {
        // Preserve the original retry failure when context refresh is unavailable.
      }
      const message = userSafePipelineError(err, deps.strings());
      deps.setError(message);
      deps.notices.pushNotice({
        tone: "error",
        message,
      });
      deps.setLastCommandErrorKind(parseCommandInvokeError(err)?.kind ?? null);
      deps.setPhase("idle");
      deps.setActiveRunId(null);
    }
  }

  async function copyCurrentCard() {
    deps.setError(null);
    const value = deps.copyText().trim();
    if (!value || !deps.canCopyCurrentCard()) return;
    void emitUiEvent(deps.platform, "copy_answer_clicked", { phase: "ready" });
    await deps.platform.clipboard.writeText(value);
    deps.notices.pushNotice({
      tone: "info",
      message: deps.strings().notices.sayNowCopied,
    });
  }

  /**
   * Frontend-safe pipeline cancellation: switches activeRunId so the
   * lifecycle listener ignores stale status events from the current run.
   * The backend request continues to completion, but its result is
   * discarded (runId mismatch).
   */
  function cancelPipeline() {
    void emitUiEvent(deps.platform, "cancel_clicked", { phase: "processing" });
    // Switch to a synthetic runId so stale status events are filtered out.
    deps.setActiveRunId(`cancel-${Date.now()}`);
    deps.setPhase("idle");
    deps.setStatusDetail(null);
    deps.setError(null);
    deps.notices.pushNotice({
      tone: "info",
      message: deps.strings().card.cancelNotice,
    });
  }

  return { clearContext, retryAnalysis, copyCurrentCard, cancelPipeline };
}
