import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import type { AppPlatform, ListenerPayload, ShortcutEvent, Unlisten } from "./platform";

function createMockPlatform(): AppPlatform {
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
          captureMaxSeconds: 30,
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
      return { gist: "g", sayNow: "say", nextMove: "next" };
    }
    if (command === "clear_context") {
      return { contextActive: false, entryCount: 0, canRetryLastTranscript: false };
    }
    return null;
  });

  return {
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
}

describe("App slim flow", () => {
  let platform: AppPlatform;

  beforeEach(() => {
    platform = createMockPlatform();
  });

  it("renders settings and saves", async () => {
    render(() => <App platform={platform} />);
    fireEvent.click(await screen.findByTitle("Settings"));
    await waitFor(() => expect(screen.getByText("Settings")).toBeTruthy());
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect((platform.invoke as ReturnType<typeof vi.fn>).mock.calls.some((c) => c[0] === "save_settings")).toBe(true));
  });
});
