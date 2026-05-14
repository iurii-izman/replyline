import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const cwd = process.cwd();
const canonicalHotkey = "Ctrl+Alt+Space";
const canonicalCard = "gist / say_now / next_move";
const guardrailTokens = ["meeting assistant", "transcript tool", "speaking coach"];

const requiredIncludes = [
  {
    path: "README.md",
    includes: [canonicalHotkey, canonicalCard, ...guardrailTokens],
    excludes: ["Ctrl+Shift+Space"],
  },
  {
    path: "docs/smoke-checks.md",
    includes: [canonicalHotkey],
    excludes: ["Ctrl+Shift+Space"],
  },
  {
    path: "docs/copy-rules.md",
    includes: [canonicalCard],
  },
  {
    path: "docs/known-limitations.md",
    includes: [...guardrailTokens],
  },
  {
    path: "docs/privacy-and-trust.md",
    includes: ["Internal Alpha", "STT -> LLM -> карточка", "санитизацию/редакцию"],
    excludes: ["Pre-Alpha"],
  },
  {
    path: "docs/tester-brief.md",
    includes: [canonicalCard, ...guardrailTokens],
  },
  {
    path: "docs/beta-ops-diagnostics.md",
    includes: ["diag_runtime_event", "stage", "outcome", "code"],
  },
  {
    path: "docs/advanced-mode-governance.md",
    includes: ["Purpose", "Enable criteria", "Disable criteria"],
  },
  {
    path: "landing/index.html",
    includes: [canonicalCard, ...guardrailTokens],
  },
  {
    path: "src-tauri/src/types.rs",
    includes: [canonicalHotkey],
  },
  {
    path: "src/app/model.ts",
    includes: [canonicalHotkey],
  },
];

function lineOf(content, token) {
  const lines = content.split(/\r?\n/u);
  const needle = token.toLowerCase();
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].toLowerCase().includes(needle)) {
      return index + 1;
    }
  }
  return null;
}

const failures = [];

for (const spec of requiredIncludes) {
  const fullPath = join(cwd, spec.path);
  const content = readFileSync(fullPath, "utf8");

  for (const token of spec.includes ?? []) {
    if (!content.includes(token)) {
      failures.push(`${spec.path}: missing "${token}"`);
    }
  }

  for (const token of spec.excludes ?? []) {
    const hitLine = lineOf(content, token);
    if (hitLine != null) {
      failures.push(`${spec.path}:${hitLine}: unexpected "${token}"`);
    }
  }
}

if (failures.length > 0) {
  console.error("Consistency check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Consistency OK. Canonical hotkey=${canonicalHotkey}; card=${canonicalCard}.`);
