import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const baselinePath = join(cwd, "docs", "release-freeze-baseline.json");
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));

const diff = spawnSync("git", ["diff", "--name-only", "--", "."], {
  cwd,
  encoding: "utf8",
  windowsHide: true,
  shell: false,
});
if (diff.status !== 0) {
  console.error("release-freeze-check: git diff failed");
  process.exit(diff.status ?? 1);
}

const changedFiles = diff.stdout
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter(Boolean);

const allowlistPrefixes = baseline.allowlistPrefixes ?? [];
const guardrailPaths = new Set(baseline.guardrailPaths ?? []);

const outsideFreeze = changedFiles.filter(
  (file) => !allowlistPrefixes.some((prefix) => file.startsWith(prefix)),
);
const outsideGuardrails = changedFiles.filter((file) => !guardrailPaths.has(file));

mkdirSync(join(cwd, "reports"), { recursive: true });
const artifactPath = join(cwd, "reports", "release-freeze-check.json");
const artifact = {
  generatedAt: new Date().toISOString(),
  changedFileCount: changedFiles.length,
  changedFiles,
  outsideFreeze,
  outsideGuardrails,
  baselineScenarios: baseline.baselineScenarios ?? [],
  guardrailPaths: baseline.guardrailPaths ?? [],
  status:
    outsideFreeze.length === 0 && outsideGuardrails.length === 0
      ? "in-guardrails"
      : "attention-required",
};
writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

console.log(`[release-freeze] changed files: ${changedFiles.length}`);
if (outsideFreeze.length > 0) {
  console.log("[release-freeze] outside allowlist:");
  for (const file of outsideFreeze) console.log(`- ${file}`);
}
if (outsideGuardrails.length > 0) {
  console.log("[release-freeze] outside baseline guardrails:");
  for (const file of outsideGuardrails) console.log(`- ${file}`);
}
console.log(`[release-freeze] artifact: ${artifactPath}`);

if (process.argv.includes("--strict") && (outsideFreeze.length > 0 || outsideGuardrails.length > 0)) {
  process.exit(2);
}
