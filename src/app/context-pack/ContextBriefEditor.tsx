// context-pack/ContextBriefEditor.tsx — Full context pack editor with title, content, and actions.
import { Show, type Accessor, type Setter } from "solid-js";
import type { UiStrings } from "../locale";
import type { ContextPackDto } from "../model";
import { countWords } from "./helpers";

export function ContextBriefEditor(
  props: Readonly<{
    strings: Accessor<UiStrings>;
    draftId: Accessor<string>;
    draftTitle: Accessor<string>;
    setDraftTitle: Setter<string>;
    draftContent: Accessor<string>;
    setDraftContent: Setter<string>;
    saving: Accessor<boolean>;
    onSave: () => void;
    onCancel: () => void;
    isEditingActive: Accessor<boolean>;
    confirmingDeleteId: Accessor<string | null>;
    onRequestDelete: (id: string) => void;
    onCancelDelete: () => void;
    onDelete: (id: string) => void;
    onSetActive: (id: string) => void;
    onDuplicate: (pack: ContextPackDto) => void;
    packs: Accessor<ContextPackDto[]>;
    insertExample: () => void;
  }>,
) {
  const cp = () => props.strings().contextPack;
  const contentWordCount = () => countWords(props.draftContent());

  return (
    <div class="context-brief-editor" data-testid="context-pack-editor">
      {/* Active indicator inside editor when editing active context */}
      <Show when={props.isEditingActive()}>
        <div class="context-brief-editor-active" data-testid="context-brief-editor-active">
          {cp().activeLabel}
        </div>
      </Show>

      <label
        for="context-pack-title-field"
        style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap"
      >
        {cp().titleLabel}
      </label>
      <input
        type="text"
        class="context-brief-title"
        id="context-pack-title-field"
        data-testid="context-pack-title-input"
        value={props.draftTitle()}
        onInput={(e) => props.setDraftTitle(e.currentTarget.value)}
        maxLength={200}
        placeholder={cp().titleLabel}
      />

      <label
        for="context-pack-content-field"
        style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap"
      >
        {cp().contentLabel}
      </label>
      <textarea
        class="context-brief-content"
        id="context-pack-content-field"
        data-testid="context-pack-content-input"
        value={props.draftContent()}
        onInput={(e) => props.setDraftContent(e.currentTarget.value)}
        rows={14}
        placeholder={cp().emptyExample}
      />

      <div class="context-brief-footer">
        <span class="context-brief-meta">
          {(() => {
            const tpl = cp().charCount;
            return tpl.replace("{{count}}", String(props.draftContent().length));
          })()}
          {" · "}
          {contentWordCount()} words
        </span>
        <span class="context-brief-insert">
          <Show when={!props.draftContent().trim()}>
            <button
              type="button"
              class="btn btn-sm btn-ghost"
              data-testid="context-pack-insert-example-btn"
              onClick={props.insertExample}
            >
              {cp().insertExample}
            </button>
          </Show>
        </span>
      </div>

      <div class="context-pack-editor-actions">
        <button
          type="button"
          class="btn btn-primary"
          data-testid="context-pack-save-btn"
          onClick={props.onSave}
          disabled={props.saving() || !props.draftTitle().trim() || !props.draftContent().trim()}
        >
          {props.saving() ? "..." : cp().save}
        </button>
        <button
          type="button"
          class="btn btn-ghost"
          data-testid="context-pack-cancel-btn"
          onClick={props.onCancel}
        >
          {cp().cancel}
        </button>

        {/* Context actions — only for existing packs */}
        <Show when={props.draftId()}>
          <span class="context-brief-actions-sep" aria-hidden="true" />
          <Show when={!props.isEditingActive()}>
            <button
              type="button"
              class="btn btn-sm"
              data-testid={"context-pack-activate-" + props.draftId()}
              onClick={() => props.onSetActive(props.draftId())}
            >
              {cp().setActive}
            </button>
          </Show>
          <Show when={props.packs().find((p) => p.id === props.draftId())}>
            {(pack) => (
              <button
                type="button"
                class="btn btn-sm"
                data-testid={"context-pack-duplicate-" + props.draftId()}
                onClick={() => props.onDuplicate(pack())}
              >
                {cp().duplicatePack}
              </button>
            )}
          </Show>
          {/* Two-step delete confirmation */}
          <Show
            when={props.confirmingDeleteId() !== props.draftId()}
            fallback={
              <>
                <button
                  type="button"
                  class="btn btn-sm btn-danger"
                  data-testid={"context-pack-delete-confirm-" + props.draftId()}
                  onClick={() => props.onDelete(props.draftId())}
                >
                  {cp().confirmDelete}
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-ghost"
                  data-testid={"context-pack-delete-cancel-" + props.draftId()}
                  onClick={props.onCancelDelete}
                >
                  {cp().cancelConfirmDelete}
                </button>
              </>
            }
          >
            <button
              type="button"
              class="btn btn-sm btn-danger"
              data-testid={"context-pack-delete-" + props.draftId()}
              onClick={() => props.onRequestDelete(props.draftId())}
            >
              {cp().deletePack}
            </button>
          </Show>
        </Show>
      </div>
    </div>
  );
}
