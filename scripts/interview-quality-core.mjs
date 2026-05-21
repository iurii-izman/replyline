import { readFile } from "node:fs/promises";

const DATASET_PATH = new URL(
  "../tests/fixtures/interview-quality/golden-dataset-v1.json",
  import.meta.url,
);
const PROMPT_REGISTRY_PATH = new URL("../src-tauri/src/prompt_registry.rs", import.meta.url);

const BANNED_COACHING = [
  "you got this",
  "crush this interview",
  "smile more",
  "manifest",
  "just be yourself",
];
const STAR_TOKENS = ["situation", "task", "action", "result"];

function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

function wordCount(text) {
  return String(text ?? "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
}

function containsAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(normalize(needle)));
}

function countDigits(text) {
  const matches = String(text ?? "").match(/\d+/g);
  return matches ? matches.length : 0;
}

function gatherEvidenceTokens(candidatePack) {
  if (!candidatePack || typeof candidatePack !== "object") return [];
  const values = [];
  for (const value of Object.values(candidatePack)) {
    if (Array.isArray(value)) values.push(...value.map(String));
    else if (value != null) values.push(String(value));
  }
  return values.map(normalize);
}

function parseProfileLimits(promptRegistryRaw) {
  const limits = new Map();
  const blockRegex =
    /id:\s*"([^"]+)"[\s\S]*?answer_word_min:\s*(\d+),[\s\S]*?answer_word_max:\s*(\d+),[\s\S]*?short_word_max:\s*(\d+),[\s\S]*?strong_word_max:\s*(\d+),/g;
  for (const m of promptRegistryRaw.matchAll(blockRegex)) {
    limits.set(m[1], {
      answerWordMin: Number(m[2]),
      answerWordMax: Number(m[3]),
      shortWordMax: Number(m[4]),
      strongWordMax: Number(m[5]),
    });
  }
  return limits;
}

function validateFixtureShape(fixture) {
  const errors = [];
  if (!fixture.id) errors.push("missing id");
  if (!fixture.transcript) errors.push("missing transcript");
  if (!fixture.expected || typeof fixture.expected !== "object") errors.push("missing expected");
  if (!fixture.deterministicOutput || typeof fixture.deterministicOutput !== "object")
    errors.push("missing deterministicOutput");
  return errors;
}

function validateInterviewCardSchemaV1(output) {
  const errors = [];
  const allowedQuestionTypes = new Set([
    "behavioral",
    "technical",
    "product",
    "system_design",
    "management",
    "hr",
    "salary",
    "culture_fit",
    "unknown",
  ]);
  const allowedConfidence = new Set(["low", "medium", "high"]);
  const allowedStructure = new Set(["STAR", "CASE", "DIRECT", "CLARIFY"]);

  validateQuestionBlock(output, errors, allowedQuestionTypes, allowedConfidence);
  validateAnswerBlock(output, errors, allowedStructure);
  validateSignalsBlock(output, errors);
  validateRisksBlock(output, errors);
  validateFollowUps(output, errors);
  validateClarifier(output, errors);

  return {
    errors,
    main: String(output?.answer?.main ?? "").trim(),
    short: String(output?.answer?.short ?? "").trim(),
    strong: String(output?.answer?.strong ?? "").trim(),
  };
}

function validateQuestionBlock(output, errors, allowedQuestionTypes, allowedConfidence) {
  if (output.mode !== "interview") errors.push("mode must be interview");
  if (!output.question || typeof output.question !== "object") errors.push("question missing");
  if (!allowedQuestionTypes.has(output?.question?.questionType))
    errors.push("question.questionType invalid");
  if (!allowedConfidence.has(output?.question?.confidence))
    errors.push("question.confidence invalid");
}
function validateAnswerBlock(output, errors, allowedStructure) {
  if (!output.answer || typeof output.answer !== "object") errors.push("answer missing");
  if (!String(output?.answer?.main ?? "").trim()) errors.push("answer.main missing");
  if (!String(output?.answer?.short ?? "").trim()) errors.push("answer.short missing");
  if (!String(output?.answer?.strong ?? "").trim()) errors.push("answer.strong missing");
  if (!allowedStructure.has(output?.answer?.structure)) errors.push("answer.structure invalid");
}
function validateSignalsBlock(output, errors) {
  if (!output.signals || typeof output.signals !== "object") errors.push("signals missing");
  if (!Array.isArray(output?.signals?.mustMention)) errors.push("signals.mustMention invalid");
  if (!Array.isArray(output?.signals?.keywords)) errors.push("signals.keywords invalid");
  if (!Array.isArray(output?.signals?.metrics)) errors.push("signals.metrics invalid");
  if (!Array.isArray(output?.signals?.resumeAnchors)) errors.push("signals.resumeAnchors invalid");
}
function validateRisksBlock(output, errors) {
  if (!output.risks || typeof output.risks !== "object") errors.push("risks missing");
  if (!Array.isArray(output?.risks?.weakPoints)) errors.push("risks.weakPoints invalid");
  if (!Array.isArray(output?.risks?.avoid)) errors.push("risks.avoid invalid");
  if (!String(output?.risks?.safeReframe ?? "").trim()) errors.push("risks.safeReframe missing");
}
function validateFollowUps(output, errors) {
  if (!Array.isArray(output.followUps)) {
    errors.push("followUps invalid");
    return;
  }
  for (const [idx, row] of output.followUps.entries()) {
    if (!String(row?.question ?? "").trim()) errors.push(`followUps[${idx}].question missing`);
    if (!String(row?.bridgeAnswer ?? "").trim())
      errors.push(`followUps[${idx}].bridgeAnswer missing`);
  }
}
function validateClarifier(output, errors) {
  if (!output.clarifier || typeof output.clarifier !== "object") errors.push("clarifier missing");
  if (typeof output?.clarifier?.needed !== "boolean") errors.push("clarifier.needed invalid");
  if (output?.clarifier?.needed && !String(output?.clarifier?.text ?? "").trim()) {
    errors.push("clarifier.text required when needed=true");
  }
}

function validateGates(fixture, profileLimitsById) {
  const failures = [];
  const expected = fixture.expected;
  const output = fixture.deterministicOutput;

  const schema = validateInterviewCardSchemaV1(output);
  failures.push(...schema.errors.map((e) => `schema: ${e}`));

  const profileId = expected.profileId ?? "interview_default";
  const limits = profileLimitsById.get(profileId);
  if (!limits) failures.push(`gate: unknown profile limits (${profileId})`);

  const fullText = normalize(
    [
      schema.main,
      schema.short,
      schema.strong,
      output.question?.cleanQuestion,
      output.question?.interviewerIntent,
      output.risks?.safeReframe,
      ...(output.signals?.mustMention ?? []),
      ...(output.signals?.keywords ?? []),
      ...(output.signals?.metrics ?? []),
      ...(output.signals?.resumeAnchors ?? []),
    ].join(" "),
  );

  applyProfileLimits(schema, limits, failures);
  applyNoFabricationChecks(fixture, expected, output, fullText, failures);

  applyAnswerFramingChecks(schema, failures);
  applyStarChecks(expected, output, fullText, failures);
  applyClarifierChecks(fixture, expected, output, failures);
  applyStyleAndRetellChecks(fixture, fullText, failures);
  applyExpectationTokens(expected, fullText, failures);
  applyQuestionTypeCheck(expected, output, failures);
  applyResumeAnchorRequirement(expected, output, failures);

  return failures;
}

function applyAnswerFramingChecks(schema, failures) {
  if (!/\b(i|my|we)\b/i.test(schema.main) && !/\b(я|мы)\b/iu.test(schema.main)) {
    failures.push("gate: no direct answer framing");
  }
}

function applyStarChecks(expected, output, fullText, failures) {
  if (!(expected.starLikeRequired || output.question?.questionType === "behavioral")) return;
  const hasStar = STAR_TOKENS.every((token) => fullText.includes(token));
  if (!hasStar) failures.push("gate: missing STAR-like structure");
}

function applyStyleAndRetellChecks(fixture, fullText, failures) {
  if (containsAny(fullText, BANNED_COACHING)) failures.push("gate: coaching fluff detected");
  const transcriptNorm = normalize(fixture.transcript);
  if (transcriptNorm.length > 40 && fullText.includes(transcriptNorm.slice(0, 40))) {
    failures.push("gate: transcript retell detected");
  }
}

function applyQuestionTypeCheck(expected, output, failures) {
  if (output.question?.questionType === expected.questionType) return;
  failures.push(
    `expectation: questionType mismatch (${output.question?.questionType} != ${expected.questionType})`,
  );
}

function applyResumeAnchorRequirement(expected, output, failures) {
  if (!expected.requiresResumeAnchor) return;
  if ((output.signals?.resumeAnchors?.length ?? 0) > 0) return;
  failures.push("gate: resume anchor required");
}

function applyProfileLimits(schema, limits, failures) {
  if (!limits) return;
  if (
    wordCount(schema.main) < limits.answerWordMin ||
    wordCount(schema.main) > limits.answerWordMax
  ) {
    failures.push("gate: answer.main profile limits");
  }
  if (wordCount(schema.short) > limits.shortWordMax)
    failures.push("gate: answer.short profile limits");
  if (
    wordCount(schema.strong) < limits.answerWordMin ||
    wordCount(schema.strong) > limits.strongWordMax
  ) {
    failures.push("gate: answer.strong profile limits");
  }
}

function applyNoFabricationChecks(fixture, expected, output, fullText, failures) {
  if (!expected.requiresNoFabrication) return;
  const transcriptAndEvidence = normalize(
    `${fixture.transcript} ${gatherEvidenceTokens(fixture.candidatePack).join(" ")}`,
  );
  if (countDigits(transcriptAndEvidence) === 0 && countDigits(fullText) > 0) {
    failures.push("gate: fabricated metrics detected");
  }
  for (const metric of output.signals?.metrics ?? []) {
    if (!transcriptAndEvidence.includes(normalize(metric))) {
      failures.push(`gate: fabricated metric token (${metric})`);
    }
  }
  for (const anchor of output.signals?.resumeAnchors ?? []) {
    if (!transcriptAndEvidence.includes(normalize(anchor))) {
      failures.push(`gate: fabricated resume anchor (${anchor})`);
    }
  }
}

function applyClarifierChecks(fixture, expected, output, failures) {
  if (!expected.allowClarifier && output.clarifier?.needed) {
    failures.push("gate: clarifier present when not allowed");
  }
  if (!output.clarifier?.needed) return;
  const transcriptNorm = normalize(fixture.transcript);
  const hasAmbiguousCue =
    /\b(unclear|ambiguous|not sure|уточни|непонятно|ambigu|noise|crosstalk)\b/iu.test(
      transcriptNorm,
    );
  const shortPrompt = wordCount(transcriptNorm) <= 8;
  const asksHowWouldYou = /\b(how would you|how do you|как бы вы|что делать)\b/iu.test(
    transcriptNorm,
  );
  const allowedByScenario =
    expected.allowClarifier &&
    (shortPrompt || output.question?.questionType === "unknown" || asksHowWouldYou);
  if (!hasAmbiguousCue && !allowedByScenario)
    failures.push("gate: clarifier not needed by transcript");
}

function applyExpectationTokens(expected, fullText, failures) {
  for (const token of expected.mustMention ?? []) {
    if (!fullText.includes(normalize(token)))
      failures.push(`expectation: mustMention missing (${token})`);
  }
  for (const token of expected.mustNotMention ?? []) {
    if (fullText.includes(normalize(token)))
      failures.push(`expectation: mustNotMention violated (${token})`);
  }
}

export async function runInterviewQuality() {
  const [datasetRaw, promptRegistryRaw] = await Promise.all([
    readFile(DATASET_PATH, "utf8"),
    readFile(PROMPT_REGISTRY_PATH, "utf8"),
  ]);
  const dataset = JSON.parse(datasetRaw);
  const profileLimitsById = parseProfileLimits(promptRegistryRaw);

  if (!Array.isArray(dataset) || dataset.length < 30)
    throw new Error("Interview golden dataset must contain at least 30 scenarios.");

  const results = dataset.map((fixture) => {
    const shapeErrors = validateFixtureShape(fixture);
    const gateErrors =
      shapeErrors.length > 0 ? shapeErrors : validateGates(fixture, profileLimitsById);
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

  return {
    totals: {
      total: results.length,
      pass: results.filter((r) => r.pass).length,
      fail: results.filter((r) => !r.pass).length,
    },
    summaryByType: [...summaryByType.entries()].map(([questionType, value]) => ({
      questionType,
      ...value,
    })),
    results,
  };
}
