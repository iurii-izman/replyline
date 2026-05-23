import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  asAnalysisCard,
  formatHotkeyFromEvent,
  isConfiguredLlmRoute,
  parseCommandInvokeError,
  settingsAnchorForCommandErrorKind,
  type CheckItemDto,
  type RuntimeCheckDto,
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
      const parsed = parseCommandInvokeError('Error: {"kind":"Internal","message":"oops"}');
      expect(parsed?.kind).toBe("Internal");
      expect(parsed?.message).toBe("oops");
    });

    it("returns null for empty object without kind/message", () => {
      expect(parseCommandInvokeError("{}")).toBeNull();
    });

    it("returns null for an unknown error kind", () => {
      expect(parseCommandInvokeError('{"kind":"UnknownKind","message":"test"}')).toBeNull();
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

  describe("setup readiness helpers", () => {
    it("DEFAULT_SETTINGS has empty llmBaseUrl", () => {
      expect(DEFAULT_SETTINGS.llmBaseUrl).toBe("");
      expect(isConfiguredLlmRoute(DEFAULT_SETTINGS.llmBaseUrl, DEFAULT_SETTINGS.llmModel)).toBe(
        false,
      );
    });

    it("detects configured LLM route with both fields filled", () => {
      expect(isConfiguredLlmRoute("https://api.example.com/v1", "gpt-4o-mini")).toBe(true);
      expect(isConfiguredLlmRoute("http://localhost:11434/v1", "llama3")).toBe(true);
      expect(isConfiguredLlmRoute("https://api.example.com/v1", "")).toBe(false);
      expect(isConfiguredLlmRoute("", "gpt-4o-mini")).toBe(false);
    });
  });

  describe("CheckItemDto", () => {
    it("accepts ok response without action", () => {
      const item: CheckItemDto = {
        ok: true,
        code: "ok",
        message: "Deepgram API key configured",
      };
      expect(item.ok).toBe(true);
      expect(item.code).toBe("ok");
      expect(item.action).toBeUndefined();
    });

    it("accepts error response with action", () => {
      const item: CheckItemDto = {
        ok: false,
        code: "missing_key",
        message: "Deepgram API key is not set",
        action: "Add your Deepgram API key in the Speech section",
      };
      expect(item.ok).toBe(false);
      expect(item.code).toBe("missing_key");
      expect(item.action).toBe("Add your Deepgram API key in the Speech section");
    });

    it("accepts action as null (JSON wire format)", () => {
      const item: CheckItemDto = {
        ok: false,
        code: "config_error",
        message: "Cannot read key",
        action: null,
      };
      expect(item.action).toBeNull();
    });
  });

  describe("RuntimeCheckDto", () => {
    it("constructs fully ready result", () => {
      const okItem: CheckItemDto = { ok: true, code: "ok", message: "Ready" };
      const result: RuntimeCheckDto = {
        stt: okItem,
        llm: okItem,
        settings: okItem,
        runtimeReady: true,
      };
      expect(result.runtimeReady).toBe(true);
      expect(result.stt.ok).toBe(true);
      expect(result.llm.ok).toBe(true);
      expect(result.settings.ok).toBe(true);
    });

    it("constructs not-ready result when STT missing", () => {
      const failItem: CheckItemDto = {
        ok: false,
        code: "missing_key",
        message: "Key not set",
        action: "Add key",
      };
      const okItem: CheckItemDto = { ok: true, code: "ok", message: "Ready" };
      const result: RuntimeCheckDto = {
        stt: failItem,
        llm: okItem,
        settings: okItem,
        runtimeReady: false,
      };
      expect(result.runtimeReady).toBe(false);
      expect(result.stt.ok).toBe(false);
      expect(result.llm.ok).toBe(true);
    });

    it("detects runtimeReady consistency with all items", () => {
      const okItem: CheckItemDto = { ok: true, code: "ok", message: "Ready" };
      const failItem: CheckItemDto = { ok: false, code: "config_error", message: "Bad" };

      // All ok => ready
      const allReady: RuntimeCheckDto = {
        stt: okItem,
        llm: okItem,
        settings: okItem,
      };
      expect(allReady).toBeDefined();

      // One fail => not ready
      const partial: RuntimeCheckDto = {
        stt: okItem,
        llm: failItem,
        settings: okItem,
        runtimeReady: false,
      };
      expect(partial.runtimeReady).toBe(false);
    });
  });

  describe("settings validation preflight rules", () => {
    it("DEFAULT_SETTINGS schemaVersion is 9 (matches backend)", () => {
      expect(DEFAULT_SETTINGS.schemaVersion).toBe(9);
    });

    it("DEFAULT_SETTINGS hotkey is non-empty", () => {
      expect(DEFAULT_SETTINGS.hotkey.trim().length).toBeGreaterThan(0);
    });

    it("DEFAULT_SETTINGS captureMaxSeconds is within valid range", () => {
      expect(DEFAULT_SETTINGS.captureMaxSeconds).toBeGreaterThanOrEqual(5);
      expect(DEFAULT_SETTINGS.captureMaxSeconds).toBeLessThanOrEqual(180);
    });

    it("DEFAULT_SETTINGS llmModel is not empty", () => {
      expect(DEFAULT_SETTINGS.llmModel.trim().length).toBeGreaterThan(0);
    });

    it("DEFAULT_SETTINGS has model preset selected", () => {
      expect(DEFAULT_SETTINGS.selectedModelPreset).toBe("custom_openai_compatible");
    });

    it("DEFAULT_SETTINGS interview report retention is manual-clear mode", () => {
      expect(DEFAULT_SETTINGS.interviewReportRetentionDays).toBe(0);
    });

    it("DEFAULT_SETTINGS keeps normal window behavior defaults", () => {
      expect(DEFAULT_SETTINGS.hideToTrayOnClose).toBe(true);
      expect(DEFAULT_SETTINGS.keepOnTopDuringCapture).toBe(false);
    });

    it("DEFAULT_SETTINGS debug trace mode is safe redacted", () => {
      expect(DEFAULT_SETTINGS.debugTraceMode).toBe("redacted");
      expect(DEFAULT_SETTINGS.debugTraceRetentionDays).toBe(3);
    });
  });

  describe("interview DTO contract", () => {
    it("keeps backend-compatible string fields and clarifier.text", () => {
      const dto = {
        gist: "legacy gist",
        sayNow: "legacy say",
        nextMove: "legacy next",
        charsBand: "normal",
        interviewCardSchemaV1: {
          mode: "interview",
          question: {
            rawTranscript: "raw",
            cleanQuestion: "clean",
            interviewerIntent: "intent",
            questionType: "behavioral",
            confidence: "high",
          },
          answer: {
            main: "main",
            short: "short",
            strong: "strong",
            structure: "STAR",
          },
          signals: {
            mustMention: ["ownership"],
            keywords: ["impact"],
            metrics: [],
            resumeAnchors: [],
          },
          risks: {
            weakPoints: ["risk"],
            avoid: ["avoid"],
            safeReframe: "reframe",
          },
          followUps: [{ question: "q1", bridgeAnswer: "a1" }],
          clarifier: { needed: true, text: "Need scope?" },
        },
      } as const;

      const card = asAnalysisCard(dto);
      expect(card.mode).toBe("interview");
      if (card.mode !== "interview") throw new Error("expected interview card");
      expect(card.interview.answer.short).toBe("short");
      expect(card.interview.answer.strong).toBe("strong");
      expect(card.interview.risks.safeReframe).toBe("reframe");
      expect(card.interview.clarifier.text).toBe("Need scope?");
      expect(Array.isArray(card.interview.followUps)).toBe(true);
    });
  });
});
