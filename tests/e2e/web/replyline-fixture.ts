import type { Page } from "@playwright/test";
import type { AppSettings } from "../../../src/app/model";
import {
  createReplylineWebE2EPersistenceDiagnostics,
  REPLYLINE_WEB_E2E_SETTINGS,
} from "./replyline-e2e-settings";

export interface E2EBootstrapOverrides {
  deepgramKeyPresent?: boolean;
  llmKeyPresent?: boolean;
  runtimeReady?: boolean;
  contextActive?: boolean;
  analysisError?: { kind: string; message: string } | null;
  contextPacks?: Array<{
    id: string;
    title: string;
    content: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}

export async function installReplylineE2EPlatform(
  page: Page,
  settings: AppSettings = REPLYLINE_WEB_E2E_SETTINGS,
  bootstrapOverrides: E2EBootstrapOverrides = {},
): Promise<void> {
  const persistenceDiagnostics = createReplylineWebE2EPersistenceDiagnostics(settings);

  await page.addInitScript(
    ({ mockSettings, mockPersistenceDiagnostics, overrides }) => {
      let shortcutHandler:
        | ((event: { state: "Pressed" | "Released" }) => void | Promise<void>)
        | null = null;
      let captureActive = false;

      // Mutable context pack store for E2E visual tests.
      let contextPacks: Array<{
        id: string;
        title: string;
        content: string;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
      }> = (overrides?.contextPacks ?? []).map((p: Record<string, unknown>) => ({
        id: String(p.id),
        title: String(p.title),
        content: String(p.content),
        isActive: Boolean(p.isActive),
        createdAt: String(p.createdAt),
        updatedAt: String(p.updatedAt),
      }));

      (
        window as Window & {
          __REPLYLINE_E2E_TRIGGER_SHORTCUT__: (state: "Pressed" | "Released") => void;
        }
      ).__REPLYLINE_E2E_TRIGGER_SHORTCUT__ = (state) => {
        void shortcutHandler?.({ state });
      };

      (window as Window & { __REPLYLINE_E2E_PLATFORM__: unknown }).__REPLYLINE_E2E_PLATFORM__ = {
        invoke: async (command: string, args?: Record<string, unknown>) => {
          if (command === "load_bootstrap") {
            return {
              settings: mockSettings,
              deepgramKeyPresent: overrides?.deepgramKeyPresent ?? true,
              llmKeyPresent: overrides?.llmKeyPresent ?? false,
              contextActive: overrides?.contextActive ?? false,
              contextEntryCount: contextPacks.filter((p) => p.isActive).length,
              runtimeReady: overrides?.runtimeReady ?? true,
              logStatus: { logPath: "N/A" },
              lastTranscriptPreview: null,
              canRetryLastTranscript: false,
              experimentalBilingualAllowed: false,
            };
          }
          if (command === "get_setup_status") {
            return {
              deepgramKeyPresent: overrides?.deepgramKeyPresent ?? true,
              llmKeyPresent: overrides?.llmKeyPresent ?? false,
              llmRouteConfigured: Boolean(mockSettings.llmBaseUrl && mockSettings.llmModel),
              runtimePathReady: overrides?.runtimeReady ?? true,
            };
          }
          if (command === "get_persistence_diagnostics") {
            return mockPersistenceDiagnostics;
          }
          if (command === "capture_start") {
            captureActive = true;
            return "e2e-run-1";
          }
          if (command === "capture_stop_and_analyze") {
            if (!captureActive) throw new Error("capture_not_started");
            captureActive = false;
            if (overrides?.analysisError) {
              throw overrides.analysisError;
            }
            return {
              gist: "Interviewer asks about reliability ownership.",
              sayNow: "I can own this stream and show measurable delivery impact.",
              nextMove: "Back this with one metric and one risk tradeoff.",
              charsBand: "120-220",
            };
          }
          if (command === "log_client_event") return null;
          if (command === "check_runtime_config") {
            const runtimeReady =
              overrides?.deepgramKeyPresent !== false && overrides?.runtimeReady !== false;
            return {
              runtimeReady,
              stt: { ok: overrides?.deepgramKeyPresent !== false },
              llm: { ok: Boolean(mockSettings.llmBaseUrl && mockSettings.llmModel) },
              settings: { ok: true },
            };
          }
          if (command === "get_context_status") {
            return {
              contextActive: contextPacks.some((p) => p.isActive),
              entryCount: contextPacks.length,
              canRetryLastTranscript: false,
            };
          }
          if (command === "list_context_packs") {
            return { packs: contextPacks.map((p) => ({ ...p })) };
          }
          if (command === "get_active_context_pack") {
            return contextPacks.find((p) => p.isActive) ?? null;
          }
          if (command === "get_context_pack_status") {
            return {
              totalCount: contextPacks.length,
              activeId: contextPacks.find((p) => p.isActive)?.id ?? null,
            };
          }
          if (command === "save_context_pack") {
            const input = (args?.input ?? args ?? {}) as Record<string, unknown>;
            const id = String(input.id || "ctx-e2e-" + Date.now());
            const existing = contextPacks.findIndex((p) => p.id === id);
            const pack = {
              id,
              title: String(input.title || ""),
              content: String(input.content || ""),
              isActive: Boolean(input.isActive),
              createdAt: String(input.createdAt || new Date().toISOString()),
              updatedAt: String(input.updatedAt || new Date().toISOString()),
            };
            if (existing >= 0) {
              contextPacks[existing] = pack;
            } else {
              contextPacks.push(pack);
            }
            return null;
          }
          if (command === "delete_context_pack") {
            const id = String(args?.id ?? "");
            contextPacks = contextPacks.filter((p) => p.id !== id);
            return null;
          }
          if (command === "set_active_context_pack") {
            const id = String(args?.id ?? "");
            contextPacks = contextPacks.map((p) => ({ ...p, isActive: p.id === id }));
            return null;
          }
          if (command === "clear_active_context_pack") {
            contextPacks = contextPacks.map((p) => ({ ...p, isActive: false }));
            return null;
          }
          if (command === "clear_context") return null;
          if (command === "retry_last_analysis") {
            if (overrides?.analysisError) {
              throw overrides.analysisError;
            }
            return {
              gist: "Retry gist",
              sayNow: "Retry say",
              nextMove: "Retry next",
              charsBand: "normal",
            };
          }
          throw new Error(`Unsupported mocked command: ${command}`);
        },
        listen: async () => () => {},
        shortcuts: {
          unregisterAll: async () => {},
          isRegistered: async () => false,
          register: async (_hotkey: string, handler: typeof shortcutHandler) => {
            shortcutHandler = handler;
          },
        },
        clipboard: {
          writeText: async () => {},
        },
        window: {
          show: async () => {},
          setFocus: async () => {},
          hide: async () => {},
          startDragging: async () => {},
          setOpacity: async () => {},
          setAlwaysOnTop: async () => {},
          onCloseRequested: async () => () => {},
        },
      };
    },
    {
      mockSettings: settings,
      mockPersistenceDiagnostics: persistenceDiagnostics,
      overrides: bootstrapOverrides,
    },
  );
}
