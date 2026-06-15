import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = [
  "src-tauri/src/lib.rs",
  "src-tauri/src/commands/mod.rs",
  "src-tauri/src/commands/diagnostics.rs",
  "src-tauri/src/commands/bootstrap.rs",
  "src-tauri/src/commands/tray_window.rs",
  "src-tauri/src/commands/context.rs",
  "src-tauri/src/commands/runtime_checks.rs",
  "src-tauri/src/commands/secrets.rs",
  "src-tauri/src/services/capture_pipeline.rs",
  "src/app/controller/hotkeys.ts",
  "src/app/controller/index.ts",
  "src/app/controller/lifecycle.ts",
  "src/app/controller/pipelineActions.ts",
  "src/app/controller/settingsActions.ts",
];

const required = [
  "app_start",
  "app_ready",
  "window_show",
  "window_hide",
  "window_close_requested",
  "tray_open_main",
  "tray_quit_requested",
  "settings_opened",
  "settings_section_opened",
  "settings_save_attempt",
  "settings_save_ok",
  "settings_save_failed",
  "credential_presence_checked",
  "credential_save_attempt",
  "credential_save_ok",
  "credential_delete_ok",
  "capture_start_attempt",
  "capture_start_ok",
  "capture_stop_attempt",
  "capture_stop_ok",
  "stt_request_start",
  "stt_request_ok",
  "stt_request_failed",
  "llm_request_start",
  "llm_request_attempt",
  "llm_request_ok",
  "llm_request_failed",
  "card_normalization_start",
  "card_normalization_ok",
  "card_validation_failed",
  "card_ready",
  "copy_answer_clicked",
  "retry_clicked",
  "clear_clicked",
  "export_full_clicked",
  "export_redacted_clicked",
];

const corpus = files
  .map((file) => {
    const abs = join(root, file);
    return readFileSync(abs, "utf8");
  })
  .join("\n");

const missing = required.filter((name) => {
  const s1 = `"${name}"`;
  const s2 = `'${name}'`;
  return !corpus.includes(s1) && !corpus.includes(s2);
});

if (missing.length) {
  console.error("Observability event contract mismatch.");
  for (const item of missing) console.error(`- missing event literal: ${item}`);
  process.exit(1);
}

console.log(`Observability event contract OK (${required.length} required events).`);
