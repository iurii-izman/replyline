import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import type { AppPlatform, ListenerPayload, ShortcutEvent, Unlisten } from "./platform";

type MockPlatform = {
  platform: AppPlatform;
  invoke: ReturnType<typeof vi.fn>;
  emitShortcut: (event: ShortcutEvent) => Promise<void>;
};

type MockPlatformOptions = {
  analysisError?: unknown;
  analysisCard?: { gist: string; sayNow: string; nextMove: string };
};

function createMockPlatform(options: MockPlatformOptions = {}): MockPlatform {
  const listeners = new Map<string, ((event: ListenerPayload<unknown>) => void)[]>();
  const shortcuts: ((event: ShortcutEvent) => void | Promise<void>)[] = [];

  const invoke = vi.fn(async (command: string) => {
    if (command === "load_bootstrap") {
      return {
        settings: {
          schemaVersion: 2,
          hotkey: "Ctrl+Alt+Space",
          llmBaseUrl: "https://api.example/v1",
          llmModel: "gpt-4o-mini",
          captureMaxSeconds: 45,
        },
        deepgramKeyPresent: true,
        llmKeyPresent: true,
        contextActive: false,
        contextEntryCount: 0,
        runtimeReady: true,
      };
    }
    if (command === "get_context_status") {
      return { contextActive: true, entryCount: 1, canRetryLastTranscript: true };
    }
    if (command === "capture_stop_and_analyze" || command === "retry_last_analysis") {
      if (options.analysisError) throw options.analysisError;
      return options.analysisCard ?? { gist: "g", sayNow: "say", nextMove: "next" };
    }
    if (command === "clear_context") {
      return { contextActive: false, entryCount: 0, canRetryLastTranscript: false };
    }
    return null;
  });

  const platform: AppPlatform = {
    invoke,
    listen: vi.fn(async (event, handler) => {
      const arr = listeners.get(event) ?? [];
      arr.push(handler as (event: ListenerPayload<unknown>) => void);
      listeners.set(event, arr);
      return (() => undefined) as Unlisten;
    }),
    shortcuts: {
      unregisterAll: vi.fn(async () => undefined),
      isRegistered: vi.fn(async () => false),
      register: vi.fn(async (_hotkey, handler) => {
        shortcuts.push(handler);
      }),
    },
    clipboard: {
      writeText: vi.fn(async () => undefined),
    },
    window: {
      show: vi.fn(async () => undefined),
      setFocus: vi.fn(async () => undefined),
      hide: vi.fn(async () => undefined),
      startDragging: vi.fn(async () => undefined),
      onCloseRequested: vi.fn(async () => (() => undefined) as Unlisten),
    },
  };

  return {
    platform,
    invoke,
    emitShortcut: async (event: ShortcutEvent) => {
      for (const handler of shortcuts) {
        await handler(event);
      }
    },
  };
}

describe("App UX stabilization", () => {
  let mock: MockPlatform;

  beforeEach(() => {
    mock = createMockPlatform();
  });

  it("shows card shell and action row in idle", async () => {
    render(() => <App platform={mock.platform} />);

    const shell = await screen.findByTestId("main-card-shell");
    const surface = screen.getByTestId("main-surface");
    const top = screen.getByTestId("main-card-top");
    const body = screen.getByTestId("main-card-body");
    const actions = screen.getByTestId("action-row");

    expect(shell).toBeTruthy();
    expect([...surface.children]).toEqual([top, body, actions]);
    expect(screen.getByText("Суть")).toBeTruthy();
    expect(screen.getByText("Скажи сейчас")).toBeTruthy();
    expect(screen.getByText("Дальше")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Статус цепочки" })).toBeTruthy();
  });

  it("keeps actions disabled in idle without card", async () => {
    render(() => <App platform={mock.platform} />);

    const copy = await screen.findByRole("button", { name: "Скопировать ответ" });
    const retry = screen.getByRole("button", { name: "Пересобрать" });

    expect(copy).toHaveProperty("disabled", true);
    expect(retry).toHaveProperty("disabled", true);
    expect(copy.getAttribute("title")).toBe("Сначала получите карточку.");
  });

  it("keeps action buttons fixed-height and out of the scroll body", async () => {
    render(() => <App platform={mock.platform} />);

    const copy = await screen.findByRole("button", { name: "Скопировать ответ" });
    const actions = screen.getByTestId("action-row");
    const body = screen.getByTestId("main-card-body");

    expect(actions.parentElement).toBe(screen.getByTestId("main-surface"));
    expect(body.contains(actions)).toBe(false);
    expect(getComputedStyle(actions).alignItems).toBe("center");
    expect(getComputedStyle(copy).height).toBe("38px");
    expect(getComputedStyle(copy).maxHeight).toBe("38px");
  });

  it("enables actions and handles keyboard shortcuts when card is ready", async () => {
    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    const copy = await screen.findByRole("button", { name: "Скопировать ответ" });
    const retry = screen.getByRole("button", { name: "Пересобрать" });
    const actions = screen.getByTestId("action-row");
    await waitFor(() => {
      expect(copy).toHaveProperty("disabled", false);
      expect(retry).toHaveProperty("disabled", false);
    });
    expect(actions.parentElement).toBe(screen.getByTestId("main-surface"));
    expect(screen.getByText("Ответ готов к копированию.")).toBeTruthy();

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    await waitFor(() => expect(mock.platform.clipboard.writeText).toHaveBeenCalledWith("say"));

    fireEvent.keyDown(window, { key: "r" });
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((c) => c[0] === "retry_last_analysis")).toBe(true),
    );

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Ответ скопирован.")).toBeNull());
  });

  it("keeps the same action zone after a pipeline error", async () => {
    mock = createMockPlatform({ analysisError: { kind: "Pipeline", message: "LLM timeout" } });
    render(() => <App platform={mock.platform} />);

    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });

    expect(
      await screen.findByText("Нет ответа LLM-шлюза: проверьте URL, модель и ключ."),
    ).toBeTruthy();
    expect(screen.getByText("Повторите захват или проверьте настройки.")).toBeTruthy();
    expect(screen.getByTestId("action-row").parentElement).toBe(screen.getByTestId("main-surface"));
    expect(screen.getByRole("button", { name: "Скопировать ответ" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("renders localized settings CTA labels", async () => {
    render(() => <App platform={mock.platform} />);
    fireEvent.click(await screen.findByTitle("Настройки"));
    await waitFor(() => expect(screen.getByText("Настройки")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Назад" })).toBeTruthy();
  });
});
