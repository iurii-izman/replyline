import { onCleanup, onMount, type Accessor, type Setter } from "solid-js";
import type { Panel } from "../model";
import type { NoticeApi } from "./notices";
import type { PipelineActions } from "./pipelineActions";

export interface KeyboardShortcutDeps {
  panel: Accessor<Panel>;
  canCopyCurrentCard: Accessor<boolean>;
  canRetry: Accessor<boolean>;
  copyCurrentCard: PipelineActions["copyCurrentCard"];
  retryAnalysis: PipelineActions["retryAnalysis"];
  nextInterviewCard: () => void;
  prevInterviewCard: () => void;
  selectInterviewCardByNumber: (number: number) => void;
  dismissNotice: NoticeApi["dismissNotice"];
  setError: Setter<string | null>;
}

export function setupKeyboardShortcuts(deps: KeyboardShortcutDeps): void {
  const isEditableTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"),
    );
  };
  const hasNoModifiers = (event: KeyboardEvent): boolean =>
    !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
  const isCopyShortcut = (event: KeyboardEvent): boolean =>
    (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";
  const isRetryShortcut = (event: KeyboardEvent): boolean =>
    hasNoModifiers(event) && event.key.toLowerCase() === "r";

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const editable = isEditableTarget(event.target);
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        deps.dismissNotice();
        deps.setError(null);
        return;
      }
      if (deps.panel() !== "main" || editable) return;
      if (hasNoModifiers(event)) {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          deps.nextInterviewCard();
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          deps.prevInterviewCard();
          return;
        }
        if (/^[1-6]$/.test(event.key)) {
          event.preventDefault();
          deps.selectInterviewCardByNumber(Number.parseInt(event.key, 10));
          return;
        }
      }
      if (isCopyShortcut(event)) {
        if (!deps.canCopyCurrentCard()) return;
        event.preventDefault();
        void deps.copyCurrentCard();
        return;
      }
      if (isRetryShortcut(event)) {
        if (!deps.canRetry()) return;
        event.preventDefault();
        void deps.retryAnalysis();
      }
    };
    globalThis.addEventListener("keydown", onKeyDown);
    onCleanup(() => globalThis.removeEventListener("keydown", onKeyDown));
  });
}
