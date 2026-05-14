import { expect, test } from '@playwright/test';

test('home smoke renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});
