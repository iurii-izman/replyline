import type { Accessor } from "solid-js";

import { invokeErrorMessage, type AnalysisCard, type MemorySpace, type MemorySpaceRecord } from "./model";
import type { AppPlatform } from "./platform";
import { ui } from "./locale";

type MemorySliceDeps = {
  platform: AppPlatform;
  card: Accessor<AnalysisCard | null>;
  activeSpaceId: Accessor<string | null>;
  setMemorySpaces: (spaces: MemorySpace[]) => void;
  setActiveSpaceId: (id: string | null) => void;
  setSettingsFormHint: (hint: string | null) => void;
  setCopyNotice: (notice: string | null) => void;
  setError: (message: string | null) => void;
  onMemoryRecordChanged?: () => void;
};

function makeMemorySpaceId(label: string, kind: "team" | "thread" | "contact"): string {
  return `${kind}:${label.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`;
}

function userSafeMemoryError(err: unknown): string {
  const message = invokeErrorMessage(err);
  if (/Memory input is invalid/i.test(message)) {
    return "Память: данные не прошли проверку. Проверьте поля и повторите.";
  }
  if (/Memory space not found/i.test(message)) {
    return "Память: выбранное пространство не найдено. Обновите список.";
  }
  return "Память: операция не выполнена. Повторите позже.";
}

export function createMemorySlice(deps: MemorySliceDeps) {
  async function loadMemorySpaces() {
    try {
      const spaces = await deps.platform.invoke<MemorySpace[]>("memory_list_spaces");
      deps.setMemorySpaces(spaces);
      if (!deps.activeSpaceId() && spaces.length > 0) {
        deps.setActiveSpaceId(spaces[0].id);
      }
    } catch {
      deps.setMemorySpaces([]);
    }
  }

  async function createMemorySpace(label: string, kind: "team" | "thread" | "contact") {
    const now = new Date().toISOString();
    const id = makeMemorySpaceId(label, kind);
    const record: MemorySpaceRecord = {
      space: { id, kind, label, status: "active", createdAt: now, updatedAt: now },
      facts: [],
      commitments: [],
      terms: [],
    };
    try {
      await deps.platform.invoke("memory_save_space_record", { input: record });
      await loadMemorySpaces();
      deps.setActiveSpaceId(id);
      deps.onMemoryRecordChanged?.();
    } catch (err) {
      deps.setSettingsFormHint(userSafeMemoryError(err));
    }
  }

  async function saveCardToMemory() {
    const currentCard = deps.card();
    const spaceId = deps.activeSpaceId();
    if (!currentCard || !spaceId) return;

    try {
      const record = await deps.platform.invoke<MemorySpaceRecord>("memory_get_space_record", {
        spaceId,
      });
      const now = new Date().toISOString();
      record.facts.push({
        id: `fact-card-${Date.now()}`,
        text: `${currentCard.gist} -> ${currentCard.nextMove}`,
        category: "context",
        sourceKind: "saved_card",
        confidence: 0.8,
        confirmedByUser: false,
        createdAt: now,
        updatedAt: now,
      });
      record.space.updatedAt = now;
      await deps.platform.invoke("memory_save_space_record", { input: record });
      deps.setCopyNotice(ui.memory.savedToMemory);
      deps.onMemoryRecordChanged?.();
    } catch (err) {
      deps.setError(userSafeMemoryError(err));
    }
  }

  async function removeLastSavedCardFromMemory() {
    const spaceId = deps.activeSpaceId();
    if (!spaceId) return;
    try {
      const record = await deps.platform.invoke<MemorySpaceRecord>("memory_get_space_record", {
        spaceId,
      });
      let idx = -1;
      for (let i = record.facts.length - 1; i >= 0; i--) {
        if (record.facts[i]!.sourceKind === "saved_card") {
          idx = i;
          break;
        }
      }
      if (idx < 0) {
        deps.setSettingsFormHint(ui.memory.noSavedCardToRemove);
        return;
      }
      record.facts.splice(idx, 1);
      const now = new Date().toISOString();
      record.space.updatedAt = now;
      await deps.platform.invoke("memory_save_space_record", { input: record });
      deps.onMemoryRecordChanged?.();
      deps.setCopyNotice(ui.memory.removedLastSavedCard);
    } catch (err) {
      deps.setSettingsFormHint(userSafeMemoryError(err));
    }
  }

  return {
    loadMemorySpaces,
    createMemorySpace,
    saveCardToMemory,
    removeLastSavedCardFromMemory,
  };
}
