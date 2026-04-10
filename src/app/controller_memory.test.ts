import { describe, expect, it, vi } from "vitest";

import { createMemorySlice } from "./controller_memory";
import { ui_ru } from "./locale";
import type { AnalysisCard, MemorySpaceRecord } from "./model";

function makeCard(): AnalysisCard {
  return {
    gist: "Согласовать окно релиза",
    sayNow: "Давайте зафиксируем владельца до конца дня.",
    nextMove: "Отправить резюме в чат.",
  };
}

describe("controller_memory slice", () => {
  it("loads spaces and selects first active space", async () => {
    let currentActive: string | null = null;
    const setActiveSpaceId = vi.fn((id: string | null) => {
      currentActive = id;
    });
    const setMemorySpaces = vi.fn();
    const platform = {
      invoke: vi.fn(async (command: string) => {
        if (command === "memory_list_spaces") {
          return [
            {
              id: "team:qa",
              kind: "team",
              label: "QA",
              status: "active",
              createdAt: "2026-04-07T10:00:00Z",
              updatedAt: "2026-04-07T10:00:00Z",
            },
          ];
        }
        throw new Error("unexpected command");
      }),
    } as unknown as {
      invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
    };

    const slice = createMemorySlice({
      platform: platform as never,
      strings: () => ui_ru,
      card: () => makeCard(),
      activeSpaceId: () => currentActive,
      setMemorySpaces: setMemorySpaces as never,
      setActiveSpaceId,
      setSettingsFormHint: vi.fn(),
      setCopyNotice: vi.fn(),
      setError: vi.fn(),
      onMemoryRecordChanged: vi.fn(),
    });

    await slice.loadMemorySpaces();

    expect(setMemorySpaces).toHaveBeenCalledOnce();
    expect(setActiveSpaceId).toHaveBeenCalledWith("team:qa");
  });

  it("saves current card into active memory record", async () => {
    const setCopyNotice = vi.fn();
    const setError = vi.fn();
    const nowRecord: MemorySpaceRecord = {
      space: {
        id: "team:qa",
        kind: "team",
        label: "QA",
        status: "active",
        createdAt: "2026-04-07T10:00:00Z",
        updatedAt: "2026-04-07T10:00:00Z",
      },
      facts: [],
      commitments: [],
      terms: [],
    };

    const platform = {
      invoke: vi.fn(async (command: string) => {
        if (command === "memory_get_space_record") return structuredClone(nowRecord);
        if (command === "memory_save_space_record") return null;
        throw new Error("unexpected command");
      }),
    } as unknown as {
      invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
    };

    const onMemoryRecordChanged = vi.fn();
    const slice = createMemorySlice({
      platform: platform as never,
      strings: () => ui_ru,
      card: () => makeCard(),
      activeSpaceId: () => "team:qa",
      setMemorySpaces: vi.fn(),
      setActiveSpaceId: vi.fn(),
      setSettingsFormHint: vi.fn(),
      setCopyNotice,
      setError,
      onMemoryRecordChanged,
    });

    await slice.saveCardToMemory();

    expect(platform.invoke).toHaveBeenCalledWith("memory_get_space_record", { spaceId: "team:qa" });
    expect(platform.invoke).toHaveBeenCalledWith(
      "memory_save_space_record",
      expect.objectContaining({
        input: expect.objectContaining({
          facts: expect.arrayContaining([
            expect.objectContaining({
              category: "context",
              sourceKind: "saved_card",
            }),
          ]),
        }),
      }),
    );
    expect(setCopyNotice).toHaveBeenCalledOnce();
    expect(setError).not.toHaveBeenCalled();
    expect(onMemoryRecordChanged).toHaveBeenCalledOnce();
  });

  it("removes last saved_card fact from active space", async () => {
    const setSettingsFormHint = vi.fn();
    const setCopyNotice = vi.fn();
    const record: MemorySpaceRecord = {
      space: {
        id: "team:qa",
        kind: "team",
        label: "QA",
        status: "active",
        createdAt: "2026-04-07T10:00:00Z",
        updatedAt: "2026-04-07T10:00:00Z",
      },
      facts: [
        {
          id: "f1",
          text: "manual",
          category: "goal",
          sourceKind: "manual",
          confidence: 1,
          confirmedByUser: true,
          createdAt: "2026-04-07T10:00:00Z",
          updatedAt: "2026-04-07T10:00:00Z",
        },
        {
          id: "f2",
          text: "from card",
          category: "context",
          sourceKind: "saved_card",
          confidence: 0.8,
          confirmedByUser: false,
          createdAt: "2026-04-07T11:00:00Z",
          updatedAt: "2026-04-07T11:00:00Z",
        },
      ],
      commitments: [],
      terms: [],
    };

    const platform = {
      invoke: vi.fn(async (command: string) => {
        if (command === "memory_get_space_record") return structuredClone(record);
        if (command === "memory_save_space_record") return null;
        throw new Error("unexpected command");
      }),
    } as unknown as {
      invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
    };

    const slice = createMemorySlice({
      platform: platform as never,
      strings: () => ui_ru,
      card: () => makeCard(),
      activeSpaceId: () => "team:qa",
      setMemorySpaces: vi.fn(),
      setActiveSpaceId: vi.fn(),
      setSettingsFormHint,
      setCopyNotice,
      setError: vi.fn(),
    });

    await slice.removeLastSavedCardFromMemory();

    const saveCall = (platform.invoke as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === "memory_save_space_record",
    );
    expect(saveCall).toBeDefined();
    const saved = (saveCall![1] as { input: MemorySpaceRecord }).input;
    expect(saved.facts).toHaveLength(1);
    expect(saved.facts[0]!.sourceKind).toBe("manual");
    expect(setCopyNotice).toHaveBeenCalledOnce();
    expect(setSettingsFormHint).not.toHaveBeenCalled();
  });
});
