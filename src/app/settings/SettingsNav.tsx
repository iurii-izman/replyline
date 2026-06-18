import { For, Show } from "solid-js";
import type { SettingsSectionId } from "../model";
import type { UiStrings } from "../locale";
import { type SetupStatusTone, setupStatusLabel } from "./settingsViewModel";

export function SettingsNav(
  props: Readonly<{
    sections: Array<{ id: SettingsSectionId; label: string; separatorBefore?: boolean }>;
    activeSection: () => SettingsSectionId;
    sectionStatus: (id: SettingsSectionId) => SetupStatusTone;
    focusSectionByIndex: (index: number, refs: HTMLButtonElement[]) => void;
    handleSectionKeyDown: (event: KeyboardEvent, refs: HTMLButtonElement[]) => void;
    st: () => UiStrings;
  }>,
) {
  const mobileTabRefs: HTMLButtonElement[] = [];
  const sidebarTabRefs: HTMLButtonElement[] = [];

  return (
    <>
      <div
        class="settings-nav-mobile"
        data-testid="settings-nav-mobile"
        role="tablist"
        aria-orientation="horizontal"
        aria-label={props.st().settings.title}
      >
        <For each={props.sections}>
          {(section, index) => {
            const tabIndex = index();
            return (
              <button
                ref={(element) => {
                  mobileTabRefs[tabIndex] = element;
                }}
                class={`settings-nav-chip ${props.activeSection() === section.id ? "is-active" : ""}`}
                type="button"
                id={`settings-mobile-tab-${section.id}`}
                role="tab"
                aria-selected={props.activeSection() === section.id}
                aria-controls={`settings-panel-${section.id}`}
                tabIndex={props.activeSection() === section.id ? 0 : -1}
                onClick={() => props.focusSectionByIndex(tabIndex, mobileTabRefs)}
                onKeyDown={(event) => props.handleSectionKeyDown(event, mobileTabRefs)}
              >
                {section.label}
              </button>
            );
          }}
        </For>
      </div>

      <aside class="settings-sidebar app-page-aside app-sidebar" data-testid="settings-sidebar">
        <div
          class="settings-sidebar-inner"
          role="tablist"
          aria-orientation="vertical"
          aria-label={props.st().settings.title}
        >
          <For each={props.sections}>
            {(section) => {
              const status = () => props.sectionStatus(section.id);
              const tabIndex = props.sections.findIndex((item) => item.id === section.id);
              return (
                <>
                  <Show when={section.separatorBefore && tabIndex > 0}>
                    <hr class="settings-nav-separator" aria-hidden="true" />
                  </Show>
                  <button
                    ref={(element) => {
                      sidebarTabRefs[tabIndex] = element;
                    }}
                    class={`settings-sidebar-link ${props.activeSection() === section.id ? "is-active" : ""}`}
                    type="button"
                    id={`settings-sidebar-tab-${section.id}`}
                    role="tab"
                    aria-selected={props.activeSection() === section.id}
                    aria-controls={`settings-panel-${section.id}`}
                    tabIndex={props.activeSection() === section.id ? 0 : -1}
                    onClick={() => props.focusSectionByIndex(tabIndex, sidebarTabRefs)}
                    onKeyDown={(event) => props.handleSectionKeyDown(event, sidebarTabRefs)}
                  >
                    <span class="settings-sidebar-label">{section.label}</span>
                    <span
                      class={`section-status-dot section-status-${status()}`}
                      aria-label={setupStatusLabel(props.st(), status())}
                      title={setupStatusLabel(props.st(), status())}
                    >
                      <span class="section-status-dot-inner" />
                    </span>
                  </button>
                </>
              );
            }}
          </For>
        </div>
      </aside>
    </>
  );
}
