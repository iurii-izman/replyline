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

const EXPECTED = [
  "acknowledge_tray_intro",
  "capture_start",
  "capture_stop_and_analyze",
  "check_provider_health",
  "clear_context",
  "collect_diagnostic_bundle",
  "delete_secret",
  "dev_analyze_fixture_snippet",
  "get_context_status",
  "get_log_status",
  "get_runtime_readiness",
  "load_bootstrap",
  "log_client_event",
  "memory_get_space_record",
  "memory_list_spaces",
  "memory_save_space_record",
  "open_notebooklm",
  "quit_app",
  "refresh_tray_menu",
  "retry_last_analysis",
  "save_secret",
  "save_settings",
  "sync_tray_ui_phase",
  "tray_open_main",
];

const text = readFileSync(libPath, "utf8");
const matches = [...text.matchAll(/commands::(\w+)/g)].map((m) => m[1]);
const found = new Set(matches);

const expectedSet = new Set(EXPECTED);
const missing = EXPECTED.filter((name) => !found.has(name));
const extra = [...found].filter((name) => !expectedSet.has(name));

if (missing.length || extra.length || found.size !== EXPECTED.length) {
  console.error("IPC handler contract mismatch.");
  if (missing.length) console.error("Missing in lib.rs:", missing.join(", "));
  if (extra.length) console.error("Unexpected in lib.rs:", extra.join(", "));
  if (found.size !== EXPECTED.length) {
    console.error(`Expected ${EXPECTED.length} commands, found ${found.size} unique.`);
  }
  process.exit(1);
}

console.log(`IPC handler contract OK (${EXPECTED.length} commands).`);
