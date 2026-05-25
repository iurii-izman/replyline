import { execSync } from "node:child_process";

const blockedPrefixes = [
  ".roo/",
  ".windsurf/",
  ".zed/",
  "docs/archive/",
  "infra/",
  "postman/",
  "scratch/",
  "tests/api/postman/",
  "reports/runtime/",
  "reports/runtime-evidence-",
  "reports/beta-handoff-",
  "reports/manual/live-evidence/",
  "artifacts/",
  "test-results/",
];

const blockedFiles = new Set(["docs-cleanup-task.md", "test-out.txt"]);
const allowedBlockedPathEntries = new Map([
  [
    "infra/replyline-ai-stack.override.yml",
    "Repo-local Docker safety override: labels + local-only ports, no secrets.",
  ],
  [
    "infra/replyline-ai-stack.pinned.example.yml",
    "Pinned Docker example for release policy, no runtime secrets.",
  ],
  [".env.docker.example", "Sanitized Docker env template with placeholders only."],
  ["docs/docker-stack.md", "Public Docker runbook for local stack operations."],
  [
    "reports/docker/docker-stack-hardening-2026-05-21.md",
    "Docker hardening audit artifact, no secrets.",
  ],
]);

const trackedFiles = execSync("git ls-files", { encoding: "utf8" })
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter(Boolean);

const violations = trackedFiles.filter((file) => {
  if (allowedBlockedPathEntries.has(file)) return false;
  if (blockedFiles.has(file)) return true;
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
