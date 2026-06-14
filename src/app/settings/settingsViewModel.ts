import type { CheckItemDto, SettingsSectionId } from "../model";
import type { UiStrings } from "../locale";

export function checkItemLabel(item: CheckItemDto, st: UiStrings): string {
  switch (item.code) {
    case "ok":
      return st.checks.code.ok;
    case "missing_key":
      return st.checks.code.missing_key;
    case "config_error":
      return st.checks.code.config_error;
    case "auth_error":
      return st.checks.code.auth_error;
    case "endpoint_error":
      return st.checks.code.endpoint_error;
    case "network_error":
      return st.checks.code.network_error;
    case "skipped":
      return st.checks.code.skipped;
    case "error":
      return st.checks.code.error;
    default:
      return item.code;
  }
}

export function checkItemClass(item: CheckItemDto): string {
  return item.ok ? "check-item is-ok" : "check-item is-fail";
}

export type SetupStatusTone =
  | "configured"
  | "missing"
  | "needs_check"
  | "check_failed"
  | "ready"
  | "optional";

export function setupStatusLabel(st: UiStrings, tone: SetupStatusTone): string {
  switch (tone) {
    case "configured":
      return st.settings.statusConfigured;
    case "missing":
      return st.settings.statusMissing;
    case "needs_check":
      return st.settings.statusNeedsCheck;
    case "check_failed":
      return st.settings.statusCheckFailed;
    case "ready":
      return st.settings.statusReady;
    case "optional":
      return st.settings.statusOptional;
  }
}

export function setupStatusClass(tone: SetupStatusTone): string {
  if (tone === "ready" || tone === "configured") return "status-pill is-ready";
  if (tone === "needs_check") return "status-pill is-setup-needed";
  if (tone === "check_failed" || tone === "missing") return "status-pill is-error";
  return "status-pill";
}

export function runtimeCheckSection(item: CheckItemDto): SettingsSectionId {
  if (item.code === "missing_key") return "speech";
  if (item.code === "auth_error" || item.code === "endpoint_error" || item.code === "network_error")
    return "llm";
  if (item.code === "config_error") return "overview";
  return "overview";
}

export function runtimeCheckMessage(st: UiStrings, item: CheckItemDto): string {
  switch (item.code) {
    case "ok":
      return st.settings.runtimeCheckOk;
    case "missing_key":
      return st.errors.missingDeepgramKey;
    case "config_error":
      return st.errors.runtimeCheckFailed;
    case "auth_error":
      return st.errors.runtimeCheckAuth;
    case "endpoint_error":
      return st.errors.runtimeCheckEndpoint;
    case "network_error":
      return st.errors.runtimeCheckNetwork;
    case "skipped":
      return st.settings.runtimeCheckSkipped;
    case "error":
      return st.errors.runtimeCheckFailed;
    default:
      return st.errors.runtimeCheckFailed;
  }
}

export function runtimeCheckActionLabel(st: UiStrings, item: CheckItemDto): string {
  switch (item.code) {
    case "missing_key":
      return st.settings.openSpeechSection;
    case "auth_error":
    case "endpoint_error":
    case "network_error":
      return st.settings.openReplySection;
    case "config_error":
      return st.settings.openSettings;
    default:
      return st.settings.runCheck;
  }
}
