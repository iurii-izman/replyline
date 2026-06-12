import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const cwd = process.cwd();
const scriptPath = join(cwd, "scripts", "beta-doctor.ps1");

const result = spawnSync(
  "pwsh",
  ["-NoProfile", "-File", scriptPath, "-Json", "-SimulateNonWindows"],
  {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  },
);

assert.equal(result.error, undefined);
assert.ok(result.stdout.trim().startsWith("{"), "beta-doctor JSON should start with an object");

const report = JSON.parse(result.stdout);
assert.equal(report.schema, "replyline.beta-doctor.v1");
assert.ok(["ready", "ready_with_warnings", "blocked"].includes(report.verdict));
assert.equal(Array.isArray(report.checks), true);
assert.equal(typeof report.summary.pass, "number");
assert.equal(typeof report.summary.warn, "number");
assert.equal(typeof report.summary.fail, "number");
assert.equal(result.stdout.includes("sk-"), false);
assert.equal(result.stdout.includes("dg_"), false);

console.log("beta-doctor JSON mode is parseable and sanitized.");
