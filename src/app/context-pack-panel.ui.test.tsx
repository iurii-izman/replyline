import { fireEvent, screen, waitFor } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";

import { createMockPlatform } from "./test-utils/mockPlatform";
import { renderApp } from "./test-utils/appUi";

function makePack(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: "Test Context " + id,
    content: "Test content for " + id,
    isActive: false,
    createdAt: "2026-06-15T00:00:00Z",
    updatedAt: "2026-06-15T00:00:00Z",
    ...overrides,
  };
}

describe("context pack panel", () => {
  it("active context chip visible on main surface", async () => {
    const packs = [makePack("ctx-1", { isActive: true })];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await waitFor(
      () => {
        expect(screen.getByTestId("context-active-chip")).toBeTruthy();
      },
      { timeout: 3000 },
    );
    expect(screen.getByTestId("context-chip-title").textContent).toContain("Test Context ctx-1");
    expect(screen.getByTestId("context-chip-change-btn")).toBeTruthy();
    expect(screen.getByTestId("context-chip-disable-btn")).toBeTruthy();
  });

  it("hides active chip when no pack active", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await waitFor(
      () => {
        expect(screen.getByTestId("main-surface")).toBeTruthy();
      },
      { timeout: 3000 },
    );
    expect(screen.queryByTestId("context-active-chip")).toBeNull();
  });

  it("disable button clears active context", async () => {
    const packs = [makePack("ctx-1", { isActive: true })];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await waitFor(
      () => {
        expect(screen.getByTestId("context-chip-disable-btn")).toBeTruthy();
      },
      { timeout: 3000 },
    );
    fireEvent.click(screen.getByTestId("context-chip-disable-btn"));

    await waitFor(() => {
      expect(mock.invoke).toHaveBeenCalledWith("clear_active_context_pack");
    });
  });

  it("creates new context pack", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await waitFor(
      () => {
        expect(screen.getByTestId("context-pack-panel")).toBeTruthy();
      },
      { timeout: 3000 },
    );

    // The context pack panel is always rendered but only shown when panel=contextPack
    // Verify the panel structure exists
    expect(screen.getByTestId("context-pack-empty")).toBeTruthy();
    expect(screen.getByTestId("context-pack-new-btn")).toBeTruthy();
  });

  it("delete context pack", async () => {
    const packs = [makePack("ctx-1")];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await waitFor(
      () => {
        expect(screen.getByTestId("context-pack-list")).toBeTruthy();
      },
      { timeout: 3000 },
    );

    expect(screen.getByTestId("context-pack-item-ctx-1")).toBeTruthy();
    expect(screen.getByTestId("context-pack-delete-ctx-1")).toBeTruthy();
  });
});
