import { createSignal, For, Show, onCleanup } from "solid-js";
import type { ReplylineController } from "./controller";
import type { ContextPackDto } from "./model";

function compactPreview(content: string, maxLen: number): string {
  const single = content.replace(/\s+/g, " ").trim();
  if (single.length <= maxLen) return single;
  return single.slice(0, maxLen).trimEnd() + "\u2026";
}

export function ContextPackPanel(props: Readonly<{ controller: ReplylineController }>) {
  const ctrl = () => props.controller;
  const st = () => ctrl().strings();

  const [draftId, setDraftId] = createSignal("");
  const [draftTitle, setDraftTitle] = createSignal("");
  const [draftContent, setDraftContent] = createSignal("");
  const [editing, setEditing] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  const [confirmingDeleteId, setConfirmingDeleteId] = createSignal<string | null>(null);
  let confirmTimer: ReturnType<typeof setTimeout> | null = null;
  onCleanup(() => {
    if (confirmTimer) clearTimeout(confirmTimer);
  });

  function requestDeleteConfirm(id: string) {
    setConfirmingDeleteId(id);
    if (confirmTimer) clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => setConfirmingDeleteId(null), 4000);
  }

  function cancelDeleteConfirm() {
    setConfirmingDeleteId(null);
    if (confirmTimer) clearTimeout(confirmTimer);
  }

  const activePack = () => ctrl().activeContextPack();
  const packs = () => ctrl().contextPacks();

  let newPackBtnRef: HTMLButtonElement | undefined;

  function resetDraft() {
    setDraftId("");
    setDraftTitle("");
    setDraftContent("");
    setEditing(false);
  }

  function startNew() {
    resetDraft();
    cancelDeleteConfirm();
    setEditing(true);
  }

  function startEdit(pack: ContextPackDto) {
    setDraftId(pack.id);
    setDraftTitle(pack.title);
    setDraftContent(pack.content);
    setEditing(true);
    cancelDeleteConfirm();
  }

  function startWithExample() {
    resetDraft();
    setDraftContent(st().contextPack.emptyExample);
    setEditing(true);
  }

  function insertExampleContent() {
    setDraftContent(st().contextPack.emptyExample);
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
      // Focus the New button after save so keyboard flow stays on the primary action.
      newPackBtnRef?.focus();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    cancelDeleteConfirm();
    await ctrl().deleteContextPack(id);
  }

  async function handleSetActive(id: string) {
    await ctrl().setActiveContextPackAction(id);
    cancelDeleteConfirm();
  }

  async function handleClearActive() {
    await ctrl().clearActiveContextPackAction();
  }

  async function handleDuplicate(pack: ContextPackDto) {
    await ctrl().saveContextPack({
      id: "ctx-" + String(Date.now()),
      title: pack.title + st().contextPack.duplicateSuffix,
      content: pack.content,
      isActive: false,
      createdAt: "",
      updatedAt: "",
    });
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
            ref={(el) => {
              newPackBtnRef = el;
            }}
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
              <span class="context-pack-active-preview" data-testid="context-pack-active-preview">
                {compactPreview(pack().content, 80)}
              </span>
              <span
                class="context-pack-active-charcount"
                data-testid="context-pack-active-charcount"
              >
                {(() => {
                  const tpl = st().contextPack.charCount;
                  return tpl.replace("{{count}}", String(pack().content.length));
                })()}
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
                placeholder={st().contextPack.emptyExample}
              />
            </label>
            <Show when={!draftContent().trim()}>
              <button
                type="button"
                class="btn btn-sm btn-ghost"
                data-testid="context-pack-insert-example-btn"
                onClick={insertExampleContent}
              >
                {st().contextPack.insertExample}
              </button>
            </Show>
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
              <p class="context-pack-empty-hint">{st().contextPack.emptyHint}</p>
              <p class="context-pack-empty-why" data-testid="context-pack-empty-why">
                {st().contextPack.emptyWhy}
              </p>
              <p class="context-pack-empty-example" data-testid="context-pack-empty-example">
                {st().contextPack.emptyExample}
              </p>
              <button
                type="button"
                class="btn btn-secondary"
                data-testid="context-pack-use-example-btn"
                onClick={startWithExample}
              >
                {st().contextPack.useExample}
              </button>
            </div>
          }
        >
          <div class="context-pack-list" data-testid="context-pack-list">
            <h3>{st().contextPack.listTitle}</h3>
            <For each={packs()}>
              {(pack) => {
                const isActive = () => pack.isActive;
                const isConfirming = () => confirmingDeleteId() === pack.id;
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
                        class="btn btn-sm"
                        data-testid={"context-pack-duplicate-" + pack.id}
                        onClick={() => handleDuplicate(pack)}
                      >
                        {st().contextPack.duplicatePack}
                      </button>
                      <Show
                        when={!isConfirming()}
                        fallback={
                          <>
                            <button
                              type="button"
                              class="btn btn-sm btn-danger"
                              data-testid={"context-pack-delete-confirm-" + pack.id}
                              onClick={() => handleDelete(pack.id)}
                            >
                              {st().contextPack.confirmDelete}
                            </button>
                            <button
                              type="button"
                              class="btn btn-sm"
                              data-testid={"context-pack-delete-cancel-" + pack.id}
                              onClick={cancelDeleteConfirm}
                            >
                              {st().contextPack.cancelConfirmDelete}
                            </button>
                          </>
                        }
                      >
                        <button
                          type="button"
                          class="btn btn-sm btn-danger"
                          data-testid={"context-pack-delete-" + pack.id}
                          onClick={() => requestDeleteConfirm(pack.id)}
                        >
                          {st().contextPack.deletePack}
                        </button>
                      </Show>
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
