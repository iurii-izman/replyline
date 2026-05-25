import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { setupKeyboardShortcuts } from "./controller/keyboardShortcuts";

function Harness(props: { deps: Parameters<typeof setupKeyboardShortcuts>[0] }) {
  setupKeyboardShortcuts(props.deps);
  return <div data-testid="harness" />;
}

describe("setupKeyboardShortcuts", () => {
  it("escape dismisses notice and clears error", () => {
    const dismissNotice = vi.fn();
    const setError = vi.fn();
    const deps = {
      panel: () => "main" as const,
      canCopyCurrentCard: () => false,
      canRetry: () => false,
      copyCurrentCard: vi.fn(async () => undefined),
      retryAnalysis: vi.fn(async () => undefined),
      nextInterviewCard: vi.fn(),
      prevInterviewCard: vi.fn(),
      selectInterviewCardByNumber: vi.fn(),
      dismissNotice,
      setError,
    };
    render(() => <Harness deps={deps} />);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(dismissNotice).toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith(null);
  });
});
