import { describe, expect, it, vi } from "vitest";
import { createPipelineActions } from "./controller/pipelineActions";
import { ui_ru } from "./locale";

describe("createPipelineActions", () => {
  it("clearContext resets card and phase", async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === "clear_context") return { contextActive: false, entryCount: 0 };
      return null;
    });
    const setError = vi.fn();
    const setPhase = vi.fn();
    const setCard = vi.fn();
    const setActiveRunId = vi.fn();
    const pushNotice = vi.fn();
    const applyContextStatus = vi.fn();

    const actions = createPipelineActions({
      platform: { invoke } as never,
      canCopyCurrentCard: () => false,
      copyText: () => "",
      strings: () => ui_ru,
      setError: setError as never,
      setPhase: setPhase as never,
      setCard,
      setCaptureQuality: vi.fn() as never,
      setContextActive: vi.fn() as never,
      setStatusDetail: vi.fn() as never,
      setLastCommandErrorKind: vi.fn() as never,
      setActiveRunId: setActiveRunId as never,
      notices: { pushNotice, dismissNotice: vi.fn(), clearNoticeTimer: vi.fn() },
      applyContextStatus,
    });

    await actions.clearContext();

    expect(invoke).toHaveBeenCalledWith("clear_context");
    expect(applyContextStatus).toHaveBeenCalled();
    expect(setCard).toHaveBeenCalledWith(null);
    expect(setPhase).toHaveBeenCalledWith("idle");
    expect(setActiveRunId).toHaveBeenCalledWith(null);
    expect(pushNotice).toHaveBeenCalled();
  });

  it("copyCurrentCard writes trimmed value to clipboard", async () => {
    const writeText = vi.fn(async () => undefined);
    const actions = createPipelineActions({
      platform: { invoke: vi.fn(), clipboard: { writeText } } as never,
      canCopyCurrentCard: () => true,
      copyText: () => "  answer  ",
      strings: () => ui_ru,
      setError: vi.fn() as never,
      setPhase: vi.fn() as never,
      setCard: vi.fn(),
      setCaptureQuality: vi.fn() as never,
      setContextActive: vi.fn() as never,
      setStatusDetail: vi.fn() as never,
      setLastCommandErrorKind: vi.fn() as never,
      setActiveRunId: vi.fn() as never,
      notices: { pushNotice: vi.fn(), dismissNotice: vi.fn(), clearNoticeTimer: vi.fn() },
      applyContextStatus: vi.fn(),
    });

    await actions.copyCurrentCard();
    expect(writeText).toHaveBeenCalledWith("answer");
  });
});
