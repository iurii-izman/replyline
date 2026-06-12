import { expect, test } from "@playwright/test";
import { installReplylineE2EPlatform } from "./replyline-fixture";

test("credential-free happy path renders shell, settings, and fixture card", async ({ page }) => {
  await installReplylineE2EPlatform(page);

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
