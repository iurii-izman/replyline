import { readFile } from "node:fs/promises";

import { deterministicCardFromSnippet, validateCard } from "./prompt-contract-core.mjs";

const fixturePath = new URL("../fixtures/ru-work-snippets.json", import.meta.url);
const llmPath = new URL("../src-tauri/src/llm.rs", import.meta.url);

function fail(message) {
  throw new Error(message);
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    fail(message);
  }
}

const [fixtureRaw, llmRaw] = await Promise.all([
  readFile(fixturePath, "utf8"),
  readFile(llmPath, "utf8"),
]);

const fixtures = JSON.parse(fixtureRaw);
if (!Array.isArray(fixtures) || fixtures.length < 20) {
  fail("Fixture corpus is too small for prompt-contract checks (need >= 20).");
}

assertIncludes(
  llmRaw,
  '{"gist":"...","say_now":"...","next_move":"..."}',
  "llm.rs must require exact JSON contract gist/say_now/next_move.",
);
assertIncludes(llmRaw, "struct RawCard", "llm.rs must define RawCard contract.");
assertIncludes(llmRaw, "gist: String", "RawCard must include gist.");
assertIncludes(llmRaw, "say_now: String", "RawCard must include say_now.");
assertIncludes(llmRaw, "next_move: String", "RawCard must include next_move.");
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
  "max_tokens: 260",
  "LLM max_tokens should be increased to 260.",
);

for (const fixture of fixtures) {
  const card = deterministicCardFromSnippet(fixture.snippet);
  const error = validateCard(card, fixture.snippet);
  if (error) {
    fail(`Fixture "${fixture.id}" generated contract violation: ${error}`);
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
];

for (const sample of negativeCases) {
  const error = validateCard(sample.card, sample.snippet);
  if (!error) {
    fail(`Negative case "${sample.name}" unexpectedly passed.`);
  }
}

console.log(`Prompt contract OK: ${fixtures.length} fixtures validated (deterministic mode).`);
