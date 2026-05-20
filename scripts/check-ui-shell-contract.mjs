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

function assertNoRegex(content, regex, label, details) {
  if (regex.test(content)) {
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
  assertIncludes(chromeSurface, "app-header-context", "src/app/ChromeSurface.tsx");
  assertIncludes(chromeSurface, "headerStatus", "src/app/ChromeSurface.tsx");
  assertIncludes(chromeSurface, "activeSection", "src/app/ChromeSurface.tsx");

  assertNotIncludes(chromeSurface, "closeWindow(", "src/app/ChromeSurface.tsx");
  assertNotIncludes(chromeSurface, "minimizeWindow(", "src/app/ChromeSurface.tsx");
  assertNotIncludes(chromeSurface, "maximizeWindow(", "src/app/ChromeSurface.tsx");
  assertNotIncludes(chromeSurface, "quitApp(", "src/app/ChromeSurface.tsx");
  assertNotIncludes(chromeSurface, "exitApp(", "src/app/ChromeSurface.tsx");

  assertRegex(
    chromeSurface,
    /title=\{st\(\)\.chrome\.hideToTray\}/u,
    "src/app/ChromeSurface.tsx",
    "hide-to-tray action title should stay present",
  );
}

const mainSurface = readText("src/app/MainSurface.tsx");
if (mainSurface) {
  assertIncludes(mainSurface, 'data-testid="workspace-layout"', "src/app/MainSurface.tsx");
  assertIncludes(mainSurface, "main-cockpit-layout", "src/app/MainSurface.tsx");
  assertIncludes(mainSurface, "app-page-main", "src/app/MainSurface.tsx");
  assertIncludes(mainSurface, "app-page-aside app-sidebar", "src/app/MainSurface.tsx");
  assertIncludes(mainSurface, 'data-testid="action-row"', "src/app/MainSurface.tsx");
  assertIncludes(mainSurface, 'data-testid="main-status-strip"', "src/app/MainSurface.tsx");
  const actionRowMatch = mainSurface.match(
    /<div class="action-bar sticky-action-footer app-sticky-footer" data-testid="action-row">([\s\S]*?)<\/div>/u,
  );
  if (!actionRowMatch) {
    fail("src/app/MainSurface.tsx: action row block missing");
  } else if (/sessionActions\./u.test(actionRowMatch[1] ?? "")) {
    fail(
      "src/app/MainSurface.tsx: main bottom action bar must not include session/report/export actions",
    );
  }
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
  assertIncludes(settingsSurface, 'role="tablist"', "src/app/SettingsSurface.tsx");
  assertIncludes(settingsSurface, 'role="tab"', "src/app/SettingsSurface.tsx");
  assertNoRegex(
    settingsSurface,
    /class="settings-content[\s\S]*?(?:w-full|max-w-none)/u,
    "src/app/SettingsSurface.tsx",
    "settings form must keep capped width classes and avoid full-width infinite form patterns",
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

const candidatePackStudio = readText("src/app/CandidatePackStudio.tsx");
if (candidatePackStudio) {
  assertIncludes(
    candidatePackStudio,
    'data-testid="candidate-pack-studio-grid"',
    "src/app/CandidatePackStudio.tsx",
  );
  assertNoRegex(
    candidatePackStudio,
    /class="candidate-pack-studio[\s\S]*?(?:w-full|max-w-none)/u,
    "src/app/CandidatePackStudio.tsx",
    "candidate studio must keep capped width classes and avoid full-width infinite form patterns",
  );
  assertIncludes(
    candidatePackStudio,
    'data-testid="candidate-pack-studio-footer"',
    "src/app/CandidatePackStudio.tsx",
  );
}

const appCss = readText("src/App.css");
if (appCss) {
  assertIncludes(appCss, "--workspace-max", "src/App.css");
  assertIncludes(appCss, "--settings-max", "src/App.css");
  assertIncludes(appCss, "--studio-max", "src/App.css");

  assertIncludes(appCss, ".app-sticky-footer", "src/App.css");
  assertIncludes(appCss, ".settings-sticky-footer", "src/App.css");
  assertIncludes(appCss, ".settings-sticky-footer--section", "src/App.css");
  assertIncludes(appCss, ".candidate-pack-footer", "src/App.css");

  assertRegex(
    appCss,
    /\.settings-content\s*,\s*\.candidate-pack-studio\s*\{[^}]*padding-bottom\s*:\s*(?:7[0-9]|8[0-9])px;/su,
    "src/App.css",
    "expected sticky-footer bottom padding compensation for settings and studio content",
  );
  assertRegex(
    appCss,
    /\.settings-content\s*\{[^}]*max-width\s*:\s*var\(--settings-content-max\)/su,
    "src/App.css",
    "settings content should keep max-width cap token",
  );
  assertRegex(
    appCss,
    /\.candidate-pack-studio\s*\{[^}]*max-width\s*:\s*var\(--studio-max\)/su,
    "src/App.css",
    "candidate studio should keep max-width cap token",
  );
}

const userFacingTsxFiles = [
  "src/app/MainSurface.tsx",
  "src/app/SettingsSurface.tsx",
  "src/app/CandidatePackStudio.tsx",
  "src/app/CandidatePackStudioSurface.tsx",
  "src/app/ChromeSurface.tsx",
];

for (const path of userFacingTsxFiles) {
  const source = readText(path);
  if (!source) continue;

  assertNoRegex(
    source,
    />\s*(missing|ready|optional)\s*</giu,
    path,
    'raw EN setup labels in user-facing JSX are forbidden ("missing/ready/optional")',
  );
  assertNoRegex(source, /Статус setup/gu, path, 'forbidden copy "Статус setup"');
}

const localeSource = readText("src/app/locale.ts");
if (localeSource) {
  const ruSectionEnd = localeSource.indexOf("export const ui_en");
  const ruLocale = ruSectionEnd > -1 ? localeSource.slice(0, ruSectionEnd) : localeSource;
  assertNoRegex(
    ruLocale,
    /inputPanelTitle:\s*"Input"/u,
    "src/app/locale.ts",
    'RU-first violation: avoid raw "Input" in RU-facing labels',
  );
  assertNoRegex(
    ruLocale,
    /previewPanelTitle:\s*"Preview and quality"/u,
    "src/app/locale.ts",
    'RU-first violation: avoid raw "Preview and quality" in RU-facing labels',
  );
  assertNoRegex(
    ruLocale,
    /savedProfileTitle:\s*"Saved profile"/u,
    "src/app/locale.ts",
    'RU-first violation: avoid raw "Saved profile" in RU-facing labels',
  );
}

if (mainSurface) {
  assertRegex(
    mainSurface,
    /<button[\s\S]*class="btn-primary"[\s\S]*\{st\(\)\.card\.copySayNow\}/u,
    "src/app/MainSurface.tsx",
    "critical copy action must use Replyline button class",
  );
  assertRegex(
    mainSurface,
    /<button[\s\S]*class="btn-secondary"[\s\S]*\{st\(\)\.card\.retryCard\}/u,
    "src/app/MainSurface.tsx",
    "critical retry action must use Replyline button class",
  );
}

if (settingsSurface) {
  assertRegex(
    settingsSurface,
    /<button[\s\S]*class="btn-primary"[\s\S]*\{controller\(\)\.saving\(\)\s*\?\s*st\(\)\.settings\.saving\s*:\s*st\(\)\.settings\.save\}/u,
    "src/app/SettingsSurface.tsx",
    "critical save settings action must use Replyline button class",
  );
}

if (candidatePackStudio) {
  assertRegex(
    candidatePackStudio,
    /<button[\s\S]*class="btn-primary"[\s\S]*st\(\)\.settings\.prepare/u,
    "src/app/CandidatePackStudio.tsx",
    "critical prepare candidate pack action must use Replyline button class",
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
