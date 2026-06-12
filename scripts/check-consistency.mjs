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
    includes: [
      canonicalHotkey,
      canonicalCard,
      "capture -> stt -> llm -> card",
      "Windows-first",
      "pnpm beta:doctor",
      ...guardrailTokens,
    ],
    excludes: ["Ctrl+Shift+Space"],
  },
  {
    path: "docs/beta-readiness.md",
    includes: [
      "WorkConversation",
      "Interview Mode",
      "InterviewCardSchemaV1",
      "schemaVersion = 10",
      "pnpm beta:doctor",
      "pnpm beta:smoke-report",
      "pnpm beta:preflight",
      "pnpm verify:fast",
      "pnpm verify:full",
    ],
    excludes: ["primary instruction", "alpha-only"],
  },
  {
    path: "docs/beta-doctor.md",
    includes: ["pnpm beta:doctor", "ready_with_warnings", "blocked"],
  },
  {
    path: "docs/beta-smoke-report.md",
    includes: ["pnpm beta:smoke-report", "smoke-report.md", "smoke-report.json", "GitHub issue"],
  },
  {
    path: "docs/interview-mode.md",
    includes: [
      "start_interview_session",
      "end_interview_session",
      "export_interview_report_markdown",
      "InterviewCardSchemaV1",
      "CardSchemaV3",
    ],
  },
  {
    path: "docs/candidate-pack.md",
    includes: [
      "candidate-pack.v1.json",
      "candidate-pack-latest.json",
      "Raw `resume`, raw `job description`, raw `company values` are not written to app logs",
      "provider",
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
    path: "docs/known-limitations.md",
    includes: [
      ...guardrailTokens,
      "скрытых cheating сценариев",
      "click-through скрытого overlay",
      "Everything is fully local",
    ],
  },
  {
    path: "docs/privacy-and-trust.md",
    includes: ["Internal Stable Beta", "STT -> LLM -> карточка", "санитизацию/редакцию"],
    excludes: ["Pre-Alpha"],
  },
  {
    path: "docs/beta-ops-diagnostics.md",
    includes: ["diag_runtime_event", "stage", "outcome", "code"],
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
    path: "docs/release-freeze-matrix.md",
    includes: ["Source of truth: `docs/release-freeze-baseline.json`."],
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
