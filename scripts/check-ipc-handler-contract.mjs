/**
 * Ensures `src-tauri/src/lib.rs` invoke_handler stays aligned with the expected command surface.
 * Catches drift when commands are added/renamed in Rust but not registered (or vice versa).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const libPath = join(root, "src-tauri", "src", "lib.rs");

const REQUIRED = [
  "acknowledge_tray_intro",
  "capture_start",
  "capture_stop_and_analyze",
  "check_provider_health",
  "clear_context",
  "collect_diagnostic_bundle",
  "delete_secret",
  "get_context_status",
  "get_log_status",
  "get_runtime_readiness",
  "load_bootstrap",
  "log_client_event",
  "memory_get_space_record",
  "memory_list_spaces",
  "memory_save_space_record",
  "quit_app",
  "refresh_tray_menu",
  "retry_last_analysis",
  "save_secret",
  "save_settings",
  "sync_tray_ui_phase",
  "tray_open_main",
];
const DEBUG_ONLY = ["dev_analyze_fixture_snippet"];

const text = readFileSync(libPath, "utf8");
const matches = [...text.matchAll(/commands::(\w+)/g)].map((m) => m[1]);
const found = new Set(matches);

const allowed = new Set([...REQUIRED, ...DEBUG_ONLY]);
const missing = REQUIRED.filter((name) => !found.has(name));
const extra = [...found].filter((name) => !allowed.has(name));
const debugBlockHasGuard =
  text.includes("#[cfg(any(debug_assertions, test))]") &&
  text.includes("commands::dev_analyze_fixture_snippet");
const releaseBlockExcludesDebug = text.includes("#[cfg(not(any(debug_assertions, test)))]");

if (missing.length || extra.length || !debugBlockHasGuard || !releaseBlockExcludesDebug) {
  console.error("IPC handler contract mismatch.");
  if (missing.length) console.error("Missing in lib.rs:", missing.join(", "));
  if (extra.length) console.error("Unexpected in lib.rs:", extra.join(", "));
  if (!debugBlockHasGuard) {
    console.error("Missing debug-only cfg guard for dev fixture command.");
  }
  if (!releaseBlockExcludesDebug) {
    console.error("Missing release cfg block for invoke_handler.");
  }
  process.exit(1);
}

const hasDebugOnly = DEBUG_ONLY.some((name) => found.has(name));
console.log(
  `IPC handler contract OK (${REQUIRED.length} required commands, debug-only present=${hasDebugOnly}).`,
);
