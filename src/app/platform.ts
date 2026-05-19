import { invoke as tauriInvoke } from "@tauri-apps/api/core";

async function invokeWithDevTiming<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const hasPerf = typeof performance !== "undefined" && typeof performance.now === "function";
  const t0 = hasPerf ? performance.now() : 0;
  try {
    const result = await tauriInvoke<T>(command, args);
    if (import.meta.env.DEV && hasPerf) {
      console.debug(`[replyline:invoke] ${command} ok ${(performance.now() - t0).toFixed(1)}ms`);
    }
    return result;
  } catch (err) {
    if (import.meta.env.DEV && hasPerf) {
      console.debug(
        `[replyline:invoke] ${command} err ${(performance.now() - t0).toFixed(1)}ms`,
        err,
      );
    }
    throw err;
  }
}
import { listen as tauriListen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  isRegistered as tauriIsRegistered,
  register as tauriRegister,
  unregisterAll as tauriUnregisterAll,
} from "@tauri-apps/plugin-global-shortcut";
import { writeText as tauriWriteText } from "@tauri-apps/plugin-clipboard-manager";

export type ShortcutState = "Pressed" | "Released";
export type Unlisten = () => void;

export type CloseRequestEvent = {
  preventDefault(): void;
};

export type ShortcutEvent = {
  state: ShortcutState;
};

export type ListenerPayload<T> = {
  payload: T;
};

export type AppPlatform = {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  listen<T>(event: string, handler: (event: ListenerPayload<T>) => void): Promise<Unlisten>;
  shortcuts: {
    unregisterAll(): Promise<void>;
    isRegistered(hotkey: string): Promise<boolean>;
    register(
      hotkey: string,
      handler: (event: ShortcutEvent) => void | Promise<void>,
    ): Promise<void>;
  };
  clipboard: {
    writeText(value: string): Promise<void>;
  };
  window: {
    show(): Promise<void>;
    setFocus(): Promise<void>;
    hide(): Promise<void>;
    startDragging(): Promise<void>;
    setOpacity?(value: number): Promise<void>;
    onCloseRequested(
      handler: (event: CloseRequestEvent) => void | Promise<void>,
    ): Promise<Unlisten>;
  };
};

let defaultPlatform: AppPlatform | null = null;

function createBrowserFallbackPlatform(): AppPlatform {
  const unsupported = async <T>(command: string): Promise<T> => {
    throw new Error(
      `Tauri runtime is not available in browser preview. Command '${command}' is unsupported.`,
    );
  };

  return {
    invoke: (command) => unsupported(command),
    listen: async () => () => {},
    shortcuts: {
      unregisterAll: async () => {},
      isRegistered: async () => false,
      register: async () => {},
    },
    clipboard: {
      writeText: async (value: string) => navigator.clipboard.writeText(value),
    },
    window: {
      show: async () => {},
      setFocus: async () => {},
      hide: async () => {},
      startDragging: async () => {},
      setOpacity: async () => {},
      onCloseRequested: async () => () => {},
    },
  };
}

export function getDefaultPlatform(): AppPlatform {
  if (defaultPlatform) {
    return defaultPlatform;
  }

  const hasTauriRuntime =
    typeof window !== "undefined" &&
    typeof (window as typeof window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !==
      "undefined";

  if (!hasTauriRuntime) {
    defaultPlatform = createBrowserFallbackPlatform();
    return defaultPlatform;
  }

  const windowRef = getCurrentWindow();
  defaultPlatform = {
    invoke: (command, args) => invokeWithDevTiming(command, args),
    listen: (event, handler) => tauriListen(event, handler),
    shortcuts: {
      unregisterAll: () => tauriUnregisterAll(),
      isRegistered: (hotkey) => tauriIsRegistered(hotkey),
      register: (hotkey, handler) => tauriRegister(hotkey, handler),
    },
    clipboard: {
      writeText: (value) => tauriWriteText(value),
    },
    window: {
      show: () => windowRef.show(),
      setFocus: () => windowRef.setFocus(),
      hide: () => windowRef.hide(),
      startDragging: () => windowRef.startDragging(),
      setOpacity: (value) => windowRef.setOpacity(value),
      onCloseRequested: (handler) => windowRef.onCloseRequested(handler),
    },
  };

  return defaultPlatform;
}
