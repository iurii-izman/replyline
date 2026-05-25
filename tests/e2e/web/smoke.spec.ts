import { expect, test } from "@playwright/test";

test("credential-free happy path renders shell, settings, and fixture card", async ({ page }) => {
  await page.addInitScript(() => {
    const DEFAULT_SETTINGS = {
      schemaVersion: 9,
      hotkey: "Ctrl+Alt+Space",
      llmBaseUrl: "https://openrouter.ai/api/v1",
      llmModel: "openai/gpt-4o-mini",
      selectedModelPreset: "openrouter_free_dev",
      captureMaxSeconds: 45,
      activeAnswerProfile: "interview_default",
      windowOpacity: 100,
      hideToTrayOnClose: true,
      keepOnTopDuringCapture: false,
      interviewCompactMode: false,
      interviewReportRetentionDays: 0,
      debugTraceMode: "redacted",
      debugTraceRetentionDays: 3,
    } as const;
    let shortcutHandler:
      | ((event: { state: "Pressed" | "Released" }) => void | Promise<void>)
      | null = null;
    let captureActive = false;
    (window as Window & { __REPLYLINE_E2E_TRIGGER_SHORTCUT__: (s: "Pressed" | "Released") => void })
      .__REPLYLINE_E2E_TRIGGER_SHORTCUT__ = (state) => {
      void shortcutHandler?.({ state });
    };
    (window as Window & { __REPLYLINE_E2E_PLATFORM__: unknown }).__REPLYLINE_E2E_PLATFORM__ = {
      invoke: async (command: string) => {
        if (command === "load_bootstrap") {
          return {
            settings: DEFAULT_SETTINGS,
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
            llmRouteConfigured: true,
            runtimePathReady: true,
          };
        }
        if (command === "get_persistence_diagnostics") {
          return {
            settingsPath: "C:/Dev/replyline/settings.json",
            settingsPathHash: "test",
            settingsFileExists: true,
            settingsFileSize: 256,
            settingsParseOk: true,
            settingsValidationOk: true,
            settingsSchemaVersion: 9,
            llmBaseUrlPresent: true,
            llmModelPresent: true,
            selectedModelPreset: "openrouter_free_dev",
            activeAnswerProfile: "interview_default",
            hotkey: "Ctrl+Alt+Space",
            captureMaxSeconds: 45,
            corruptBackups: [],
            corruptBackupsCount: 0,
            keyringServiceName: "replyline",
            deepgramKeyPresent: true,
            llmKeyPresent: false,
            runtimePathReady: true,
            appLogExists: false,
          };
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
  });

  await page.goto("/");
  await expect(page.getByTestId("app-root")).toBeVisible();
  await expect(page.getByTestId("main-state-idle")).toBeVisible();

  await page.getByTestId("app-header-settings-action").click();
  await expect(page.getByTestId("settings-surface")).toBeVisible();
  await expect(page.getByTestId("settings-section-overview")).toBeVisible();

  await page.getByTestId("app-header-settings-action").click();
  await expect(page.getByTestId("main-surface")).toBeVisible();

  await page.evaluate(() => {
    (
      window as Window & { __REPLYLINE_E2E_TRIGGER_SHORTCUT__: (s: "Pressed" | "Released") => void }
    ).__REPLYLINE_E2E_TRIGGER_SHORTCUT__("Pressed");
  });
  await page.evaluate(() => {
    (
      window as Window & { __REPLYLINE_E2E_TRIGGER_SHORTCUT__: (s: "Pressed" | "Released") => void }
    ).__REPLYLINE_E2E_TRIGGER_SHORTCUT__("Released");
  });

  await expect(page.getByTestId("answer-hero-card")).toBeVisible();
  await expect(page.getByTestId("section-say-now")).toContainText(
    "I can own this stream and show measurable delivery impact.",
  );
});
