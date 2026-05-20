import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, cpSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const verifier = path.join(root, "scripts", "verify-live-runtime-evidence.mjs");
const goodFixture = path.join(root, "tests", "fixtures", "runtime-live-evidence", "good");

function runVerifier(targetDir) {
  return spawnSync(process.execPath, [verifier, targetDir], { encoding: "utf8" });
}

function withFixture(mutator) {
  const dir = mkdtempSync(path.join(tmpdir(), "replyline-live-evidence-"));
  cpSync(goodFixture, dir, { recursive: true });
  mutator(dir);
  return dir;
}

{
  const result = runVerifier(goodFixture);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

{
  const dir = withFixture((target) => {
    const logPath = path.join(target, "app.log");
    const log = "2026-05-20T10:00:00 [app_boot_start] setup\n";
    writeFileSync(logPath, log, "utf8");
  });
  const result = runVerifier(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing required event/);
}

{
  const dir = withFixture((target) => {
    const logPath = path.join(target, "app.log");
    const base = readFileSync(logPath, "utf8");
    const raw = `${base}2026-05-20T10:00:13 [analysis_ok] token sk-live-secret\n`;
    writeFileSync(logPath, raw, "utf8");
  });
  const result = runVerifier(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Forbidden raw secret pattern/);
}

{
  const dir = withFixture((target) => {
    const logPath = path.join(target, "app.log");
    const base = `2026-05-20T10:00:00 [app_boot_start] setup
2026-05-20T10:00:00 [settings_load_attempt] exists=true
2026-05-20T10:00:00 [settings_parse_ok] source=settings_json
2026-05-20T10:00:00 [settings_validation_ok] source=settings_json
2026-05-20T10:00:01 [bootstrap_loaded] runtime_ready=true
2026-05-20T10:00:01 [hotkey_registered] Ctrl+Alt+Space
2026-05-20T10:00:05 [hotkey_pressed] state=Pressed
2026-05-20T10:00:05 [setup_preflight_check_start] -
2026-05-20T10:00:05 [setup_preflight_check_result] status=ready runtime_ready=true
2026-05-20T10:00:05 [setup_missing_redirect] missing=none
2026-05-20T10:00:06 [capture_start_requested] source=hotkey
2026-05-20T10:00:06 [capture_start_ok] run_id=1
2026-05-20T10:00:10 [capture_stop_requested] source=hotkey
2026-05-20T10:00:10 [analysis_start] -
2026-05-20T10:00:11 [analysis_stt_ok] chars=120
2026-05-20T10:00:12 [analysis_llm_ok] model=gpt-4o-mini
2026-05-20T10:00:12 [analysis_ok] card_ready
`;
    writeFileSync(logPath, base, "utf8");
  });
  const result = runVerifier(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /setup_missing_redirect after ready runtime signal/);
}

{
  const dir = withFixture((target) => {
    writeFileSync(
      path.join(target, "diagnostics.json"),
      JSON.stringify(
        {
          settingsFileExists: true,
          settingsParseOk: true,
          settingsValidationOk: true,
          deepgramKeyPresent: false,
          llmKeyPresent: true,
          runtimePathReady: true,
          corruptBackupsCount: 0,
        },
        null,
        2,
      ),
      "utf8",
    );
  });
  const result = runVerifier(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /deepgramKeyPresent must be true/);
}

console.log("All verify-live-runtime-evidence tests passed.");
