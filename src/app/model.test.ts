import { describe, expect, it } from "vitest";
import {
  formatHotkeyFromEvent,
  isConfiguredLlmRoute,
  parseCommandInvokeError,
  settingsAnchorForCommandErrorKind,
} from "./model";

describe("model", () => {
  describe("parseCommandInvokeError", () => {
    it("parses a direct command error envelope", () => {
      const parsed = parseCommandInvokeError('{"kind":"Pipeline","message":"fail"}');
      expect(parsed?.kind).toBe("Pipeline");
      expect(parsed?.message).toBe("fail");
    });

    it("extracts JSON via brace from a prefixed error string", () => {
      const parsed = parseCommandInvokeError(
        'Error from Tauri: {"kind":"Capture","message":"capture failed"}',
      );
      expect(parsed?.kind).toBe("Capture");
      expect(parsed?.message).toBe("capture failed");
    });

    it("strips prefix text before JSON via brace extraction", () => {
      const parsed = parseCommandInvokeError(
        'Error: {"kind":"Internal","message":"oops"}',
      );
      expect(parsed?.kind).toBe("Internal");
      expect(parsed?.message).toBe("oops");
    });

    it("returns null for empty object without kind/message", () => {
      expect(parseCommandInvokeError("{}")).toBeNull();
    });

    it("returns null for an unknown error kind", () => {
      expect(
        parseCommandInvokeError('{"kind":"UnknownKind","message":"test"}'),
      ).toBeNull();
    });

    it("returns null for a non-JSON string", () => {
      expect(parseCommandInvokeError("not json at all")).toBeNull();
    });

    it("returns null for a plain Error object", () => {
      expect(parseCommandInvokeError(new Error("some error"))).toBeNull();
    });
  });

  describe("settingsAnchorForCommandErrorKind", () => {
    it("maps command error to settings anchors", () => {
      expect(settingsAnchorForCommandErrorKind("Credential")).toBe("stt");
      expect(settingsAnchorForCommandErrorKind("Pipeline")).toBe("llm");
    });
  });

  describe("isConfiguredLlmRoute", () => {
    it("checks llm route readiness", () => {
      expect(isConfiguredLlmRoute("", "model")).toBe(false);
      expect(isConfiguredLlmRoute("https://api.example/v1", "gpt-4o-mini")).toBe(true);
    });
  });

  describe("formatHotkeyFromEvent", () => {
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
});
