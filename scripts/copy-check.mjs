import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const targets = [
  "src/App.tsx",
  "src/app/locale.ts",
  "src-tauri/src/ui_strings.rs",
  "src/App.css",
  "index.html",
  "README.md",
  "landing/index.html",
  "docs/privacy-and-trust.md",
  "docs/known-limitations.md",
  "docs/third-party-providers.md",
  "BETA_TESTING.md",
  "docs/test-feedback-template.md",
  "BETA_TESTING.md",
  ".github/ISSUE_TEMPLATE/bug_report.md",
  ".github/ISSUE_TEMPLATE/feature_request.md",
];

const blockedPhrases = [
  "stealth",
  "invisible overlay",
  "anti-proctoring",
  "undetectable",
  "therapy app",
  "diagnose anxiety",
  "emotion scoring",
  "reads emotions",
  "answers for you automatically",
  "production-ready everywhere",
  "always low latency",
  "works in every call app",
];

const hits = [];

function firstLineWithToken(content, token) {
  const lines = content.split(/\r?\n/u);
  const needle = token.toLowerCase();
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].toLowerCase().includes(needle)) {
      return i + 1;
    }
  }
  return null;
}

for (const relativePath of targets) {
  const fullPath = join(process.cwd(), relativePath);
  if (!existsSync(fullPath)) continue;
  const content = readFileSync(fullPath, "utf8");
  const lowered = content.toLowerCase();
  for (const token of blockedPhrases) {
    if (lowered.includes(token)) {
      hits.push({
        path: relativePath,
        token,
        line: firstLineWithToken(content, token),
      });
    }
  }
}

if (hits.length > 0) {
  console.error("Blocked copy tokens found:");
  for (const hit of hits) {
    const lineHint = hit.line == null ? "" : `:${hit.line}`;
    console.error(`- ${hit.path}${lineHint}: ${hit.token}`);
  }
  process.exit(1);
}

console.log(`Copy check OK. Scanned ${targets.length} files.`);
