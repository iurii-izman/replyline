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
const modelPath = join(root, "src", "app", "model", "settings.ts");
const modelCardsPath = join(root, "src", "app", "model", "cards.ts");
const interviewRustPath = join(root, "src-tauri", "src", "interview_card_v1.rs");
const settingsRustPath = join(root, "src-tauri", "src", "settings.rs");
const typesRustPath = join(root, "src-tauri", "src", "types.rs");

const COMMAND_CATEGORIES = {
  user: ["load_bootstrap", "clear_context", "get_context_status", "log_client_event", "quit_app"],
  runtime: ["capture_start", "capture_stop_and_analyze", "retry_last_analysis"],
  bilingual: [
    "start_bilingual_session",
    "stop_bilingual_session",
    "capture_bilingual_answer",
    "export_bilingual_interview_report",
  ],
  settings: [
    "save_settings",
    "get_setup_status",
    "check_stt_config",
    "check_llm_config",
    "check_runtime_config",
  ],
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
  diagnostics: [
    "get_persistence_diagnostics",
    "get_trace_status",
    "open_trace_folder",
    "clear_debug_traces",
  ],
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
const modelCardsText = readFileSync(modelCardsPath, "utf8");
const interviewRustText = readFileSync(interviewRustPath, "utf8");
const settingsRustText = readFileSync(settingsRustPath, "utf8");
const typesRustText = readFileSync(typesRustPath, "utf8");

// Command registration now lives in the replyline_commands! macro in commands.rs.
// Scan both files to catch any migration drift.
const registered = new Set(
  [
    ...libText.matchAll(/commands::(\w+)/g),
    ...commandsText.matchAll(/\$crate::commands::(\w+)/g),
  ].map((m) => m[1]),
);
const declared = new Set(
  [
    ...commandsText.matchAll(/#\s*\[tauri::command\][\s\S]*?\bpub\s+(?:async\s+)?fn\s+(\w+)\s*\(/g),
  ].map((m) => m[1]),
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
const registryMacroPresent = commandsText.includes("macro_rules! replyline_commands");

if (
  duplicateCategorized.length ||
  missingInRegistration.length ||
  uncategorizedRegistered.length ||
  unregisteredDeclared.length ||
  registeredWithoutDeclaration.length ||
  !registryMacroPresent
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
    console.error(
      "Declared #[tauri::command] but not registered:",
      unregisteredDeclared.join(", "),
    );
  }
  if (registeredWithoutDeclaration.length) {
    console.error(
      "Registered in lib.rs but missing #[tauri::command] declaration:",
      registeredWithoutDeclaration.join(", "),
    );
  }
  if (!registryMacroPresent) {
    console.error("Missing replyline_commands! macro in src-tauri/src/commands.rs.");
  }
  process.exit(1);
}

const staticContractChecks = [
  {
    ok: modelText.includes("schemaVersion: 10"),
    message: "Expected DEFAULT_SETTINGS.schemaVersion to be 10 in src/app/model.ts",
  },
  {
    ok: settingsRustText.includes("const CURRENT_SCHEMA_VERSION: u32 = 10;"),
    message: "Expected CURRENT_SCHEMA_VERSION = 10 in src-tauri/src/settings.rs",
  },
  {
    ok:
      modelText.includes('hotkey: "Ctrl+Alt+Space"') &&
      typesRustText.includes('hotkey: "Ctrl+Alt+Space".to_string()'),
    message: "Settings default drift: hotkey must be Ctrl+Alt+Space in TS and Rust",
  },
  {
    ok:
      modelText.includes('llmBaseUrl: ""') &&
      typesRustText.includes('llm_base_url: "".to_string()'),
    message: "Settings default drift: llmBaseUrl must be empty in TS and Rust",
  },
  {
    ok:
      modelText.includes('llmModel: "gpt-4o-mini"') &&
      typesRustText.includes('llm_model: "gpt-4o-mini".to_string()'),
    message: "Settings default drift: llmModel must be gpt-4o-mini in TS and Rust",
  },
  {
    ok:
      modelText.includes('selectedModelPreset: "custom_openai_compatible"') &&
      typesRustText.includes('selected_model_preset: "custom_openai_compatible".to_string()'),
    message:
      "Settings default drift: selectedModelPreset must be custom_openai_compatible in TS and Rust",
  },
  {
    ok:
      modelText.includes("captureMaxSeconds: 45") &&
      typesRustText.includes("capture_max_seconds: 45"),
    message: "Settings default drift: captureMaxSeconds must be 45 in TS and Rust",
  },
  {
    ok:
      modelText.includes('activeAnswerProfile: "interview_default"') &&
      typesRustText.includes(
        "active_answer_profile: crate::prompt_registry::DEFAULT_ANSWER_PROFILE_ID.to_string()",
      ),
    message:
      "Settings default drift: activeAnswerProfile must be interview_default / DEFAULT_ANSWER_PROFILE_ID",
  },
  {
    ok: modelText.includes("windowOpacity: 100") && typesRustText.includes("window_opacity: 100"),
    message: "Settings default drift: windowOpacity must be 100 in TS and Rust",
  },
  {
    ok:
      modelText.includes("interviewCompactMode: false") &&
      typesRustText.includes("interview_compact_mode: false"),
    message: "Settings default drift: interviewCompactMode must be false in TS and Rust",
  },
  {
    ok:
      modelText.includes("bilingualInterviewEnabled: false") &&
      typesRustText.includes("bilingual_interview_enabled: false"),
    message: "Settings default drift: bilingualInterviewEnabled must be false in TS and Rust",
  },
  {
    ok:
      modelText.includes("translationDebounceMs: 600") &&
      typesRustText.includes("translation_debounce_ms: 600"),
    message: "Settings default drift: translationDebounceMs must be 600 in TS and Rust",
  },
  {
    ok:
      modelText.includes("translationMinWordCount: 3") &&
      typesRustText.includes("translation_min_word_count: 3"),
    message: "Settings default drift: translationMinWordCount must be 3 in TS and Rust",
  },
  {
    ok:
      modelText.includes('bilingualRetentionBehavior: "session_only"') &&
      typesRustText.includes('bilingual_retention_behavior: "session_only".to_string()'),
    message:
      "Settings default drift: bilingualRetentionBehavior must be session_only in TS and Rust",
  },
  {
    ok:
      modelText.includes('bilingualAnswerStyle: "b2_conversational"') &&
      typesRustText.includes('bilingual_answer_style: "b2_conversational".to_string()'),
    message:
      "Settings default drift: bilingualAnswerStyle must be b2_conversational in TS and Rust",
  },
  {
    ok: settingsRustText.includes("if !(5..=180).contains(&settings.capture_max_seconds) {"),
    message: "Settings range drift: captureMaxSeconds must be validated as 5..=180 in Rust",
  },
  {
    ok: settingsRustText.includes(
      "if ![70u8, 80u8, 90u8, 100u8].contains(&settings.window_opacity) {",
    ),
    message: "Settings range drift: windowOpacity allowed values must be [70,80,90,100] in Rust",
  },
  {
    ok:
      modelText.includes("windowOpacity: 100 | 90 | 80 | 70;") &&
      settingsRustText.includes(
        "if ![70u8, 80u8, 90u8, 100u8].contains(&settings.window_opacity) {",
      ),
    message: "Settings type/range drift: windowOpacity options must match in TS and Rust",
  },
  {
    ok:
      settingsRustText.includes("if !(300..=1500).contains(&settings.translation_debounce_ms) {") &&
      settingsRustText.includes("if !(1..=10).contains(&settings.translation_min_word_count) {"),
    message:
      "Settings range drift: translationDebounceMs/translationMinWordCount sanitize ranges must remain stable",
  },
  {
    ok:
      interviewRustText.includes("pub short: String") && modelCardsText.includes("short: string;"),
    message: "Interview answer.short drift: Rust/TS must both be string",
  },
  {
    ok:
      interviewRustText.includes("pub strong: String") &&
      modelCardsText.includes("strong: string;"),
    message: "Interview answer.strong drift: Rust/TS must both be string",
  },
  {
    ok:
      interviewRustText.includes("pub safe_reframe: String") &&
      modelCardsText.includes("safeReframe: string;"),
    message: "Interview risks.safeReframe drift: Rust/TS must both be string",
  },
  {
    ok:
      interviewRustText.includes("pub confidence: InterviewConfidence") &&
      modelCardsText.includes('confidence: "low" | "medium" | "high";'),
    message: "Interview question.confidence drift between Rust/TS",
  },
  {
    ok:
      interviewRustText.includes("pub text: Option<String>") &&
      modelCardsText.includes("text?: string | null;"),
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
