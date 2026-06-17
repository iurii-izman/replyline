/**
 * Validates locale key contract:
 * - Every key in ui_ru is referenced in at least one frontend source file.
 * - No source file references a key that does not exist in ui_ru.
 * - TSX should not include hardcoded user-visible strings outside allowed technical labels.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

const root = process.cwd();
const localePath = join(root, "src", "app", "locale", "index.ts");
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

function resolveSpreadObject(source, baseDir) {
  // Find ALL imports from the source file (handles multi-import and single-import)
  const importRe = /import\s*\{\s*([^}]+)\s*\}\s*from\s*["'](.\/[^"']+)["']/g;
  const imports = new Map();
  for (const m of source.matchAll(importRe)) {
    const namesStr = m[1];
    const path = join(baseDir, m[2] + ".ts");
    const names = namesStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!imports.has(path)) imports.set(path, []);
    for (const name of names) imports.get(path).push(name);
  }

  // Recursively extract exports from imported files
  const resolvedExports = new Map();

  function resolveFile(filePath, wantedNames) {
    if (!existsSync(filePath)) return;
    const fileSource = readFileSync(filePath, "utf8");

    // First, resolve any imports in this file
    const fileImports = new Map();
    for (const m of fileSource.matchAll(importRe)) {
      const namesStr = m[1];
      const depPath = join(baseDir, m[2] + ".ts");
      const names = namesStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!fileImports.has(depPath)) fileImports.set(depPath, []);
      for (const name of names) fileImports.get(depPath).push(name);
    }

    // Build an eval context with already-resolved dependencies
    const evalContext = {};
    for (const [depPath, depNames] of fileImports) {
      for (const name of depNames) {
        if (resolvedExports.has(name)) {
          evalContext[name] = resolvedExports.get(name);
        } else {
          // Try to extract from the dependency
          const depSource = existsSync(depPath) ? readFileSync(depPath, "utf8") : "";
          const depObj = extractRawObject(depSource, `export const ${name} = `);
          if (depObj) {
            resolvedExports.set(name, depObj);
            evalContext[name] = depObj;
          }
        }
      }
    }

    // Extract each wanted name using eval with the context
    for (const name of wantedNames) {
      if (resolvedExports.has(name)) continue;
      const obj = extractRawObjectWithContext(fileSource, `export const ${name} = `, evalContext);
      if (obj) resolvedExports.set(name, obj);
    }
  }

  // Resolve all direct imports
  for (const [filePath, names] of imports) {
    resolveFile(filePath, names);
  }

  // Find ui_ru assembly
  const startMarker = "export const ui_ru = ";
  const startIdx = source.indexOf(startMarker);
  if (startIdx < 0) throw new Error("Cannot find ui_ru in locale/index.ts");

  const afterStart = source.slice(startIdx);

  // Collect spread objects
  const spreadRe = /\.\.\.(\w+)/g;
  const spreads = [];
  for (const m of afterStart.matchAll(spreadRe)) {
    const spreadObj = resolvedExports.get(m[1]);
    if (spreadObj) spreads.push(spreadObj);
  }

  // Find assignments
  const cardMatch = afterStart.match(/card:\s*(\w+)/);
  const settingsMatch = afterStart.match(/settings:\s*(\w+)/);
  const contextPackMatch = afterStart.match(/contextPack:\s*(\w+)/);

  const result = { ...(spreads[0] || {}) };
  if (cardMatch && resolvedExports.has(cardMatch[1])) {
    result.card = resolvedExports.get(cardMatch[1]);
  }
  if (settingsMatch && resolvedExports.has(settingsMatch[1])) {
    result.settings = resolvedExports.get(settingsMatch[1]);
  }
  if (contextPackMatch && resolvedExports.has(contextPackMatch[1])) {
    result.contextPack = resolvedExports.get(contextPackMatch[1]);
  }
  return result;
}

function extractRawObject(source, startMarker) {
  return extractRawObjectWithContext(source, startMarker, {});
}

function extractRawObjectWithContext(source, startMarker, context) {
  const startIdx = source.indexOf(startMarker);
  if (startIdx < 0) return null;
  let idx = startIdx + startMarker.length;
  let state = { depth: 0, inString: false, stringChar: "", escaped: false, objectClosed: false };

  for (; idx < source.length; idx++) {
    state = consumeUiChar(source[idx], state);
    if (state.objectClosed) {
      const raw = source.slice(startIdx + startMarker.length, idx + 1);
      const jsLike = raw
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/as const;?/g, "")
        .replace(/:\s*typeof\s+\w+/g, "")
        .trim();
      try {
        // Build function with context variables as parameters
        const contextKeys = Object.keys(context);
        const contextValues = Object.values(context);
        const fn = new Function(...contextKeys, "return (" + jsLike + ")");
        return fn(...contextValues);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function extractUiRu(source, baseDir) {
  return resolveSpreadObject(source, baseDir);
}

function consumeUiChar(ch, state) {
  if (state.escaped) return { ...state, escaped: false, objectClosed: false };
  if (state.inString) return consumeStringChar(ch, state);
  if (ch === '"' || ch === "'" || ch === "`") {
    return { ...state, inString: true, stringChar: ch, objectClosed: false };
  }
  if (ch === "{") return { ...state, depth: state.depth + 1, objectClosed: false };
  if (ch === "}") {
    const nextDepth = state.depth - 1;
    return { ...state, depth: nextDepth, objectClosed: nextDepth === 0 };
  }
  return { ...state, objectClosed: false };
}

function consumeStringChar(ch, state) {
  if (ch === "\\") return { ...state, escaped: true, objectClosed: false };
  if (ch === state.stringChar) return { ...state, inString: false, objectClosed: false };
  return { ...state, objectClosed: false };
}

let uiRu;
try {
  uiRu = extractUiRu(localeSource, join(root, "src", "app", "locale"));
} catch (err) {
  console.error("Failed to parse ui_ru from locale/index.ts:", err.message);
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
  "ContextPack",
  "URL",
  "Ctrl+Alt+Space",
  "manual",
  "add metrics",
  "add conflict example",
  "add leadership example",
  "add failure example",
  "add system design/product examples, if relevant",
  "input, textarea, select, [contenteditable='true'], [contenteditable='']",
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
    .replaceAll("(", " ")
    .replaceAll(")", " ")
    .replaceAll("[", " ")
    .replaceAll("]", " ")
    .replaceAll("{", " ")
    .replaceAll("}", " ")
    .replaceAll(",", " ")
    .replaceAll(":", " ")
    .replaceAll(";", " ")
    .split(" ")
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

function extractStringLiteralCandidates(content) {
  const hits = [];
  const literalPattern = /(["'`])([^\n\r\\]{1,180}?)\1/g;
  for (const match of content.matchAll(literalPattern)) {
    const text = match[2].replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (text.includes("${")) continue;
    if (/[=<>]/.test(text)) continue;
    const looksUserFacing =
      /[А-Яа-яЁё]/.test(text) || (/[A-Za-z]/.test(text) && /\s/.test(text) && text.length >= 8);
    if (!looksUserFacing) continue;
    hits.push(text);
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

const controllerDir = join(srcDir, "app", "controller");
const controllerTsFiles = collectFiles(controllerDir, /\.ts$/);

for (const file of controllerTsFiles) {
  const content = readFileSync(file, "utf8");
  const candidates = extractStringLiteralCandidates(content);
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
  failures.push(
    `Hardcoded user-visible strings (TSX/controller): ${hardcodedViolations.join(", ")}`,
  );
}

if (failures.length > 0) {
  console.error("Locale key contract mismatch:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log(
  `Locale key contract OK. ${uiRuKeys.length} keys defined, ${usedKeys.size} keys referenced, hardcoded TSX/controller violations: 0.`,
);
