/**
 * Validates locale key contract:
 * - Every key in ui_ru is referenced in at least one frontend source file.
 * - No source file references a key that does not exist in ui_ru.
 *
 * This catches drift between locale.ts and the UI components / controller.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();
const localePath = join(root, "src", "app", "locale.ts");
const srcDir = join(root, "src");

// ---- 1. Collect all leaf keys from ui_ru in locale.ts ----

function collectKeys(value, prefix = "") {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix].filter(Boolean);
  }
  return Object.entries(value).flatMap(([key, next]) =>
    collectKeys(next, prefix ? `${prefix}.${key}` : key),
  );
}

const localeSource = readFileSync(localePath, "utf8");

// Extract the ui_ru object literal and convert it to valid JSON for parsing.
function extractUiRu(source) {
  // Find the start of ui_ru
  const startMarker = "export const ui_ru = ";
  const startIdx = source.indexOf(startMarker);
  if (startIdx < 0) throw new Error("Cannot find ui_ru in locale.ts");

  // Find the matching closing brace + "as const;"
  let idx = startIdx + startMarker.length;
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let escaped = false;

  for (; idx < source.length; idx++) {
    const ch = source[idx];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === stringChar) {
        inString = false;
        continue;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === "{") {
      depth++;
      continue;
    }
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        // Found the closing brace — extract the JSON-like portion
        const raw = source.slice(startIdx + startMarker.length, idx + 1);

        // Convert TS object literal to JSON:
        // 1. Remove // comments
        // 2. Remove trailing commas before } or ]
        // 3. Quote bare identifier keys (e.g. appName -> "appName")
        const jsonLike = raw
          .replace(/\/\/.*$/gm, "") // single-line comments
          .replace(/\/\*[\s\S]*?\*\//g, "") // multi-line comments
          .replace(/,(\s*[}\]])/g, "$1") // trailing commas
          .replace(/(^|\n|{|,)\s*([a-zA-Z_$][\w$]*)\s*:/g, '$1"$2":') // quote bare keys
          .trim();

        return JSON.parse(jsonLike);
      }
    }
  }
  throw new Error("Could not find closing brace for ui_ru");
}

let uiRu;
try {
  uiRu = extractUiRu(localeSource);
} catch (err) {
  console.error("Failed to parse ui_ru from locale.ts:", err.message);
  process.exit(1);
}

const uiRuKeys = collectKeys(uiRu).sort();

if (uiRuKeys.length === 0) {
  console.error("No locale keys extracted — parser may be broken.");
  process.exit(1);
}

// ---- 2. Find all locale key references in source files ----

function collectTsFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      files.push(...collectTsFiles(full));
    } else if (entry.isFile() && /\.(ts|tsx|jsx)$/.test(entry.name)) {
      // Skip test files — they may reference keys for assertions.
      if (/\.test\./.test(entry.name)) continue;
      files.push(full);
    }
  }
  return files;
}

const sourceFiles = collectTsFiles(srcDir);

// Pattern: st().KEY, st().a.b.c, strings().KEY, strings().a.b.c
const usagePatterns = [/st\(\)\.([\w.]+)/g, /strings\(\)\.([\w.]+)/g];
// s is a UiStrings parameter in controller_status.ts and selectors.ts:
// s.phase.booting, s.setup.sttReady, etc.
// We only capture multi-level keys (containing a dot) to avoid false positives
// on method calls like s.push, s.length, etc.
const sPattern = /s\.([\w.]+)/g;

const usedKeys = new Set();

for (const file of sourceFiles) {
  const content = readFileSync(file, "utf8");
  for (const pattern of usagePatterns) {
    for (const match of content.matchAll(pattern)) {
      usedKeys.add(match[1]);
    }
  }
  // controller_status.ts and selectors.ts use s.setup.* / s.phase.* pattern
  if (file.endsWith("controller_status.ts") || file.endsWith("selectors.ts")) {
    for (const match of content.matchAll(sPattern)) {
      const key = match[1];
      // Only multi-level keys (e.g. phase.booting, setup.sttReady), skip single-level method calls
      if (key.includes(".")) {
        usedKeys.add(key);
      }
    }
  }
}

// ---- 3. Report ----

const unusedKeys = uiRuKeys.filter((k) => !usedKeys.has(k));
const missingKeys = [...usedKeys].filter((k) => !uiRuKeys.includes(k));

// Known allowed unused keys — keys that exist for API completeness but are
// intentionally not referenced in Slim Stable Beta UI.
const allowedUnused = [];

const realUnused = unusedKeys.filter((k) => !allowedUnused.includes(k));

const failures = [];

if (realUnused.length > 0) {
  failures.push(`Unused locale keys (not referenced in any source file): ${realUnused.join(", ")}`);
}

if (missingKeys.length > 0) {
  failures.push(`Source files reference non-existent locale keys: ${missingKeys.join(", ")}`);
}

if (failures.length > 0) {
  console.error("Locale key contract mismatch:");
  for (const f of failures) {
    console.error(`- ${f}`);
  }
  process.exit(1);
}

console.log(
  `Locale key contract OK. ${uiRuKeys.length} keys defined, ${usedKeys.size} keys referenced in sources, 0 unused, 0 missing.`,
);
