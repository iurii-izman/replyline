import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const cwd = process.cwd();
const canonicalHotkey = "Ctrl+Alt+Space";
const canonicalCard = "gist / say_now / next_move";
const guardrailTokens = ["meeting assistant", "transcript tool", "speaking coach"];

const requiredIncludes = [
  {
    path: "README.md",
    includes: [
      canonicalHotkey,
      canonicalCard,
      "capture -> stt -> llm -> card",
      "Windows-first",
      "pnpm beta:doctor",
      "pnpm beta:start",
      ...guardrailTokens,
    ],
    excludes: ["Ctrl+Shift+Space"],
  },
  {
    path: "docs/README.md",
    includes: [
      "engineering/runtime.md",
      "engineering/operations.md",
      "engineering/architecture.md",
      "engineering/manual-qa.md",
    ],
  },
  {
    path: "docs/archive/handoff/beta-readiness.md",
    includes: [
      "WorkConversation",
      "Interview Mode",
      "InterviewCardSchemaV1",
      "schemaVersion = 10",
      "pnpm beta:doctor",
      "pnpm beta:smoke-report",
      "pnpm beta:start",
      "pnpm beta:preflight",
      "pnpm verify",
      "pnpm verify:full",
    ],
    excludes: ["primary instruction", "alpha-only"],
  },
  {
    path: "docs/archive/handoff/beta-doctor.md",
    includes: ["pnpm beta:doctor", "ready_with_warnings", "blocked"],
  },
  {
    path: "docs/beta-smoke-report.md",
    includes: ["pnpm beta:smoke-report", "smoke-report.md", "smoke-report.json", "GitHub issue"],
  },
  {
    path: "docs/product/user-guide.md",
    includes: [
      "## 2. First 10 minutes",
      "## 4. Settings reference",
      "`llmBaseUrl`",
      "## 6. Interview Mode (context usage example)",
      "## 7. ContextPack",
      "## 9. Troubleshooting quick table",
    ],
  },
  {
    path: "docs/smoke-checks.md",
    includes: [canonicalHotkey],
    excludes: ["Ctrl+Shift+Space"],
  },
  {
    path: "docs/copy-rules.md",
    includes: [canonicalCard, "best model", "nothing is ever stored anywhere"],
  },
  {
    path: "docs/product/limitations.md",
    includes: [
      ...guardrailTokens,
      "There is no stealth, hidden-overlay, click-through, or cheating flow.",
      "A local LLM endpoint does not make the shipped runtime fully local-only because the shipped STT path is still Deepgram.",
      "There is no signed public installer yet.",
    ],
  },
  {
    path: "docs/product/privacy.md",
    includes: [
      "Deepgram",
      "OpenAI-compatible",
      "Default runtime does not write raw audio or transcripts to disk automatically.",
      "debugTraceMode=full_local",
    ],
    excludes: ["Pre-Alpha"],
  },
  {
    path: "docs/reference/errors.md",
    includes: ["diag_runtime_event", "RL_*", "CommandError"],
  },

  {
    path: "docs/engineering/operations.md",
    includes: [
      "Operator purpose and guardrails",
      "Smoke report flow",
      "GitHub issue routing and labels",
      "Feedback triage cadence",
      "Diagnostics collection",
      "Public vs local artifact sharing",
      "status:stale-candidate",
      "diag_runtime_event",
    ],
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
    paths: ["src/app/model/settings.ts", "src/app/model.ts"],
    includes: [canonicalHotkey, "schemaVersion: 10", "selectedModelPreset", "debugTraceMode"],
  },
  {
    path: "src-tauri/src/settings.rs",
    includes: ["const CURRENT_SCHEMA_VERSION: u32 = 10;"],
  },
  {
    path: "src-tauri/src/interview_card_v1.rs",
    includes: ["InterviewCardSchemaV1"],
  },
  {
    path: "src-tauri/src/card_v3.rs",
    includes: ["CardSchemaV3"],
  },
  {
    path: "docs/model-ladder.md",
    includes: ["Unknown preset ids fall back safely", "OpenRouter presets"],
  },
  {
    path: "docs/engineering/release.md",
    includes: [
      "Canonical engineering source of truth for release decisions",
      "docs/release-freeze-baseline.json",
      "Unsigned artifacts are internal artifacts only.",
      "A public release binary is allowed only after an Authenticode-verified signed package exists.",
    ],
  },
];

function resolvePath(spec) {
  const paths = spec.paths ?? [spec.path];
  for (const relativePath of paths) {
    const fullPath = join(cwd, relativePath);
    if (existsSync(fullPath)) {
      return { fullPath, relativePath };
    }
  }
  return null;
}

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
  const resolved = resolvePath(spec);
  if (!resolved) {
    const expectedPaths = (spec.paths ?? [spec.path]).join(", ");
    failures.push(`${expectedPaths}: required file is missing or moved`);
    continue;
  }

  const { fullPath, relativePath } = resolved;
  const content = readFileSync(fullPath, "utf8");

  for (const token of spec.includes ?? []) {
    if (!content.includes(token)) {
      failures.push(`${relativePath}: missing "${token}"`);
    }
  }

  for (const token of spec.excludes ?? []) {
    const hitLine = lineOf(content, token);
    if (hitLine != null) {
      failures.push(`${relativePath}:${hitLine}: unexpected "${token}"`);
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
