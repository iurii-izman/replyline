// context-pack/ActiveContextBanner.tsx — Active context indicator shown when a pack is active and not editing.
import { Show, type Accessor } from "solid-js";
import type { UiStrings } from "../locale";
import type { ContextPackDto } from "../model";

export function ActiveContextBanner(
  props: Readonly<{
    strings: Accessor<UiStrings>;
    activePack: Accessor<ContextPackDto | null>;
    editing: Accessor<boolean>;
    onEdit: (pack: ContextPackDto) => void;
    onClear: () => void;
  }>,
) {
  const cp = () => props.strings().contextPack;

  return (
    <Show when={props.activePack() && !props.editing()}>
      <div class="context-brief-active" data-testid="context-pack-active-banner">
        <span class="context-brief-active-dot" aria-hidden="true" />
        <span>
          {cp().activeLabel}:{" "}
          <strong data-testid="context-pack-active-title">{props.activePack()!.title}</strong>
        </span>
        <span class="context-brief-active-meta">
          {(() => {
            const tpl = cp().charCount;
            return tpl.replace("{{count}}", String(props.activePack()!.content.length));
          })()}
        </span>
        <span class="context-brief-active-actions">
          <button
            type="button"
            class="btn btn-sm"
            data-testid="context-pack-edit-active-btn"
            onClick={() => props.onEdit(props.activePack()!)}
          >
            {cp().editCtx}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            data-testid="context-pack-disable-btn"
            onClick={props.onClear}
          >
            {cp().disableCtx}
          </button>
        </span>
      </div>
    </Show>
  );
}
