/**
 * Desktop E2E required lane runner.
 *
 * Requires:
 *   - TAURI_APP_PATH  — path to the built replyline.exe (required)
 *   - TAURI_DRIVER_PORT — WebDriver port (optional, default 4444)
 *   - webdriverio installed (pnpm install --include=optional)
 *
 * The lane verifies:
 *   1. The artifact exists and is readable.
 *   2. WebDriverIO dependencies are available.
 *   3. The tauri.smoke.mjs spec passes (launch, shell, input).
 *
 * This lane is BLOCKING only in verify:extended when all prerequisites are met.
 * In CI, it runs as optional. Locally, it's workstation-dependent.
 */

import { accessSync, constants } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const REQUIRED_ENV = "TAURI_APP_PATH";
const DRIVER_PORT_ENV = "TAURI_DRIVER_PORT";
const REQUIRED_PACKAGE = "webdriverio";

function fail(message) {
  console.error(`\n[desktop-e2e:required] ${message}`);
  console.error("[desktop-e2e:required] Troubleshooting:");
  console.error("  1. Build the app first: pnpm tauri build");
  console.error("  2. Set TAURI_APP_PATH to the built .exe path.");
  console.error("     Example: $env:TAURI_APP_PATH = 'src-tauri/target/release/replyline.exe'");
  console.error("  3. Install optional deps: pnpm install --include=optional");
  console.error("  4. Ensure no other instance of replyline.exe is running.");
  console.error("  5. Run: pnpm test:e2e:desktop:required");
  console.error("");
  process.exit(1);
}

function canReadPath(inputPath) {
  try {
    accessSync(resolve(inputPath), constants.F_OK | constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function hasPackage(pkgName) {
  return canReadPath(resolve("node_modules", pkgName, "package.json"));
}

// ── Validate TAURI_APP_PATH ─────────────────────────────────────────

const tauriAppPath = process.env[REQUIRED_ENV]?.trim() ?? "";
if (!tauriAppPath) {
  fail(
    `${REQUIRED_ENV} is not set. This env var must point to the built replyline.exe.\n` +
      `Build the app first: pnpm tauri build\n` +
      `Then set: $env:TAURI_APP_PATH = 'src-tauri/target/release/replyline.exe'`,
  );
}
if (!canReadPath(tauriAppPath)) {
  fail(
    `${REQUIRED_ENV}=${tauriAppPath}\n` +
      `The file does not exist or is not readable.\n` +
      `Build the app first: pnpm tauri build`,
  );
}

console.log(`[desktop-e2e:required] TAURI_APP_PATH: ${resolve(tauriAppPath)}`);

// ── Validate webdriverio ─────────────────────────────────────────────

if (!hasPackage(REQUIRED_PACKAGE)) {
  fail(
    `Required package "${REQUIRED_PACKAGE}" is not installed.\n` +
      `Run: pnpm install --include=optional`,
  );
}

// ── Optional: validate driver port ───────────────────────────────────

const driverPort = process.env[DRIVER_PORT_ENV]?.trim() || "4444";
console.log(`[desktop-e2e:required] TAURI_DRIVER_PORT: ${driverPort}`);
console.log(`[desktop-e2e:required] Running tauri.smoke.mjs...`);

// ── Run WebDriverIO ──────────────────────────────────────────────────

const command = "pnpm exec wdio run tests/e2e/desktop/wdio.tauri.conf.mjs";
const run = spawnSync("cmd.exe", ["/d", "/s", "/c", command], {
  stdio: "inherit",
  shell: false,
  windowsHide: true,
  env: {
    ...process.env,
    TAURI_DRIVER_PORT: driverPort,
  },
});

if (run.error) {
  console.error(`\n[desktop-e2e:required] Failed to spawn wdio: ${run.error.message}`);
  console.error("[desktop-e2e:required] Make sure Tauri WebDriver is available.");
  console.error("[desktop-e2e:required] Install: cargo install tauri-driver");
  process.exit(1);
}

if (run.status !== 0) {
  console.error(`\n[desktop-e2e:required] Desktop E2E smoke FAILED (exit code ${run.status}).`);
  console.error("[desktop-e2e:required] Common causes:");
  console.error("  - Another instance of replyline.exe is already running.");
  console.error("  - TAURI_APP_PATH points to a stale/incompatible build.");
  console.error("  - Tauri WebDriver port conflict (TAURI_DRIVER_PORT).");
  console.error("  - Antivirus blocking the WebDriver connection.");
  console.error("  - The app crashed on startup (check app.log).");
  process.exit(run.status);
}

console.log("[desktop-e2e:required] Desktop E2E smoke PASSED.");
