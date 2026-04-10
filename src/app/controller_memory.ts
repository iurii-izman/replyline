import type { Accessor } from "solid-js";

import type { UiStrings } from "./locale";
import {
  invokeErrorMessage,
  type AnalysisCard,
  type MemorySpace,
  type MemorySpaceRecord,
} from "./model";
import type { AppPlatform } from "./platform";

type MemorySliceDeps = {
  platform: AppPlatform;
  strings: Accessor<UiStrings>;
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

function userSafeMemoryError(err: unknown, s: UiStrings): string {
  const message = invokeErrorMessage(err);
  if (/Memory input is invalid/i.test(message)) {
    return s.memory.invokeInvalid;
  }
  if (/Memory space not found/i.test(message)) {
    return s.memory.invokeSpaceMissing;
  }
  return s.memory.invokeGeneric;
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
      deps.setSettingsFormHint(userSafeMemoryError(err, deps.strings()));
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
      deps.setCopyNotice(deps.strings().memory.savedToMemory);
      deps.onMemoryRecordChanged?.();
    } catch (err) {
      deps.setError(userSafeMemoryError(err, deps.strings()));
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
        deps.setSettingsFormHint(deps.strings().memory.noSavedCardToRemove);
        return;
      }
      record.facts.splice(idx, 1);
      const now = new Date().toISOString();
      record.space.updatedAt = now;
      await deps.platform.invoke("memory_save_space_record", { input: record });
      deps.onMemoryRecordChanged?.();
      deps.setCopyNotice(deps.strings().memory.removedLastSavedCard);
    } catch (err) {
      deps.setSettingsFormHint(userSafeMemoryError(err, deps.strings()));
    }
  }

  return {
    loadMemorySpaces,
    createMemorySpace,
    saveCardToMemory,
    removeLastSavedCardFromMemory,
  };
}
