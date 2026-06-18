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

  /** Opens a context in the editor by clicking its chip in the list. */
  async function openContextInEditor(packId: string) {
    await waitFor(() => expect(screen.getByTestId("context-pack-list")).toBeTruthy(), {
      timeout: 3000,
    });
    fireEvent.click(screen.getByTestId("context-pack-item-" + packId));
    await waitFor(() => expect(screen.getByTestId("context-pack-editor")).toBeTruthy());
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
    const emptyState = screen.getByTestId("context-pack-empty");
    expect(emptyState).toBeTruthy();
    expect(emptyState.textContent).toContain("Создайте контекст");

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
      expect(screen.getAllByText("My Q3 Prep").length).toBeGreaterThanOrEqual(1);
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

  it("quick pasted context creates a local draft with auto-title", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await openContextPackPanel();

    const quickInput = screen.getByTestId("quick-context-input") as HTMLTextAreaElement;
    fireEvent.input(quickInput, {
      target: {
        value: "  Project Gemini kickoff\nBring up Q3 scope, launch risk, and owner map.  ",
      },
    });

    expect(quickInput.value).toContain("Project Gemini kickoff");
    expect(screen.getByTestId("quick-context-title-preview").textContent).toContain(
      "Project Gemini kickoff",
    );
  });

  it("quick pasted context saves an inactive ContextPack with trimmed content", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await openContextPackPanel();

    fireEvent.input(screen.getByTestId("quick-context-input"), {
      target: {
        value: "\n  Client renewal call\n  Discuss renewal risk and pricing guardrails.  \n",
      },
    });
    fireEvent.click(screen.getByTestId("quick-context-save-btn"));

    await waitFor(() => {
      const saveCalls = mock.invoke.mock.calls.filter(
        (c: [string, unknown?]) => c[0] === "save_context_pack",
      );
      expect(saveCalls.length).toBeGreaterThanOrEqual(1);
      const input = (saveCalls[saveCalls.length - 1][1] as Record<string, unknown>).input as
        | Record<string, unknown>
        | undefined;
      expect(input?.title).toBe("Client renewal call");
      expect(input?.content).toBe(
        "Client renewal call\n  Discuss renewal risk and pricing guardrails.",
      );
      expect(input?.isActive).toBe(false);
    });

    const activateCalls = mock.invoke.mock.calls.filter(
      (c: [string, unknown?]) => c[0] === "set_active_context_pack",
    );
    expect(activateCalls.length).toBe(0);
    expect(screen.queryByTestId("context-pack-active-banner")).toBeNull();
  });

  it("quick pasted context uses safe fallback title when first line is blank markup", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await openContextPackPanel();

    fireEvent.input(screen.getByTestId("quick-context-input"), {
      target: { value: "###\n\n-   \n\nActual notes start later." },
    });
    fireEvent.click(screen.getByTestId("quick-context-save-btn"));

    await waitFor(() => {
      const saveCalls = mock.invoke.mock.calls.filter(
        (c: [string, unknown?]) => c[0] === "save_context_pack",
      );
      const input = (saveCalls[saveCalls.length - 1][1] as Record<string, unknown>).input as
        | Record<string, unknown>
        | undefined;
      expect(input?.title).toBe("Actual notes start later.");
    });
  });

  it("quick pasted context shows safe error for too long content", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await openContextPackPanel();

    const tooLong = "x".repeat(100_001);
    fireEvent.input(screen.getByTestId("quick-context-input"), {
      target: { value: tooLong },
    });

    expect(screen.getByTestId("quick-context-error").textContent).toContain("100000");
    expect(screen.getByTestId("quick-context-error").textContent).not.toContain(tooLong);
    expect(screen.getByTestId("quick-context-save-btn")).toHaveProperty("disabled", true);
    expect(
      mock.invoke.mock.calls.some((c: [string, unknown?]) => c[0] === "save_context_pack"),
    ).toBe(false);
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

    // Open pack in editor to see the Set Active button.
    await openContextInEditor("ctx-1");
    expect(screen.getByTestId("context-pack-activate-ctx-1")).toBeTruthy();

    // Click Set active.
    fireEvent.click(screen.getByTestId("context-pack-activate-ctx-1"));

    // Invoke was called.
    await waitFor(() => {
      expect(mock.invoke).toHaveBeenCalledWith("set_active_context_pack", { id: "ctx-1" });
    });

    // Active indicator appears inside editor.
    await waitFor(() => {
      expect(screen.getByTestId("context-brief-editor-active")).toBeTruthy();
    });
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

    // After loadContextPacks, active banner should disappear.
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

    // Click on the pack chip to open editor.
    await openContextInEditor("ctx-1");

    const titleInput = screen.getByTestId("context-pack-title-input") as HTMLInputElement;
    expect(titleInput.value).toBe("Test Context ctx-1");

    // Change title and save.
    fireEvent.input(titleInput, { target: { value: "Updated Title" } });
    fireEvent.click(screen.getByTestId("context-pack-save-btn"));

    // Editor closes, updated title appears in chips.
    await waitFor(
      () => expect(screen.getAllByText("Updated Title").length).toBeGreaterThanOrEqual(1),
      {
        timeout: 3000,
      },
    );
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
    // Active indicator should be visible inside editor
    expect(screen.getByTestId("context-brief-editor-active")).toBeTruthy();
    const contentInput = screen.getByTestId("context-pack-content-input") as HTMLTextAreaElement;
    fireEvent.input(contentInput, {
      target: { value: "Updated content for active pack with enough detail." },
    });
    fireEvent.click(screen.getByTestId("context-pack-save-btn"));

    // After reload, active banner still shows.
    await waitFor(() => expect(screen.getByTestId("context-pack-active-banner")).toBeTruthy(), {
      timeout: 3000,
    });
  });

  // ── Delete flow ──────────────────────────────────────────────────

  it("deletes an inactive pack after confirmation step", async () => {
    const packs = [makePack("ctx-a"), makePack("ctx-b")];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();

    // Both packs visible as chips.
    await waitFor(() => expect(screen.getByTestId("context-pack-item-ctx-a")).toBeTruthy(), {
      timeout: 3000,
    });
    expect(screen.getByTestId("context-pack-item-ctx-b")).toBeTruthy();

    // Open ctx-a in editor to access delete button.
    await openContextInEditor("ctx-a");

    // First click: request confirm.
    fireEvent.click(screen.getByTestId("context-pack-delete-ctx-a"));
    await waitFor(() => {
      expect(screen.getByTestId("context-pack-delete-confirm-ctx-a")).toBeTruthy();
    });
    expect(screen.queryByTestId("context-pack-delete-ctx-a")).toBeNull();

    // Second click: confirm delete.
    fireEvent.click(screen.getByTestId("context-pack-delete-confirm-ctx-a"));

    await waitFor(() => {
      expect(mock.invoke).toHaveBeenCalledWith("delete_context_pack", { id: "ctx-a" });
    });

    // After reload, ctx-a is gone, ctx-b remains.
    await waitFor(() => {
      expect(screen.queryByTestId("context-pack-item-ctx-a")).toBeNull();
    });
    expect(screen.getByTestId("context-pack-item-ctx-b")).toBeTruthy();
  });

  it("deleting an active pack clears the active state via confirmation", async () => {
    const packs = [makePack("ctx-1", { isActive: true })];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();
    await waitFor(() => expect(screen.getByTestId("context-pack-active-banner")).toBeTruthy(), {
      timeout: 3000,
    });

    // Open ctx-1 in editor to access delete.
    await openContextInEditor("ctx-1");

    // Request confirm.
    fireEvent.click(screen.getByTestId("context-pack-delete-ctx-1"));
    await waitFor(() => {
      expect(screen.getByTestId("context-pack-delete-confirm-ctx-1")).toBeTruthy();
    });

    // Confirm delete.
    fireEvent.click(screen.getByTestId("context-pack-delete-confirm-ctx-1"));

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

  it("chips show active context and are clickable", async () => {
    const packs = [makePack("ctx-1", { isActive: true })];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();
    // Active banner should be visible.
    await waitFor(() => expect(screen.getByTestId("context-pack-active-banner")).toBeTruthy(), {
      timeout: 3000,
    });
    // Active label is present in banner.
    expect(screen.getByTestId("context-pack-active-banner").textContent).toContain(
      "Активный контекст",
    );
    // Chip list is visible and chip is clickable.
    expect(screen.getByTestId("context-pack-list")).toBeTruthy();
    expect(screen.getByTestId("context-pack-item-ctx-1").tagName).toBe("BUTTON");
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

    // Open pack in editor and click Set Active.
    await openContextInEditor("ctx-1");
    fireEvent.click(screen.getByTestId("context-pack-activate-ctx-1"));
    await waitFor(() => {
      expect(mock.invoke).toHaveBeenCalledWith("set_active_context_pack", { id: "ctx-1" });
    });

    // Close editor first, then active banner appears.
    fireEvent.click(screen.getByTestId("context-pack-cancel-btn"));
    await waitFor(() => expect(screen.queryByTestId("context-pack-editor")).toBeNull());
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
    await waitFor(() => expect(screen.getByTestId("notice-message")).toBeTruthy(), {
      timeout: 3000,
    });
    expect(screen.getByTestId("notice-message").textContent).toBeTruthy();
  });

  // ── Active banner ────────────────────────────────────────────────

  it("active banner shows context title and character count", async () => {
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

    // Title is visible.
    expect(screen.getByTestId("context-pack-active-title").textContent).toContain("Test Context");
    // Character count is visible in the banner.
    const banner = screen.getByTestId("context-pack-active-banner");
    expect(banner.textContent).toContain(String(content.length));
  });

  // ── Duplicate flow ────────────────────────────────────────────────

  it("duplicate creates a copy with localized suffix", async () => {
    const packs = [makePack("ctx-1", { title: "Original" })];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();

    // Open pack in editor to access duplicate button.
    await openContextInEditor("ctx-1");

    // Click Duplicate.
    fireEvent.click(screen.getByTestId("context-pack-duplicate-ctx-1"));

    // Verify save_context_pack was called with localized suffix.
    await waitFor(() => {
      const saveCalls = mock.invoke.mock.calls.filter(
        (c: [string, unknown?]) => c[0] === "save_context_pack",
      );
      expect(saveCalls.length).toBeGreaterThanOrEqual(1);
      const lastCall = saveCalls[saveCalls.length - 1];
      const input = (lastCall[1] as Record<string, unknown>).input as Record<string, unknown>;
      expect(input.title).toContain(" (копия)");
      expect(input.title).not.toContain("(Copy)");
      expect(input.isActive).toBe(false);
    });
  });

  it("duplicate does not auto-activate the copy", async () => {
    const packs = [makePack("ctx-1", { title: "Original" })];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();
    await openContextInEditor("ctx-1");

    // Click Duplicate.
    fireEvent.click(screen.getByTestId("context-pack-duplicate-ctx-1"));

    // No activate call should be made for the duplicate.
    await waitFor(() => {
      const activateCalls = mock.invoke.mock.calls.filter(
        (c: [string, unknown?]) => c[0] === "set_active_context_pack",
      );
      const nonBootstrapActivates = activateCalls.filter(
        (_c: [string, unknown?], i: number) => i > 0,
      );
      expect(nonBootstrapActivates.length).toBe(0);
    });
  });

  // ── Delete confirmation safety ────────────────────────────────────

  it("cancel delete confirm returns to normal delete button", async () => {
    const packs = [makePack("ctx-1")];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();
    await openContextInEditor("ctx-1");

    // Click delete — confirm buttons appear.
    fireEvent.click(screen.getByTestId("context-pack-delete-ctx-1"));
    await waitFor(() => {
      expect(screen.getByTestId("context-pack-delete-confirm-ctx-1")).toBeTruthy();
    });
    expect(screen.getByTestId("context-pack-delete-cancel-ctx-1")).toBeTruthy();

    // Click cancel — back to normal delete.
    fireEvent.click(screen.getByTestId("context-pack-delete-cancel-ctx-1"));
    await waitFor(() => {
      expect(screen.getByTestId("context-pack-delete-ctx-1")).toBeTruthy();
    });
    expect(screen.queryByTestId("context-pack-delete-confirm-ctx-1")).toBeNull();
    // No delete was invoked.
    const deleteCalls = mock.invoke.mock.calls.filter(
      (c: [string, unknown?]) => c[0] === "delete_context_pack",
    );
    expect(deleteCalls.length).toBe(0);
  });

  it("delete confirmation is scoped — only one pack shows confirm at a time", async () => {
    const packs = [makePack("ctx-a"), makePack("ctx-b")];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();

    // Open ctx-a in editor, request confirm.
    await openContextInEditor("ctx-a");
    fireEvent.click(screen.getByTestId("context-pack-delete-ctx-a"));
    await waitFor(() => {
      expect(screen.getByTestId("context-pack-delete-confirm-ctx-a")).toBeTruthy();
    });

    // Cancel confirmation to go back to editor, then close editor.
    fireEvent.click(screen.getByTestId("context-pack-cancel-btn"));
    await waitFor(() => expect(screen.queryByTestId("context-pack-editor")).toBeNull());

    // Now open ctx-b in editor.
    fireEvent.click(screen.getByTestId("context-pack-item-ctx-b"));
    await waitFor(() => expect(screen.getByTestId("context-pack-editor")).toBeTruthy());

    // ctx-b should show normal delete (confirmation is scoped per-pack).
    expect(screen.getByTestId("context-pack-delete-ctx-b")).toBeTruthy();
    expect(screen.queryByTestId("context-pack-delete-confirm-ctx-b")).toBeNull();
  });

  // ── Insert / Use example ──────────────────────────────────────────

  it("insert example button fills content draft while editing", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await openContextPackPanel();
    fireEvent.click(screen.getByTestId("context-pack-new-btn"));
    await waitFor(() => expect(screen.getByTestId("context-pack-editor")).toBeTruthy());

    // Insert example button visible when content is empty.
    expect(screen.getByTestId("context-pack-insert-example-btn")).toBeTruthy();

    // Click fills the content input with example text.
    fireEvent.click(screen.getByTestId("context-pack-insert-example-btn"));
    const contentInput = screen.getByTestId("context-pack-content-input") as HTMLTextAreaElement;
    expect(contentInput.value).toContain("тимлид");
    // Insert button hides once content is non-empty.
    expect(screen.queryByTestId("context-pack-insert-example-btn")).toBeNull();
  });

  it("use example from empty state opens editor with pre-filled content", async () => {
    const mock = createMockPlatform({ contextPacks: [] });
    renderApp(mock);

    await openContextPackPanel();
    await waitFor(() => expect(screen.getByTestId("context-pack-empty")).toBeTruthy());

    // Use example button is in empty state.
    expect(screen.getByTestId("context-pack-use-example-btn")).toBeTruthy();

    // Click opens editor with example content.
    fireEvent.click(screen.getByTestId("context-pack-use-example-btn"));
    await waitFor(() => expect(screen.getByTestId("context-pack-editor")).toBeTruthy());

    const contentInput = screen.getByTestId("context-pack-content-input") as HTMLTextAreaElement;
    expect(contentInput.value).toContain("тимлид");
  });

  // ── Keyboard flow ─────────────────────────────────────────────────

  it("keyboard flow works through delete confirm cycle", async () => {
    const packs = [makePack("ctx-1")];
    const mock = createMockPlatform({ contextPacks: packs });
    renderApp(mock);

    await openContextPackPanel();
    await openContextInEditor("ctx-1");

    // Delete button is focusable.
    const deleteBtn = screen.getByTestId("context-pack-delete-ctx-1");
    deleteBtn.focus();
    expect(document.activeElement).toBe(deleteBtn);

    // Click delete — confirm appears.
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(screen.getByTestId("context-pack-delete-confirm-ctx-1")).toBeTruthy();
    });

    // Confirm button is focusable.
    const confirmBtn = screen.getByTestId("context-pack-delete-confirm-ctx-1");
    confirmBtn.focus();
    expect(document.activeElement).toBe(confirmBtn);

    // Cancel button is focusable.
    const cancelBtn = screen.getByTestId("context-pack-delete-cancel-ctx-1");
    cancelBtn.focus();
    expect(document.activeElement).toBe(cancelBtn);
  });
});
