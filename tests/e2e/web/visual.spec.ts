import { expect, test } from "@playwright/test";
import { installReplylineE2EPlatform, type E2EBootstrapOverrides } from "./replyline-fixture";
import { createReplylineWebE2ESettings } from "./replyline-e2e-settings";

// ── Viewport definitions ───────────────────────────────────────────────
const VIEWPORTS = {
  compact: { width: 900, height: 620 },
  normal: { width: 1200, height: 760 },
  wide: { width: 1440, height: 900 },
} as const;

type ViewportName = keyof typeof VIEWPORTS;

function vpLabel(name: ViewportName): string {
  return `-${name}`;
}

// ── Synthetic demo ContextPacks ────────────────────────────────────────
function demoContextPack(): E2EBootstrapOverrides["contextPacks"] {
  return [
    {
      id: "ctx-demo-1",
      title: "Team lead — Sprint review",
      content:
        "I am a tech lead for a team of 5 developers. Sprint 3 of 4. Key risk: code review delays due to reviewer vacation. We use React + Node.js stack.",
      isActive: true,
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-15T14:00:00Z",
    },
    {
      id: "ctx-demo-2",
      title: "Client negotiation prep",
      content:
        "Meeting with Acme Corp about contract renewal. Our proposal: 12-month extension at current rate. Their concern: delivery speed. Budget is fixed.",
      isActive: false,
      createdAt: "2026-06-10T09:00:00Z",
      updatedAt: "2026-06-14T11:00:00Z",
    },
  ];
}

// ── Helper: trigger capture cycle ───────────────────────────────────────
async function pressHotkey(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    (
      window as Window & {
        __REPLYLINE_E2E_TRIGGER_SHORTCUT__: (s: "Pressed" | "Released") => void;
      }
    ).__REPLYLINE_E2E_TRIGGER_SHORTCUT__("Pressed");
  });
}

async function releaseHotkey(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    (
      window as Window & {
        __REPLYLINE_E2E_TRIGGER_SHORTCUT__: (s: "Pressed" | "Released") => void;
      }
    ).__REPLYLINE_E2E_TRIGGER_SHORTCUT__("Released");
  });
}

// ═════════════════════════════════════════════════════════════════════════
// State 1: Setup missing
// ═════════════════════════════════════════════════════════════════════════

for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
  test(`visual: setup missing — ${vpName}`, async ({ page }) => {
    await page.setViewportSize(vpSize);
    const settings = createReplylineWebE2ESettings({ llmBaseUrl: "", llmModel: "" });
    await installReplylineE2EPlatform(page, settings, {
      deepgramKeyPresent: false,
      llmKeyPresent: false,
      runtimeReady: false,
    });
    await page.goto("/");
    await expect(page.getByTestId("main-state-setup")).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveScreenshot(`setup-missing${vpLabel(vpName as ViewportName)}.png`, {
      fullPage: true,
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════
// State 2: Idle ready — no context
// ═════════════════════════════════════════════════════════════════════════

for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
  test(`visual: idle ready — no context — ${vpName}`, async ({ page }) => {
    await page.setViewportSize(vpSize);
    await installReplylineE2EPlatform(page);
    await page.goto("/");
    await expect(page.getByTestId("main-state-idle")).toBeVisible();
    await expect(page).toHaveScreenshot(
      `idle-ready-no-context${vpLabel(vpName as ViewportName)}.png`,
      {
        fullPage: true,
      },
    );
  });
}

// ═════════════════════════════════════════════════════════════════════════
// State 3: Idle ready — with active context
// ═════════════════════════════════════════════════════════════════════════

for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
  test(`visual: idle ready — active context — ${vpName}`, async ({ page }) => {
    await page.setViewportSize(vpSize);
    await installReplylineE2EPlatform(page, undefined, {
      contextPacks: demoContextPack(),
      contextActive: true,
    });
    await page.goto("/");
    await expect(page.getByTestId("context-active-chip")).toBeVisible();
    await expect(page).toHaveScreenshot(
      `idle-ready-active-context${vpLabel(vpName as ViewportName)}.png`,
      { fullPage: true },
    );
  });
}

// ═════════════════════════════════════════════════════════════════════════
// State 4: ContextPack panel — empty
// ═════════════════════════════════════════════════════════════════════════

for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
  test(`visual: context pack — empty — ${vpName}`, async ({ page }) => {
    await page.setViewportSize(vpSize);
    await installReplylineE2EPlatform(page);
    await page.goto("/");
    await page.getByTestId("context-pack-open-btn").click();
    await expect(page.getByTestId("context-pack-empty")).toBeVisible();
    await expect(page).toHaveScreenshot(
      `context-pack-empty${vpLabel(vpName as ViewportName)}.png`,
      {
        fullPage: true,
      },
    );
  });
}

// ═════════════════════════════════════════════════════════════════════════
// State 5: ContextPack panel — with active pack
// ═════════════════════════════════════════════════════════════════════════

for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
  test(`visual: context pack — active — ${vpName}`, async ({ page }) => {
    await page.setViewportSize(vpSize);
    await installReplylineE2EPlatform(page, undefined, {
      contextPacks: demoContextPack(),
      contextActive: true,
    });
    await page.goto("/");
    await page.getByTestId("context-pack-open-btn").click();
    await expect(page.getByTestId("context-pack-active-banner")).toBeVisible();
    await expect(page).toHaveScreenshot(
      `context-pack-active${vpLabel(vpName as ViewportName)}.png`,
      { fullPage: true },
    );
  });
}

// ═════════════════════════════════════════════════════════════════════════
// State 6: Capturing (hotkey held)
// ═════════════════════════════════════════════════════════════════════════

// Capturing is transient — snapshot after Pressed, before Released.
// Only wide viewport: transient states are fragile at narrow widths.

test("visual: capturing — wide", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.wide);
  await installReplylineE2EPlatform(page);
  await page.goto("/");
  await expect(page.getByTestId("main-state-idle")).toBeVisible();
  await pressHotkey(page);
  await expect(page.getByTestId("main-state-processing")).toBeVisible({ timeout: 3000 });
  await expect(page).toHaveScreenshot("capturing.png", { fullPage: true });
});

// ═════════════════════════════════════════════════════════════════════════
// State 7: Analyzing (after release, before card arrives)
// ═════════════════════════════════════════════════════════════════════════

// Analyzing is transient — snapshot after Released, before answer card appears.
// Only wide viewport: transient states are fragile at narrow widths.

test("visual: analyzing — wide", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.wide);
  await installReplylineE2EPlatform(page);
  await page.goto("/");
  await expect(page.getByTestId("main-state-idle")).toBeVisible();
  await pressHotkey(page);
  await releaseHotkey(page);
  // The analyzing phase card should appear briefly before card is ready.
  await expect(page.getByTestId("processing-phase-label")).toBeVisible({ timeout: 3000 });
  await expect(page).toHaveScreenshot("analyzing.png", { fullPage: true });
});

// ═════════════════════════════════════════════════════════════════════════
// State 8: Answer ready — work card
// ═════════════════════════════════════════════════════════════════════════

for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
  test(`visual: answer ready — ${vpName}`, async ({ page }) => {
    await page.setViewportSize(vpSize);
    await installReplylineE2EPlatform(page);
    await page.goto("/");
    await pressHotkey(page);
    await releaseHotkey(page);
    await expect(page.getByTestId("answer-hero-card")).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveScreenshot(`answer-ready${vpLabel(vpName as ViewportName)}.png`, {
      fullPage: true,
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════
// State 9: Error recovery (pipeline error on main surface)
// ═════════════════════════════════════════════════════════════════════════

for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
  test(`visual: error recovery — ${vpName}`, async ({ page }) => {
    await page.setViewportSize(vpSize);
    await installReplylineE2EPlatform(page, undefined, {
      analysisError: { kind: "Pipeline", message: "LLM timeout" },
    });
    await page.goto("/");
    await pressHotkey(page);
    await releaseHotkey(page);
    await expect(page.getByTestId("error-recovery-card")).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveScreenshot(`error-recovery${vpLabel(vpName as ViewportName)}.png`, {
      fullPage: true,
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════
// State 10: Settings — overview
// ═════════════════════════════════════════════════════════════════════════

for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
  test(`visual: settings overview — ${vpName}`, async ({ page }) => {
    await page.setViewportSize(vpSize);
    await installReplylineE2EPlatform(page);
    await page.goto("/");
    await page.getByTestId("app-header-settings-action").click();
    await expect(page.getByTestId("settings-section-overview")).toBeVisible();
    await expect(page).toHaveScreenshot(`settings-overview${vpLabel(vpName as ViewportName)}.png`, {
      fullPage: true,
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════
// State 11: Settings — runtime check error
// ═════════════════════════════════════════════════════════════════════════

for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
  test(`visual: settings — runtime check error — ${vpName}`, async ({ page }) => {
    await page.setViewportSize(vpSize);
    const settings = createReplylineWebE2ESettings({ llmBaseUrl: "", llmModel: "" });
    await installReplylineE2EPlatform(page, settings, {
      deepgramKeyPresent: false,
      runtimeReady: false,
    });
    await page.goto("/");
    await page.getByTestId("app-header-settings-action").click();
    const checkBtn = page.getByTestId("check-settings-btn");
    if (await checkBtn.isVisible()) {
      await checkBtn.click();
    }
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      `settings-runtime-check-error${vpLabel(vpName as ViewportName)}.png`,
      { fullPage: true },
    );
  });
}

// ═════════════════════════════════════════════════════════════════════════
// Layout safety checks (non-snapshot)
// ═════════════════════════════════════════════════════════════════════════

test("layout: no horizontal overflow on app root at compact viewport", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.compact);
  await installReplylineE2EPlatform(page);
  await page.goto("/");
  await expect(page.getByTestId("main-state-idle")).toBeVisible();

  const root = page.locator(".app-root");
  const box = await root.boundingBox();
  expect(box).toBeTruthy();
  // App root should not exceed viewport width.
  expect(box!.x + box!.width).toBeLessThanOrEqual(VIEWPORTS.compact.width + 1);
});

test("layout: sticky footer does not overlap main content at normal viewport", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.normal);
  await installReplylineE2EPlatform(page, undefined, {
    contextPacks: demoContextPack(),
    contextActive: true,
  });
  await page.goto("/");
  await pressHotkey(page);
  await releaseHotkey(page);
  await expect(page.getByTestId("answer-hero-card")).toBeVisible({ timeout: 5000 });

  // Action dock should be visible and not overlap the answer card.
  const actionRow = page.getByTestId("action-row");
  await expect(actionRow).toBeVisible();
  const answerCard = page.getByTestId("answer-hero-card");
  const answerBox = await answerCard.boundingBox();
  const actionBox = await actionRow.boundingBox();
  expect(answerBox).toBeTruthy();
  expect(actionBox).toBeTruthy();
  // Footer should be below the answer card (no overlap).
  expect(actionBox!.y).toBeGreaterThanOrEqual(answerBox!.y + answerBox!.height - 1);
});

test("layout: context chip wraps cleanly on compact viewport", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.compact);
  await installReplylineE2EPlatform(page, undefined, {
    contextPacks: demoContextPack(),
    contextActive: true,
  });
  await page.goto("/");
  await expect(page.getByTestId("context-active-chip")).toBeVisible();

  const chip = page.getByTestId("context-active-chip");
  const chipBox = await chip.boundingBox();
  expect(chipBox).toBeTruthy();
  // Chip should not overflow the main card.
  const mainCard = page.getByTestId("main-surface");
  const cardBox = await mainCard.boundingBox();
  expect(chipBox!.x + chipBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width + 2);
});

test("layout: answer card text does not truncate at compact viewport", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.compact);
  await installReplylineE2EPlatform(page);
  await page.goto("/");
  await pressHotkey(page);
  await releaseHotkey(page);
  await expect(page.getByTestId("answer-hero-card")).toBeVisible({ timeout: 5000 });

  // say-now text should not have CSS truncation (no text-overflow: ellipsis cutting content).
  const sayNow = page.getByTestId("section-say-now");
  const overflowStyle = await sayNow.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      textOverflow: style.textOverflow,
      whiteSpace: style.whiteSpace,
      overflow: style.overflow,
    };
  });
  // The speak text should use normal wrapping, not ellipsis truncation.
  expect(overflowStyle.whiteSpace).not.toBe("nowrap");
});

test("layout: settings sidebar is scrollable at compact height", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 620 });
  await installReplylineE2EPlatform(page);
  await page.goto("/");
  await page.getByTestId("app-header-settings-action").click();
  await expect(page.getByTestId("settings-surface")).toBeVisible();

  // At wide width with compact height, sidebar should be present and not cause overflow.
  const sidebar = page.getByTestId("settings-sidebar");
  await expect(sidebar).toBeVisible();
  const sidebarBox = await sidebar.boundingBox();
  expect(sidebarBox).toBeTruthy();
  // Sidebar should be within the settings surface.
  const surface = page.getByTestId("settings-surface");
  const surfaceBox = await surface.boundingBox();
  expect(sidebarBox!.y + sidebarBox!.height).toBeLessThanOrEqual(
    surfaceBox!.y + surfaceBox!.height + 2,
  );
});
