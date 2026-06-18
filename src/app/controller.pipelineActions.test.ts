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

  it("cancelPipeline sets cancel runId, phase to idle, and shows notice", () => {
    const setActiveRunId = vi.fn();
    const setPhase = vi.fn();
    const setStatusDetail = vi.fn();
    const setError = vi.fn();
    const pushNotice = vi.fn();

    const actions = createPipelineActions({
      platform: { invoke: vi.fn() } as never,
      canCopyCurrentCard: () => false,
      copyText: () => "",
      strings: () => ui_ru,
      setError: setError as never,
      setPhase: setPhase as never,
      setCard: vi.fn(),
      setCaptureQuality: vi.fn() as never,
      setContextActive: vi.fn() as never,
      setStatusDetail: setStatusDetail as never,
      setLastCommandErrorKind: vi.fn() as never,
      setActiveRunId: setActiveRunId as never,
      notices: { pushNotice, dismissNotice: vi.fn(), clearNoticeTimer: vi.fn() },
      applyContextStatus: vi.fn(),
    });

    actions.cancelPipeline();

    // Should set a cancel- runId
    expect(setActiveRunId).toHaveBeenCalledTimes(1);
    const runIdArg = setActiveRunId.mock.calls[0][0] as string;
    expect(runIdArg).toMatch(/^cancel-\d+$/);
    // Should set phase to idle
    expect(setPhase).toHaveBeenCalledWith("idle");
    // Should clear status detail
    expect(setStatusDetail).toHaveBeenCalledWith(null);
    // Should clear error
    expect(setError).toHaveBeenCalledWith(null);
    // Should push a cancel notice
    expect(pushNotice).toHaveBeenCalledTimes(1);
    expect(pushNotice).toHaveBeenCalledWith({
      tone: "info",
      message: ui_ru.card.cancelNotice,
    });
  });

  it("cancelPipeline is safe to call when not in pipeline", () => {
    const pushNotice = vi.fn();
    const actions = createPipelineActions({
      platform: { invoke: vi.fn() } as never,
      canCopyCurrentCard: () => false,
      copyText: () => "",
      strings: () => ui_ru,
      setError: vi.fn() as never,
      setPhase: vi.fn() as never,
      setCard: vi.fn(),
      setCaptureQuality: vi.fn() as never,
      setContextActive: vi.fn() as never,
      setStatusDetail: vi.fn() as never,
      setLastCommandErrorKind: vi.fn() as never,
      setActiveRunId: vi.fn() as never,
      notices: { pushNotice, dismissNotice: vi.fn(), clearNoticeTimer: vi.fn() },
      applyContextStatus: vi.fn(),
    });

    // Should not throw — cancelling when idle is a no-op (just sets phase to idle again)
    expect(() => actions.cancelPipeline()).not.toThrow();
  });
});
