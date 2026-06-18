import { createSignal, Show, onCleanup } from "solid-js";
import type { ReplylineController } from "./controller";
import type { ContextPackDto } from "./model";
import { QuickContextCard } from "./context-pack/QuickContextCard";
import { ActiveContextBanner } from "./context-pack/ActiveContextBanner";
import { ContextSidebar } from "./context-pack/ContextSidebar";
import { ContextBriefEditor } from "./context-pack/ContextBriefEditor";
import { ContextPackList } from "./context-pack/ContextPackListItem";
import { titleFromContent, quickContextTooLong, quickTooLongMessage } from "./context-pack/helpers";

export function ContextPackPanel(props: Readonly<{ controller: ReplylineController }>) {
  const ctrl = () => props.controller;
  const st = () => ctrl().strings();

  const [draftId, setDraftId] = createSignal("");
  const [draftTitle, setDraftTitle] = createSignal("");
  const [draftContent, setDraftContent] = createSignal("");
  const [editing, setEditing] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [quickText, setQuickText] = createSignal("");
  const [quickError, setQuickError] = createSignal<string | null>(null);
  const [quickSaving, setQuickSaving] = createSignal(false);

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

  function handleQuickInput(value: string) {
    setQuickText(value);
    const nextLen = value.trim().length;
    setQuickError(nextLen > 100_000 ? quickTooLongMessage(st().contextPack.quickTooLong) : null);
  }

  async function handleQuickSave() {
    const content = quickText().trim();
    if (!content) return;
    if (quickContextTooLong(content)) {
      setQuickError(quickTooLongMessage(st().contextPack.quickTooLong));
      return;
    }
    setQuickSaving(true);
    setQuickError(null);
    try {
      await ctrl().saveContextPack({
        id: "ctx-" + String(Date.now()),
        title: titleFromContent(content, st().contextPack.quickFallbackTitle),
        content,
        isActive: false,
        createdAt: "",
        updatedAt: "",
      });
      setQuickText("");
    } finally {
      setQuickSaving(false);
    }
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
  const isEditingActive = () => activePack()?.id === draftId();
  const quickTitlePreview = () =>
    titleFromContent(quickText(), st().contextPack.quickFallbackTitle);

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
          <ContextSidebar
            strings={st}
            packs={packs}
            selectedPackId={selectedPackId}
            onEdit={startEdit}
          />

          <div class="context-pack-editor-panel" data-testid="context-pack-editor-panel">
            <QuickContextCard
              strings={st}
              quickText={quickText}
              onInput={handleQuickInput}
              quickError={quickError}
              quickSaving={quickSaving}
              onSave={handleQuickSave}
              titlePreview={quickTitlePreview}
            />

            <ActiveContextBanner
              strings={st}
              activePack={activePack}
              editing={editing}
              onEdit={startEdit}
              onClear={handleClearActive}
            />

            <Show when={editing()}>
              <ContextBriefEditor
                strings={st}
                draftId={draftId}
                draftTitle={draftTitle}
                setDraftTitle={setDraftTitle}
                draftContent={draftContent}
                setDraftContent={setDraftContent}
                saving={saving}
                onSave={handleSave}
                onCancel={resetDraft}
                isEditingActive={isEditingActive}
                confirmingDeleteId={confirmingDeleteId}
                onRequestDelete={requestDeleteConfirm}
                onCancelDelete={cancelDeleteConfirm}
                onDelete={handleDelete}
                onSetActive={handleSetActive}
                onDuplicate={handleDuplicate}
                packs={packs}
                insertExample={insertExampleContent}
              />
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
              <ContextPackList
                strings={st}
                packs={packs}
                selectedPackId={selectedPackId}
                onEdit={startEdit}
              />
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}
