import { cleanup, fireEvent, screen, waitFor, within } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

import {
  createMockPlatform,
  createSetupMockPlatform,
  defaultMockSettings,
} from "./test-utils/mockPlatform";
import { openSettingsPanel, openSettingsSection, renderApp } from "./test-utils/appUi";

describe("settings integration", () => {
  it("renders localized settings sections and submits from keyboard form path", async () => {
    const mock = createMockPlatform();
    renderApp(mock);
    await openSettingsPanel();

    const form = document.querySelector("form.settings-content");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "save_settings")).toBe(true),
    );

    expect(screen.getByRole("button", { name: /Сохран/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Назад" })).toBeTruthy();

    openSettingsSection(/Отчёты/i);
    expect(screen.getByText("Срок хранения отчётов интервью")).toBeTruthy();
    expect(screen.getAllByText("Только ручная очистка").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/raw prompt/i)).toBeNull();
  });

  it("renders window behavior controls and persists opacity settings", async () => {
    const mock = createMockPlatform();
    renderApp(mock);
    await openSettingsPanel();

    openSettingsSection(/Горячая клавиша/i);
    expect(screen.getByText("Поведение окна")).toBeTruthy();
    expect(screen.getByLabelText("Скрывать в трей при закрытии окна")).toBeTruthy();
    expect(screen.getByLabelText("Поверх окон только во время захвата и анализа")).toBeTruthy();

    const opacity = await screen.findByDisplayValue("100%");
    fireEvent.input(opacity, { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: /Сохран/ }));
    await waitFor(() => expect(mock.platform.window.setOpacity).toHaveBeenCalledWith(0.8));
  });

  it("persists reports debug trace mode from the reports section", async () => {
    const mock = createMockPlatform();
    renderApp(mock);
    await openSettingsPanel();
    openSettingsSection(/Отчёты/i);
    const modeField = await screen.findByTestId("debug-trace-mode-field");
    fireEvent.input(within(modeField).getByRole("combobox"), { target: { value: "full_local" } });
    fireEvent.click(screen.getByRole("button", { name: /Сохран/ }));

    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "save_settings")).toBe(true),
    );
    const saveCalls = mock.invoke.mock.calls.filter((call) => call[0] === "save_settings");
    expect(
      saveCalls.some(
        (call) =>
          ((call[1] as { input?: Record<string, unknown> } | undefined)?.input ?? {})
            .debugTraceMode === "full_local",
      ),
    ).toBe(true);
  });

  it("supports model preset caveats, preset sync, and custom route override safety", async () => {
    const mock = createMockPlatform();
    renderApp(mock);
    await openSettingsPanel();
    openSettingsSection(/Ответ \/ LLM/i);

    fireEvent.click(screen.getByText(/caveats/i));
    const preset = await screen.findByDisplayValue("Custom OpenAI-compatible");

    fireEvent.input(preset, { target: { value: "openrouter_free_dev" } });
    expect(
      screen.getByText("Free models can be rate-limited and availability may vary."),
    ).toBeTruthy();

    fireEvent.input(preset, { target: { value: "openrouter_balanced_paid" } });
    expect(screen.getByDisplayValue("https://openrouter.ai/api/v1")).toBeTruthy();
    expect(screen.getByDisplayValue("openai/gpt-4.1-mini")).toBeTruthy();

    const baseUrl = screen.getByDisplayValue("https://openrouter.ai/api/v1");
    const model = screen.getByDisplayValue("openai/gpt-4.1-mini");
    fireEvent.input(baseUrl, { target: { value: "https://custom.gateway/v1" } });
    fireEvent.input(model, { target: { value: "custom-model-1" } });
    fireEvent.input(preset, { target: { value: "custom_openai_compatible" } });
    expect(screen.getByDisplayValue("https://custom.gateway/v1")).toBeTruthy();
    expect(screen.getByDisplayValue("custom-model-1")).toBeTruthy();
  });

  it("renders runtime check results and compact setup affordances", async () => {
    const setupMock = createMockPlatform();
    const invoke = setupMock.platform.invoke;
    setupMock.platform.invoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "load_bootstrap") {
        return {
          settings: { ...defaultMockSettings, llmBaseUrl: "" },
          deepgramKeyPresent: false,
          llmKeyPresent: false,
          contextActive: false,
          contextEntryCount: 0,
          runtimeReady: false,
          logStatus: { logPath: "", lastLine: null },
          canRetryLastTranscript: false,
        };
      }
      if (command === "check_runtime_config") {
        return {
          runtimeReady: false,
          stt: { ok: false, code: "missing_key", message: "Deepgram key missing" },
          llm: { ok: true, code: "ok", message: "OK" },
          settings: { ok: false, code: "config_error", message: "Hotkey invalid" },
        };
      }
      if (command === "get_setup_status") {
        return {
          deepgramKeyPresent: false,
          llmKeyPresent: false,
          llmRouteConfigured: false,
          runtimePathReady: false,
        };
      }
      return invoke(command, args);
    });
    renderApp(setupMock);

    await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Проверить настройки" }));

    const checks = await screen.findByTestId("check-results");
    expect(checks.className).toContain("check-results-card");
    expect(within(checks).getByRole("button", { name: "Открыть шаг" }).className).toContain(
      "check-item-action",
    );
    expect(document.querySelectorAll(".section-status-dot").length).toBeGreaterThan(0);
  });
});

describe("setup wizard integration", () => {
  it("shows first-run guidance and focuses the first missing step", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });
    renderApp(mock);

    await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());
    expect(screen.getAllByText("1. Речь").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Добавьте ключ Deepgram API.")).toBeTruthy();

    fireEvent.click(await screen.findByTestId("setup-first-missing-cta"));
    expect(screen.getByTestId("settings-section-speech")).toBeTruthy();
  });

  it("explains missing LLM route and keeps wizard available after ready bootstrap", async () => {
    const missingLlmMock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmBaseUrl: "",
      llmModel: "",
      runtimeReady: false,
    });
    renderApp(missingLlmMock);

    await waitFor(() => expect(screen.getByText("Укажите URL и модель LLM-шлюза.")).toBeTruthy());
    fireEvent.click(screen.getByTestId("setup-first-missing-cta"));
    expect(screen.getByTestId("settings-section-llm")).toBeTruthy();
  });

  it("saves setup fields, returns to main, and avoids empty secret overwrite", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: false,
      llmBaseUrl: "",
      runtimeReady: false,
    });
    renderApp(mock);

    await waitFor(() => expect(screen.getByTestId("settings-surface")).toBeTruthy());
    fireEvent.click(screen.getByRole("tab", { name: /Речь/i }));
    fireEvent.input(screen.getByPlaceholderText("Добавьте ключ Deepgram API."), {
      target: { value: "dg-key-123" },
    });
    fireEvent.click(screen.getByRole("tab", { name: /Ответ \/ LLM/i }));
    fireEvent.input(screen.getByPlaceholderText("https://api.example.com/v1"), {
      target: { value: "https://api.example.com/v1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Сохран/ }));

    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "save_settings")).toBe(true),
    );
    const saveCall = mock.invoke.mock.calls.find((call) => call[0] === "save_settings");
    const input = (saveCall?.[1] as { input?: Record<string, unknown> } | undefined)?.input ?? {};
    expect(Object.prototype.hasOwnProperty.call(input, "llmApiKey")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(input, "deepgramApiKey")).toBe(false);
  });

  it("resyncs bootstrap after save and reuses cached startup readiness for hotkeys", async () => {
    const mock = createSetupMockPlatform({
      deepgramKeyPresent: true,
      llmKeyPresent: true,
      llmBaseUrl: "https://api.example.com/v1",
      llmModel: "gpt-4o-mini",
      runtimeReady: true,
    });
    let bootstrapCount = 0;
    const invoke = mock.platform.invoke;
    const patchedInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "load_bootstrap") {
        bootstrapCount += 1;
        return {
          settings: {
            ...defaultMockSettings,
            hotkey: "Ctrl+Alt+Shift+S",
            llmBaseUrl: "https://api.example.com/v1",
            llmModel: "gpt-4.1-mini",
          },
          deepgramKeyPresent: true,
          llmKeyPresent: true,
          contextActive: false,
          contextEntryCount: 0,
          runtimeReady: true,
          logStatus: { logPath: "", lastLine: null },
          canRetryLastTranscript: false,
        };
      }
      if (command === "save_settings") {
        return (args as { input: Record<string, unknown> }).input;
      }
      if (command === "get_setup_status") {
        return {
          deepgramKeyPresent: true,
          llmKeyPresent: true,
          llmRouteConfigured: true,
          runtimePathReady: true,
        };
      }
      if (command === "capture_start") return "run-1";
      if (command === "get_context_status") {
        return { contextActive: true, entryCount: 1, canRetryLastTranscript: true };
      }
      return invoke(command, args);
    });
    mock.platform.invoke = patchedInvoke;
    mock.invoke = patchedInvoke;

    renderApp(mock);
    await waitFor(() => expect(screen.getByTestId("main-surface")).toBeTruthy());
    fireEvent.click(screen.getByTitle("Настройки"));
    fireEvent.click(screen.getByRole("button", { name: /Сохран/ }));
    await waitFor(() => expect(mock.invoke.mock.calls.filter((c) => c[0] === "load_bootstrap")).toHaveLength(2));
    expect(bootstrapCount).toBe(2);
    expect(mock.invoke.mock.calls.some((call) => call[0] === "save_secret")).toBe(false);

    await waitFor(() => expect(mock.platform.shortcuts.register).toHaveBeenCalled());
    await mock.emitShortcut({ state: "Pressed" });
    await mock.emitShortcut({ state: "Released" });
    await waitFor(() =>
      expect(mock.invoke.mock.calls.some((call) => call[0] === "capture_start")).toBe(true),
    );
    expect(screen.queryByTestId("settings-surface")).toBeNull();
    expect(
      mock.invoke.mock.calls.some(
        (call) =>
          call[0] === "log_client_event" &&
          (call[1] as { event?: string } | undefined)?.event === "setup_preflight_check_result",
      ),
    ).toBe(true);
    expect(
      mock.invoke.mock.calls.some(
        (call) =>
          call[0] === "log_client_event" &&
          (call[1] as { event?: string } | undefined)?.event === "ui_answer_ready",
      ),
    );
  });

  it("covers startup checking before bootstrap resolves", async () => {
    let resolveBootstrap: ((value: unknown) => void) | null = null;
    const bootstrapPromise = new Promise((resolve) => {
      resolveBootstrap = resolve;
    });
    const pendingMock = createMockPlatform();
    const pendingInvoke = pendingMock.platform.invoke;
    const patchedPendingInvoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      if (command === "load_bootstrap") return bootstrapPromise;
      return pendingInvoke(command, args);
    });
    pendingMock.platform.invoke = patchedPendingInvoke;
    pendingMock.invoke = patchedPendingInvoke;
    cleanup();
    renderApp(pendingMock);
    await waitFor(() => expect(screen.getByTestId("startup-checking")).toBeTruthy());
    expect(screen.queryByText("Нужно завершить настройку")).toBeNull();
    resolveBootstrap?.({
      settings: defaultMockSettings,
      deepgramKeyPresent: true,
      llmKeyPresent: true,
      contextActive: false,
      contextEntryCount: 0,
      runtimeReady: true,
      logStatus: { logPath: "", lastLine: null },
      canRetryLastTranscript: false,
    });
    await waitFor(() => expect(screen.queryByTestId("startup-checking")).toBeNull());
  });
});
