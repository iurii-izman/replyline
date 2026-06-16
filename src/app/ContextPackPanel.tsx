import { createSignal, For, Show } from "solid-js";
import type { ReplylineController } from "./controller";
import type { ContextPackDto } from "./model";

export function ContextPackPanel(props: Readonly<{ controller: ReplylineController }>) {
  const ctrl = () => props.controller;
  const st = () => ctrl().strings();

  const [draftId, setDraftId] = createSignal("");
  const [draftTitle, setDraftTitle] = createSignal("");
  const [draftContent, setDraftContent] = createSignal("");
  const [editing, setEditing] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  const activePack = () => ctrl().activeContextPack();
  const packs = () => ctrl().contextPacks();

  function resetDraft() {
    setDraftId("");
    setDraftTitle("");
    setDraftContent("");
    setEditing(false);
  }

  function startNew() {
    resetDraft();
    setEditing(true);
  }

  function startEdit(pack: ContextPackDto) {
    setDraftId(pack.id);
    setDraftTitle(pack.title);
    setDraftContent(pack.content);
    setEditing(true);
  }

  async function handleSave() {
    const title = draftTitle().trim();
    const content = draftContent().trim();
    if (!title || !content) return;
    setSaving(true);
    try {
      const id = draftId() || "ctx-" + String(Date.now());
      await ctrl().saveContextPack({
        id,
        title,
        content,
        isActive: activePack()?.id === id ? activePack()!.isActive : false,
        createdAt: "",
        updatedAt: "",
      });
      resetDraft();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await ctrl().deleteContextPack(id);
  }

  async function handleSetActive(id: string) {
    await ctrl().setActiveContextPackAction(id);
  }

  async function handleClearActive() {
    await ctrl().clearActiveContextPackAction();
  }

  return (
    <Show when={ctrl().panel() === "contextPack"}>
      <div class="context-pack-panel" data-testid="context-pack-panel">
        <header class="context-pack-header">
          <button
            type="button"
            class="btn btn-sm"
            data-testid="context-pack-back-btn"
            onClick={() => ctrl().goToMainPanel()}
            aria-label={st().settings.back}
          >
            ← {st().settings.back}
          </button>
          <h2>{st().contextPack.panelTitle}</h2>
          <button
            type="button"
            class="btn btn-primary"
            data-testid="context-pack-new-btn"
            onClick={startNew}
            disabled={editing()}
          >
            {st().contextPack.newPack}
          </button>
        </header>

        <Show when={activePack()}>
          {(pack) => (
            <div class="context-pack-active-banner" data-testid="context-pack-active-banner">
              <span class="context-pack-active-label">{st().contextPack.activeLabel}:</span>
              <span class="context-pack-active-title" data-testid="context-pack-active-title">
                {pack().title}
              </span>
              <div class="context-pack-active-actions">
                <button
                  type="button"
                  class="btn btn-sm"
                  data-testid="context-pack-edit-active-btn"
                  onClick={() => startEdit(pack())}
                >
                  {st().contextPack.editCtx}
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-danger"
                  data-testid="context-pack-disable-btn"
                  onClick={handleClearActive}
                >
                  {st().contextPack.disableCtx}
                </button>
              </div>
            </div>
          )}
        </Show>

        <Show when={editing()}>
          <div class="context-pack-editor" data-testid="context-pack-editor">
            <label>
              <span class="field-label">{st().contextPack.titleLabel}</span>
              <input
                type="text"
                class="input"
                data-testid="context-pack-title-input"
                value={draftTitle()}
                onInput={(e) => setDraftTitle(e.currentTarget.value)}
                maxLength={200}
                placeholder={st().contextPack.titleLabel}
              />
            </label>
            <label>
              <span class="field-label">{st().contextPack.contentLabel}</span>
              <textarea
                class="textarea"
                data-testid="context-pack-content-input"
                value={draftContent()}
                onInput={(e) => setDraftContent(e.currentTarget.value)}
                rows={10}
                placeholder={st().contextPack.contentLabel}
              />
            </label>
            <div class="context-pack-editor-actions">
              <button
                type="button"
                class="btn btn-primary"
                data-testid="context-pack-save-btn"
                onClick={handleSave}
                disabled={saving() || !draftTitle().trim() || !draftContent().trim()}
              >
                {saving() ? "..." : st().contextPack.save}
              </button>
              <button
                type="button"
                class="btn"
                data-testid="context-pack-cancel-btn"
                onClick={resetDraft}
              >
                {st().contextPack.cancel}
              </button>
            </div>
          </div>
        </Show>

        <Show
          when={packs().length > 0}
          fallback={
            <div class="context-pack-empty" data-testid="context-pack-empty">
              <p>{st().contextPack.emptyHint}</p>
            </div>
          }
        >
          <div class="context-pack-list" data-testid="context-pack-list">
            <h3>{st().contextPack.listTitle}</h3>
            <For each={packs()}>
              {(pack) => {
                const isActive = () => pack.isActive;
                const itemClass = () =>
                  "context-pack-item" + (isActive() ? " context-pack-item--active" : "");
                return (
                  <div class={itemClass()} data-testid={"context-pack-item-" + pack.id}>
                    <div class="context-pack-item-info">
                      <strong>{pack.title}</strong>
                      <span class="context-pack-item-meta">
                        {new Date(pack.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div class="context-pack-item-actions">
                      <Show
                        when={!isActive()}
                        fallback={
                          <span class="badge badge-active">{st().contextPack.activeLabel}</span>
                        }
                      >
                        <button
                          type="button"
                          class="btn btn-sm"
                          data-testid={"context-pack-activate-" + pack.id}
                          onClick={() => handleSetActive(pack.id)}
                        >
                          {st().contextPack.setActive}
                        </button>
                      </Show>
                      <button
                        type="button"
                        class="btn btn-sm"
                        data-testid={"context-pack-edit-" + pack.id}
                        onClick={() => startEdit(pack)}
                      >
                        {st().contextPack.editPack}
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-danger"
                        data-testid={"context-pack-delete-" + pack.id}
                        onClick={() => handleDelete(pack.id)}
                      >
                        {st().contextPack.deletePack}
                      </button>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>
    </Show>
  );
}
