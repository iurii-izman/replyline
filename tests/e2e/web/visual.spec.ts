import { expect, test } from "@playwright/test";
import { installReplylineE2EPlatform } from "./replyline-fixture";

test("home visual snapshot", async ({ page }) => {
  await installReplylineE2EPlatform(page);
  await page.goto("/");
  await expect(page.getByTestId("main-state-idle")).toBeVisible();
  await expect(page).toHaveScreenshot("home-smoke.png", { fullPage: true });
});
