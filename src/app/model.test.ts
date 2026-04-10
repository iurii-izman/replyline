import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  alphaLanguageLabel,
  formatHotkeyFromEvent,
  invokeErrorMessage,
  isConfiguredLlmRoute,
  isNotebookLmLaunchReady,
  mapSettingsSaveError,
  parseCommandInvokeError,
  shortUrlForUi,
  userSafeBootstrapLoadError,
  userSafeCaptureStartError,
  userSafeHotkeyRegisterError,
  userSafeNotebookLmOpenError,
  userSafePipelineError,
  usesPlaceholderLlmRoute,
  settingsAnchorForCommandErrorKind,
} from "./model";

function keyEvent(key: string, options: Partial<KeyboardEventInit> = {}): KeyboardEvent {
  return new KeyboardEvent("keydown", { key, ...options });
}

describe("model helpers", () => {
  it("detects placeholder route", () => {
    expect(usesPlaceholderLlmRoute(DEFAULT_SETTINGS.llmBaseUrl, DEFAULT_SETTINGS.llmModel)).toBe(
      true,
    );
    expect(usesPlaceholderLlmRoute("https://openrouter.ai/api/v1", "openai/gpt-4o-mini")).toBe(
      false,
    );
  });

  it("detects configured llm route", () => {
    expect(isConfiguredLlmRoute("", "model")).toBe(false);
    expect(isConfiguredLlmRoute(DEFAULT_SETTINGS.llmBaseUrl, DEFAULT_SETTINGS.llmModel)).toBe(
      false,
    );
    expect(isConfiguredLlmRoute("https://gateway.example/v1", "model-x")).toBe(true);
  });

  it("validates notebooklm launch readiness", () => {
    expect(isNotebookLmLaunchReady(false, "https://notebooklm.google.com")).toBe(false);
    expect(isNotebookLmLaunchReady(true, "ftp://host")).toBe(false);
    expect(isNotebookLmLaunchReady(true, "https://notebooklm.google.com")).toBe(true);
  });

  it("formats hotkey from keyboard event", () => {
    expect(formatHotkeyFromEvent(keyEvent("a", { ctrlKey: true, altKey: true }))).toBe(
      "Ctrl+Alt+A",
    );
    expect(formatHotkeyFromEvent(keyEvent(" ", { ctrlKey: true, altKey: true }))).toBe(
      "Ctrl+Alt+Space",
    );
    expect(formatHotkeyFromEvent(keyEvent("Control", { ctrlKey: true }))).toBeNull();
  });

  it("maps capture and pipeline errors to user-safe text", () => {
    expect(userSafeCaptureStartError("not active")).toContain("не была активна");
    expect(userSafePipelineError("empty transcript")).toContain("Текст из звука не получился");
    expect(userSafePipelineError("Deepgram missing API key")).toContain("ключ Deepgram");
  });

  it("maps settings save and notebook open errors", () => {
    expect(mapSettingsSaveError("HOTKEY_REQUIRED")).toContain("Клавиша");
    expect(mapSettingsSaveError("INVALID_URL")).toContain("http:// или https://");
    expect(userSafeNotebookLmOpenError("NOTEBOOKLM_DISABLED")).toContain("выключен");
  });

  it("returns stable language labels and short URL", () => {
    expect(alphaLanguageLabel("ru")).toContain("Русский");
    expect(alphaLanguageLabel("en")).toContain("English");
    expect(shortUrlForUi("https://example.com/" + "a".repeat(80), 20)).toMatch(/…$/u);
  });

  it("maps bootstrap and hotkey registration errors", () => {
    expect(userSafeBootstrapLoadError("Context lock poisoned")).toContain("Внутренняя ошибка");
    expect(userSafeBootstrapLoadError("IO: denied")).toContain("Не прочитались настройки");
    expect(userSafeHotkeyRegisterError("already registered", "Ctrl+Alt+Space")).toContain(
      "уже занято",
    );
  });

  it("maps command error kinds to settings anchors", () => {
    expect(settingsAnchorForCommandErrorKind("Credential")).toBe("stt");
    expect(settingsAnchorForCommandErrorKind("Settings")).toBe("llm");
    expect(settingsAnchorForCommandErrorKind("Pipeline")).toBe("llm");
    expect(settingsAnchorForCommandErrorKind("Memory")).toBe("memory");
    expect(settingsAnchorForCommandErrorKind("Internal")).toBe("hotkey");
  });

  it("parses structured CommandError JSON from invoke-style errors", () => {
    const payload = '{"kind":"Pipeline","message":"empty transcript"}';
    expect(parseCommandInvokeError(payload)).toEqual({
      kind: "Pipeline",
      message: "empty transcript",
    });
    expect(invokeErrorMessage(payload)).toBe("empty transcript");
    expect(userSafePipelineError(payload)).toContain("Текст из звука не получился");
    expect(parseCommandInvokeError(new Error(payload))?.kind).toBe("Pipeline");
    expect(parseCommandInvokeError(`prefix ${payload}`)?.kind).toBe("Pipeline");
  });
});
