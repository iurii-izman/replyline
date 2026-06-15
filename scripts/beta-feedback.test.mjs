import { strict as assert } from "node:assert";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");
const rootDir = join(__dirname, "..");
const scriptPath = join(__dirname, "beta-feedback.mjs");

function runFeedback(args = []) {
  return execSync(`node "${scriptPath}" ${args.join(" ")}`, {
    cwd: rootDir,
    encoding: "utf8",
    timeout: 15000,
    windowsHide: true,
  });
}

// Test 1: script runs without crash
console.log("[test] 1. Script runs without crash");
const output = runFeedback();
assert.ok(output.length > 100, "Output should be substantial");
console.log("   PASS");

// Test 2: no secret-looking values in output
console.log("[test] 2. No secret-looking values");
const secretPatterns = [
  /\bsk-[a-z0-9_-]{12,}\b/i,
  /\bdg_[a-z0-9_-]{12,}\b/i,
  /\bBearer\s+[A-Za-z0-9_-]{20,}/i,
];
for (const pat of secretPatterns) {
  assert.ok(!pat.test(output), `Secret pattern found: ${pat}`);
}
console.log("   PASS");

// Test 3: output does not contain actual transcript content
console.log("[test] 3. No transcript content");
// Safety checklist mentions "raw transcripts" — that is fine.
// But there should be no long transcript-like paragraphs.
const lines = output.split("\n");
const longLines = lines.filter((l) => l.length > 200);
assert.ok(
  longLines.length === 0,
  `Found ${longLines.length} long lines (possible transcript dump)`,
);
console.log("   PASS");

// Test 4: issue body includes reproduction steps section
console.log("[test] 4. Reproduction steps section");
assert.ok(output.includes("Reproduction steps"), "Missing reproduction steps");
console.log("   PASS");

// Test 5: safety checklist present
console.log("[test] 5. Safety checklist");
assert.ok(output.includes("No API keys"), "Missing API key note");
assert.ok(output.includes("No raw transcripts"), "Missing transcript note");
console.log("   PASS");

// Test 6: JSON mode works
console.log("[test] 6. JSON mode");
const jsonOutput = runFeedback(["--json"]);
const payload = JSON.parse(jsonOutput);
assert.strictEqual(payload.schema, "beta-feedback/1.0.0");
assert.ok(Array.isArray(payload.excludes));
assert.ok(payload.excludes.includes("raw_transcript"));
assert.ok(payload.excludes.includes("api_keys"));
console.log("   PASS");

// Test 7: app info present in JSON
console.log("[test] 7. App info in JSON");
assert.ok(payload.app.version, "Missing version");
assert.ok(payload.app.commit, "Missing commit");
console.log("   PASS");

console.log("");
console.log("[beta-feedback.test] All tests passed.");
