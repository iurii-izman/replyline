import { describe, expect, it } from "vitest";

import {
  livePhaseHeadlineFor,
  livePhaseSubFor,
  phaseLabelFor,
  traySyncPayload,
} from "./controller_status";
import { ui } from "./locale";

describe("controller_status helpers", () => {
  it("builds tray payload for analyzing with short detail", () => {
    const payload = traySyncPayload({
      phase: "analyzing",
      statusDetail: "short",
      setupRequired: false,
      hotkeyFailed: false,
      hasError: false,
    });
    expect(payload).toEqual({ phase: "analyzing", detail: "short" });
  });

  it("drops tray detail when too long", () => {
    const payload = traySyncPayload({
      phase: "analyzing",
      statusDetail: "x".repeat(60),
      setupRequired: false,
      hotkeyFailed: false,
      hasError: false,
    });
    expect(payload).toEqual({ phase: "analyzing", detail: null });
  });

  it("prefers setup-needed payload in idle", () => {
    const payload = traySyncPayload({
      phase: "idle",
      statusDetail: null,
      setupRequired: true,
      hotkeyFailed: false,
      hasError: false,
    });
    expect(payload.phase).toBe("setup_needed");
  });

  it("returns localized labels for capture and ready", () => {
    expect(phaseLabelFor("capturing", false, false)).toBe(ui.phase.capturing);
    expect(phaseLabelFor("ready", false, false)).toBe(ui.phase.ready);
  });

  it("returns live phase headlines and subtitles", () => {
    expect(livePhaseHeadlineFor("transcribing")).toBe(ui.livePhase.transcribingHeadline);
    expect(livePhaseSubFor("analyzing")).toBe(ui.livePhase.analyzingSub);
  });
});
