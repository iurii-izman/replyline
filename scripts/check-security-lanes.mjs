import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const QS_ADVISORY = "GHSA-q8mj-m7cp-5q26";

// ============================================================================
// Privacy lane: check Rust source for dangerous logging patterns.
// Blocking for high-risk patterns unless explicitly allowlisted with an inline
// comment marker: `privacy-lane: allow`.
// ============================================================================

const DANGEROUS_LOG_PATTERNS = [
  {
    label: "logging raw api_key/secrets",
    patterns: [
      /append_event\s*\([^,]+,\s*(?!["`-])[^)]*api[_-]?key[^s)]/i,
      /append_event\s*\([^,]+,\s*(?!["`-])[^)]*secret[^s)]/i,
      /append_event\s*\([^,]+,\s*(?!["`-])[^)]*bearer[^)]*/i,
      /append_event\s*\([^,]+,\s*(?!["`-])[^)]*authorization[^)]*/i,
    ],
    excludeFiles: ["src-tauri/src/privacy.rs", "src-tauri/src/app_log.rs"],
  },
  {
    label: "logging full transcript content",
    patterns: [
      // Detects append_event("...", transcript) or append_event("...", &transcript)
      /append_event\s*\([^,]+,\s*&?transcript\b/i,
      /append_event\s*\([^,]+,\s*[^)]*segment\.(text|translated_text)\b/i,
      /log_diag\s*\([^,]+,[^,]+,[^,]+,\s*&?transcript\b/i,
    ],
    excludeFiles: ["src-tauri/src/privacy.rs"],
  },
  {
    label: "logging LLM prompt variable directly",
    patterns: [
      /append_event\s*\([^,]+,\s*&?prompt\b/i,
      /log_diag\s*\([^,]+,[^,]+,[^,]+,\s*&?prompt\b/i,
    ],
    excludeFiles: ["src-tauri/src/privacy.rs"],
  },
  {
    label: "response.text() result logged instead of discarded",
    patterns: [
      /append_event\s*\([^)]*response\.text\(\)/i,
      /log_diag\s*\([^)]*response\.text\(\)/i,
    ],
    excludeFiles: [],
  },
];

function walkRustFiles() {
  const basePath = resolve(repoRoot, "src-tauri", "src");
  const results = [];
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = resolve(dir, entry);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full);
      } else if (entry.endsWith(".rs")) {
        results.push(relative(repoRoot, full));
      }
    }
  }
  walk(basePath);
  return results.sort((a, b) => a.localeCompare(b));
}

function isExcludedByRule(rule, fileRel) {
  return rule.excludeFiles.some((ex) => fileRel.replaceAll("\\", "/").includes(ex));
}

function readRustLines(filePath) {
  try {
    return readFileSync(filePath, "utf8").split(/\r?\n/u);
  } catch {
    return null;
  }
}

function hasDangerousPattern(rule, codeOnly) {
  return rule.patterns.some((pattern) => pattern.test(codeOnly));
}

function scanRustFileAgainstRule(rule, fileRel) {
  if (isExcludedByRule(rule, fileRel)) return false;
  const filePath = resolve(repoRoot, fileRel);
  const lines = readRustLines(filePath);
  if (!lines) return false;
  let matched = false;
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const codeOnly = line.replace(/\/\/.*$/, "").trim();
    if (!codeOnly || line.includes("privacy-lane: allow")) continue;
    if (!hasDangerousPattern(rule, codeOnly)) continue;
    const relPath = relative(repoRoot, filePath);
    console.error(`[privacy-lane] ${rule.label}: ${relPath}:${lineIdx + 1}`);
    console.error(`  → ${line.trim()}`);
    matched = true;
  }
  return matched;
}

function checkDangerousLogPatterns() {
  const rustFiles = walkRustFiles();
  let failed = false;

  for (const rule of DANGEROUS_LOG_PATTERNS) {
    for (const fileRel of rustFiles) {
      if (scanRustFileAgainstRule(rule, fileRel)) {
        failed = true;
      }
    }
  }

  if (failed) {
    console.error(
      "\n[privacy-lane] Dangerous log patterns found. " +
        "Use privacy::safe_preview or privacy::redact_secrets before logging.\n" +
        "If this is a false positive (e.g. the line is already protected by redaction), " +
        "add the file to excludeFiles in check-security-lanes.mjs.",
    );
  }
  return !failed;
}

// ============================================================================
// CSP documentation check
// ============================================================================

function checkCspDecision() {
  const tauriConfPath = resolve(repoRoot, "src-tauri", "tauri.conf.json");
  const rawContent = readFileSync(tauriConfPath, "utf8");
  const conf = JSON.parse(rawContent);
  const csp = String(conf?.app?.security?.csp ?? "");
  const hasWideCsp = csp.includes("https://*");

  if (!hasWideCsp) {
    console.error(
      "[privacy-lane] CSP connect-src is missing 'https://*'. " +
        "This may break user-configured remote LLM endpoints. " +
        "If intentionally removed, update this check.",
    );
    return false;
  }

  const privacyDoc = readFileSync(resolve(repoRoot, "docs/privacy-and-trust.md"), "utf8");
  const providersDoc = readFileSync(resolve(repoRoot, "docs/third-party-providers.md"), "utf8");
  const settingsDoc = readFileSync(resolve(repoRoot, "docs/settings-reference.md"), "utf8");

  const requiredPrivacyMarkers = [
    "https://*",
    "connect-src",
    "https://* — обоснование",
    "Пользователь сам настраивает `llm_base_url`",
    "Tauri CSP статичен на этапе сборки",
  ];
  const missingPrivacyMarkers = requiredPrivacyMarkers.filter((marker) => !privacyDoc.includes(marker));
  if (missingPrivacyMarkers.length > 0) {
    console.error(
      `[privacy-lane] docs/privacy-and-trust.md is missing CSP rationale marker(s): ${missingPrivacyMarkers.join(", ")}`,
    );
    return false;
  }

  const requiredProviderMarkers = [
    "Local vs Cloud URL policy",
    "Для удалённых LLM endpoint ожидается `https://`",
    "`http://` поддерживается только для локального/local-network режима",
  ];
  const missingProviderMarkers = requiredProviderMarkers.filter(
    (marker) => !providersDoc.includes(marker),
  );
  if (missingProviderMarkers.length > 0) {
    console.error(
      `[privacy-lane] docs/third-party-providers.md is missing URL policy marker(s): ${missingProviderMarkers.join(", ")}`,
    );
    return false;
  }

  if (!settingsDoc.includes("`llmBaseUrl`") || !settingsDoc.includes("Local vs Cloud URL policy")) {
    console.error(
      "[privacy-lane] docs/settings-reference.md must mention `llmBaseUrl` and link to Local vs Cloud URL policy rationale.",
    );
    return false;
  }

  return true;
}

function checkQsAdvisoryFloor() {
  const pkgPath = resolve(repoRoot, "package.json");
  const lockPath = resolve(repoRoot, "pnpm-lock.yaml");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const optionalDeps = pkg.optionalDependencies ?? {};
  if (!Object.prototype.hasOwnProperty.call(optionalDeps, "@lhci/cli")) {
    return true;
  }

  const lock = readFileSync(lockPath, "utf8");
  const matches = [...lock.matchAll(/^\s{2}qs@(\d+)\.(\d+)\.(\d+):/gmu)];
  for (const match of matches) {
    const major = Number(match[1]);
    const minor = Number(match[2]);
    const patch = Number(match[3]);
    const vulnerable = major === 6 && minor >= 11 && (minor < 15 || (minor === 15 && patch <= 1));
    if (vulnerable) {
      console.error(
        `[security-lane] vulnerable qs version in pnpm-lock.yaml: ${major}.${minor}.${patch}`,
      );
      console.error(
        `[security-lane] ${QS_ADVISORY} requires qs >= 6.15.2; keep override/pin in place.`,
      );
      return false;
    }
  }

  return true;
}

// ============================================================================
// Main
// ============================================================================

// 1. Privacy lane (blocking)
console.log("\n[privacy-lane] checking for dangerous log patterns...");
const privacyOk = checkDangerousLogPatterns();
if (!privacyOk) {
  console.error("[privacy-lane] dangerous patterns found (blocking)\n");
  process.exit(1);
}

const cspOk = checkCspDecision();
if (!cspOk) {
  console.error("[privacy-lane] CSP issue found\n");
  process.exit(1);
}

if (!checkQsAdvisoryFloor()) {
  process.exit(1);
}

// 2. Standard security lanes
const checks = [
  ["pnpm", ["audit:npm"]],
  ["pnpm", ["rust:deps"]],
];

for (const [cmd, args] of checks) {
  const pretty = [cmd, ...args].join(" ");
  console.log(`\n[security-lane] ${pretty}`);
  const command = cmd === "pnpm" && process.env.npm_execpath ? process.execPath : cmd;
  const commandArgs =
    cmd === "pnpm" && process.env.npm_execpath ? [process.env.npm_execpath, ...args] : args;
  const run = spawnSync(command, commandArgs, {
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });
  if (run.error) {
    const isMissingTool =
      run.error.code === "ENOENT" || run.error.code === "ENOTDIR" || run.error.code === "EACCES";
    if (isMissingTool) {
      console.error(
        `[security-lane] environment failure while starting "${pretty}": ${run.error.message}`,
      );
      console.error(
        "[security-lane] this is not a code regression. Install the required toolchain and retry.",
      );
    } else {
      console.error(`[security-lane] failed to start "${pretty}": ${run.error.message}`);
    }
    process.exit(1);
  }
  if (run.status !== 0) {
    console.error(
      `[security-lane] "${pretty}" failed with exit code ${run.status ?? "unknown"} (blocking).`,
    );
    process.exit(run.status ?? 1);
  }
}

console.log("\n[security-lane] all checks passed");
