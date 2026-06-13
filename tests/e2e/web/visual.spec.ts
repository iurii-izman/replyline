import { expect, test } from "@playwright/test";
import { installReplylineE2EPlatform } from "./replyline-fixture";

test("optional visual snapshot for idle home shell", async ({ page }) => {
  await installReplylineE2EPlatform(page);
  await page.goto("/");
  await expect(page.getByTestId("main-state-idle")).toBeVisible();
  await expect(page).toHaveScreenshot("home-smoke.png", {
    animations: "disabled",
    caret: "hide",
    fullPage: true,
  });
});
