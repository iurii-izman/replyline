import { fireEvent, screen, waitFor } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it } from "vitest";

import { createMockPlatform, createSetupMockPlatform, type MockPlatform } from "./test-utils/mockPlatform";
import { openCandidatePackStudio, renderApp, triggerAnalysisReady } from "./test-utils/appUi";

describe("app shell integration", () => {
  let mock: MockPlatform;

  beforeEach(() => {
    mock = createMockPlatform();
  });

  it("renders app shell chrome in default fixture", async () => {
    renderApp(mock);

    const appRoot = await screen.findByTestId("app-root");
    expect(appRoot).toBeTruthy();
    expect(screen.getByTestId("app-workarea")).toBeTruthy();
    expect(screen.getByTestId("app-view").contains(screen.getByTestId("main-surface"))).toBe(true);
    expect(screen.queryByTitle("Выход")).toBeNull();
  });

  it("renders compact header brand and actions", async () => {
    renderApp(mock);

    expect(await screen.findByTestId("app-header-brand")).toBeTruthy();
    expect(screen.getByText("Replyline")).toBeTruthy();
    expect(screen.getByTestId("app-header-hotkey").textContent).toContain("Ctrl+Alt+Space");
    expect(screen.getByRole("button", { name: "Настройки" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Скрыть" })).toBeTruthy();
  });

  it("renders current panel breadcrumb for settings speech section", async () => {
    renderApp(mock);

    fireEvent.click(await screen.findByTestId("app-header-settings-action"));
    fireEvent.click(screen.getByRole("tab", { name: /Речь/i }));

    expect(screen.getByTestId("app-header-section").textContent).toContain("Настройки");
    expect(screen.getByTestId("app-header-section").textContent).toContain("Речь");
  });

  it("shows setup header phase from unresolved bootstrap state", async () => {
    const setupMock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });
    renderApp(setupMock);

    await waitFor(() =>
      expect(screen.getByTestId("app-header-phase").textContent).toContain(
        "Нужно завершить настройку",
      ),
    );
    expect(screen.getByTestId("app-header-phase").className).toContain("app-header-phase--setup");
  });

  it("shows idle header phase for ready bootstrap state", async () => {
    renderApp(mock);
    await waitFor(() =>
      expect(screen.getByTestId("app-header-phase").textContent).toContain("Готово к записи"),
    );
    expect(screen.getByTestId("app-header-phase").className).toContain("app-header-phase--idle");
  });

  it("opens settings from header action and hides the window from header action", async () => {
    renderApp(mock);

    fireEvent.click(await screen.findByTestId("app-header-settings-action"));
    expect(await screen.findByTestId("settings-surface")).toBeTruthy();

    fireEvent.click(screen.getByTestId("app-header-hide-action"));
    await waitFor(() => expect(mock.platform.window.hide).toHaveBeenCalled());
  });

  it("hides window to tray on close only when the setting is enabled", async () => {
    renderApp(mock);
    await waitFor(() => expect(mock.platform.window.onCloseRequested).toHaveBeenCalled());
    await mock.emitCloseRequest();
    await waitFor(() => expect(mock.platform.window.hide).toHaveBeenCalled());

    const noTrayMock = createMockPlatform({ settingsOverrides: { hideToTrayOnClose: false } });
    renderApp(noTrayMock);
    await waitFor(() => expect(noTrayMock.platform.window.onCloseRequested).toHaveBeenCalled());
    await noTrayMock.emitCloseRequest();
    await waitFor(() => expect(noTrayMock.platform.window.hide).not.toHaveBeenCalled());
  });

  it("keeps window on top only during capture when enabled", async () => {
    mock = createMockPlatform({ settingsOverrides: { keepOnTopDuringCapture: true } });
    renderApp(mock);

    await triggerAnalysisReady(mock);
    await waitFor(() =>
      expect(mock.platform.window.setAlwaysOnTop).toHaveBeenNthCalledWith(1, true),
    );
    await waitFor(() =>
      expect(mock.platform.window.setAlwaysOnTop).toHaveBeenNthCalledWith(2, false),
    );
  });

  it("keeps responsive layout contracts across main, settings, and candidate studio panels", async () => {
    renderApp(mock);

    const mainSurface = await screen.findByTestId("main-surface");
    const appView = screen.getByTestId("app-view");
    expect(mainSurface.className).toContain("app-page");
    expect(appView.contains(mainSurface)).toBe(true);

    await openCandidatePackStudio();
    expect(appView.contains(screen.getByTestId("candidate-pack-studio"))).toBe(true);
  });

  it("does not expose stealth or cheating copy in visible UI", async () => {
    renderApp(mock);
    const text = document.body.textContent?.toLowerCase() ?? "";
    expect(text).not.toContain("stealth");
    expect(text).not.toContain("cheat");
    expect(text).not.toContain("hidden overlay");
  });
});
