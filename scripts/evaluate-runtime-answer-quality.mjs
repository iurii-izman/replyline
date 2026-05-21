import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deterministicCardFromSnippet, normalize, validateCard } from "./prompt-contract-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const fixturesPath = join(
  rootDir,
  "tests",
  "fixtures",
  "runtime-quality",
  "runtime-answer-fixtures.json",
);
const thresholdsPath = join(
  rootDir,
  "tests",
  "fixtures",
  "runtime-quality",
  "quality-thresholds.json",
);
const reportsDir = join(rootDir, "reports", "runtime-quality");

const SECRET_PATTERNS = [
  /\bsk-[a-z0-9_-]{12,}\b/i,
  /\bdg_[a-z0-9_-]{12,}\b/i,
  /\bBearer\s+\S+/i,
  /\bOPENAI_API_KEY\b/i,
  /\bDEEPGRAM_API_KEY\b/i,
  /\bOPENROUTER_API_KEY\b/i,
];

const FORBIDDEN_SAY_NOW_MARKDOWN = [/```/, /^\s*#/m, /^\s*\|.+\|/m, /^\s*[-*]\s+/m];
const APOLOGY_SPAM = /(извините|простите|сожалею).*(извините|простите|сожалею)/i;
const RAW_PROMPT_LEAK = /(system prompt|developer message|BEGIN PROMPT|### instruction)/i;
const CYRILLIC_RATIO_RE = /[а-яё]/gi;

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function ensureReportsDir() {
  mkdirSync(reportsDir, { recursive: true });
}

function extractCandidatePackTokens(candidatePack) {
  if (!candidatePack || typeof candidatePack !== "object") return [];
  const tokens = [];
  for (const value of Object.values(candidatePack)) {
    if (Array.isArray(value)) tokens.push(...value.map((x) => String(x)));
    else if (value != null) tokens.push(String(value));
  }
  return tokens.map((x) => normalize(x)).filter(Boolean);
}

function buildMockCard(fixture) {
  const base = deterministicCardFromSnippet(fixture.transcript || "");
  return {
    ...base,
    ...(fixture.mockCardOverrides ?? {}),
  };
}

function hasRuTone(text) {
  const totalAlpha = (text.match(/[a-zа-яё]/gi) ?? []).length;
  const cyr = (text.match(CYRILLIC_RATIO_RE) ?? []).length;
  if (totalAlpha === 0) return false;
  return cyr / totalAlpha >= 0.35;
}

export function evaluateFixture(fixture, thresholds) {
  const reasons = [];
  let score = 100;

  const transcript = String(fixture.transcript ?? "").trim();
  const expected = fixture.expected ?? {};

  if (!transcript) {
    if (expected.expectsGracefulFailure) {
      return {
        id: fixture.id,
        pass: true,
        score: 100,
        reasons: [],
        card: null,
        gracefulFailure: true,
      };
    }
    return {
      id: fixture.id,
      pass: false,
      score: 0,
      reasons: ["empty transcript"],
      card: null,
      gracefulFailure: false,
    };
  }

  const card = buildMockCard(fixture);
  const shapeError = validateCard(card, transcript);
  if (shapeError) {
    score -= 25;
    reasons.push(`card-shape: ${shapeError}`);
  }

  if (!card.say_now || !card.say_now.trim()) {
    score -= 25;
    reasons.push("sayNow missing");
  }

  if (expected.requiresNextStep && (!card.next_move || !card.next_move.trim())) {
    score -= 20;
    reasons.push("nextMove missing");
  }

  const maxSayNowChars = Math.min(
    Number(expected.maxSayNowChars ?? thresholds.maxSayNowChars ?? 420),
    Number(thresholds.maxSayNowChars ?? 420),
  );
  if ((card.say_now ?? "").length > maxSayNowChars) {
    score -= 15;
    reasons.push(`sayNow too long (${card.say_now.length} > ${maxSayNowChars})`);
  }

  const fullText = `${card.gist ?? ""} ${card.say_now ?? ""} ${card.next_move ?? ""}`;
  const fullNorm = normalize(fullText);

  for (const token of expected.mustContain ?? []) {
    if (!fullNorm.includes(normalize(token))) {
      score -= 8;
      reasons.push(`mustContain missing: ${token}`);
    }
  }

  for (const token of expected.mustNotContain ?? []) {
    if (fullNorm.includes(normalize(token))) {
      score -= 12;
      reasons.push(`mustNotContain violated: ${token}`);
    }
  }

  if (expected.requiresNoApologySpam && APOLOGY_SPAM.test(fullText)) {
    score -= 8;
    reasons.push("apology spam");
  }

  if (expected.requiresRuTone && !hasRuTone(fullText)) {
    score -= 8;
    reasons.push("RU tone check failed");
  }

  if (RAW_PROMPT_LEAK.test(fullText)) {
    score -= 20;
    reasons.push("raw prompt leakage");
  }

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(fullText)) {
      score -= 20;
      reasons.push(`secret-like pattern: ${pattern}`);
      break;
    }
  }

  for (const pattern of FORBIDDEN_SAY_NOW_MARKDOWN) {
    if (pattern.test(String(card.say_now ?? ""))) {
      score -= 10;
      reasons.push("markdown dump inside sayNow");
      break;
    }
  }

  if (expected.requiresNoCandidateHallucination && !fixture.candidatePack) {
    const disallowed = ["candidate pack", "resume", "portfolio", "certification"];
    for (const token of disallowed) {
      if (fullNorm.includes(token)) {
        score -= 10;
        reasons.push(`candidate hallucination token: ${token}`);
      }
    }
  }

  if (fixture.candidatePack) {
    const evidenceTokens = extractCandidatePackTokens(fixture.candidatePack);
    const hasEvidenceReference = evidenceTokens.some((token) => fullNorm.includes(token));
    if (!hasEvidenceReference) {
      score -= 12;
      reasons.push("candidate pack evidence not used");
    }
  }

  score = Math.max(0, Math.round(score));
  const pass = reasons.length === 0 && score >= Number(thresholds.minScenarioScore ?? 70);

  return {
    id: fixture.id,
    pass,
    score,
    reasons,
    card,
    gracefulFailure: false,
  };
}

export function evaluateRuntimeAnswerQuality() {
  if (!existsSync(fixturesPath)) {
    throw new Error(`Missing fixtures file: ${fixturesPath}`);
  }
  if (!existsSync(thresholdsPath)) {
    throw new Error(`Missing thresholds file: ${thresholdsPath}`);
  }

  const fixtures = readJson(fixturesPath);
  const thresholds = readJson(thresholdsPath);

  if (!Array.isArray(fixtures) || fixtures.length < 10) {
    throw new Error("runtime-answer fixtures must contain at least 10 scenarios");
  }

  const results = fixtures.map((fixture) => evaluateFixture(fixture, thresholds));
  const passCount = results.filter((x) => x.pass).length;
  const failCount = results.length - passCount;
  const avgScore =
    results.length > 0
      ? Math.round((results.reduce((sum, row) => sum + row.score, 0) / results.length) * 10) / 10
      : 0;

  const weakestFixtures = [...results]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((row) => ({ id: row.id, score: row.score, reasons: row.reasons }));

  const reasonCounts = new Map();
  for (const row of results) {
    for (const reason of row.reasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
  }

  const recurringFailureReasons = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count }));

  const aggregate = {
    total: results.length,
    passCount,
    failCount,
    averageScore: avgScore,
    minAverageScore: Number(thresholds.minAverageScore ?? 82),
    minScenarioScore: Number(thresholds.minScenarioScore ?? 70),
    weakestFixtures,
    recurringFailureReasons,
  };

  const pass =
    aggregate.averageScore >= aggregate.minAverageScore &&
    results.every((row) => row.score >= aggregate.minScenarioScore || row.gracefulFailure);

  return {
    generatedAt: new Date().toISOString(),
    pass,
    thresholds,
    aggregate,
    results,
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push("# Runtime Answer Quality Report");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Pass: ${report.pass}`);
  lines.push("");
  lines.push("## Aggregate");
  lines.push(`- total: ${report.aggregate.total}`);
  lines.push(`- pass: ${report.aggregate.passCount}`);
  lines.push(`- fail: ${report.aggregate.failCount}`);
  lines.push(`- averageScore: ${report.aggregate.averageScore}`);
  lines.push("");
  lines.push("## Weakest Fixtures");
  for (const row of report.aggregate.weakestFixtures) {
    lines.push(`- ${row.id}: score=${row.score}; reasons=${row.reasons.join("; ") || "none"}`);
  }
  lines.push("");
  lines.push("## Recurring Failure Reasons");
  for (const row of report.aggregate.recurringFailureReasons) {
    lines.push(`- ${row.reason}: ${row.count}`);
  }
  lines.push("");
  lines.push("## Scenario Scores");
  for (const row of report.results) {
    lines.push(`- ${row.id}: pass=${row.pass} score=${row.score}`);
  }
  return lines.join("\n");
}

function writeReports(report) {
  ensureReportsDir();
  const stamp = todayStamp();
  const jsonPath = join(reportsDir, `runtime-answer-quality-${stamp}.json`);
  const mdPath = join(reportsDir, `runtime-answer-quality-${stamp}.md`);

  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(mdPath, `${toMarkdown(report)}\n`, "utf8");

  return { jsonPath, mdPath };
}

function runCli() {
  const report = evaluateRuntimeAnswerQuality();
  const files = writeReports(report);
  console.log(`runtime-answer-quality: JSON report -> ${files.jsonPath}`);
  console.log(`runtime-answer-quality: MD report -> ${files.mdPath}`);
  console.log(
    `runtime-answer-quality: pass=${report.aggregate.passCount}/${report.aggregate.total} avg=${report.aggregate.averageScore}`,
  );
  if (!report.pass) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCli();
}
