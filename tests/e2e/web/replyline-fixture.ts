import type { Page } from "@playwright/test";
import type { AppSettings } from "../../../src/app/model";
import {
  createReplylineWebE2EPersistenceDiagnostics,
  REPLYLINE_WEB_E2E_SETTINGS,
} from "./replyline-e2e-settings";

export async function installReplylineE2EPlatform(
  page: Page,
  settings: AppSettings = REPLYLINE_WEB_E2E_SETTINGS,
): Promise<void> {
  const persistenceDiagnostics = createReplylineWebE2EPersistenceDiagnostics(settings);

  await page.addInitScript(
    ({ mockSettings, mockPersistenceDiagnostics }) => {
      let shortcutHandler:
        | ((event: { state: "Pressed" | "Released" }) => void | Promise<void>)
        | null = null;
      let captureActive = false;

      (
        window as Window & {
          __REPLYLINE_E2E_TRIGGER_SHORTCUT__: (state: "Pressed" | "Released") => void;
        }
      ).__REPLYLINE_E2E_TRIGGER_SHORTCUT__ = (state) => {
        void shortcutHandler?.({ state });
      };

      (window as Window & { __REPLYLINE_E2E_PLATFORM__: unknown }).__REPLYLINE_E2E_PLATFORM__ = {
        invoke: async (command: string) => {
          if (command === "load_bootstrap") {
            return {
              settings: mockSettings,
              deepgramKeyPresent: true,
              llmKeyPresent: false,
              contextActive: false,
              contextEntryCount: 0,
              runtimeReady: true,
              logStatus: { logPath: "N/A" },
              lastTranscriptPreview: null,
              canRetryLastTranscript: false,
            };
          }
          if (command === "get_setup_status") {
            return {
              deepgramKeyPresent: true,
              llmKeyPresent: false,
              llmRouteConfigured: Boolean(mockSettings.llmBaseUrl && mockSettings.llmModel),
              runtimePathReady: true,
            };
          }
          if (command === "get_persistence_diagnostics") {
            return mockPersistenceDiagnostics;
          }
          if (command === "load_candidate_pack") return null;
          if (command === "get_candidate_pack_status") {
            return { exists: false, factCount: 0, weakFactCount: 0 };
          }
          if (command === "capture_start") {
            captureActive = true;
            return null;
          }
          if (command === "capture_stop_and_analyze") {
            if (!captureActive) throw new Error("capture_not_started");
            captureActive = false;
            return {
              gist: "Interviewer asks about reliability ownership.",
              sayNow: "I can own this stream and show measurable delivery impact.",
              nextMove: "Back this with one metric and one risk tradeoff.",
              charsBand: "120-220",
            };
          }
          if (command === "log_client_event") return null;
          if (command === "get_context_status") {
            return { contextActive: false, entryCount: 0, canRetryLastTranscript: false };
          }
          if (command === "clear_context") return null;
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
    { mockSettings: settings, mockPersistenceDiagnostics: persistenceDiagnostics },
  );
}
