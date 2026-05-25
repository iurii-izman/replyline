import { createRoot, createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { setupTraySync } from "./controller/traySync";

describe("setupTraySync", () => {
  it("invokes tray sync after booting", async () => {
    let invoke: ReturnType<typeof vi.fn> | undefined;
    let dispose: (() => void) | undefined;
    createRoot((cleanup) => {
      dispose = cleanup;
      const [phase, setPhase] = createSignal<"booting" | "idle">("booting");
      invoke = vi.fn(async () => null);
      setupTraySync({
        platform: { invoke } as never,
        phase,
        statusDetail: () => null,
        setupRequired: () => false,
        hotkeyFailed: () => false,
        hasError: () => false,
      });
      setPhase("idle");
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(invoke).toBeDefined();
    expect(invoke!).toHaveBeenCalledWith("sync_tray_ui_phase", {
      phase: "idle_ready",
      detail: null,
    });
    dispose?.();
  });
});
