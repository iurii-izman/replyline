import { expect, test } from "@playwright/test";
import { installReplylineE2EPlatform } from "./replyline-fixture";

test("credential-free happy path renders shell, settings, and fixture card", async ({ page }) => {
  // Sidebar is visible only at >=1280px viewports.
  await page.setViewportSize({ width: 1440, height: 900 });
  await installReplylineE2EPlatform(page);

  await page.goto("/");
  await expect(page.getByTestId("app-root")).toBeVisible();
  await expect(page.getByTestId("main-state-idle")).toBeVisible();

  await page.getByTestId("app-header-settings-action").click();
  await expect(page.getByTestId("settings-surface")).toBeVisible();
  await expect(page.getByTestId("settings-section-overview")).toBeVisible();

  await page.locator("#settings-sidebar-tab-llm").click();
  await expect(page.getByTestId("settings-section-llm")).toBeVisible();
  await expect(page.locator("#settings-panel-llm select").first()).toHaveValue(
    "openrouter_free_dev",
  );

  await page.locator("#settings-sidebar-tab-hotkey").click();
  await expect(page.getByTestId("settings-section-hotkey")).toBeVisible();
  // Hotkey section has a text input for the hotkey and a number input for capture max.
  await expect(page.locator("#settings-panel-hotkey input.field-input").first()).toBeVisible();

  await page.locator("#settings-sidebar-tab-reports").click();
  await expect(page.getByTestId("settings-section-reports")).toBeVisible();
  await expect(page.getByTestId("advanced-window-behavior")).toBeVisible();
  await expect(page.getByTestId("debug-trace-mode-field").locator("select")).toHaveValue(
    "redacted",
  );

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
