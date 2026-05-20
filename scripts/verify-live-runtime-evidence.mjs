import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const requiredEvents = [
  "app_boot_start",
  "settings_load_attempt",
  "settings_parse_ok",
  "settings_validation_ok",
  "bootstrap_loaded",
  "hotkey_registered",
  "hotkey_pressed",
  "setup_preflight_check_start",
  "setup_preflight_check_result",
  "capture_start_requested",
  "capture_start_ok",
  "capture_stop_requested",
  "analysis_start",
  "analysis_stt_ok",
  "analysis_llm_ok",
];

const terminalEvents = ["analysis_ok", "ui_answer_ready"];
const captureAltEvents = ["capture_start_ok", "capture_start_client_ok"];
const forbiddenPatterns = [/\bsk-[a-z0-9_-]+\b/i, /\bdg_[a-z0-9_-]+\b/i, /\bBearer\s+\S+/i];
const maybeForbidden = [/api_key=/i];

function parseEvents(logText) {
  return Array.from(logText.matchAll(/\[([a-z0-9_-]+)\]/gi)).map((m) => m[1]);
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

function hasUnsafeApiKey(raw) {
  if (!/api_key=/i.test(raw)) return false;
  return !/\[redacted\]/i.test(raw);
}

const evidenceDir = process.argv[2];
if (!evidenceDir) {
  fail("Usage: node scripts/verify-live-runtime-evidence.mjs <evidence_dir>");
}

const appLogPath = path.join(evidenceDir, "app.log");
const reportPath = path.join(evidenceDir, "runtime-live-qa.md");
const diagnosticsPath = path.join(evidenceDir, "diagnostics.json");

if (!existsSync(appLogPath)) fail("Missing required file: app.log");
if (!existsSync(reportPath)) fail("Missing required file: runtime-live-qa.md");

const appLog = readFileSync(appLogPath, "utf8");
const events = parseEvents(appLog);

for (const event of requiredEvents) {
  if (!events.includes(event)) {
    fail(`Missing required event: ${event}`);
  }
}

if (!captureAltEvents.some((event) => events.includes(event))) {
  fail("Missing capture start success event");
}

if (!terminalEvents.some((event) => events.includes(event))) {
  fail("Missing terminal analysis event (analysis_ok or ui_answer_ready)");
}

if (events.includes("settings_quarantine")) {
  fail("Forbidden event found: settings_quarantine");
}

const hadReadySignal =
  appLog.includes("setup_preflight_check_result") &&
  (appLog.includes("runtime_ready=true") || appLog.includes("status=ready"));
if (hadReadySignal && events.includes("setup_missing_redirect")) {
  fail("Forbidden setup_missing_redirect after ready runtime signal");
}

for (const pattern of forbiddenPatterns) {
  if (pattern.test(appLog)) {
    fail(`Forbidden raw secret pattern found: ${pattern}`);
  }
}
for (const pattern of maybeForbidden) {
  if (pattern.test(appLog) && hasUnsafeApiKey(appLog)) {
    fail("Forbidden raw api_key marker found");
  }
}

if (existsSync(diagnosticsPath)) {
  const diagnostics = JSON.parse(readFileSync(diagnosticsPath, "utf8"));
  if (diagnostics.settingsFileExists !== true) fail("diagnostics.settingsFileExists must be true");
  if (diagnostics.settingsParseOk !== true) fail("diagnostics.settingsParseOk must be true");
  if (diagnostics.settingsValidationOk !== true)
    fail("diagnostics.settingsValidationOk must be true");
  if (diagnostics.deepgramKeyPresent !== true) fail("diagnostics.deepgramKeyPresent must be true");
  if (diagnostics.llmKeyPresent !== true) fail("diagnostics.llmKeyPresent must be true");
  if (diagnostics.runtimePathReady !== true) fail("diagnostics.runtimePathReady must be true");
  if (Number(diagnostics.corruptBackupsCount ?? -1) !== 0) {
    fail("diagnostics.corruptBackupsCount must be 0");
  }
}

pass("live runtime evidence verified");
