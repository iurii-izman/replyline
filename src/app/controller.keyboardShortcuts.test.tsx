import { fireEvent, render, screen } from "@solidjs/testing-library";
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

  it("routes main-panel keyboard shortcuts for carousel, copy, and retry", () => {
    const copyCurrentCard = vi.fn(async () => undefined);
    const retryAnalysis = vi.fn(async () => undefined);
    const nextInterviewCard = vi.fn();
    const prevInterviewCard = vi.fn();
    const selectInterviewCardByNumber = vi.fn();
    const deps = {
      panel: () => "main" as const,
      canCopyCurrentCard: () => true,
      canRetry: () => true,
      copyCurrentCard,
      retryAnalysis,
      nextInterviewCard,
      prevInterviewCard,
      selectInterviewCardByNumber,
      dismissNotice: vi.fn(),
      setError: vi.fn(),
    };
    render(() => <Harness deps={deps} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "3" });
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    fireEvent.keyDown(window, { key: "r" });

    expect(nextInterviewCard).toHaveBeenCalledTimes(1);
    expect(prevInterviewCard).toHaveBeenCalledTimes(1);
    expect(selectInterviewCardByNumber).toHaveBeenCalledWith(3);
    expect(copyCurrentCard).toHaveBeenCalledTimes(1);
    expect(retryAnalysis).toHaveBeenCalledTimes(1);
  });

  it("ignores editable targets for carousel shortcuts and copy", () => {
    const nextInterviewCard = vi.fn();
    const copyCurrentCard = vi.fn(async () => undefined);
    const deps = {
      panel: () => "main" as const,
      canCopyCurrentCard: () => true,
      canRetry: () => true,
      copyCurrentCard,
      retryAnalysis: vi.fn(async () => undefined),
      nextInterviewCard,
      prevInterviewCard: vi.fn(),
      selectInterviewCardByNumber: vi.fn(),
      dismissNotice: vi.fn(),
      setError: vi.fn(),
    };
    render(() => (
      <>
        <input data-testid="editor" />
        <Harness deps={deps} />
      </>
    ));

    const editor = screen.getByTestId("editor");
    fireEvent.keyDown(editor, { key: "ArrowRight" });
    fireEvent.keyDown(editor, { key: "c", ctrlKey: true });

    expect(nextInterviewCard).not.toHaveBeenCalled();
    expect(copyCurrentCard).not.toHaveBeenCalled();
  });
});
