import { readFile } from "node:fs/promises";

const DATASET_PATH = new URL("../tests/fixtures/interview-quality/golden-dataset-v1.json", import.meta.url);

const BEHAVIORAL_TYPES = new Set(["behavioral"]);
const MAX_MAIN_CHARS = 560;
const MAX_MAIN_WORDS = 90;
const MIN_MAIN_WORDS = 14;

const BANNED_COACHING = [
  "you got this",
  "crush this interview",
  "be confident",
  "smile more",
  "manifest",
  "just be yourself",
];

const STAR_TOKENS = ["situation", "task", "action", "result"];

function normalize(text) {
  return String(text ?? "").toLowerCase().replace(/\s+/gu, " ").trim();
}

function wordCount(text) {
  return String(text ?? "").trim().split(/\s+/u).filter(Boolean).length;
}

function containsAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(normalize(needle)));
}

function countDigits(text) {
  const matches = String(text ?? "").match(/[0-9]+/g);
  return matches ? matches.length : 0;
}

function gatherEvidenceTokens(candidatePack) {
  if (!candidatePack || typeof candidatePack !== "object") return [];
  const values = [];
  for (const value of Object.values(candidatePack)) {
    if (Array.isArray(value)) {
      for (const item of value) values.push(String(item));
    } else if (value != null) {
      values.push(String(value));
    }
  }
  return values.map(normalize);
}

function validateFixtureShape(fixture) {
  const errors = [];
  if (!fixture.id) errors.push("missing id");
  if (!fixture.transcript) errors.push("missing transcript");
  if (!fixture.expected || typeof fixture.expected !== "object") errors.push("missing expected");
  if (!fixture.deterministicOutput || typeof fixture.deterministicOutput !== "object") {
    errors.push("missing deterministicOutput");
  }
  return errors;
}

function validateInterviewCardSchemaV1(output) {
  const errors = [];
  const allowedTypes = new Set([
    "intro",
    "motivation",
    "behavioral",
    "ambiguous",
    "compensation",
    "technical",
    "product",
    "fit",
    "resume",
  ]);

  if (!allowedTypes.has(output.questionType)) errors.push("questionType invalid");
  if (!output.answer || typeof output.answer !== "object") errors.push("answer missing");

  const main = String(output?.answer?.main ?? "").trim();
  if (!main) errors.push("answer.main missing");

  if (!Array.isArray(output.hints) || output.hints.length === 0) errors.push("hints empty");
  if (!Array.isArray(output.signals) || output.signals.length === 0) errors.push("signals empty");

  return { errors, main };
}

function validateGates(fixture) {
  const failures = [];
  const expected = fixture.expected;
  const output = fixture.deterministicOutput;

  const schema = validateInterviewCardSchemaV1(output);
  failures.push(...schema.errors.map((e) => `schema: ${e}`));

  const main = schema.main;
  const fullText = normalize([
    main,
    output.answer?.clarifier ?? "",
    output.resumeAnchor ?? "",
    ...(output.hints ?? []),
    ...(output.signals ?? []),
  ].join(" "));

  if (main.length > MAX_MAIN_CHARS || wordCount(main) > MAX_MAIN_WORDS || wordCount(main) < MIN_MAIN_WORDS) {
    failures.push("gate: answer.main profile limits");
  }

  if (expected.requiresNoFabrication) {
    const transcriptAndEvidence = normalize(`${fixture.transcript} ${gatherEvidenceTokens(fixture.candidatePack).join(" ")}`);
    const hasNumbersInEvidence = countDigits(transcriptAndEvidence) > 0;
    const hasNumbersInOutput = countDigits(fullText) > 0;
    if (!hasNumbersInEvidence && hasNumbersInOutput) {
      failures.push("gate: fabricated metrics detected");
    }

    const companyClaims = ["google", "megabank", "microsoft", "amazon", "replyline"];
    const evidenceCompanies = companyClaims.filter((c) => transcriptAndEvidence.includes(c));
    const outputCompanies = companyClaims.filter((c) => fullText.includes(c));
    for (const company of outputCompanies) {
      if (!evidenceCompanies.includes(company)) failures.push(`gate: fake company claim (${company})`);
    }
  }

  const clarifier = String(output.answer?.clarifier ?? "").trim();
  if (!expected.allowClarifier && clarifier) {
    failures.push("gate: clarifier present when not allowed");
  }

  if (!/\b(i|my|we)\b/i.test(main) && !/\bwould\b/i.test(main)) {
    failures.push("gate: no direct answer framing");
  }

  if (BEHAVIORAL_TYPES.has(output.questionType)) {
    const hasStar = STAR_TOKENS.every((token) => fullText.includes(token));
    if (!hasStar) failures.push("gate: missing STAR-like structure");
  }

  const hintsOk = output.hints.every((h) => String(h).trim().length >= 8);
  const signalsOk = output.signals.every((h) => String(h).trim().length >= 8);
  if (!hintsOk || !signalsOk) failures.push("gate: hints/signals weak");

  if (containsAny(fullText, BANNED_COACHING)) failures.push("gate: coaching fluff detected");

  const transcriptNorm = normalize(fixture.transcript);
  if (transcriptNorm.length > 40 && fullText.includes(transcriptNorm.slice(0, 40))) {
    failures.push("gate: transcript retell detected");
  }

  for (const token of expected.mustMention ?? []) {
    if (!fullText.includes(normalize(token))) failures.push(`expectation: mustMention missing (${token})`);
  }

  for (const token of expected.mustNotMention ?? []) {
    if (fullText.includes(normalize(token))) failures.push(`expectation: mustNotMention violated (${token})`);
  }

  if (output.questionType !== expected.questionType) {
    failures.push(`expectation: questionType mismatch (${output.questionType} != ${expected.questionType})`);
  }

  if (expected.requiresResumeAnchor) {
    if (!String(output.resumeAnchor ?? "").trim()) failures.push("gate: resume anchor required");
  }

  return failures;
}

export async function runInterviewQuality() {
  const raw = await readFile(DATASET_PATH, "utf8");
  const dataset = JSON.parse(raw);

  if (!Array.isArray(dataset) || dataset.length < 30) {
    throw new Error("Interview golden dataset must contain at least 30 scenarios.");
  }

  const results = dataset.map((fixture) => {
    const shapeErrors = validateFixtureShape(fixture);
    const gateErrors = shapeErrors.length > 0 ? shapeErrors : validateGates(fixture);
    return {
      id: fixture.id,
      scenario: fixture.scenario,
      questionType: fixture.expected?.questionType ?? "unknown",
      pass: gateErrors.length === 0,
      errors: gateErrors,
    };
  });

  const summaryByType = new Map();
  for (const row of results) {
    const key = row.questionType;
    const current = summaryByType.get(key) ?? { total: 0, pass: 0, fail: 0 };
    current.total += 1;
    if (row.pass) current.pass += 1;
    else current.fail += 1;
    summaryByType.set(key, current);
  }

  const totals = {
    total: results.length,
    pass: results.filter((r) => r.pass).length,
    fail: results.filter((r) => !r.pass).length,
  };

  return {
    totals,
    summaryByType: [...summaryByType.entries()].map(([questionType, value]) => ({ questionType, ...value })),
    results,
  };
}
