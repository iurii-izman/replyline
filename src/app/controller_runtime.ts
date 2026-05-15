import type { Accessor } from "solid-js";

import { fmtBundleCollected, fmtLogPath, fmtSayNowFallback, type UiStrings } from "./locale";
import {
  userSafeClearContextError,
  userSafeDiagnosticError,
  userSafePipelineError,
  type AnalysisCard,
  type ContextStatusDto,
  type DiagnosticBundleDto,
  type HealthCheckResult,
  type LogStatusDto,
} from "./model";
import type { AppPlatform } from "./platform";

type RuntimeSliceDeps = {
  platform: AppPlatform;
  strings: Accessor<UiStrings>;
  panel: Accessor<"main" | "settings">;
  card: Accessor<AnalysisCard | null>;
  logStatus: Accessor<LogStatusDto | null>;
  tryWriteClipboard: (value: string) => Promise<boolean>;
  showWindow: (panelName?: "main" | "settings", focus?: boolean) => Promise<void>;
  showRecoverableError: (message: string, invokeErr?: unknown) => void;
  setError: (value: string | null) => void;
  setStatusDetail: (value: string | null) => void;
  setPhase: (value: "idle" | "analyzing" | "ready") => void;
  setCopyNotice: (value: string | null) => void;
  applyContextStatus: (status: ContextStatusDto) => void;
  setSettingsFormHint: (value: string | null) => void;
  setHealthCheckBusy: (value: boolean) => void;
  setHealthCheck: (value: HealthCheckResult | null) => void;
  setDiagnosticBusy: (value: boolean) => void;
  setDiagnosticLocalError: (value: string | null) => void;
  setPanel: (value: "main" | "settings") => void;
  setLogStatus: (value: LogStatusDto | null) => void;
};

export function createRuntimeSlice(deps: RuntimeSliceDeps) {
  async function clearContext() {
    try {
      const status = await deps.platform.invoke<ContextStatusDto>("clear_context");
      deps.applyContextStatus(status);
      deps.setCopyNotice(deps.strings().notices.contextCleared);
    } catch (err) {
      deps.showRecoverableError(userSafeClearContextError(err), err);
    }
  }

  async function retryAnalysis() {
    deps.setError(null);
    deps.setPhase("analyzing");
    deps.setStatusDetail(deps.strings().notices.retrying);
    try {
      const result = await deps.platform.invoke<AnalysisCard>("retry_last_analysis");
      try {
        const status = await deps.platform.invoke<ContextStatusDto>("get_context_status");
        deps.applyContextStatus(status);
      } catch {
        /* keep prior transcript preview / counts */
      }
      deps.setPhase("ready");
      deps.setStatusDetail(null);
      deps.setCopyNotice(null);
      return result;
    } catch (err) {
      deps.showRecoverableError(userSafePipelineError(err), err);
      return null;
    }
  }

  async function collectSupportBundle() {
    deps.setDiagnosticLocalError(null);
    deps.setDiagnosticBusy(true);
    await deps.platform
      .invoke("log_client_event", {
        event: "diagnostic_bundle_attempt",
        detail: "ui_button",
      })
      .catch(() => undefined);
    try {
      const result = await deps.platform.invoke<DiagnosticBundleDto>("collect_diagnostic_bundle");
      const copied = await deps.tryWriteClipboard(result.bundlePath);
      deps.setCopyNotice(fmtBundleCollected(result.bundlePath, copied, deps.strings()));
      const nextLogStatus = await deps.platform
        .invoke<LogStatusDto>("get_log_status")
        .catch(() => null);
      if (nextLogStatus) deps.setLogStatus(nextLogStatus);
    } catch (err) {
      deps.setDiagnosticLocalError(userSafeDiagnosticError(err));
    } finally {
      deps.setDiagnosticBusy(false);
    }
  }

  async function copyLogPath() {
    const status = deps.logStatus();
    if (!status?.logPath) return;
    const copied = await deps.tryWriteClipboard(status.logPath);
    deps.setCopyNotice(fmtLogPath(status.logPath, copied, deps.strings()));
  }

  async function copyAnswer() {
    const value = deps.card()?.sayNow?.trim();
    if (!value) return;
    const copied = await deps.tryWriteClipboard(value);
    deps.setCopyNotice(
      copied ? deps.strings().notices.sayNowCopied : fmtSayNowFallback(value, deps.strings()),
    );
  }

  async function copySection(section: "gist" | "sayNow" | "nextMove") {
    const currentCard = deps.card();
    if (!currentCard) return;
    const value = currentCard[section]?.trim();
    if (!value) return;
    const copied = await deps.tryWriteClipboard(value);
    const sectionNotice =
      section === "gist"
        ? deps.strings().notices.cardSectionCopiedGist
        : section === "sayNow"
          ? deps.strings().notices.cardSectionCopiedSayNow
          : deps.strings().notices.cardSectionCopiedNextMove;
    deps.setCopyNotice(copied ? sectionNotice : value);
  }

  async function runHealthCheck() {
    deps.setHealthCheckBusy(true);
    deps.setHealthCheck(null);
    try {
      const result = await deps.platform.invoke<HealthCheckResult>("check_provider_health");
      deps.setHealthCheck(result);
    } catch {
      deps.setHealthCheck({ deepgramOk: false, llmOk: false, detail: "Health check failed" });
    } finally {
      deps.setHealthCheckBusy(false);
    }
  }

  async function onCollectDiagnosticEvent() {
    deps.setPanel("settings");
    await deps.showWindow("settings");
    await collectSupportBundle();
  }

  return {
    clearContext,
    retryAnalysis,
    collectSupportBundle,
    copyLogPath,
    copyAnswer,
    copySection,
    runHealthCheck,
    onCollectDiagnosticEvent,
  };
}
