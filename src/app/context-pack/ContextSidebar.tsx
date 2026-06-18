// context-pack/ContextSidebar.tsx — Narrow sidebar rail showing saved context packs (desktop layout).
import { For, Show, type Accessor } from "solid-js";
import type { UiStrings } from "../locale";
import type { ContextPackDto } from "../model";

export function ContextSidebar(
  props: Readonly<{
    strings: Accessor<UiStrings>;
    packs: Accessor<ContextPackDto[]>;
    selectedPackId: Accessor<string>;
    onEdit: (pack: ContextPackDto) => void;
  }>,
) {
  const cp = () => props.strings().contextPack;

  return (
    <nav
      class="context-pack-sidebar"
      data-testid="context-pack-sidebar"
      aria-label={cp().listTitle}
    >
      <Show when={props.packs().length > 0}>
        <div class="context-pack-sidebar-inner">
          <For each={props.packs()}>
            {(pack) => {
              const isSelected = () => props.selectedPackId() === pack.id;
              const linkClass = () =>
                "context-pack-sidebar-link" + (isSelected() ? " is-active" : "");
              return (
                <button
                  type="button"
                  class={linkClass()}
                  data-testid={"context-pack-sidebar-link-" + pack.id}
                  onClick={() => props.onEdit(pack)}
                  title={cp().editPack}
                >
                  <span class="context-pack-sidebar-title">{pack.title}</span>
                  {pack.isActive && (
                    <span class="context-pack-sidebar-badge" aria-label={cp().activeLabel}>
                      ●
                    </span>
                  )}
                </button>
              );
            }}
          </For>
        </div>
      </Show>
    </nav>
  );
}
