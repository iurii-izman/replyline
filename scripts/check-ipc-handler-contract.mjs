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
const modelPath = join(root, "src", "app", "model.ts");
const interviewRustPath = join(root, "src-tauri", "src", "interview_card_v1.rs");
const settingsRustPath = join(root, "src-tauri", "src", "settings.rs");

const REQUIRED = [
  "capture_start",
  "capture_stop_and_analyze",
  "check_llm_config",
  "check_runtime_config",
  "check_stt_config",
  "clear_context",
  "clear_interview_reports",
  "clear_candidate_pack",
  "clear_debug_traces",
  "delete_secret",
  "get_candidate_pack_status",
  "get_context_status",
  "get_setup_status",
  "get_persistence_diagnostics",
  "load_bootstrap",
  "load_candidate_pack",
  "get_interview_report",
  "get_trace_status",
  "open_trace_folder",
  "log_client_event",
  "quit_app",
  "refresh_tray_menu",
  "prepare_candidate_pack",
  "retry_last_analysis",
  "start_interview_session",
  "end_interview_session",
  "export_interview_report_markdown",
  "export_interview_report_redacted_markdown",
  "save_prepared_candidate_pack",
  "save_candidate_pack",
  "save_secret",
  "save_settings",
  "sync_tray_ui_phase",
  "tray_open_main",
];
const DEBUG_ONLY = [];

const text = readFileSync(libPath, "utf8");
const modelText = readFileSync(modelPath, "utf8");
const interviewRustText = readFileSync(interviewRustPath, "utf8");
const settingsRustText = readFileSync(settingsRustPath, "utf8");
const matches = [...text.matchAll(/commands::(\w+)/g)].map((m) => m[1]);
const found = new Set(matches);

const allowed = new Set([...REQUIRED, ...DEBUG_ONLY]);
const missing = REQUIRED.filter((name) => !found.has(name));
const extra = [...found].filter((name) => !allowed.has(name));
const debugBlockHasGuard = true;
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
const staticContractChecks = [
  {
    ok: modelText.includes("schemaVersion: 9"),
    message: "Expected DEFAULT_SETTINGS.schemaVersion to be 9 in src/app/model.ts",
  },
  {
    ok: settingsRustText.includes("const CURRENT_SCHEMA_VERSION: u32 = 9;"),
    message: "Expected CURRENT_SCHEMA_VERSION = 9 in src-tauri/src/settings.rs",
  },
  {
    ok: interviewRustText.includes("pub short: String") && modelText.includes("short: string;"),
    message: "Interview answer.short drift: Rust/TS must both be string",
  },
  {
    ok: interviewRustText.includes("pub strong: String") && modelText.includes("strong: string;"),
    message: "Interview answer.strong drift: Rust/TS must both be string",
  },
  {
    ok:
      interviewRustText.includes("pub safe_reframe: String") &&
      modelText.includes("safeReframe: string;"),
    message: "Interview risks.safeReframe drift: Rust/TS must both be string",
  },
  {
    ok:
      interviewRustText.includes("pub confidence: InterviewConfidence") &&
      modelText.includes('confidence: "low" | "medium" | "high";'),
    message: "Interview question.confidence drift between Rust/TS",
  },
  {
    ok:
      interviewRustText.includes("pub text: Option<String>") &&
      modelText.includes("text?: string | null;"),
    message: "Interview clarifier drift: expected clarifier.text on both sides",
  },
];
const failedStatic = staticContractChecks.filter((item) => !item.ok);

if (failedStatic.length) {
  console.error("DTO/static contract mismatch.");
  for (const item of failedStatic) console.error(item.message);
  process.exit(1);
}

console.log(
  `IPC handler contract OK (${REQUIRED.length} required commands, debug-only present=${hasDebugOnly}).`,
);
