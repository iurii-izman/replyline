import { readFile } from "node:fs/promises";

import {
  deterministicCardFromSnippet,
  deterministicCardV3FromSnippet,
  mapV3ToLegacy,
  validateCard,
  validateCardV3,
} from "./prompt-contract-core.mjs";

const fixturePath = new URL("../fixtures/ru-work-snippets.json", import.meta.url);
const llmPath = new URL("../src-tauri/src/llm.rs", import.meta.url);
const cardV3Path = new URL("../src-tauri/src/card_v3.rs", import.meta.url);
const interviewCardV1Path = new URL("../src-tauri/src/interview_card_v1.rs", import.meta.url);
const llmProviderPath = new URL("../src-tauri/src/providers/llm_provider.rs", import.meta.url);
const promptRegistryPath = new URL("../src-tauri/src/prompt_registry.rs", import.meta.url);
const answerProfilesPath = new URL("../src/app/answerProfiles.ts", import.meta.url);

function fail(message) {
  throw new Error(message);
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    fail(message);
  }
}

const [fixtureRaw, llmRaw, cardV3Raw, interviewCardRaw, llmProviderRaw, promptRegistryRaw, answerProfilesRaw] = await Promise.all([
  readFile(fixturePath, "utf8"),
  readFile(llmPath, "utf8"),
  readFile(cardV3Path, "utf8"),
  readFile(interviewCardV1Path, "utf8"),
  readFile(llmProviderPath, "utf8"),
  readFile(promptRegistryPath, "utf8"),
  readFile(answerProfilesPath, "utf8"),
]);

const fixtures = JSON.parse(fixtureRaw);
if (!Array.isArray(fixtures) || fixtures.length < 20) {
  fail("Fixture corpus is too small for prompt-contract checks (need >= 20).");
}

assertIncludes(
  llmRaw,
  "CardSchemaV3",
  "llm.rs must document CardSchemaV3 in system prompt.",
);
assertIncludes(
  llmRaw,
  '"question_brief":"...","answer_now":"...","star_evidence":"...","next_step":"..."',
  "llm.rs must require CardSchemaV3 JSON fields.",
);
assertIncludes(cardV3Raw, "struct RawCardV3", "card_v3.rs must define RawCardV3.");
assertIncludes(cardV3Raw, "struct RawCardLegacy", "card_v3.rs must keep legacy RawCard parser.");
assertIncludes(cardV3Raw, "map_v3_fields", "card_v3.rs must map v3 to legacy fields.");
assertIncludes(cardV3Raw, "repair_section", "card_v3.rs must implement repair-first normalization.");
assertIncludes(
  llmRaw,
  "не давай терапевтические советы",
  "Russian prompt must ban therapy wording.",
);
assertIncludes(
  llmRaw,
  "не оценивай эмоции и тональность",
  "Russian prompt must ban emotion/tone magic.",
);
assertIncludes(llmRaw, "SYSTEM_PROMPT_EN", "llm.rs must define an English system prompt.");
assertIncludes(
  llmRaw,
  "do not give therapeutic advice",
  "English prompt must ban therapy wording.",
);
assertIncludes(
  llmRaw,
  "do not evaluate emotions or tone",
  "English prompt must ban emotion/tone magic.",
);
assertIncludes(
  llmRaw,
  "const PRIMARY_MAX_TOKENS: u16 = 420;",
  "Primary LLM max token budget should be 420 for paragraph cards.",
);
assertIncludes(
  llmRaw,
  "const RETRY_MAX_TOKENS: u16 = 300;",
  "Retry LLM max token budget should be 300.",
);
assertIncludes(
  llmProviderRaw,
  "enum AnalysisMode",
  "llm_provider.rs must declare explicit analysis mode switch.",
);
assertIncludes(
  llmProviderRaw,
  "AnalysisMode::Interview",
  "llm_provider.rs must implement interview analysis branch.",
);
assertIncludes(
  interviewCardRaw,
  "You generate InterviewCardSchemaV1 JSON only.",
  "interview_card_v1.rs must enforce InterviewCardSchemaV1-only output prompt.",
);
assertIncludes(
  interviewCardRaw,
  "pub struct InterviewCardDto",
  "interview_card_v1.rs must define InterviewCardDto contract.",
);
assertIncludes(
  promptRegistryRaw,
  "pub const DEFAULT_ANSWER_PROFILE_ID",
  "prompt_registry.rs must define DEFAULT_ANSWER_PROFILE_ID.",
);
assertIncludes(
  promptRegistryRaw,
  "unwrap_or_else(|| default_answer_profile())",
  "Unknown profile must safely fallback to interview_default.",
);
assertIncludes(
  llmRaw,
  "Active answer profile:",
  "Prompt suffix must include active profile id.",
);
assertIncludes(
  llmRaw,
  "Structure preference:",
  "Prompt suffix must include structure preference behavior.",
);
assertIncludes(
  llmRaw,
  "Clarifier policy:",
  "Prompt suffix must include clarifier policy behavior.",
);
assertIncludes(
  llmRaw,
  "Do not fabricate facts",
  "Prompt suffix must include anti-hallucination wording.",
);
assertIncludes(
  promptRegistryRaw,
  "INTERVIEW_SCHEMA_VERSION: &str = \"InterviewCardSchemaV1\"",
  "InterviewCardSchemaV1 must stay explicit in prompt registry.",
);

const backendProfileIds = [...promptRegistryRaw.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
const frontendProfileIds = [...answerProfilesRaw.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
const frontendDefault = answerProfilesRaw.match(/DEFAULT_ANSWER_PROFILE:\s*AnswerProfileId\s*=\s*"([^"]+)"/)?.[1];
const backendDefault = promptRegistryRaw.match(/DEFAULT_ANSWER_PROFILE_ID:\s*&str\s*=\s*"([^"]+)"/)?.[1];
if (!frontendDefault || !backendDefault) {
  fail("Cannot parse frontend/backend default profile ids.");
}
for (const id of frontendProfileIds) {
  if (!backendProfileIds.includes(id)) {
    fail(`Frontend profile id "${id}" is missing in backend prompt registry.`);
  }
}
if (frontendDefault !== backendDefault) {
  fail(`Default profile mismatch: frontend=${frontendDefault}, backend=${backendDefault}`);
}

for (const fixture of fixtures) {
  const legacy = deterministicCardFromSnippet(fixture.snippet);
  const legacyError = validateCard(legacy, fixture.snippet);
  if (legacyError) {
    fail(`Fixture "${fixture.id}" legacy contract violation: ${legacyError}`);
  }

  const v3 = deterministicCardV3FromSnippet(fixture.snippet);
  const v3Error = validateCardV3(v3, fixture.snippet);
  if (v3Error) {
    fail(`Fixture "${fixture.id}" v3 contract violation: ${v3Error}`);
  }

  const mapped = mapV3ToLegacy(v3);
  const mappedError = validateCard(mapped, fixture.snippet);
  if (mappedError) {
    fail(`Fixture "${fixture.id}" v3->legacy mapping violation: ${mappedError}`);
  }
}

const negativeCases = [
  {
    name: "wrong-shape",
    snippet: fixtures[0].snippet,
    card: { gist: "a", say_now: "b", next_move: "c", transcript: "extra" },
  },
  {
    name: "therapy-wording",
    snippet: fixtures[0].snippet,
    card: { gist: "a", say_now: "Обратитесь к терапевту.", next_move: "c" },
  },
  {
    name: "emotion-magic",
    snippet: fixtures[0].snippet,
    card: { gist: "a", say_now: "Считайте эмоции собеседника.", next_move: "c" },
  },
  {
    name: "stealth-drift",
    snippet: fixtures[0].snippet,
    card: { gist: "a", say_now: "Этот режим stealth и undetectable.", next_move: "c" },
  },
  {
    name: "v3-missing-star",
    snippet: fixtures[0].snippet,
    card: {
      question_brief: "q",
      answer_now: "Давайте зафиксируем шаг и срок сегодня до 17:00. Отправлю итог в чат.",
      next_step: "Письмо с владельцем и дедлайном.",
    },
  },
  {
    name: "v3-short-answer",
    snippet: fixtures[0].snippet,
    card: {
      question_brief: "q",
      answer_now: "Ок.",
      star_evidence: "s",
      next_step: "Письмо с владельцем и дедлайном.",
    },
  },
];

for (const sample of negativeCases) {
  const error = sample.card.question_brief
    ? validateCardV3(sample.card, sample.snippet)
    : validateCard(sample.card, sample.snippet);
  if (!error) {
    fail(`Negative case "${sample.name}" unexpectedly passed.`);
  }
}

console.log(
  `Prompt contract OK: ${fixtures.length} fixtures validated (legacy + v3 + mapping).`,
);
