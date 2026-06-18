// context-pack/ContextPackListItem.tsx — Compact chip for the narrow-screen fallback pack list.
import { For, Show, type Accessor } from "solid-js";
import type { UiStrings } from "../locale";
import type { ContextPackDto } from "../model";

export function ContextPackList(
  props: Readonly<{
    strings: Accessor<UiStrings>;
    packs: Accessor<ContextPackDto[]>;
    selectedPackId: Accessor<string>;
    onEdit: (pack: ContextPackDto) => void;
  }>,
) {
  const cp = () => props.strings().contextPack;

  return (
    <Show when={props.packs().length > 0}>
      <nav
        class="context-pack-list context-pack-list--compact"
        data-testid="context-pack-list"
        aria-label={cp().listTitle}
      >
        <For each={props.packs()}>
          {(pack) => {
            const chipClass = () =>
              "context-pack-chip" +
              (pack.isActive ? " context-pack-chip--active" : "") +
              (props.selectedPackId() === pack.id ? " context-pack-chip--selected" : "");
            return (
              <button
                type="button"
                class={chipClass()}
                data-testid={"context-pack-item-" + pack.id}
                onClick={() => props.onEdit(pack)}
              >
                <span class="context-pack-chip-title">{pack.title}</span>
                {pack.isActive && <span class="context-pack-chip-badge">●</span>}
              </button>
            );
          }}
        </For>
      </nav>
    </Show>
  );
}
