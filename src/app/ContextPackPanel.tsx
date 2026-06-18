import { createSignal, For, Show, onCleanup } from "solid-js";
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
      newPackBtnRef?.focus();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    cancelDeleteConfirm();
    // Close editor if deleting the pack being edited.
    if (draftId() === id) resetDraft();
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

  const selectedPackId = () => draftId() || activePack()?.id || "";

  const contentWordCount = () => {
    return draftContent().trim().split(/\s+/).filter(Boolean).length;
  };

  const isEditingActive = () => activePack()?.id === draftId();

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

        <div class="context-pack-workspace" data-testid="context-pack-workspace">
          {/* Saved contexts sidebar — narrow rail */}
          <nav
            class="context-pack-sidebar"
            data-testid="context-pack-sidebar"
            aria-label={st().contextPack.listTitle}
          >
            <Show when={packs().length > 0}>
              <div class="context-pack-sidebar-inner">
                <For each={packs()}>
                  {(pack) => {
                    const isSelected = () => selectedPackId() === pack.id;
                    const linkClass = () =>
                      "context-pack-sidebar-link" + (isSelected() ? " is-active" : "");
                    return (
                      <button
                        type="button"
                        class={linkClass()}
                        data-testid={"context-pack-sidebar-link-" + pack.id}
                        onClick={() => startEdit(pack)}
                        title={st().contextPack.editPack}
                      >
                        <span class="context-pack-sidebar-title">{pack.title}</span>
                        {pack.isActive && (
                          <span
                            class="context-pack-sidebar-badge"
                            aria-label={st().contextPack.activeLabel}
                          >
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

          {/* Editor panel — the brief workspace */}
          <div class="context-pack-editor-panel" data-testid="context-pack-editor-panel">
            {/* Active context indicator (subtle, non-blocking) */}
            <Show when={activePack() && !editing()}>
              <div class="context-brief-active" data-testid="context-pack-active-banner">
                <span class="context-brief-active-dot" aria-hidden="true" />
                <span>
                  {st().contextPack.activeLabel}:{" "}
                  <strong data-testid="context-pack-active-title">{activePack()!.title}</strong>
                </span>
                <span class="context-brief-active-meta">
                  {(() => {
                    const tpl = st().contextPack.charCount;
                    return tpl.replace("{{count}}", String(activePack()!.content.length));
                  })()}
                </span>
                <span class="context-brief-active-actions">
                  <button
                    type="button"
                    class="btn btn-sm"
                    data-testid="context-pack-edit-active-btn"
                    onClick={() => startEdit(activePack()!)}
                  >
                    {st().contextPack.editCtx}
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-ghost"
                    data-testid="context-pack-disable-btn"
                    onClick={handleClearActive}
                  >
                    {st().contextPack.disableCtx}
                  </button>
                </span>
              </div>
            </Show>

            {/* Editor — the brief document */}
            <Show when={editing()}>
              <div class="context-brief-editor" data-testid="context-pack-editor">
                {/* Active indicator inside editor when editing active context */}
                <Show when={isEditingActive()}>
                  <div
                    class="context-brief-editor-active"
                    data-testid="context-brief-editor-active"
                  >
                    {st().contextPack.activeLabel}
                  </div>
                </Show>

                <label
                  for="context-pack-title-field"
                  style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap"
                >
                  {st().contextPack.titleLabel}
                </label>
                <input
                  type="text"
                  class="context-brief-title"
                  id="context-pack-title-field"
                  data-testid="context-pack-title-input"
                  value={draftTitle()}
                  onInput={(e) => setDraftTitle(e.currentTarget.value)}
                  maxLength={200}
                  placeholder={st().contextPack.titleLabel}
                />

                <label
                  for="context-pack-content-field"
                  style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap"
                >
                  {st().contextPack.contentLabel}
                </label>
                <textarea
                  class="context-brief-content"
                  id="context-pack-content-field"
                  data-testid="context-pack-content-input"
                  value={draftContent()}
                  onInput={(e) => setDraftContent(e.currentTarget.value)}
                  rows={14}
                  placeholder={st().contextPack.emptyExample}
                />

                <div class="context-brief-footer">
                  <span class="context-brief-meta">
                    {(() => {
                      const tpl = st().contextPack.charCount;
                      return tpl.replace("{{count}}", String(draftContent().length));
                    })()}
                    {" · "}
                    {contentWordCount()} words
                  </span>
                  <span class="context-brief-insert">
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
                  </span>
                </div>

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
                    class="btn btn-ghost"
                    data-testid="context-pack-cancel-btn"
                    onClick={resetDraft}
                  >
                    {st().contextPack.cancel}
                  </button>

                  {/* Context actions — only for existing packs */}
                  <Show when={draftId()}>
                    <span class="context-brief-actions-sep" aria-hidden="true" />
                    <Show when={!isEditingActive()}>
                      <button
                        type="button"
                        class="btn btn-sm"
                        data-testid={"context-pack-activate-" + draftId()}
                        onClick={() => handleSetActive(draftId())}
                      >
                        {st().contextPack.setActive}
                      </button>
                    </Show>
                    <Show when={packs().find((p) => p.id === draftId())}>
                      {(pack) => (
                        <button
                          type="button"
                          class="btn btn-sm"
                          data-testid={"context-pack-duplicate-" + draftId()}
                          onClick={() => handleDuplicate(pack())}
                        >
                          {st().contextPack.duplicatePack}
                        </button>
                      )}
                    </Show>
                    <Show
                      when={confirmingDeleteId() !== draftId()}
                      fallback={
                        <>
                          <button
                            type="button"
                            class="btn btn-sm btn-danger"
                            data-testid={"context-pack-delete-confirm-" + draftId()}
                            onClick={() => handleDelete(draftId())}
                          >
                            {st().contextPack.confirmDelete}
                          </button>
                          <button
                            type="button"
                            class="btn btn-sm btn-ghost"
                            data-testid={"context-pack-delete-cancel-" + draftId()}
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
                        data-testid={"context-pack-delete-" + draftId()}
                        onClick={() => requestDeleteConfirm(draftId())}
                      >
                        {st().contextPack.deletePack}
                      </button>
                    </Show>
                  </Show>
                </div>
              </div>
            </Show>

            {/* Empty state */}
            <Show when={!editing() && packs().length === 0}>
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
            </Show>

            {/* Saved context chips (narrow-screen fallback rail) */}
            <Show when={!editing() && packs().length > 0}>
              <nav
                class="context-pack-list context-pack-list--compact"
                data-testid="context-pack-list"
                aria-label={st().contextPack.listTitle}
              >
                <For each={packs()}>
                  {(pack) => {
                    const chipClass = () =>
                      "context-pack-chip" +
                      (pack.isActive ? " context-pack-chip--active" : "") +
                      (selectedPackId() === pack.id ? " context-pack-chip--selected" : "");
                    return (
                      <button
                        type="button"
                        class={chipClass()}
                        data-testid={"context-pack-item-" + pack.id}
                        onClick={() => startEdit(pack)}
                      >
                        <span class="context-pack-chip-title">{pack.title}</span>
                        {pack.isActive && <span class="context-pack-chip-badge">●</span>}
                      </button>
                    );
                  }}
                </For>
              </nav>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}
