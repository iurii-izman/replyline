/**
 * Validates locale key contract:
 * - Every key in ui_ru is referenced in at least one frontend source file.
 * - No source file references a key that does not exist in ui_ru.
 * - TSX should not include hardcoded user-visible strings outside allowed technical labels.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

const root = process.cwd();
const localePath = join(root, "src", "app", "locale.ts");
const srcDir = join(root, "src");

function collectKeys(value, prefix = "") {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix].filter(Boolean);
  }
  return Object.entries(value).flatMap(([key, next]) =>
    collectKeys(next, prefix ? `${prefix}.${key}` : key),
  );
}

const localeSource = readFileSync(localePath, "utf8");

function extractUiRu(source) {
  const startMarker = "export const ui_ru = ";
  const startIdx = source.indexOf(startMarker);
  if (startIdx < 0) throw new Error("Cannot find ui_ru in locale.ts");
  const endMarker = "\nexport type UiStrings";
  const endIdx = source.indexOf(endMarker, startIdx);
  if (endIdx < 0) throw new Error("Cannot find ui_en marker in locale.ts");

  const rawBlock = source.slice(startIdx + startMarker.length, endIdx).trim();
  const objectLiteral = rawBlock.replace(/\bas const\s*;?\s*$/u, "").trim();
  return new Function(`"use strict"; return (${objectLiteral});`)();
}

let uiRu;
try {
  uiRu = extractUiRu(localeSource);
} catch (err) {
  console.error("Failed to parse ui_ru from locale.ts:", err.message);
  process.exit(1);
}

const uiRuKeys = collectKeys(uiRu).sort((a, b) => a.localeCompare(b));
if (uiRuKeys.length === 0) {
  console.error("No locale keys extracted — parser may be broken.");
  process.exit(1);
}

function collectFiles(dir, extPattern) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      files.push(...collectFiles(full, extPattern));
    } else if (entry.isFile() && extPattern.test(entry.name) && !/\.test\./.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const sourceFiles = collectFiles(srcDir, /\.(ts|tsx|jsx)$/);

const usagePatterns = [/st\(\)\.([\w.]+)/g, /strings\(\)\.([\w.]+)/g];
const sPattern = /s\.([\w.]+)/g;
const usedKeys = new Set();

for (const file of sourceFiles) {
  const content = readFileSync(file, "utf8");
  for (const pattern of usagePatterns) {
    for (const match of content.matchAll(pattern)) {
      usedKeys.add(match[1]);
    }
  }
  if (file.endsWith("controller_status.ts") || file.endsWith("selectors.ts")) {
    for (const match of content.matchAll(sPattern)) {
      const key = match[1];
      if (key.includes(".")) usedKeys.add(key);
    }
  }
}

const unusedKeys = uiRuKeys.filter((k) => !usedKeys.has(k));
const uiRuKeysSet = new Set(uiRuKeys);
const missingKeys = [...usedKeys].filter((k) => !uiRuKeysSet.has(k));

const realUnused = unusedKeys;

const hardcodedAllowlist = new Set([
  "API",
  "LLM",
  "STT",
  "JSON",
  "Markdown",
  "Deepgram",
  "OpenRouter",
  "Candidate Pack",
  "URL",
  "Ctrl+Alt+Space",
  "manual",
]);

const hardcodedAllowRegex = [
  /^\d+(?:[.,]\d+)?%?$/,
  /^[✓○→%]$/,
  /^[a-z0-9][a-z0-9._:-]*$/i,
  /^https?:\/\//i,
  /^[\u2713\u2717]$/,
];

function isAllowedHardcoded(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return true;
  if (hardcodedAllowlist.has(normalized)) return true;
  if (hardcodedAllowRegex.some((pattern) => pattern.test(normalized))) return true;
  if (!/[A-Za-zА-Яа-яЁё]/.test(normalized)) return true;

  const parts = normalized
    .split(/[\s,:;()[\]{}]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 0 && parts.every((part) => hardcodedAllowRegex.some((re) => re.test(part)))) {
    return true;
  }

  return false;
}

function extractHardcodedCandidates(content) {
  const hits = [];
  const jsxTextPattern = />\s*([A-Za-zА-Яа-яЁё][^<>{\n]*)\s*</g;
  const attrPattern = /\b(?:title|aria-label|placeholder)\s*=\s*(["'])([^"']+)\1/g;

  for (const match of content.matchAll(jsxTextPattern)) {
    const text = match[1].replace(/\s+/g, " ").trim();
    if (text) hits.push(text);
  }
  for (const match of content.matchAll(attrPattern)) {
    const text = match[2].replace(/\s+/g, " ").trim();
    if (text) hits.push(text);
  }

  return hits;
}

const tsxFiles = collectFiles(srcDir, /\.tsx$/);
const hardcodedViolations = [];

for (const file of tsxFiles) {
  const content = readFileSync(file, "utf8");
  const candidates = extractHardcodedCandidates(content);
  for (const candidate of candidates) {
    if (!isAllowedHardcoded(candidate)) {
      hardcodedViolations.push(`${relative(root, file)}: "${candidate}"`);
    }
  }
}

const failures = [];
if (realUnused.length > 0) {
  failures.push(`Unused locale keys (not referenced in any source file): ${realUnused.join(", ")}`);
}
if (missingKeys.length > 0) {
  failures.push(`Source files reference non-existent locale keys: ${missingKeys.join(", ")}`);
}
if (hardcodedViolations.length > 0) {
  failures.push(`Hardcoded user-visible TSX strings: ${hardcodedViolations.join(", ")}`);
}

if (failures.length > 0) {
  console.error("Locale key contract mismatch:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log(
  `Locale key contract OK. ${uiRuKeys.length} keys defined, ${usedKeys.size} keys referenced, hardcoded TSX violations: 0.`,
);
