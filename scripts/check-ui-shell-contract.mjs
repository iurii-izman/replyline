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

  if (mainWindow) {
    if (mainWindow.decorations === false) {
      fail("src-tauri/tauri.conf.json: main window decorations must stay enabled");
    }
    if (mainWindow.alwaysOnTop === true) {
      fail("src-tauri/tauri.conf.json: main window alwaysOnTop must not be true by default");
    }
    if (mainWindow.skipTaskbar === true) {
      fail("src-tauri/tauri.conf.json: main window skipTaskbar must not be true by default");
    }
  } else {
    fail("src-tauri/tauri.conf.json: app.windows[0] is missing");
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
// Also read extracted sub-components for shell contract checks
const mainLiveAssistShell = readText("src/app/main/LiveAssistShell.tsx") || "";
const mainActionDock = readText("src/app/main/ActionDock.tsx") || "";
const mainWorkspaceSidePanel = readText("src/app/main/WorkspaceSidePanel.tsx") || "";
if (mainSurface) {
  assertIncludes(
    mainLiveAssistShell || mainSurface,
    'data-testid="workspace-layout"',
    "src/app/main/LiveAssistShell.tsx",
  );
  assertIncludes(
    mainLiveAssistShell || mainSurface,
    "main-cockpit-layout",
    "src/app/main/LiveAssistShell.tsx",
  );
  assertIncludes(
    mainLiveAssistShell || mainSurface,
    "app-page-main",
    "src/app/main/LiveAssistShell.tsx",
  );
  assertIncludes(
    mainWorkspaceSidePanel || mainSurface,
    "app-page-aside app-sidebar",
    "src/app/main/WorkspaceSidePanel.tsx",
  );
  assertIncludes(
    mainActionDock || mainSurface,
    'data-testid="action-row"',
    "src/app/main/ActionDock.tsx",
  );
  assertIncludes(mainSurface, 'data-testid="main-status-strip"', "src/app/MainSurface.tsx");
  const actionRowSource = mainActionDock || mainSurface;
  const actionRowMatch = actionRowSource.match(
    /<div class="action-bar sticky-action-footer app-sticky-footer" data-testid="action-row">([\s\S]*?)<\/div>/u,
  );
  if (!actionRowMatch) {
    fail("src/app/main/ActionDock.tsx: action row block missing");
  } else if (/sessionActions\./u.test(actionRowMatch[1] ?? "")) {
    fail("main bottom action bar must not include session/report/export actions");
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
  assertIncludes(appTsx, "ContextPackPanel", "src/App.tsx");
  assertIncludes(appTsx, 'class="app-sticky-footer"', "src/App.tsx");
}

const settingsSurface = readText("src/app/SettingsSurface.tsx");
const settingsNav = readText("src/app/settings/SettingsNav.tsx");
if (settingsSurface) {
  assertIncludes(settingsSurface, "settingsActiveSection()", "src/app/SettingsSurface.tsx");
  assertIncludes(settingsSurface, "setSettingsActiveSection(", "src/app/SettingsSurface.tsx");

  const sectionShowCount = (settingsSurface.match(/activeSection\(\) === "/gu) ?? []).length;
  if (sectionShowCount < 5) {
    fail(
      "src/app/SettingsSurface.tsx: expected section-mode rendering guards for settings sections",
    );
  }

  if (settingsNav) {
    assertIncludes(
      settingsNav,
      'data-testid="settings-sidebar"',
      "src/app/settings/SettingsNav.tsx",
    );
    assertIncludes(settingsNav, 'role="tablist"', "src/app/settings/SettingsNav.tsx");
    assertIncludes(settingsNav, 'role="tab"', "src/app/settings/SettingsNav.tsx");
  }
  assertNoRegex(
    settingsSurface,
    /class="settings-content[\s\S]*?(?:w-full|max-w-none)/u,
    "src/app/SettingsSurface.tsx",
    "settings form must keep capped width classes and avoid full-width infinite form patterns",
  );
}

const contextPackPanel = readText("src/app/ContextPackPanel.tsx");
if (contextPackPanel) {
  assertIncludes(
    contextPackPanel,
    'data-testid="context-pack-panel"',
    "src/app/ContextPackPanel.tsx",
  );
  assertIncludes(contextPackPanel, "st().contextPack.panelTitle", "src/app/ContextPackPanel.tsx");
  assertIncludes(contextPackPanel, "saveContextPack", "src/app/ContextPackPanel.tsx");
  assertNoRegex(
    contextPackPanel,
    />\s*Cancel\s*</u,
    "src/app/ContextPackPanel.tsx",
    "context panel actions must use locale strings",
  );
}

const appCss = readText("src/App.css");
// Tokens now live in src/styles/tokens.css — merge for contract checks.
const tokensCss = readText("src/styles/tokens.css");
const mergedCss = (appCss || "") + "\n" + (tokensCss || "");
if (appCss) {
  // Layout/component checks still run against App.css + layout/components.
  const layoutCss = readText("src/styles/layout.css") || "";
  const componentsCss = readText("src/styles/components.css") || "";
  const allCss = mergedCss + "\n" + layoutCss + "\n" + componentsCss;
  assertIncludes(allCss, "--workspace-max", "src/App.css + styles");
  assertIncludes(allCss, "--settings-max", "src/App.css + styles");
  assertIncludes(allCss, ".app-sticky-footer", "src/App.css + styles");
  assertIncludes(allCss, ".settings-sticky-footer", "src/App.css + styles");
  assertIncludes(allCss, ".settings-sticky-footer--section", "src/App.css + styles");
  assertIncludes(allCss, ".context-pack-panel", "src/App.css + styles");

  assertRegex(
    allCss,
    /\.settings-content\s*\{[^}]*padding-bottom\s*:\s*calc\(var\(--page-footer-space\)\s*\+\s*20px\)/su,
    "src/App.css + styles",
    "expected sticky-footer bottom padding compensation for settings content",
  );
  assertRegex(
    allCss,
    /\.settings-content\s*\{[^}]*max-width\s*:\s*var\(--settings-content-max\)/su,
    "src/App.css + styles",
    "settings content should keep max-width cap token",
  );
  const requiredSemanticTokens = [
    "--color-bg-app",
    "--color-bg-canvas",
    "--color-bg-surface",
    "--color-bg-surface-raised",
    "--color-bg-surface-muted",
    "--color-bg-hero",
    "--color-text-primary",
    "--color-text-secondary",
    "--color-text-muted",
    "--color-text-accent",
    "--color-border-subtle",
    "--color-border-strong",
    "--color-accent",
    "--color-accent-hover",
    "--color-accent-soft",
    "--color-success",
    "--color-success-soft",
    "--color-warning",
    "--color-warning-soft",
    "--color-danger",
    "--color-danger-soft",
    "--color-state-recording",
    "--color-state-analyzing",
    "--color-state-copied",
    "--color-focus-ring",
    "--color-focus-shadow",
    "--shadow-hero",
    "--motion-fast",
    "--motion-normal",
  ];

  for (const token of requiredSemanticTokens) {
    assertIncludes(mergedCss, token, "src/App.css + tokens.css");
  }

  const requiredCompatAliases = [
    "--canvas-bg",
    "--canvas-wash",
    "--surface-base",
    "--surface-raised",
    "--surface-muted",
    "--text-primary",
    "--text-secondary",
    "--text-tertiary",
    "--accent",
    "--warning",
    "--danger",
    "--success",
    "--radius-card",
    "--text-say-now",
    "--color-say-now-bg",
    "--color-say-now-border",
  ];

  for (const aliasToken of requiredCompatAliases) {
    assertIncludes(mergedCss, aliasToken, "src/App.css + tokens.css");
  }
}

const userFacingTsxFiles = [
  "src/app/MainSurface.tsx",
  "src/app/SettingsSurface.tsx",
  "src/app/ContextPackPanel.tsx",
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

const criticalIconFiles = [
  "src/app/ChromeSurface.tsx",
  "src/app/MainSurface.tsx",
  "src/app/SettingsSurface.tsx",
  "src/app/ContextPackPanel.tsx",
];

for (const path of criticalIconFiles) {
  const source = readText(path);
  if (!source) continue;
  assertNoRegex(
    source,
    /[⚙⤓✓✗○▾]/u,
    path,
    "critical header/actions must not rely on Unicode icon glyphs",
  );
}

const localeSource = readText("src/app/locale/index.ts");
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
  assertNoRegex(
    ruLocale,
    /candidateStudioSteps:\s*\[[^\]]*Input[^\]]*\]/u,
    "src/app/locale.ts",
    'RU-first violation: avoid raw "Input" in RU stepper labels',
  );
}

if (mainSurface) {
  const mainLiveAnswerCard = readText("src/app/main/LiveAnswerCard.tsx") || "";
  const mainMergedForCopyCheck = mainSurface + (mainLiveAnswerCard || "");
  assertRegex(
    mainMergedForCopyCheck,
    /<button[\s\S]*btn-primary[\s\S]*\{st\(\)\.card\.copyFullAnswer\}/u,
    "src/app/main/LiveAnswerCard.tsx or MainSurface.tsx",
    "critical copy action must use Replyline button class",
  );
  assertRegex(
    mainActionDock || mainSurface,
    /<button[\s\S]*btn-secondary[\s\S]*\{st\(\)\.card\.retryCard\}/u,
    "src/app/main/ActionDock.tsx",
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

if (contextPackPanel) {
  assertRegex(
    contextPackPanel,
    /<button[\s\S]*class="btn btn-primary"[\s\S]*\{st\(\)\.contextPack\.newPack\}/u,
    "src/app/ContextPackPanel.tsx",
    "critical new context action must use Replyline button class",
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
