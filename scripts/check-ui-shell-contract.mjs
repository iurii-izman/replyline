import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const cwd = process.cwd();

const failures = [];

function fail(message) {
  failures.push(message);
}

function readText(path) {
  const fullPath = join(cwd, path);
  if (!existsSync(fullPath)) {
    fail(`${path}: file is missing`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function assertIncludes(content, needle, label) {
  if (!content.includes(needle)) {
    fail(`${label}: missing "${needle}"`);
  }
}

function assertNotIncludes(content, needle, label) {
  if (content.includes(needle)) {
    fail(`${label}: forbidden token "${needle}"`);
  }
}

function assertRegex(content, regex, label, details) {
  if (!regex.test(content)) {
    fail(`${label}: ${details}`);
  }
}

const tauriConfigText = readText("src-tauri/tauri.conf.json");
if (tauriConfigText) {
  const config = JSON.parse(tauriConfigText);
  const mainWindow =
    config?.app?.windows?.find((window) => window?.label === "main") ?? config?.app?.windows?.[0];

  if (!mainWindow) {
    fail("src-tauri/tauri.conf.json: app.windows[0] is missing");
  } else {
    if (mainWindow.decorations === false) {
      fail("src-tauri/tauri.conf.json: main window decorations must stay enabled");
    }
    if (mainWindow.alwaysOnTop === true) {
      fail("src-tauri/tauri.conf.json: main window alwaysOnTop must not be true by default");
    }
    if (mainWindow.skipTaskbar === true) {
      fail("src-tauri/tauri.conf.json: main window skipTaskbar must not be true by default");
    }
  }
}

const chromeSurface = readText("src/app/ChromeSurface.tsx");
if (chromeSurface) {
  assertIncludes(chromeSurface, "toggleSettingsPanel()", "src/app/ChromeSurface.tsx");
  assertIncludes(chromeSurface, "hideWindow()", "src/app/ChromeSurface.tsx");

  assertNotIncludes(chromeSurface, "closeWindow(", "src/app/ChromeSurface.tsx");
  assertNotIncludes(chromeSurface, "quitApp(", "src/app/ChromeSurface.tsx");
  assertNotIncludes(chromeSurface, "exitApp(", "src/app/ChromeSurface.tsx");

  assertRegex(
    chromeSurface,
    /title=\{st\(\)\.chrome\.hideToTray\}/u,
    "src/app/ChromeSurface.tsx",
    "hide-to-tray action title should stay present",
  );
}

const appTsx = readText("src/App.tsx");
if (appTsx) {
  assertIncludes(appTsx, 'class="app-root"', "src/App.tsx");
  assertIncludes(appTsx, 'data-testid="app-root"', "src/App.tsx");
  assertIncludes(appTsx, 'class="app-workarea"', "src/App.tsx");
  assertIncludes(appTsx, 'data-testid="app-workarea"', "src/App.tsx");
  assertIncludes(appTsx, 'class="app-view', "src/App.tsx");
  assertIncludes(appTsx, 'data-testid="app-view"', "src/App.tsx");
  assertIncludes(appTsx, "CandidatePackStudioSurface", "src/App.tsx");
  assertIncludes(appTsx, 'class="app-sticky-footer"', "src/App.tsx");
}

const settingsSurface = readText("src/app/SettingsSurface.tsx");
if (settingsSurface) {
  assertIncludes(settingsSurface, "settingsActiveSection()", "src/app/SettingsSurface.tsx");
  assertIncludes(settingsSurface, "setSettingsActiveSection(", "src/app/SettingsSurface.tsx");
  assertIncludes(settingsSurface, 'data-testid="settings-sidebar"', "src/app/SettingsSurface.tsx");

  const sectionShowCount = (settingsSurface.match(/activeSection\(\) === "/gu) ?? []).length;
  if (sectionShowCount < 6) {
    fail(
      "src/app/SettingsSurface.tsx: expected section-mode rendering guards for settings sections",
    );
  }

  assertIncludes(settingsSurface, "openCandidatePackStudioPanel()", "src/app/SettingsSurface.tsx");
  assertIncludes(
    settingsSurface,
    'data-testid="candidate-pack-summary"',
    "src/app/SettingsSurface.tsx",
  );
}

const candidatePackStudioSurface = readText("src/app/CandidatePackStudioSurface.tsx");
if (candidatePackStudioSurface) {
  assertIncludes(
    candidatePackStudioSurface,
    'data-testid="candidate-pack-studio-surface"',
    "src/app/CandidatePackStudioSurface.tsx",
  );
  assertIncludes(
    candidatePackStudioSurface,
    'controller().panel() === "candidatePackStudio"',
    "src/app/CandidatePackStudioSurface.tsx",
  );
  assertIncludes(
    candidatePackStudioSurface,
    "<CandidatePackStudio",
    "src/app/CandidatePackStudioSurface.tsx",
  );
}

const appCss = readText("src/App.css");
if (appCss) {
  assertIncludes(appCss, "--workspace-max", "src/App.css");
  assertIncludes(appCss, "--settings-max", "src/App.css");
  assertIncludes(appCss, "--studio-max", "src/App.css");

  assertIncludes(appCss, ".app-sticky-footer", "src/App.css");
  assertIncludes(appCss, ".settings-sticky-footer", "src/App.css");

  assertRegex(
    appCss,
    /\.settings-content\s*,\s*\.candidate-pack-studio\s*\{[^}]*padding-bottom\s*:\s*88px;/su,
    "src/App.css",
    "expected sticky-footer bottom padding compensation for settings and studio content",
  );
}

if (failures.length > 0) {
  console.error("UI shell contract failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("UI shell contract OK.");
