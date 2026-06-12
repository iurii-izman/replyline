import assert from "node:assert/strict";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";

if (process.platform !== "win32") {
  console.log("beta-start integration test skipped: Windows-only script.");
  process.exit(0);
}

const root = process.cwd();
const tempRoot = mkdtempSync(join(os.tmpdir(), "replyline-beta-start-"));
const scriptsDir = join(tempRoot, "scripts");
const fakeBin = join(tempRoot, "fake-bin");
const launchMarker = join(tempRoot, "launch.marker");
const reportMarker = join(tempRoot, "report.marker");
const scriptPath = join(scriptsDir, "beta-start.ps1");

mkdirSync(scriptsDir, { recursive: true });
mkdirSync(fakeBin, { recursive: true });
copyFileSync(join(root, "scripts", "beta-start.ps1"), scriptPath);

const pnpmStub = `@echo off
if "%~1"=="beta:doctor" goto doctor
if "%~1"=="beta:smoke-report" goto report
if "%~1"=="exec" goto tauri_check
if "%~1"=="tauri" goto launch
if "%~1"=="--version" (
  echo 9.15.9
  exit /b 0
)
exit /b 2

:doctor
if "%FAKE_DOCTOR_VERDICT%"=="blocked" (
  echo {"schema":"replyline.beta-doctor.v1","verdict":"blocked","summary":{"pass":5,"warn":0,"fail":1},"checks":[{"check":"cargo","status":"FAIL","evidence":"cargo was not found.","nextAction":"Install Rust via rustup."}]}
  exit /b 1
)
if "%FAKE_DOCTOR_VERDICT%"=="ready_with_warnings" (
  echo {"schema":"replyline.beta-doctor.v1","verdict":"ready_with_warnings","summary":{"pass":5,"warn":1,"fail":0},"checks":[{"check":"WebView2 Runtime","status":"WARN","evidence":"WebView2 was not confirmed.","nextAction":"Install WebView2 Runtime."}]}
  exit /b 0
)
echo {"schema":"replyline.beta-doctor.v1","verdict":"ready","summary":{"pass":6,"warn":0,"fail":0},"checks":[]}
exit /b 0

:report
type nul > "%FAKE_REPORT_MARKER%"
exit /b 0

:tauri_check
if "%FAKE_TAURI_FAIL%"=="1" exit /b 1
echo tauri-cli 2.11.2
exit /b 0

:launch
type nul > "%FAKE_LAUNCH_MARKER%"
if "%FAKE_LAUNCH_FAIL%"=="1" exit /b 7
exit /b 0
`;

writeFileSync(join(fakeBin, "pnpm.cmd"), pnpmStub, "utf8");
writeFileSync(join(fakeBin, "cargo.cmd"), "@echo off\r\necho cargo 1.89.0\r\n", "utf8");
chmodSync(join(fakeBin, "pnpm.cmd"), 0o755);
chmodSync(join(fakeBin, "cargo.cmd"), 0o755);

function runBetaStart(args, env = {}) {
  rmSync(launchMarker, { force: true });
  rmSync(reportMarker, { force: true });
  const result = spawnSync("pwsh", ["-NoProfile", "-File", scriptPath, ...args], {
    cwd: tempRoot,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
      FAKE_DOCTOR_VERDICT: "ready",
      FAKE_LAUNCH_MARKER: launchMarker,
      FAKE_REPORT_MARKER: reportMarker,
      ...env,
    },
  });
  return {
    ...result,
    output: `${result.stdout}\n${result.stderr}`,
    launched: existsSync(launchMarker),
    reported: existsSync(reportMarker),
  };
}

try {
  const ready = runBetaStart(["-NoLaunch"]);
  assert.equal(ready.status, 0, ready.output);
  assert.match(ready.output, /Verdict: ready/u);
  assert.equal(ready.launched, false);

  const warning = runBetaStart(["-NoLaunch"], { FAKE_DOCTOR_VERDICT: "ready_with_warnings" });
  assert.equal(warning.status, 0);
  assert.match(warning.output, /Warnings:/u);

  const strictWarning = runBetaStart(["-NoLaunch", "-Strict"], {
    FAKE_DOCTOR_VERDICT: "ready_with_warnings",
  });
  assert.equal(strictWarning.status, 1);
  assert.match(strictWarning.output, /Strict mode treats readiness warnings as blocking/u);
  assert.equal(strictWarning.launched, false);

  const blocked = runBetaStart(["-NoLaunch"], { FAKE_DOCTOR_VERDICT: "blocked" });
  assert.equal(blocked.status, 1);
  assert.match(blocked.output, /Launch is blocked by the doctor result/u);
  assert.match(blocked.output, /pnpm beta:smoke-report/u);
  assert.equal(blocked.launched, false);

  const reported = runBetaStart(["-NoLaunch", "-ReportOnFail"], { FAKE_DOCTOR_VERDICT: "blocked" });
  assert.equal(reported.status, 1);
  assert.equal(reported.reported, true);

  const forced = runBetaStart(["-Force"], { FAKE_DOCTOR_VERDICT: "blocked" });
  assert.equal(forced.status, 0);
  assert.equal(forced.launched, true);

  const tauriFailure = runBetaStart(["-SkipDoctor"], { FAKE_TAURI_FAIL: "1" });
  assert.equal(tauriFailure.status, 1);
  assert.match(tauriFailure.output, /local Tauri CLI is unavailable/u);
  assert.equal(tauriFailure.launched, false);

  const launchFailure = runBetaStart(["-SkipDoctor"], { FAKE_LAUNCH_FAIL: "1" });
  assert.equal(launchFailure.status, 7);
  assert.match(launchFailure.output, /Application launch failed with exit code 7/u);
  assert.equal(launchFailure.launched, true);

  const scriptText = readFileSync(scriptPath, "utf8");
  for (const flag of ["Strict", "SkipDoctor", "ReportOnFail", "NoLaunch", "Force"]) {
    assert.match(scriptText, new RegExp(`\\[switch\\]\\$${flag}`, "u"));
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("beta-start gating and launch orchestration behave as expected.");
