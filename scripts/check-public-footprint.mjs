import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const blockedPrefixes = [
  ".cursor/",
  ".continue/",
  ".claude/",
  ".codex/",
  ".cline/",
  ".roo/",
  ".windsurf/",
  ".zed/",
  "AI/",
  "docs/archive/strategic/",
  "infra/",
  "postman/",
  "scratch/",
  "tests/api/postman/",
  "reports/",
  "reports/runtime/",
  "reports/runtime-evidence-",
  "reports/beta-handoff-",
  "reports/manual/live-evidence/",
  "artifacts/",
  "test-results/",
];

const blockedFiles = new Set([
  "docs-cleanup-task.md",
  "test-out.txt",
  "CLAUDE.md",
  "docs/ai-tooling-policy-matrix.md",
]);
const blockedPathRegexes = [
  /^docs\/audit-scorecard-.*\.md$/u,
  /^docs\/max-upgrade-.*\.md$/u,
  /^reports\/release\/.*\.md$/u,
  /^reports\/sonar\/.*\.md$/u,
  /^reports\/manual\/.*\.md$/u,
];
const trackedFiles = execSync("git ls-files", { encoding: "utf8" })
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter((file) => file && existsSync(file));

const violations = trackedFiles.filter((file) => {
  if (blockedFiles.has(file)) return true;
  if (blockedPathRegexes.some((pattern) => pattern.test(file))) return true;
  return blockedPrefixes.some((prefix) => file.startsWith(prefix));
});

if (violations.length > 0) {
  console.error("[public-footprint] blocked tracked paths detected:");
  for (const file of violations) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log(`[public-footprint] OK: ${trackedFiles.length} tracked files checked.`);
