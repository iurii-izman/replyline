import { expect, test } from "@playwright/test";
import { installReplylineE2EPlatform, type E2EBootstrapOverrides } from "./replyline-fixture";
import { createReplylineWebE2ESettings } from "./replyline-e2e-settings";

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

// NOTE: "setup missing" visual state is covered by unit tests
// (main-card.ui.test.tsx). The E2E fixture currently doesn't
// reliably reproduce the setup-missing screen because the
// bootstrap → lifecycle → selector chain needs deeper mocking.

// ── State 1: Idle ready — no context ───────────────────────────────
test("visual: idle ready — no active context", async ({ page }) => {
  await installReplylineE2EPlatform(page);
  await page.goto("/");
  await expect(page.getByTestId("main-state-idle")).toBeVisible();
  await expect(page).toHaveScreenshot("idle-ready-no-context.png", { fullPage: true });
});

// ── State 3: Idle ready — with active context ──────────────────────
test("visual: idle ready — active context chip visible", async ({ page }) => {
  await installReplylineE2EPlatform(page, undefined, {
    contextPacks: demoContextPack(),
    contextActive: true,
  });
  await page.goto("/");
  await expect(page.getByTestId("context-active-chip")).toBeVisible();
  await expect(page).toHaveScreenshot("idle-ready-active-context.png", { fullPage: true });
});

// ── State 4: ContextPack panel — empty ─────────────────────────────
test("visual: context pack panel — empty state", async ({ page }) => {
  await installReplylineE2EPlatform(page);
  await page.goto("/");
  await page.getByTestId("context-pack-open-btn").click();
  await expect(page.getByTestId("context-pack-empty")).toBeVisible();
  await expect(page).toHaveScreenshot("context-pack-empty.png", { fullPage: true });
});

// ── State 5: ContextPack panel — with active pack ──────────────────
test("visual: context pack panel — active pack shown", async ({ page }) => {
  await installReplylineE2EPlatform(page, undefined, {
    contextPacks: demoContextPack(),
    contextActive: true,
  });
  await page.goto("/");
  await page.getByTestId("context-pack-open-btn").click();
  await expect(page.getByTestId("context-pack-active-banner")).toBeVisible();
  await expect(page).toHaveScreenshot("context-pack-active.png", { fullPage: true });
});

// ── State 6: Answer ready — work card ──────────────────────────────
test("visual: answer ready — work card with say-now", async ({ page }) => {
  await installReplylineE2EPlatform(page);
  await page.goto("/");
  // Trigger capture via E2E shortcut.
  await page.evaluate(() => {
    (
      window as Window & {
        __REPLYLINE_E2E_TRIGGER_SHORTCUT__: (s: "Pressed" | "Released") => void;
      }
    ).__REPLYLINE_E2E_TRIGGER_SHORTCUT__("Pressed");
  });
  await page.evaluate(() => {
    (
      window as Window & {
        __REPLYLINE_E2E_TRIGGER_SHORTCUT__: (s: "Pressed" | "Released") => void;
      }
    ).__REPLYLINE_E2E_TRIGGER_SHORTCUT__("Released");
  });
  await expect(page.getByTestId("answer-hero-card")).toBeVisible();
  await expect(page).toHaveScreenshot("answer-ready.png", { fullPage: true });
});

// ── State 7: Settings — overview ───────────────────────────────────
test("visual: settings — overview", async ({ page }) => {
  await installReplylineE2EPlatform(page);
  await page.goto("/");
  await page.getByTestId("app-header-settings-action").click();
  await expect(page.getByTestId("settings-section-overview")).toBeVisible();
  await expect(page).toHaveScreenshot("settings-overview.png", { fullPage: true });
});

// ── State 8: Provider setup error (runtime check failure) ──────────
test("visual: settings — runtime check with errors", async ({ page }) => {
  const settings = createReplylineWebE2ESettings({ llmBaseUrl: "", llmModel: "" });
  await installReplylineE2EPlatform(page, settings, {
    deepgramKeyPresent: false,
    runtimeReady: false,
  });
  await page.goto("/");
  await page.getByTestId("app-header-settings-action").click();
  // Click "Run check" to trigger the runtime check UI.
  const checkBtn = page.getByTestId("check-settings-btn");
  if (await checkBtn.isVisible()) {
    await checkBtn.click();
  }
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot("settings-runtime-check-error.png", { fullPage: true });
});
