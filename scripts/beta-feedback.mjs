#!/usr/bin/env node

/**
 * beta-feedback — генерирует redacted issue body для GitHub.
 *
 * Без телеметрии. Без сетевых запросов. Ключи и транскрипты — никогда.
 *
 * Использование:
 *   node scripts/beta-feedback.mjs                    # stdout
 *   node scripts/beta-feedback.mjs --clipboard        # копирует в буфер обмена
 *   node scripts/beta-feedback.mjs --json              # JSON на stdout
 *   node scripts/beta-feedback.mjs --mode cli          # CLI mode (default)
 *   node scripts/beta-feedback.mjs --mode ui-payload   # режим для IPC (ожидает JSON на stdin)
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");
const rootDir = join(__dirname, "..");

// ── Secret & path patterns for redaction ──
const SECRET_PATTERNS = [
  /\bsk-[a-z0-9_-]{12,}\b/gi,
  /\bdg_[a-z0-9_-]{12,}\b/gi,
  /\bBearer\s+\S+/gi,
  /\bOPENAI_API_KEY\b/gi,
  /\bDEEPGRAM_API_KEY\b/gi,
  /\bOPENROUTER_API_KEY\b/gi,
  /\bLLM_API_KEY\b/gi,
];

const ABSOLUTE_PATH_RE = /[A-Z]:\\[^\s,;"'<>|*?]*/gi;
const USER_HOME = homedir().toLowerCase();

// ── Helpers ──

function safeExec(command, options = {}) {
  try {
    return execSync(command, {
      cwd: rootDir,
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
      ...options,
    }).trim();
  } catch {
    return null;
  }
}

function redactSecrets(text) {
  let out = String(text ?? "");
  for (const pat of SECRET_PATTERNS) {
    out = out.replace(pat, "[REDACTED]");
  }
  out = out.replace(ABSOLUTE_PATH_RE, (match) => {
    if (match.toLowerCase().startsWith(USER_HOME))
      return "%USERPROFILE%" + match.slice(USER_HOME.length);
    return "[PATH_REDACTED]";
  });
  return out;
}

function safeSlice(text, maxLen = 200) {
  return String(text ?? "").slice(0, maxLen);
}

function readJsonIfExists(path) {
  try {
    if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    /* corrupt — skip */
  }
  return null;
}

// ── Collectors ──

function collectAppInfo() {
  const pkg = readJsonIfExists(join(rootDir, "package.json"));
  const commit = safeExec("git rev-parse --short HEAD") ?? "unknown";
  const branch = safeExec("git rev-parse --abbrev-ref HEAD") ?? "unknown";
  const tag = safeExec("git describe --tags --exact-match 2>nul") ?? null;

  return {
    version: pkg?.version ?? "unknown",
    commit,
    branch,
    tag,
    node: safeSlice(process.version, 32),
    platform: safeSlice(process.platform, 32),
    osRelease: safeSlice(
      safeExec(
        "powershell -NoProfile -Command \"(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion').DisplayVersion\"",
      ) ?? "unknown",
      64,
    ),
  };
}

function collectSettingsSummary() {
  const settingsPath = join(process.env.APPDATA ?? "", "com.replyline.app", "settings.json");
  const settings = readJsonIfExists(settingsPath);
  if (!settings) return { configured: false };

  return {
    configured: true,
    schemaVersion: settings.schemaVersion ?? null,
    hotkey: safeSlice(settings.hotkey, 32),
    captureMaxSeconds: settings.captureMaxSeconds ?? null,
    modelPreset: safeSlice(settings.selectedModelPreset, 64),
    llmRouteKind: classifyRoute(settings.llmBaseUrl),
    activeProfile: safeSlice(settings.activeAnswerProfile, 64),
    bilingualEnabled: settings.bilingualInterviewEnabled === true,
    debugTraceMode: safeSlice(settings.debugTraceMode, 32),
  };
}

function classifyRoute(baseUrl) {
  if (!baseUrl) return "not_configured";
  const url = String(baseUrl).toLowerCase();
  if (url.includes("openrouter.ai")) return "openrouter";
  if (url.includes("api.openai.com")) return "openai";
  if (url.includes("api.groq.com")) return "groq";
  if (url.includes("localhost") || url.includes("127.0.0.1")) return "local";
  if (url.startsWith("https://")) return "remote_https";
  if (url.startsWith("http://")) return "local_http";
  return "custom";
}

function collectLastError() {
  // Check for recent error in runtime probe artifacts
  const preflightPath = join(rootDir, "reports", "runtime", "preflight-report.json");
  const preflight = readJsonIfExists(preflightPath);
  if (preflight?.readiness?.credentials) {
    const cred = preflight.readiness.credentials;
    if (!cred.deepgram?.envPresent && !cred.llm?.envPresent) {
      return {
        category: "setup",
        code: "RL_PROBE_KEY_MISSING",
        summary: "Provider keys not detected by preflight.",
      };
    }
  }
  return { category: "none", code: null, summary: "No recent error captured." };
}

function collectCardQuality() {
  const reportPath = join(
    rootDir,
    "reports",
    "runtime-quality",
    `runtime-answer-quality-${today()}.json`,
  );
  const report = readJsonIfExists(reportPath);
  if (!report) return null;
  return {
    totalScenarios: report.aggregate?.total ?? null,
    passCount: report.aggregate?.passCount ?? null,
    averageScore: report.aggregate?.averageScore ?? null,
    qualityPassed: report.pass ?? null,
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── Issue body builder ──

function buildIssueBody(userDescription) {
  const app = collectAppInfo();
  const settings = collectSettingsSummary();
  const lastError = collectLastError();
  const cardQuality = collectCardQuality();

  const lines = [];
  lines.push("## Beta Feedback (redacted)");
  lines.push("");
  lines.push("> Generated by `pnpm beta:feedback`. No secrets, transcripts, or provider bodies.");
  lines.push("");

  // Environment
  lines.push("### Environment");
  lines.push("");
  lines.push(`- **App version**: ${app.version} (commit \`${app.commit}\`)`);
  if (app.tag) lines.push(`- **Tag**: \`${app.tag}\``);
  lines.push(`- **OS**: ${app.osRelease} (${app.platform})`);
  lines.push(`- **Node**: ${app.node}`);
  lines.push("");

  // Settings summary
  lines.push("### Settings (redacted)");
  lines.push("");
  if (!settings.configured) {
    lines.push("- Settings not configured.");
  } else {
    lines.push(`- **Schema version**: ${settings.schemaVersion}`);
    lines.push(`- **Hotkey**: \`${settings.hotkey}\``);
    lines.push(`- **Capture max**: ${settings.captureMaxSeconds}s`);
    lines.push(`- **Model preset**: \`${settings.modelPreset}\``);
    lines.push(`- **LLM route**: ${settings.llmRouteKind}`);
    lines.push(`- **Profile**: \`${settings.activeProfile}\``);
    lines.push(`- **Bilingual**: ${settings.bilingualEnabled ? "enabled" : "disabled"}`);
    lines.push(`- **Trace mode**: \`${settings.debugTraceMode}\``);
  }
  lines.push("");

  // Last error
  if (lastError.code) {
    lines.push("### Last Error");
    lines.push("");
    lines.push(`- **Category**: ${lastError.category}`);
    lines.push(`- **Code**: ${lastError.code}`);
    lines.push(`- **Summary**: ${lastError.summary}`);
    lines.push("");
  }

  // Card quality (if available)
  if (cardQuality) {
    lines.push("### Card Quality (deterministic)");
    lines.push("");
    lines.push(`- **Scenarios**: ${cardQuality.totalScenarios}`);
    lines.push(`- **Passed**: ${cardQuality.passCount}`);
    lines.push(`- **Avg score**: ${cardQuality.averageScore}`);
    lines.push(`- **Quality gate**: ${cardQuality.qualityPassed ? "PASS" : "FAIL"}`);
    lines.push("");
  }

  // User description
  lines.push("### What happened?");
  lines.push("");
  if (userDescription) {
    lines.push(userDescription);
  } else {
    lines.push("<!-- Describe what you were doing and what you expected. -->");
  }
  lines.push("");

  // Reproduction steps placeholder
  lines.push("### Reproduction steps");
  lines.push("");
  lines.push("1. ");
  lines.push("2. ");
  lines.push("3. ");
  lines.push("");

  // Safety footer
  lines.push("### Safety");
  lines.push("");
  lines.push("- [ ] No API keys, bearer tokens, or credential values included.");
  lines.push(
    "- [ ] No raw transcripts, prompts, Candidate Pack values, or provider response bodies.",
  );
  lines.push("- [ ] Screenshots contain synthetic content only.");
  lines.push("");

  // Evidence attachment hint
  lines.push("### Evidence attached");
  lines.push("");
  lines.push(
    `Run \`pnpm beta:smoke-report\` and attach from \`artifacts/beta-smoke-report/\` if relevant.`,
  );
  lines.push("");
  lines.push("---");
  lines.push(`*Generated ${new Date().toISOString()} by beta-feedback*`);

  return lines.join("\n");
}

function buildJsonPayload(userDescription) {
  const app = collectAppInfo();
  const settings = collectSettingsSummary();
  const lastError = collectLastError();
  const cardQuality = collectCardQuality();

  return {
    schema: "beta-feedback/1.0.0",
    generatedAt: new Date().toISOString(),
    app,
    settings: redactSecrets(JSON.stringify(settings)),
    lastError,
    cardQuality,
    userDescription: safeSlice(userDescription, 2000),
    excludes: [
      "raw_transcript",
      "candidate_pack",
      "full_prompts",
      "provider_response_bodies",
      "api_keys",
      "bearer_tokens",
      "absolute_user_paths",
    ],
  };
}

function copyToClipboard(text) {
  try {
    execSync(
      `powershell -NoProfile -Command "$input = [System.Console]::In.ReadToEnd(); Set-Clipboard -Value $input"`,
      { input: text, encoding: "utf8", windowsHide: true },
    );
    return true;
  } catch {
    return false;
  }
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const useClipboard = args.includes("--clipboard");
  const useJson = args.includes("--json");
  const modeIdx = args.indexOf("--mode");
  const mode = modeIdx >= 0 ? args[modeIdx + 1] : "cli";

  // Gather user description from args or stdin
  const descIdx = args.indexOf("--description");
  let userDescription = descIdx >= 0 ? args[descIdx + 1] : null;

  if (mode === "ui-payload") {
    // Read JSON payload from stdin (UI mode)
    let stdinData = "";
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) {
      stdinData += chunk;
    }
    try {
      const uiPayload = JSON.parse(stdinData || "{}");
      userDescription = uiPayload.userDescription ?? userDescription;
    } catch {
      /* ignore parse errors */
    }
  }

  if (useJson) {
    const payload = buildJsonPayload(userDescription);
    console.log(JSON.stringify(payload, null, 2));
  } else {
    const body = buildIssueBody(userDescription);
    if (useClipboard) {
      const ok = await copyToClipboard(body);
      if (ok) {
        console.log("[beta-feedback] Issue body copied to clipboard.");
        console.log("[beta-feedback] Paste into a new GitHub issue at:");
        console.log(
          "  https://github.com/iurii-izman/replyline/issues/new?template=bug_report.yml",
        );
      } else {
        console.log(body);
        console.error("[beta-feedback] Clipboard copy failed. Body printed above.");
      }
    } else {
      console.log(body);
    }
  }
}

main().catch((err) => {
  console.error("[beta-feedback] Fatal:", err.message);
  process.exit(1);
});
