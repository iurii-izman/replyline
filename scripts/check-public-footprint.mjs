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
];

const blockedFiles = new Set(["docs-cleanup-task.md", "test-out.txt"]);

const trackedFiles = execSync("git ls-files", { encoding: "utf8" })
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter(Boolean);

const violations = trackedFiles.filter((file) => {
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
