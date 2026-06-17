/* global describe, it, browser */

/**
 * Desktop E2E artifact smoke — intentionally minimal.
 *
 * This lane checks that a built Tauri artifact launches, creates a WebDriver
 * session, renders the app shell, and survives basic input. It does NOT test
 * provider flows, settings persistence, or full UX paths — those require
 * live API keys or mocked platforms unavailable in desktop E2E.
 *
 * Prerequisites:
 *   - TAURI_APP_PATH env var pointing to the built .exe
 *   - webdriverio installed (pnpm install --include=optional)
 *   - Tauri WebDriver running on TAURI_DRIVER_PORT (default 4444)
 *
 * Run:
 *   pnpm test:e2e:desktop           (optional, skips if deps missing)
 *   pnpm test:e2e:desktop:required   (required, fails if deps missing)
 */

describe("tauri desktop artifact smoke", () => {
  it("launches the desktop artifact and creates a webdriver session", async () => {
    const handle = await browser.getWindowHandle();
    if (!handle || handle.length === 0) {
      throw new Error("Expected a valid window handle — the app may not have launched.");
    }
  });

  it("renders the app root element in any state", async () => {
    // The app root is always present: setup, idle, error, or loading.
    const root = await browser.$('[data-testid="app-root"]');
    await root.waitForExist({ timeout: 15000 });
    const displayed = await root.isDisplayed();
    if (!displayed) {
      throw new Error("App root element exists but is not visible.");
    }
  });

  it("renders the app header (shell chrome is present)", async () => {
    // The header is rendered in all states — confirms the shell loaded.
    const header = await browser.$('[data-testid="app-header"]');
    await header.waitForExist({ timeout: 10000 });
  });

  it("accepts minimal keyboard input without losing the session", async () => {
    await browser.keys(["r"]);
    const stillAlive = await browser.getWindowHandle();
    if (!stillAlive) {
      throw new Error("Session became unavailable after keyboard input.");
    }
  });

  it("accepts Tab navigation without crashing", async () => {
    // Tab through the app to confirm focus handling works.
    await browser.keys(["Tab"]);
    await browser.keys(["Tab"]);
    const stillAlive = await browser.getWindowHandle();
    if (!stillAlive) {
      throw new Error("Session crashed during Tab navigation.");
    }
  });
});
