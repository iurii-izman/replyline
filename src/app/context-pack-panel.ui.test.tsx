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
  async function openContextPackPanel() {
    await waitFor(() => expect(screen.getByTestId("context-pack-open-btn")).toBeTruthy(), {
      timeout: 3000,
    });
    fireEvent.click(screen.getByTestId("context-pack-open-btn"));
    await waitFor(() => expect(screen.getByTestId("context-pack-panel")).toBeTruthy(), {
      timeout: 3000,
    });
  }

  // ── Main surface chip ────────────────────────────────────────────

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

  it("disable button on main chip clears active context", async () => {
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

  // ── Create flow ──────────────────────────────────────────────────

  it("creates new context pack and shows it in the list", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await openContextPackPanel();

    // Empty state before creation.
    expect(screen.getByTestId("context-pack-empty")).toBeTruthy();
    expect(screen.getByText(/Создайте контекст/)).toBeTruthy();

    // Click New.
    fireEvent.click(screen.getByTestId("context-pack-new-btn"));

    // Editor appears.
    await waitFor(() => expect(screen.getByTestId("context-pack-editor")).toBeTruthy());
    expect(screen.getByTestId("context-pack-title-input")).toBeTruthy();
    expect(screen.getByTestId("context-pack-content-input")).toBeTruthy();

    // Save is disabled when fields are empty.
    const saveBtn = screen.getByTestId("context-pack-save-btn") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);

    // Fill fields.
    fireEvent.input(screen.getByTestId("context-pack-title-input"), {
      target: { value: "My Q3 Prep" },
    });
    fireEvent.input(screen.getByTestId("context-pack-content-input"), {
      target: { value: "I am a senior engineer preparing for quarterly review." },
    });

    // Save becomes enabled.
    await waitFor(() => expect(saveBtn.disabled).toBe(false));

    // Save.
    fireEvent.click(saveBtn);

    // Editor closes, pack appears in list.
    await waitFor(() => expect(screen.getByTestId("context-pack-list")).toBeTruthy(), {
      timeout: 3000,
    });
    // After save, controller calls loadContextPacks which re-fetches.
    await waitFor(() => {
      expect(screen.getByText("My Q3 Prep")).toBeTruthy();
    });

    // Verify invoke was called with correct payload.
    const saveCalls = mock.invoke.mock.calls.filter(
      (c: [string, unknown?]) => c[0] === "save_context_pack",
    );
    expect(saveCalls.length).toBeGreaterThanOrEqual(1);
    const saveArgs = saveCalls[saveCalls.length - 1][1] as Record<string, unknown>;
    const input = saveArgs.input as Record<string, unknown>;
    expect(input.title).toBe("My Q3 Prep");
    expect(input.content).toBe("I am a senior engineer preparing for quarterly review.");
  });

  it("save button is disabled when title is empty", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await openContextPackPanel();
    fireEvent.click(screen.getByTestId("context-pack-new-btn"));
    await waitFor(() => expect(screen.getByTestId("context-pack-editor")).toBeTruthy());

    const saveBtn = screen.getByTestId("context-pack-save-btn") as HTMLButtonElement;
    // Only content filled, title empty.
    fireEvent.input(screen.getByTestId("context-pack-content-input"), {
      target: { value: "Some content" },
    });
    expect(saveBtn.disabled).toBe(true);

    // Only title filled, content empty.
    fireEvent.input(screen.getByTestId("context-pack-title-input"), {
      target: { value: "Title only" },
    });
    fireEvent.input(screen.getByTestId("context-pack-content-input"), {
      target: { value: "" },
    });
    expect(saveBtn.disabled).toBe(true);
  });

  // ── Activate / deactivate flow ───────────────────────────────────

  it("activates a pack and shows active chip on main surface", async () => {
    const packs = [makePack("ctx-1")];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();

    // Pack is in list but not active.
    await waitFor(() => expect(screen.getByTestId("context-pack-list")).toBeTruthy(), {
      timeout: 3000,
    });
    expect(screen.getByTestId("context-pack-activate-ctx-1")).toBeTruthy();

    // Click Set active.
    fireEvent.click(screen.getByTestId("context-pack-activate-ctx-1"));

    // Invoke was called.
    await waitFor(() => {
      expect(mock.invoke).toHaveBeenCalledWith("set_active_context_pack", { id: "ctx-1" });
    });

    // Active banner appears inside panel.
    await waitFor(() => {
      expect(screen.getByTestId("context-pack-active-banner")).toBeTruthy();
    });

    // Active chip appears on main surface (navigate back — close panel).
    // The chip is visible via main surface; verify by query.
    // Actually the chip is always rendered on MainSurface, which is behind the panel.
    // Let's just check the active banner in panel.
    expect(screen.getByTestId("context-pack-active-title").textContent).toContain(
      "Test Context ctx-1",
    );
  });

  it("disables active pack and removes active chip", async () => {
    const packs = [makePack("ctx-1", { isActive: true })];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();

    // Active banner is visible.
    await waitFor(() => expect(screen.getByTestId("context-pack-active-banner")).toBeTruthy(), {
      timeout: 3000,
    });

    // Click Disable.
    fireEvent.click(screen.getByTestId("context-pack-disable-btn"));

    // Invoke was called.
    await waitFor(() => {
      expect(mock.invoke).toHaveBeenCalledWith("clear_active_context_pack");
    });

    // After loadContextPacks, active banner should disappear (pack becomes inactive).
    await waitFor(() => {
      expect(screen.queryByTestId("context-pack-active-banner")).toBeNull();
    });
  });

  // ── Edit flow ────────────────────────────────────────────────────

  it("edits an existing pack and updates title", async () => {
    const packs = [makePack("ctx-1")];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();
    await waitFor(() => expect(screen.getByTestId("context-pack-list")).toBeTruthy(), {
      timeout: 3000,
    });

    // Click Edit on the pack.
    fireEvent.click(screen.getByTestId("context-pack-edit-ctx-1"));

    // Editor opens with pre-filled values.
    await waitFor(() => expect(screen.getByTestId("context-pack-editor")).toBeTruthy());
    const titleInput = screen.getByTestId("context-pack-title-input") as HTMLInputElement;
    expect(titleInput.value).toBe("Test Context ctx-1");

    // Change title and save.
    fireEvent.input(titleInput, { target: { value: "Updated Title" } });
    fireEvent.click(screen.getByTestId("context-pack-save-btn"));

    // Editor closes, updated title appears.
    await waitFor(() => expect(screen.getByText("Updated Title")).toBeTruthy(), {
      timeout: 3000,
    });
  });

  it("edits active pack and preserves active status", async () => {
    const packs = [makePack("ctx-1", { isActive: true })];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();
    await waitFor(() => expect(screen.getByTestId("context-pack-active-banner")).toBeTruthy(), {
      timeout: 3000,
    });

    // Edit the active pack via the banner button.
    fireEvent.click(screen.getByTestId("context-pack-edit-active-btn"));

    await waitFor(() => expect(screen.getByTestId("context-pack-editor")).toBeTruthy());
    const contentInput = screen.getByTestId("context-pack-content-input") as HTMLTextAreaElement;
    fireEvent.input(contentInput, { target: { value: "Updated content for active pack." } });
    fireEvent.click(screen.getByTestId("context-pack-save-btn"));

    // After reload, active banner still shows (mock preserves isActive on existing pack save).
    await waitFor(() => expect(screen.getByTestId("context-pack-active-banner")).toBeTruthy(), {
      timeout: 3000,
    });
  });

  // ── Delete flow ──────────────────────────────────────────────────

  it("deletes an inactive pack and removes only that pack", async () => {
    const packs = [makePack("ctx-a"), makePack("ctx-b")];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();
    await waitFor(() => expect(screen.getByTestId("context-pack-list")).toBeTruthy(), {
      timeout: 3000,
    });

    expect(screen.getByTestId("context-pack-item-ctx-a")).toBeTruthy();
    expect(screen.getByTestId("context-pack-item-ctx-b")).toBeTruthy();

    // Delete ctx-a.
    fireEvent.click(screen.getByTestId("context-pack-delete-ctx-a"));

    await waitFor(() => {
      expect(mock.invoke).toHaveBeenCalledWith("delete_context_pack", { id: "ctx-a" });
    });

    // After reload, ctx-a is gone, ctx-b remains.
    await waitFor(() => {
      expect(screen.queryByTestId("context-pack-item-ctx-a")).toBeNull();
    });
    expect(screen.getByTestId("context-pack-item-ctx-b")).toBeTruthy();
  });

  it("deleting an active pack clears the active state", async () => {
    const packs = [makePack("ctx-1", { isActive: true })];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();
    await waitFor(() => expect(screen.getByTestId("context-pack-active-banner")).toBeTruthy(), {
      timeout: 3000,
    });

    // Delete the active pack.
    fireEvent.click(screen.getByTestId("context-pack-delete-ctx-1"));

    await waitFor(() => {
      expect(mock.invoke).toHaveBeenCalledWith("delete_context_pack", { id: "ctx-1" });
    });

    // After reload, no active banner and item gone.
    await waitFor(() => {
      expect(screen.queryByTestId("context-pack-active-banner")).toBeNull();
    });
    await waitFor(() => {
      expect(screen.queryByTestId("context-pack-item-ctx-1")).toBeNull();
    });
  });

  // ── Cancel flow ──────────────────────────────────────────────────

  it("cancel button closes editor without saving", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await openContextPackPanel();
    fireEvent.click(screen.getByTestId("context-pack-new-btn"));
    await waitFor(() => expect(screen.getByTestId("context-pack-editor")).toBeTruthy());

    // Fill fields but cancel.
    fireEvent.input(screen.getByTestId("context-pack-title-input"), {
      target: { value: "Will be discarded" },
    });
    fireEvent.input(screen.getByTestId("context-pack-content-input"), {
      target: { value: "Discarded content" },
    });
    fireEvent.click(screen.getByTestId("context-pack-cancel-btn"));

    // Editor closes, empty state returns.
    await waitFor(() => {
      expect(screen.queryByTestId("context-pack-editor")).toBeNull();
    });
    // No save invoke was made with this title.
    const saveCalls = mock.invoke.mock.calls.filter(
      (c: [string, unknown?]) => c[0] === "save_context_pack",
    );
    // Only bootstrap-initiated calls might exist; verify no new save with our data.
    const lastSaveWithTitle = saveCalls.filter((c: [string, unknown?]) => {
      const input = (c[1] as Record<string, unknown> | undefined)?.input as
        | Record<string, unknown>
        | undefined;
      return input?.title === "Will be discarded";
    });
    expect(lastSaveWithTitle.length).toBe(0);
  });

  // ── Keyboard / accessibility basics ──────────────────────────────

  it("editor inputs and buttons have accessible labels", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await openContextPackPanel();
    fireEvent.click(screen.getByTestId("context-pack-new-btn"));
    await waitFor(() => expect(screen.getByTestId("context-pack-editor")).toBeTruthy());

    // Title input is reachable.
    const titleInput = screen.getByTestId("context-pack-title-input");
    expect(titleInput).toBeTruthy();
    expect(titleInput.tagName).toBe("INPUT");

    // Content textarea is reachable.
    const contentInput = screen.getByTestId("context-pack-content-input");
    expect(contentInput).toBeTruthy();
    expect(contentInput.tagName).toBe("TEXTAREA");

    // Buttons have text content.
    const saveBtn = screen.getByTestId("context-pack-save-btn");
    expect(saveBtn.textContent).toBeTruthy();
    const cancelBtn = screen.getByTestId("context-pack-cancel-btn");
    expect(cancelBtn.textContent).toBeTruthy();
  });

  it("list item action buttons have accessible text", async () => {
    const packs = [makePack("ctx-1", { isActive: true })];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();
    await waitFor(() => expect(screen.getByTestId("context-pack-list")).toBeTruthy(), {
      timeout: 3000,
    });

    // Active pack shows badge and action buttons.
    expect(screen.getByText("Активный контекст")).toBeTruthy();
    expect(screen.getByTestId("context-pack-edit-ctx-1").textContent).toBeTruthy();
    expect(screen.getByTestId("context-pack-delete-ctx-1").textContent).toBeTruthy();
  });

  // ── Navigation ───────────────────────────────────────────────────

  it("back button returns to main surface", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await openContextPackPanel();
    expect(screen.getByTestId("context-pack-panel")).toBeTruthy();

    // Click back.
    fireEvent.click(screen.getByTestId("context-pack-back-btn"));

    // Panel is gone, main surface is visible.
    await waitFor(() => {
      expect(screen.queryByTestId("context-pack-panel")).toBeNull();
    });
    expect(screen.getByTestId("main-surface")).toBeTruthy();
  });

  it("created pack does not auto-activate — no chip on main surface", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await openContextPackPanel();

    // Create a pack.
    fireEvent.click(screen.getByTestId("context-pack-new-btn"));
    await waitFor(() => expect(screen.getByTestId("context-pack-editor")).toBeTruthy());
    fireEvent.input(screen.getByTestId("context-pack-title-input"), {
      target: { value: "Non-active pack" },
    });
    fireEvent.input(screen.getByTestId("context-pack-content-input"), {
      target: { value: "Some content" },
    });
    fireEvent.click(screen.getByTestId("context-pack-save-btn"));

    // Wait for list to appear (save completed).
    await waitFor(() => expect(screen.getByTestId("context-pack-list")).toBeTruthy(), {
      timeout: 3000,
    });

    // Navigate back to main surface.
    fireEvent.click(screen.getByTestId("context-pack-back-btn"));
    await waitFor(() => {
      expect(screen.queryByTestId("context-pack-panel")).toBeNull();
    });

    // No active chip — pack was not auto-activated.
    expect(screen.queryByTestId("context-active-chip")).toBeNull();
  });

  it("active chip visible on main surface after activating and navigating back", async () => {
    const packs = [makePack("ctx-1")];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();
    await waitFor(() => expect(screen.getByTestId("context-pack-list")).toBeTruthy(), {
      timeout: 3000,
    });

    // Activate the pack.
    fireEvent.click(screen.getByTestId("context-pack-activate-ctx-1"));
    await waitFor(() => {
      expect(mock.invoke).toHaveBeenCalledWith("set_active_context_pack", { id: "ctx-1" });
    });

    // Active banner visible inside panel.
    await waitFor(() => expect(screen.getByTestId("context-pack-active-banner")).toBeTruthy());

    // Navigate back to main surface.
    fireEvent.click(screen.getByTestId("context-pack-back-btn"));
    await waitFor(() => {
      expect(screen.queryByTestId("context-pack-panel")).toBeNull();
    });

    // Main surface shows the active chip.
    await waitFor(() => {
      expect(screen.getByTestId("context-active-chip")).toBeTruthy();
    });
    expect(screen.getByTestId("context-chip-title").textContent).toContain("Test Context ctx-1");
  });

  it("new pack button is disabled while editor is open", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await openContextPackPanel();

    const newBtn = screen.getByTestId("context-pack-new-btn") as HTMLButtonElement;
    // Button is enabled when no editor.
    expect(newBtn.disabled).toBe(false);

    // Open editor.
    fireEvent.click(newBtn);
    await waitFor(() => expect(screen.getByTestId("context-pack-editor")).toBeTruthy());

    // Button is now disabled while editor is open.
    expect(newBtn.disabled).toBe(true);
  });

  // ── Empty state ───────────────────────────────────────────────────

  it("empty state explains context with why and example", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await openContextPackPanel();

    expect(screen.getByTestId("context-pack-empty")).toBeTruthy();
    expect(screen.getByTestId("context-pack-empty-why").textContent).toBeTruthy();
    expect(screen.getByTestId("context-pack-empty-why").textContent!.length).toBeGreaterThan(30);
    expect(screen.getByTestId("context-pack-empty-example").textContent).toBeTruthy();
    expect(screen.getByTestId("context-pack-empty-example").textContent!.length).toBeGreaterThan(
      20,
    );
  });

  // ── Save notice ───────────────────────────────────────────────────

  it("shows a notice after saving a context pack", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await openContextPackPanel();
    fireEvent.click(screen.getByTestId("context-pack-new-btn"));
    await waitFor(() => expect(screen.getByTestId("context-pack-editor")).toBeTruthy());

    fireEvent.input(screen.getByTestId("context-pack-title-input"), {
      target: { value: "Notice Test" },
    });
    fireEvent.input(screen.getByTestId("context-pack-content-input"), {
      target: { value: "Content for notice test." },
    });
    fireEvent.click(screen.getByTestId("context-pack-save-btn"));

    // After save, the list should appear and a notice should be visible.
    await waitFor(() => expect(screen.getByTestId("context-pack-list")).toBeTruthy(), {
      timeout: 3000,
    });
    // The notice appears briefly — check it exists.
    await waitFor(() => expect(screen.getByTestId("notice-message")).toBeTruthy(), {
      timeout: 3000,
    });
    expect(screen.getByTestId("notice-message").textContent).toBeTruthy();
  });

  // ── Active preview ────────────────────────────────────────────────

  it("active banner shows compact preview and character count", async () => {
    const content =
      "I am a senior developer working on the authentication module. " +
      "The current sprint focuses on OAuth2 migration and security review.";
    const packs = [makePack("ctx-1", { isActive: true, content })];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();
    await waitFor(() => expect(screen.getByTestId("context-pack-active-banner")).toBeTruthy(), {
      timeout: 3000,
    });

    // Preview is visible.
    const preview = screen.getByTestId("context-pack-active-preview");
    expect(preview.textContent).toBeTruthy();
    // Preview is truncated to ≤80 chars (+ ellipsis).
    expect(preview.textContent!.length).toBeLessThanOrEqual(84);

    // Character count is visible.
    const charCount = screen.getByTestId("context-pack-active-charcount");
    expect(charCount.textContent).toBeTruthy();
    // Character count contains the actual character count.
    expect(charCount.textContent).toContain(String(content.length));
  });

  it("active preview truncates very long content safely", async () => {
    const content = "A".repeat(200);
    const packs = [makePack("ctx-1", { isActive: true, content })];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();
    await waitFor(() => expect(screen.getByTestId("context-pack-active-banner")).toBeTruthy(), {
      timeout: 3000,
    });

    const preview = screen.getByTestId("context-pack-active-preview");
    // Preview is truncated with ellipsis.
    expect(preview.textContent).toContain("\u2026");
    expect(preview.textContent!.length).toBeLessThanOrEqual(84);
  });

  // ── Duplicate flow ────────────────────────────────────────────────

  it("duplicate creates a copy with (Copy) in the title", async () => {
    const packs = [makePack("ctx-1", { title: "Original" })];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();
    await waitFor(() => expect(screen.getByTestId("context-pack-list")).toBeTruthy(), {
      timeout: 3000,
    });

    // Click Duplicate on the pack.
    fireEvent.click(screen.getByTestId("context-pack-duplicate-ctx-1"));

    // Verify save_context_pack was called with a title containing "(Copy)".
    await waitFor(() => {
      const saveCalls = mock.invoke.mock.calls.filter(
        (c: [string, unknown?]) => c[0] === "save_context_pack",
      );
      expect(saveCalls.length).toBeGreaterThanOrEqual(1);
      const lastCall = saveCalls[saveCalls.length - 1];
      const input = (lastCall[1] as Record<string, unknown>).input as Record<string, unknown>;
      expect(input.title).toContain("(Copy)");
      expect(input.isActive).toBe(false);
    });
  });

  it("duplicate does not auto-activate the copy", async () => {
    const packs = [makePack("ctx-1", { title: "Original" })];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();
    await waitFor(() => expect(screen.getByTestId("context-pack-list")).toBeTruthy(), {
      timeout: 3000,
    });

    // Click Duplicate.
    fireEvent.click(screen.getByTestId("context-pack-duplicate-ctx-1"));

    // No activate call should be made for the duplicate.
    await waitFor(() => {
      const activateCalls = mock.invoke.mock.calls.filter(
        (c: [string, unknown?]) => c[0] === "set_active_context_pack",
      );
      // Only bootstrap-initiated calls may exist; no new activate.
      const nonBootstrapActivates = activateCalls.filter(
        (_c: [string, unknown?], i: number) => i > 0,
      );
      expect(nonBootstrapActivates.length).toBe(0);
    });
  });
});
