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
  retryAnalysis: () => Promise<void>;
  copyCurrentCard: () => Promise<void>;
}

export function createPipelineActions(deps: PipelineActionDeps): PipelineActions {
  async function clearContext() {
    try {
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
      deps.setError(userSafeClearContextError());
      deps.notices.pushNotice({
        tone: "error",
        message: userSafeClearContextError(),
      });
      deps.setLastCommandErrorKind(parseCommandInvokeError(err)?.kind ?? null);
    }
  }

  async function retryAnalysis() {
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
      });
      const card = asAnalysisCard(result);
      deps.setCard(card);
      deps.setCaptureQuality(
        card.charsBand === "short" ? "short" : card.charsBand === "long" ? "long" : "normal",
      );
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
      deps.setError(userSafePipelineError(err));
      deps.notices.pushNotice({
        tone: "error",
        message: userSafePipelineError(err),
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
    await deps.platform.clipboard.writeText(value);
    deps.notices.pushNotice({
      tone: "info",
      message: deps.strings().notices.sayNowCopied,
    });
  }

  return { clearContext, retryAnalysis, copyCurrentCard };
}
