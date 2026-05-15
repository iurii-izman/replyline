import { describe, expect, it } from "vitest";
import {
  formatHotkeyFromEvent,
  isConfiguredLlmRoute,
  parseCommandInvokeError,
  settingsAnchorForCommandErrorKind,
} from "./model";

describe("model", () => {
  it("parses command error envelope", () => {
    const parsed = parseCommandInvokeError('{"kind":"Pipeline","message":"fail"}');
    expect(parsed?.kind).toBe("Pipeline");
    expect(parsed?.message).toBe("fail");
  });

  it("maps command error to settings anchors", () => {
    expect(settingsAnchorForCommandErrorKind("Credential")).toBe("stt");
    expect(settingsAnchorForCommandErrorKind("Pipeline")).toBe("llm");
  });

  it("checks llm route readiness", () => {
    expect(isConfiguredLlmRoute("", "model")).toBe(false);
    expect(isConfiguredLlmRoute("https://api.example/v1", "gpt-4o-mini")).toBe(true);
  });

  it("formats hotkey from keyboard event", () => {
    const event = {
      key: "k",
      ctrlKey: true,
      altKey: true,
      shiftKey: false,
      metaKey: false,
    } as KeyboardEvent;
    expect(formatHotkeyFromEvent(event)).toBe("Ctrl+Alt+K");
  });
});
