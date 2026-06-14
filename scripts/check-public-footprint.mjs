import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

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
  ".env.keys",
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

const trackedSet = new Set(trackedFiles);

const violations = trackedFiles.filter((file) => {
  if (blockedFiles.has(file)) return true;
  if (blockedPathRegexes.some((pattern) => pattern.test(file))) return true;
  return blockedPrefixes.some((prefix) => file.startsWith(prefix));
});

const referenceViolations = [];
const canonicalPublicRefs = new Set([
  "AGENTS.md",
  "CONTRIBUTING.md",
  "docs/engineering/testing.md",
  "docs/copy-rules.md",
]);
const referenceChecks = [
  {
    holder: "AGENTS.md",
    expected: canonicalPublicRefs,
  },
  {
    holder: ".github/copilot-instructions.md",
    expected: canonicalPublicRefs,
  },
];

for (const { holder, expected } of referenceChecks) {
  if (!existsSync(holder)) continue;

  const content = readFileSync(holder, "utf8");
  for (const match of content.matchAll(/`([^`]+)`/gu)) {
    const ref = match[1];
    if (!ref.startsWith("docs/") && !ref.endsWith(".md")) continue;
    if (expected.has(ref)) continue;
    if (!existsSync(ref) || !trackedSet.has(ref)) {
      referenceViolations.push(`${holder}: references non-public doc ${ref}`);
    }
  }
}

if (violations.length > 0 || referenceViolations.length > 0) {
  console.error("[public-footprint] blocked tracked paths detected:");
  for (const file of violations) {
    console.error(`- ${file}`);
  }
  for (const violation of referenceViolations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`[public-footprint] OK: ${trackedFiles.length} tracked files checked.`);
