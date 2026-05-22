import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deterministicCardFromSnippet, normalize, validateCard } from "./prompt-contract-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const scenariosDir = join(rootDir, "tests", "fixtures", "product-scenarios");
const goldenDir = join(scenariosDir, "golden");
const thresholdsPath = join(scenariosDir, "thresholds.json");
const negativeCasesPath = join(scenariosDir, "negative-cases.json");
const reportsDir = join(rootDir, "reports", "product-quality");

const DIMENSIONS = {
  card_shape: 15,
  say_now_usefulness: 25,
  brevity: 10,
  tone: 15,
  next_step: 15,
  no_hallucination: 10,
  privacy_no_secret_leak: 10,
};

const SECRET_PATTERNS = [
  /\bsk-[a-z0-9_-]{12,}\b/i,
  /\bdg_[a-z0-9_-]{12,}\b/i,
  /\bBearer\s+\S+/i,
  /\bOPENAI_API_KEY\b/i,
  /\bDEEPGRAM_API_KEY\b/i,
  /\bOPENROUTER_API_KEY\b/i,
];

const RAW_PROMPT_LEAK = /(system prompt|developer message|BEGIN PROMPT|### instruction)/i;
const MARKDOWN_TABLE = /^\s*\|.+\|/m;
const APOLOGY_SPAM = /(извините|простите|сожалею).*(извините|простите|сожалею)/i;

const CONCEPT_MAP = {
  acknowledge: ["понима", "согласен", "вижу", "слышу"],
  next_step: [
    "следующий шаг",
    "зафикс",
    "отправ",
    "сделаю",
    "подтверж",
    "план",
    "добавлю",
    "дам",
    "завершу",
    "проверю",
    "покажу",
    "соберу",
    "предложу",
    "назнач",
  ],
  deadline: ["срок", "дедлайн", "сегодня", "завтра", "до ", "18:00", "17:00", "12:00"],
  clarify_scope: ["уточ", "критер", "что именно", "scope", "приоритет"],
  ownership: ["владел", "ответствен", "назнач", "owner"],
  boundary: ["не беру", "не смогу", "сейчас не", "могу после", "не обещ"],
  responsibility: [
    "беру ответственность",
    "на мне",
    "мой контроль",
    "я отвечаю",
    "ответственность взял",
  ],
  deescalate: ["верн", "спокой", "по фактам", "сним"],
  star: ["situation", "task", "action", "result"],
  evidence: ["пример", "факт", "метрик", "подтверж"],
  salary_care: ["диапазон", "compensation", "услов", "ответственности"],
  gap_honesty: ["gap", "призна", "честно", "закрыл навык"],
  why_company: ["ваш", "компани", "роль", "90 дней"],
  failure_learning: ["провал", "урок", "изменил процесс"],
  recovery_clarify: ["фрагмент", "коротк", "уточ", "не придум"],
  recovery_transparency: [
    "нет распознанного",
    "не буду придумывать",
    "часть контекста",
    "скрываю",
    "без персональных деталей",
  ],
  language_match: ["на русском", "ru", "русском"],
  candidate_fact: ["candidate pack", "подтвержд", "факт", "p95", "migrated", "mentoring"],
  no_invention: ["без выдум", "без добавления", "проверяем"],
  requirement_tradeoff: ["нет прямого", "конфликт", "tradeoff", "адаптац"],
  values_alignment: ["ценност", "ownership", "прозрач"],
  privacy_redaction: ["redaction", "redacted", "скрываю", "без ключ", "очищен"],
  secret_safe: ["без токен", "без credential", "без секрет"],
  invented_details: ["42% conversion uplift", "nasa", "portfolio на 12", "резюме есть опыт в nasa"],
  blame: ["не моя вина", "они виноваты", "ваша вина"],
  over_apology: ["извините", "простите", "сожалею"],
  prompt_leak: ["system prompt", "developer message", "begin prompt"],
  secret_leak: ["sk-", "bearer ", "openai_api_key", "deepgram_api_key"],
};

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => join(dir, name));
}

function scenarioFromEntry(entry) {
  return {
    ...entry,
    expected: {
      mustContainConcepts: [],
      mustAvoidConcepts: [],
      requiresNextStep: true,
      requiresClarifyingQuestion: false,
      maxSayNowChars: 420,
      language: "ru",
      targetUsefulness: 85,
      ...(entry.expected ?? {}),
    },
  };
}

function loadScenarios() {
  const files = listJsonFiles(scenariosDir).filter((p) => {
    const base = p.split(/[/\\]/u).at(-1);
    return base !== "thresholds.json" && base !== "negative-cases.json";
  });
  const scenarios = [];
  for (const file of files) {
    const data = readJson(file);
    if (Array.isArray(data)) {
      scenarios.push(...data.map(scenarioFromEntry));
      continue;
    }
    if (Array.isArray(data?.scenarios)) {
      scenarios.push(...data.scenarios.map(scenarioFromEntry));
      continue;
    }
    throw new Error(`Unsupported scenarios format: ${file}`);
  }
  return scenarios;
}

function loadGolden() {
  const files = listJsonFiles(goldenDir);
  const rows = [];
  for (const file of files) {
    const data = readJson(file);
    if (!Array.isArray(data)) throw new Error(`Golden file must be array: ${file}`);
    rows.push(...data);
  }
  return rows;
}

function hasConcept(text, concept) {
  const terms = CONCEPT_MAP[concept] ?? [concept];
  const norm = normalize(text);
  return terms.some((term) => norm.includes(normalize(term)));
}

function buildCard(scenario) {
  const base = deterministicCardFromSnippet(String(scenario.transcript ?? ""));
  return {
    ...base,
    ...(scenario.mockCard ?? {}),
  };
}

function scoreDimension(weight, passed) {
  return passed ? weight : 0;
}

function evaluateScenario(scenario, thresholds, goldenById = new Map()) {
  const card = buildCard(scenario);
  const expected = scenario.expected;
  const combined = `${card.gist ?? ""} ${card.say_now ?? ""} ${card.next_move ?? ""}`;
  const reasons = [];
  const dimensionPass = {};

  const shapeError = validateCard(card, String(scenario.transcript ?? ""));
  const shapeOk = !shapeError;
  if (!shapeOk) reasons.push(`card_shape: ${shapeError}`);
  dimensionPass.card_shape = shapeOk;

  const missingMustContain = expected.mustContainConcepts.filter((c) => !hasConcept(combined, c));
  const violatedMustAvoid = expected.mustAvoidConcepts.filter((c) => hasConcept(combined, c));
  const notApologySpam = !APOLOGY_SPAM.test(combined);
  const noMarkdownTable = !MARKDOWN_TABLE.test(String(card.say_now ?? ""));
  const usefulnessOk =
    missingMustContain.length === 0 &&
    violatedMustAvoid.length === 0 &&
    notApologySpam &&
    noMarkdownTable &&
    !!String(card.say_now ?? "").trim();
  if (missingMustContain.length > 0)
    reasons.push(`say_now_usefulness: missing ${missingMustContain.join(", ")}`);
  if (violatedMustAvoid.length > 0)
    reasons.push(`say_now_usefulness: mustAvoid ${violatedMustAvoid.join(", ")}`);
  if (!notApologySpam) reasons.push("say_now_usefulness: apology spam");
  if (!noMarkdownTable) reasons.push("say_now_usefulness: markdown table in say_now");
  if (!String(card.say_now ?? "").trim()) reasons.push("say_now_usefulness: empty say_now");
  dimensionPass.say_now_usefulness = usefulnessOk;

  const maxSayNowChars = Math.min(
    Number(expected.maxSayNowChars ?? thresholds.maxSayNowChars ?? 420),
    Number(thresholds.maxSayNowChars ?? 420),
  );
  const brevityOk = String(card.say_now ?? "").length <= maxSayNowChars;
  if (!brevityOk) reasons.push(`brevity: ${String(card.say_now ?? "").length} > ${maxSayNowChars}`);
  dimensionPass.brevity = brevityOk;

  const toneOk =
    expected.tone !== "calm_professional"
      ? true
      : !hasConcept(combined, "blame") && !RAW_PROMPT_LEAK.test(combined);
  if (!toneOk) reasons.push("tone: not calm_professional");
  dimensionPass.tone = toneOk;

  const nextStepOk = !expected.requiresNextStep || hasConcept(card.next_move ?? "", "next_step");
  if (!nextStepOk) reasons.push("next_step: missing actionable next step");
  if (expected.requiresClarifyingQuestion) {
    const hasQuestion =
      String(card.say_now ?? "").includes("?") || hasConcept(card.say_now ?? "", "clarify_scope");
    if (!hasQuestion) {
      reasons.push("next_step: missing clarifying question");
      dimensionPass.next_step = false;
    } else {
      dimensionPass.next_step = nextStepOk;
    }
  } else {
    dimensionPass.next_step = nextStepOk;
  }

  const hallBase = !hasConcept(combined, "invented_details");
  const hallPackCheck = !scenario.candidatePack || hasConcept(combined, "candidate_fact");
  const noHallucinationOk = hallBase && hallPackCheck;
  if (!hallBase) reasons.push("no_hallucination: invented detail marker");
  if (!hallPackCheck) reasons.push("no_hallucination: candidate pack fact missing");
  dimensionPass.no_hallucination = noHallucinationOk;

  const privacyOk =
    !RAW_PROMPT_LEAK.test(combined) && SECRET_PATTERNS.every((re) => !re.test(combined));
  if (!privacyOk) reasons.push("privacy_no_secret_leak: secret-like or prompt leak content");
  dimensionPass.privacy_no_secret_leak = privacyOk;

  const golden = goldenById.get(scenario.id);
  if (golden) {
    const shapeGoldenOk =
      (!golden.expectedShape?.gistRequired || !!String(card.gist ?? "").trim()) &&
      (!golden.expectedShape?.sayNowRequired || !!String(card.say_now ?? "").trim()) &&
      (!golden.expectedShape?.nextMoveRequired || !!String(card.next_move ?? "").trim());
    if (!shapeGoldenOk) reasons.push("card_shape: golden shape mismatch");

    const sayNowGolden = (golden.expectedConcepts?.sayNow ?? []).every((c) =>
      hasConcept(card.say_now ?? "", c),
    );
    const nextGolden = (golden.expectedConcepts?.nextMove ?? []).every((c) =>
      hasConcept(card.next_move ?? "", c),
    );
    if (!sayNowGolden || !nextGolden) {
      reasons.push("say_now_usefulness: golden concept mismatch");
      dimensionPass.say_now_usefulness = false;
    }
  }

  const weightedScore = Object.entries(DIMENSIONS).reduce((sum, [dimension, weight]) => {
    return sum + scoreDimension(weight, Boolean(dimensionPass[dimension]));
  }, 0);

  const targetUsefulness = Number(expected.targetUsefulness ?? 85);
  const score = Math.max(
    0,
    Math.min(100, Math.round((weightedScore * 0.85 + targetUsefulness * 0.15) * 10) / 10),
  );

  const pass = score >= Number(thresholds.minScenarioScore ?? 70) && reasons.length === 0;

  return {
    id: scenario.id,
    category: scenario.category,
    mode: scenario.mode,
    score,
    pass,
    reasons,
    dimensionPass,
  };
}

function summarize(results) {
  const byCategory = new Map();
  const byMode = new Map();
  const reasonCounts = new Map();

  for (const row of results) {
    if (!byCategory.has(row.category)) byCategory.set(row.category, []);
    byCategory.get(row.category).push(row.score);

    if (!byMode.has(row.mode)) byMode.set(row.mode, []);
    byMode.get(row.mode).push(row.score);

    for (const reason of row.reasons) {
      const key = reason.split(":")[0].trim();
      reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
    }
  }

  const categoryAverages = [...byCategory.entries()].map(([category, scores]) => ({
    category,
    averageScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    total: scores.length,
  }));

  const modeAverages = [...byMode.entries()].map(([mode, scores]) => ({
    mode,
    averageScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    total: scores.length,
  }));

  const lowest5 = [...results]
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((r) => ({ id: r.id, score: r.score, reasons: r.reasons }));

  const recurringFailureReasons = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count }));

  return { categoryAverages, modeAverages, lowest5, recurringFailureReasons };
}

function reportMarkdown(report) {
  const lines = [];
  lines.push("# Product Scenario Benchmark");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Overall pass: ${report.pass}`);
  lines.push(`Overall score: ${report.overallScore}`);
  lines.push("");
  lines.push("## Category Scores");
  lines.push("| Category | Avg score | Scenarios |");
  lines.push("|---|---:|---:|");
  for (const row of report.categoryAverages) {
    lines.push(`| ${row.category} | ${row.averageScore} | ${row.total} |`);
  }
  lines.push("");
  lines.push("## Mode Scores");
  for (const row of report.modeAverages) {
    lines.push(`- ${row.mode}: ${row.averageScore} (${row.total})`);
  }
  lines.push("");
  lines.push("## Weakest Scenarios");
  for (const row of report.lowest5) {
    lines.push(`- ${row.id}: ${row.score}; ${row.reasons.join("; ") || "none"}`);
  }
  lines.push("");
  lines.push("## Recurring Failure Reasons");
  for (const row of report.recurringFailureReasons) {
    lines.push(`- ${row.reason}: ${row.count}`);
  }
  lines.push("");
  lines.push("## Privacy Leak Scan");
  lines.push(`- pass: ${report.privacyLeakScan.pass}`);
  lines.push(`- issues: ${report.privacyLeakScan.issues}`);
  lines.push("");
  lines.push("## Recommendation");
  lines.push(
    report.pass
      ? "- Benchmark green. Keep adding edge scenarios and golden concept snapshots."
      : "- Benchmark red. Fix weakest scenarios and recurring failure reasons first.",
  );
  return lines.join("\n");
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function writeReport(report) {
  ensureDir(reportsDir);
  const stamp = todayStamp();
  const jsonPath = join(reportsDir, `product-scenario-benchmark-${stamp}.json`);
  const mdPath = join(reportsDir, `product-scenario-benchmark-${stamp}.md`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(mdPath, `${reportMarkdown(report)}\n`, "utf8");
  return { jsonPath, mdPath };
}

export function evaluateProductScenarios() {
  if (!existsSync(thresholdsPath)) throw new Error(`Missing thresholds: ${thresholdsPath}`);
  const thresholds = readJson(thresholdsPath);
  const scenarios = loadScenarios();
  if (scenarios.length < 25 || scenarios.length > 40) {
    throw new Error(`Expected 25-40 product scenarios, got ${scenarios.length}`);
  }
  const goldenEntries = loadGolden();
  const goldenById = new Map(goldenEntries.map((row) => [row.id, row]));
  const results = scenarios.map((scenario) => evaluateScenario(scenario, thresholds, goldenById));

  const overallScore =
    results.length === 0
      ? 0
      : Math.round((results.reduce((sum, row) => sum + row.score, 0) / results.length) * 10) / 10;

  const { categoryAverages, modeAverages, lowest5, recurringFailureReasons } = summarize(results);
  const privacyLeakScenarios = results.filter((row) =>
    row.reasons.some((reason) => reason.startsWith("privacy_no_secret_leak")),
  );

  const minCategoryScore = Number(thresholds.minCategoryScore ?? 78);
  const minScenarioScore = Number(thresholds.minScenarioScore ?? 70);
  const minOverallScore = Number(thresholds.minOverallScore ?? 84);

  const pass =
    overallScore >= minOverallScore &&
    categoryAverages.every((row) => row.averageScore >= minCategoryScore) &&
    results.every((row) => row.score >= minScenarioScore);

  return {
    generatedAt: new Date().toISOString(),
    thresholds,
    dimensions: DIMENSIONS,
    totalScenarios: results.length,
    overallScore,
    pass,
    categoryAverages,
    modeAverages,
    lowest5,
    recurringFailureReasons,
    privacyLeakScan: {
      pass: privacyLeakScenarios.length === 0,
      issues: privacyLeakScenarios.length,
    },
    results,
  };
}

export function runNegativeRegressionCases() {
  if (!existsSync(negativeCasesPath)) {
    throw new Error(`Missing negative cases: ${negativeCasesPath}`);
  }
  const thresholds = readJson(thresholdsPath);
  const rows = readJson(negativeCasesPath);
  if (!Array.isArray(rows) || rows.length < 6) {
    throw new Error("negative-cases must contain at least 6 cases");
  }

  const outcomes = [];
  for (const row of rows) {
    const scenario = structuredClone(row.scenario);
    if (Number.isFinite(scenario.extendSayNowTo)) {
      scenario.mockCard.say_now = (scenario.mockCard.say_now || "x").padEnd(
        scenario.extendSayNowTo,
        "x",
      );
    }
    const result = evaluateScenario(scenarioFromEntry(scenario), thresholds);
    const passedReasonCheck = row.mustFailReasons.every((reason) =>
      result.reasons.some((entry) => entry.startsWith(reason)),
    );
    outcomes.push({
      id: row.id,
      expectedFailReasons: row.mustFailReasons,
      actualReasons: result.reasons,
      valid: !result.pass && passedReasonCheck,
    });
  }

  const pass = outcomes.every((row) => row.valid);
  return { pass, outcomes };
}

function runCli() {
  const reportOnly = process.argv.includes("--report-only");
  const benchmark = evaluateProductScenarios();
  const negative = runNegativeRegressionCases();
  const full = {
    ...benchmark,
    negativeRegression: negative,
  };
  const files = writeReport(full);
  console.log(`product-scenarios: JSON report -> ${files.jsonPath}`);
  console.log(`product-scenarios: MD report -> ${files.mdPath}`);
  console.log(
    `product-scenarios: total=${full.totalScenarios} score=${full.overallScore} pass=${full.pass}`,
  );
  console.log(`product-scenarios: negative pass=${negative.pass}`);
  if (!reportOnly && (!full.pass || !negative.pass)) {
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCli();
}
