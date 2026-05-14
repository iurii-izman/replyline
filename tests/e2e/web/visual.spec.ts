import { expect, test } from '@playwright/test';

test('home visual snapshot', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('home-smoke.png', { fullPage: true });
});
