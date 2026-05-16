import { describe, expect, it } from "vitest";
import { phaseLabelFor, traySyncPayload } from "./controller_status";
import { shouldAcceptStatusEvent } from "./controller/lifecycle";
import { ui_ru } from "./locale";

describe("controller_status", () => {
  it("maps idle with setup required to setup_needed tray phase", () => {
    expect(
      traySyncPayload({
        phase: "idle",
        statusDetail: null,
        setupRequired: true,
        hotkeyFailed: false,
        hasError: false,
      }),
    ).toEqual({ phase: "setup_needed", detail: null });
  });

  it("returns translated phase labels", () => {
    expect(phaseLabelFor("capturing", false, false, ui_ru)).toBe("Запись");
    expect(phaseLabelFor("idle", false, false, ui_ru)).toBe("Готово");
  });
});

describe("shouldAcceptStatusEvent", () => {
  it("accepts event when activeRunId is null (boot / initial state)", () => {
    expect(shouldAcceptStatusEvent(null, "run-1")).toBe(true);
  });

  it("accepts event when event has no runId (backward compat)", () => {
    expect(shouldAcceptStatusEvent("run-1", undefined)).toBe(true);
  });

  it("accepts event when runId matches activeRunId", () => {
    expect(shouldAcceptStatusEvent("run-1", "run-1")).toBe(true);
  });

  it("rejects stale event with different runId", () => {
    expect(shouldAcceptStatusEvent("run-2", "run-1")).toBe(false);
  });

  it("accepts event when both are null / undefined", () => {
    expect(shouldAcceptStatusEvent(null, undefined)).toBe(true);
  });
});
