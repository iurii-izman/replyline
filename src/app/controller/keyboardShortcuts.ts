import { onCleanup, onMount, type Accessor, type Setter } from "solid-js";
import type { Panel } from "../model";
import type { NoticeApi } from "./notices";
import type { PipelineActions } from "./pipelineActions";

export interface KeyboardShortcutDeps {
  panel: Accessor<Panel>;
  canCopySayNow: Accessor<boolean>;
  canRetry: Accessor<boolean>;
  copySection: PipelineActions["copySection"];
  retryAnalysis: PipelineActions["retryAnalysis"];
  dismissNotice: NoticeApi["dismissNotice"];
  setError: Setter<string | null>;
}

export function setupKeyboardShortcuts(deps: KeyboardShortcutDeps): void {
  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const editable =
        target instanceof Element
          ? Boolean(
              target.closest(
                "input, textarea, select, [contenteditable='true'], [contenteditable='']",
              ),
            )
          : false;
      if (event.key === "Escape") {
        deps.dismissNotice();
        deps.setError(null);
        return;
      }
      if (deps.panel() !== "main" || editable) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        if (!deps.canCopySayNow()) return;
        event.preventDefault();
        void deps.copySection("sayNow");
        return;
      }
      if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "r"
      ) {
        if (!deps.canRetry()) return;
        event.preventDefault();
        void deps.retryAnalysis();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });
}
