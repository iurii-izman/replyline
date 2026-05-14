import { describe, expect, it } from "vitest";
import { phaseLabelFor, traySyncPayload } from "./controller_status";
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
    expect(phaseLabelFor("capturing", false, false, ui_ru)).toBe("capture");
    expect(phaseLabelFor("idle", false, false, ui_ru)).toBe("Готово");
  });
});
