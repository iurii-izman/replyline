// context-pack/QuickContextCard.tsx — Quick-paste context card (no editor, just paste + save).
import { Show, type Accessor } from "solid-js";
import type { UiStrings } from "../locale";
import { quickContextTooLong, quickCharCountLabel } from "./helpers";

export function QuickContextCard(
  props: Readonly<{
    strings: Accessor<UiStrings>;
    quickText: Accessor<string>;
    onInput: (value: string) => void;
    quickError: Accessor<string | null>;
    quickSaving: Accessor<boolean>;
    onSave: () => void;
    titlePreview: Accessor<string>;
  }>,
) {
  const cp = () => props.strings().contextPack;
  const normalizedContent = () => props.quickText().trim();
  const contentLength = () => normalizedContent().length;
  const tooLong = () => quickContextTooLong(props.quickText());

  return (
    <section class="quick-context-card" data-testid="quick-context-card">
      <div class="quick-context-header">
        <div>
          <h3>{cp().quickTitle}</h3>
          <p>{cp().quickHint}</p>
        </div>
        <span class="quick-context-meta" data-testid="quick-context-title-preview">
          {cp().quickTitlePreview}: {props.titlePreview()}
        </span>
      </div>
      <label class="quick-context-label" for="quick-context-input">
        {cp().quickInputLabel}
      </label>
      <textarea
        class="quick-context-input"
        id="quick-context-input"
        data-testid="quick-context-input"
        value={props.quickText()}
        rows={7}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        placeholder={cp().quickPlaceholder}
        aria-describedby="quick-context-meta"
      />
      <div class="quick-context-footer">
        <span class="quick-context-meta" id="quick-context-meta">
          {quickCharCountLabel(cp().quickCharCount, contentLength())}
        </span>
        <Show when={props.quickError()}>
          <span class="quick-context-error" data-testid="quick-context-error" role="alert">
            {props.quickError()}
          </span>
        </Show>
        <button
          type="button"
          class="btn btn-primary"
          data-testid="quick-context-save-btn"
          onClick={() => void props.onSave()}
          disabled={props.quickSaving() || !normalizedContent() || tooLong()}
        >
          {props.quickSaving() ? "..." : cp().quickSave}
        </button>
      </div>
    </section>
  );
}
