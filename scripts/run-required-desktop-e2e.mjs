import { accessSync, constants } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const REQUIRED_ENV = "TAURI_APP_PATH";
const REQUIRED_PACKAGE = "webdriverio";
const REQUIRED_MESSAGE =
  "TAURI_APP_PATH is required for desktop E2E required lane. Build the app first or provide artifact path.";

function fail(message) {
  console.error(`[desktop-e2e:required] ${message}`);
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

const tauriAppPath = process.env[REQUIRED_ENV]?.trim() ?? "";
if (!tauriAppPath) {
  fail(REQUIRED_MESSAGE);
}
if (!canReadPath(tauriAppPath)) {
  fail(
    `${REQUIRED_MESSAGE}\nConfigured ${REQUIRED_ENV} does not exist or is not readable: ${resolve(tauriAppPath)}`,
  );
}

if (!hasPackage(REQUIRED_PACKAGE)) {
  fail(
    `Required package "${REQUIRED_PACKAGE}" is not installed. Run "pnpm install --include=optional" before desktop E2E required lane.`,
  );
}

const command = "pnpm exec wdio run tests/e2e/desktop/wdio.tauri.conf.mjs";
const run = spawnSync("cmd.exe", ["/d", "/s", "/c", command], {
  stdio: "inherit",
  shell: false,
  windowsHide: true,
});

if (run.error) {
  fail(`Failed to run desktop E2E required lane: ${run.error.message}`);
}

process.exit(run.status ?? 1);
