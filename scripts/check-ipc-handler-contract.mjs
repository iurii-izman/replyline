/**
 * Enforces IPC command contract between Rust command declarations and lib.rs invoke_handler registration.
 * Also requires every registered command to be assigned to an explicit category.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const libPath = join(root, "src-tauri", "src", "lib.rs");
const commandsPath = join(root, "src-tauri", "src", "commands.rs");
const modelPath = join(root, "src", "app", "model.ts");
const interviewRustPath = join(root, "src-tauri", "src", "interview_card_v1.rs");
const settingsRustPath = join(root, "src-tauri", "src", "settings.rs");

const COMMAND_CATEGORIES = {
  user: ["load_bootstrap", "clear_context", "get_context_status", "log_client_event", "quit_app"],
  runtime: ["capture_start", "capture_stop_and_analyze", "retry_last_analysis"],
  settings: ["save_settings", "get_setup_status", "check_stt_config", "check_llm_config", "check_runtime_config"],
  secrets: ["save_secret", "delete_secret"],
  report: [
    "start_interview_session",
    "end_interview_session",
    "get_interview_report",
    "export_interview_report_markdown",
    "export_interview_report_redacted_markdown",
    "clear_interview_reports",
  ],
  candidate: [
    "load_candidate_pack",
    "save_candidate_pack",
    "clear_candidate_pack",
    "get_candidate_pack_status",
    "prepare_candidate_pack",
    "save_prepared_candidate_pack",
  ],
  diagnostics: ["get_persistence_diagnostics", "get_trace_status", "open_trace_folder", "clear_debug_traces"],
  trayWindow: ["sync_tray_ui_phase", "refresh_tray_menu", "tray_open_main"],
};

function flattenCategoryMap(categoryMap) {
  return Object.entries(categoryMap).flatMap(([category, names]) =>
    names.map((name) => ({ category, name })),
  );
}

const libText = readFileSync(libPath, "utf8");
const commandsText = readFileSync(commandsPath, "utf8");
const modelText = readFileSync(modelPath, "utf8");
const interviewRustText = readFileSync(interviewRustPath, "utf8");
const settingsRustText = readFileSync(settingsRustPath, "utf8");

const registered = new Set([...libText.matchAll(/commands::(\w+)/g)].map((m) => m[1]));
const declared = new Set(
  [...commandsText.matchAll(/#\s*\[tauri::command\][\s\S]*?\bpub\s+(?:async\s+)?fn\s+(\w+)\s*\(/g)].map(
    (m) => m[1],
  ),
);

const categorizedEntries = flattenCategoryMap(COMMAND_CATEGORIES);
const categorized = new Set(categorizedEntries.map((item) => item.name));

const duplicateCategorized = categorizedEntries
  .map((item) => item.name)
  .filter((name, index, arr) => arr.indexOf(name) !== index);
const missingInRegistration = [...categorized].filter((name) => !registered.has(name));
const uncategorizedRegistered = [...registered].filter((name) => !categorized.has(name));
const unregisteredDeclared = [...declared].filter((name) => !registered.has(name));
const registeredWithoutDeclaration = [...registered].filter((name) => !declared.has(name));
const releaseBlockExcludesDebug = libText.includes("#[cfg(not(any(debug_assertions, test)))]");

if (
  duplicateCategorized.length ||
  missingInRegistration.length ||
  uncategorizedRegistered.length ||
  unregisteredDeclared.length ||
  registeredWithoutDeclaration.length ||
  !releaseBlockExcludesDebug
) {
  console.error("IPC handler contract mismatch.");
  if (duplicateCategorized.length) {
    console.error("Duplicated category assignment:", [...new Set(duplicateCategorized)].join(", "));
  }
  if (missingInRegistration.length) {
    console.error("Categorized but not registered in lib.rs:", missingInRegistration.join(", "));
  }
  if (uncategorizedRegistered.length) {
    console.error("Registered but not categorized:", uncategorizedRegistered.join(", "));
  }
  if (unregisteredDeclared.length) {
    console.error("Declared #[tauri::command] but not registered:", unregisteredDeclared.join(", "));
  }
  if (registeredWithoutDeclaration.length) {
    console.error("Registered in lib.rs but missing #[tauri::command] declaration:", registeredWithoutDeclaration.join(", "));
  }
  if (!releaseBlockExcludesDebug) {
    console.error("Missing release cfg block for invoke_handler.");
  }
  process.exit(1);
}

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
  `IPC handler contract OK (${registered.size} registered commands, ${Object.keys(COMMAND_CATEGORIES).length} categories).`,
);
