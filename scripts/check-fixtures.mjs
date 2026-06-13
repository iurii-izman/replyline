import { readFile } from "node:fs/promises";
import { assertMinArraySize } from "./quality-fixture-shared.mjs";

const raw = await readFile(new URL("../fixtures/ru-work-snippets.json", import.meta.url), "utf8");
const fixtures = JSON.parse(raw);

assertMinArraySize(fixtures, 20, "Expected at least 20 Russian work-conversation fixtures.");

const seenIds = new Set();
const seenSnippets = new Set();

for (const [index, entry] of fixtures.entries()) {
  if (typeof entry.id !== "string" || typeof entry.snippet !== "string") {
    throw new Error(`Fixture ${index} is malformed.`);
  }
  const id = entry.id.trim();
  const snippet = entry.snippet.trim();
  if (!id) {
    throw new Error(`Fixture ${index} has an empty id.`);
  }
  if (seenIds.has(id)) {
    throw new Error(`Fixture id "${id}" is duplicated.`);
  }
  seenIds.add(id);

  if (!snippet) {
    throw new Error(`Fixture ${entry.id} has an empty snippet.`);
  }
  if (snippet.length < 20) {
    throw new Error(`Fixture ${entry.id} is too short; keep snippets realistic.`);
  }
  if (snippet.length > 320) {
    throw new Error(`Fixture ${entry.id} is too long; keep snippets compact.`);
  }
  const normalizedSnippet = snippet.toLowerCase().replace(/\s+/gu, " ");
  if (seenSnippets.has(normalizedSnippet)) {
    throw new Error(`Fixture ${entry.id} duplicates another snippet.`);
  }
  seenSnippets.add(normalizedSnippet);
}

console.log(`Fixture corpus OK: ${fixtures.length} snippets.`);
