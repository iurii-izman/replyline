import { readFile } from "node:fs/promises";

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

function normalize(text) {
  return text.toLowerCase().replace(/\s+/gu, " ").trim();
}

function validateCard(card, snippet) {
  if (typeof card !== "object" || card == null || Array.isArray(card)) {
    return "card must be an object";
  }

  const keys = Object.keys(card).sort();
  const expected = ["gist", "next_move", "say_now"];
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    return `keys must be exactly gist/say_now/next_move, got: ${keys.join(", ")}`;
  }

  for (const key of expected) {
    if (typeof card[key] !== "string" || !card[key].trim()) {
      return `${key} must be a non-empty string`;
    }
  }

  const sayNow = card.say_now.trim();
  if (sayNow.length > 220) {
    return "say_now must be <= 220 chars";
  }
  if (sayNow.split(/\s+/u).length > 32) {
    return "say_now should stay short and speakable (<= 32 words)";
  }

  const banned = [
    "терап",
    "психолог",
    "тревож",
    "эмоци",
    "тональ",
    "язык тела",
    "харизм",
    "коуч",
    "stealth",
    "undetectable",
    "anti-proctoring",
    "invisible overlay",
    "answers for you automatically",
    "автоматически отвеч",
    "автоответ",
  ];

  const full = normalize(`${card.gist} ${card.say_now} ${card.next_move}`);
  for (const token of banned) {
    if (full.includes(token)) {
      return `contains banned wording: ${token}`;
    }
  }

  const snippetNorm = normalize(snippet);
  const actionText = normalize(`${card.say_now} ${card.next_move}`);
  if (snippetNorm.length >= 60 && actionText.includes(snippetNorm.slice(0, 60))) {
    return "looks like transcript dump in say_now/next_move";
  }

  return null;
}

function deterministicCardFromSnippet(snippet) {
  const compact = snippet.replace(/\s+/gu, " ").trim();
  const gist = compact.length <= 100 ? compact : `${compact.slice(0, 97)}...`;
  return {
    gist,
    say_now: "Давайте зафиксируем решение и срок: сегодня подтверждаю следующий шаг письменно.",
    next_move: "Уточните владельца действия и время контрольной проверки.",
  };
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
  "llm.rs must require exact JSON contract gist/say_now/next_move."
);
assertIncludes(llmRaw, "struct RawCard", "llm.rs must define RawCard contract.");
assertIncludes(llmRaw, "gist: String", "RawCard must include gist.");
assertIncludes(llmRaw, "say_now: String", "RawCard must include say_now.");
assertIncludes(llmRaw, "next_move: String", "RawCard must include next_move.");
assertIncludes(llmRaw, "не давай терапевтические советы", "Prompt must ban therapy wording.");
assertIncludes(llmRaw, "не оценивай эмоции и тональность", "Prompt must ban emotion/tone magic.");
assertIncludes(
  llmRaw,
  "trim_line(&card.say_now, 220)",
  "say_now clamp to 220 chars must stay in place."
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
