import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import os from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const outputDir = join(rootDir, "artifacts", "beta-smoke-report");
const outputMdPath = join(outputDir, "smoke-report.md");
const outputJsonPath = join(outputDir, "smoke-report.json");

const packageJsonPath = join(rootDir, "package.json");
const cargoTomlPath = join(rootDir, "src-tauri", "Cargo.toml");
const tauriConfPath = join(rootDir, "src-tauri", "tauri.conf.json");
const persistenceDiagnosticsArgs = [
  "run",
  "--quiet",
  "--manifest-path",
  cargoTomlPath,
  "--bin",
  "persistence_diagnostics",
];

const secretPatterns = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bdg_[A-Za-z0-9_-]{16,}\b/g,
  /\bBearer\s+[A-Za-z0-9._-]{16,}\b/gi,
  /\bAuthorization\s*:\s*(?:Bearer\s+)?[A-Za-z0-9._~+/=-]{16,}\b/gi,
  /\b(?:api[_-]?key|token|secret|password|OPENAI_API_KEY|DEEPGRAM_API_KEY|LANGFUSE_SECRET_KEY|POSTGRES_PASSWORD)\s*[:=]\s*"?[^\s"'&,;`]+/gi,
  /"(?:apiKey|authorization|token|password|secret|client_secret|api_secret|access_token|refresh_token)"\s*:\s*"[^"]+"/gi,
];

const pathPatterns = [
  /[A-Za-z]:\\Users\\[^\\/\r\n]+(?:\\[^\\/\r\n]+)*/g,
  /\\\\[^\\/\s]+\\Users\\[^\\/\s]+(?:\\[^\\/\s]+)*/g,
  /\/(?:Users|home)\/[^/\s]+(?:\/[^\s"']+)*/g,
  /~(?:[\\/][^\s"']+)*/g,
];

function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function commandName(name) {
  if (process.platform === "win32" && name === "pnpm") return "pnpm.cmd";
  return name;
}

function clampText(value, maxChars = 240) {
  const text = String(value ?? "");
  if (text.length <= maxChars) return text;
  if (maxChars <= 3) return text.slice(0, maxChars);
  return `${text.slice(0, maxChars - 3)}...`;
}

function looksSensitive(value) {
  const lower = value.toLowerCase();
  const markers = [
    "raw transcript",
    "transcript:",
    "raw_transcript",
    "raw prompt",
    "prompt:",
    "candidate pack",
    "resume:",
    "job description",
    "company values",
  ];
  return markers.some((marker) => lower.includes(marker)) && value.length > 120;
}

function redactPatterns(text) {
  let out = text;
  out = out.replace(/\bAuthorization\s*:\s*Bearer\s+[^\s"'&,;`]+/gi, "[REDACTED]");
  out = out.replace(/\bAuthorization\s*:\s*[^\s"'&,;`]+/gi, "[REDACTED]");
  for (const pattern of secretPatterns) {
    out = out.replace(pattern, "[REDACTED]");
  }
  for (const pattern of pathPatterns) {
    out = out.replace(pattern, "[REDACTED_PATH]");
  }
  return out;
}

export function sanitizeText(value, { maxChars = 240 } = {}) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (looksSensitive(raw) && raw.length > 120) return "[REDACTED]";
  const redacted = redactPatterns(raw).replace(/\r?\n/gu, " ").replace(/\s+/gu, " ").trim();
  return clampText(redacted, maxChars);
}

export function sanitizeDeep(value) {
  if (typeof value === "string") return sanitizeText(value, { maxChars: 320 });
  if (Array.isArray(value)) return value.map((entry) => sanitizeDeep(entry));
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = sanitizeDeep(entry);
  }
  return out;
}

function runCommand(command, args = []) {
  const startedAt = Date.now();
  const useNodeLauncher = command === "pnpm" && process.env.npm_execpath;
  const launchCommand = useNodeLauncher ? process.execPath : commandName(command);
  const launchArgs = useNodeLauncher ? [process.env.npm_execpath, ...args] : args;
  const result = spawnSync(launchCommand, launchArgs, {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  const stdout = String(result.stdout ?? "");
  const stderr = String(result.stderr ?? "");
  const output = `${stdout}\n${stderr}`.trim();
  const missingTool =
    result.error &&
    ["ENOENT", "ENOTDIR", "EACCES"].includes(String(result.error.code ?? "")) &&
    result.status == null;

  return {
    command,
    args,
    ok: !result.error && result.status === 0,
    status: missingTool ? "missing" : result.status === 0 ? "pass" : "fail",
    exitCode: result.status ?? (missingTool ? null : 1),
    missingTool,
    error: result.error ? String(result.error.message || result.error) : null,
    stdout,
    stderr,
    output,
    durationMs: Date.now() - startedAt,
    summary: summarizeOutput(output),
  };
}

function summarizeOutput(text, maxLines = 4, maxChars = 260) {
  const cleaned = sanitizeText(String(text ?? ""), { maxChars: 1000 });
  if (!cleaned.trim()) return "";
  const lines = cleaned.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  return clampText(lines.slice(-maxLines).join(" | "), maxChars);
}

function loadPackageInfo() {
  const packageJson = readJsonIfExists(packageJsonPath) ?? {};
  const tauriConf = readJsonIfExists(tauriConfPath) ?? {};
  const cargoToml = existsSync(cargoTomlPath) ? readFileSync(cargoTomlPath, "utf8") : "";
  const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1] ?? "unknown";

  return {
    packageVersion: sanitizeText(packageJson.version ?? "unknown", { maxChars: 48 }),
    cargoVersion: sanitizeText(cargoVersion, { maxChars: 48 }),
    tauriVersion: sanitizeText(tauriConf.version ?? "unknown", { maxChars: 48 }),
    scripts: packageJson.scripts ?? {},
  };
}

function gitInfo() {
  const commit = runCommand("git", ["rev-parse", "HEAD"]);
  const branch = runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  const dirty = runCommand("git", ["status", "--short"]);
  return {
    commitSha: sanitizeText(commit.stdout, { maxChars: 64 }) || "unknown",
    branch: sanitizeText(branch.stdout, { maxChars: 64 }) || "unknown",
    dirty: Boolean(dirty.stdout.trim()),
  };
}

function loadToolchain() {
  const pnpm = runCommand("pnpm", ["--version"]);
  const rustc = runCommand("rustc", ["--version"]);
  const cargo = runCommand("cargo", ["--version"]);
  const rustup = runCommand("rustup", ["show", "active-toolchain"]);
  return {
    node: sanitizeText(process.version, { maxChars: 32 }),
    pnpm: pnpm.ok ? sanitizeText(pnpm.stdout, { maxChars: 48 }) : null,
    rustc: rustc.ok ? sanitizeText(rustc.stdout, { maxChars: 48 }) : null,
    cargo: cargo.ok ? sanitizeText(cargo.stdout, { maxChars: 48 }) : null,
    rustup: rustup.ok ? sanitizeText(rustup.stdout.split(/\r?\n/u)[0] ?? "", { maxChars: 64 }) : null,
    raw: { pnpm, rustc, cargo, rustup },
  };
}

function loadPersistenceDiagnostics() {
  const run = runCommand("cargo", persistenceDiagnosticsArgs);
  const command = "cargo run --quiet --manifest-path src-tauri/Cargo.toml --bin persistence_diagnostics";
  if (!run.ok) {
    return { available: false, command, status: run.status, summary: run.summary, data: null };
  }
  try {
    return {
      available: true,
      command,
      status: "pass",
      summary: run.summary,
      data: JSON.parse(run.stdout),
    };
  } catch (error) {
    return {
      available: false,
      command,
      status: "fail",
      summary: run.summary,
      data: null,
      error: String(error?.message || error),
    };
  }
}

function loadBetaDoctor() {
  const scripts = loadPackageInfo().scripts;
  const command = "pnpm beta:doctor -- --json";
  if (!scripts["beta:doctor"]) {
    return { available: false, command, status: "missing", verdict: "unavailable", summary: "package script missing", data: null };
  }
  const run = runCommand("pnpm", ["beta:doctor", "--", "--json"]);
  if (!run.ok) {
    return { available: true, command, status: run.status, verdict: "blocked", summary: run.summary, data: null };
  }
  try {
    const jsonStart = run.stdout.indexOf("{");
    const payload = jsonStart >= 0 ? run.stdout.slice(jsonStart) : run.stdout;
    const parsed = JSON.parse(payload);
    return {
      available: true,
      command,
      status: "pass",
      verdict: parsed.verdict ?? "unknown",
      summary: run.summary,
      data: sanitizeDeep(parsed),
    };
  } catch (error) {
    return {
      available: true,
      command,
      status: "fail",
      verdict: "blocked",
      summary: run.summary,
      data: null,
      error: String(error?.message || error),
    };
  }
}

function scriptAvailabilityMatrix(scripts) {
  const names = ["beta:smoke-report", "beta:doctor", "smoke", "verify", "typecheck", "lint", "test:ui", "test:rust"];
  return names.map((name) => ({ name, available: Boolean(scripts[name]) }));
}

function classifyErrorCategory(text, code, reason) {
  const haystack = `${text ?? ""} ${code ?? ""} ${reason ?? ""}`.toLowerCase();
  if (haystack.includes("card_invalid") || haystack.includes("analysis")) return "card_validation";
  if (haystack.includes("stt_key_missing") || haystack.includes("missing_key")) return "setup_missing_secret";
  if (haystack.includes("settings_load_default") || haystack.includes("settings_quarantine")) return "setup_config";
  if (haystack.includes("capture")) return "capture";
  if (haystack.includes("stt")) return "stt";
  if (haystack.includes("llm") || haystack.includes("gateway") || haystack.includes("401") || haystack.includes("403")) return "llm";
  if (haystack.includes("retry")) return "retry";
  return "runtime_unknown";
}

function loadLastError(appLogPath) {
  if (!appLogPath || !existsSync(appLogPath)) {
    return { category: "unavailable", code: null, source: "app.log", summary: "app.log not found" };
  }

  const lines = readFileSync(appLogPath, "utf8").split(/\r?\n/u).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!/(\boutcome=fail\b|\bsettings_load_default\b|\bsettings_quarantine\b)/i.test(line)) continue;
    const code = line.match(/\bcode=([A-Z0-9_]+)/u)?.[1] ?? null;
    const reason = line.match(/\breason=([A-Za-z0-9_-]+)/u)?.[1] ?? null;
    return {
      category: classifyErrorCategory(line, code, reason),
      code,
      source: "app.log",
      summary: sanitizeText(line, { maxChars: 220 }),
    };
  }
  return { category: "none_found", code: null, source: "app.log", summary: "no failure entry found" };
}

function buildChecks({ betaDoctor, persistenceDiagnostics, toolchain }) {
  const runTypecheck = runCommand("pnpm", ["typecheck"]);
  const runLint = runCommand("pnpm", ["lint"]);
  const runCargoCheck = runCommand("cargo", ["check", "--manifest-path", cargoTomlPath]);
  const runCargoTest = runCommand("cargo", ["test", "--manifest-path", cargoTomlPath]);
  const runUi = runCommand("pnpm", ["test:ui"]);

  return [
    {
      name: "beta:doctor",
      command: betaDoctor.command,
      available: betaDoctor.available,
      status: betaDoctor.status,
      summary: sanitizeText(betaDoctor.summary || JSON.stringify(betaDoctor.data?.summary ?? {}), { maxChars: 200 }),
    },
    {
      name: "persistence_diagnostics",
      command: persistenceDiagnostics.command,
      available: persistenceDiagnostics.available,
      status: persistenceDiagnostics.status,
      summary: sanitizeText(
        persistenceDiagnostics.data
          ? JSON.stringify({
              settingsFileExists: persistenceDiagnostics.data.settingsFileExists,
              settingsParseOk: persistenceDiagnostics.data.settingsParseOk,
              settingsValidationOk: persistenceDiagnostics.data.settingsValidationOk,
              runtimePathReady: persistenceDiagnostics.data.runtimePathReady,
            })
          : persistenceDiagnostics.summary,
        { maxChars: 200 },
      ),
    },
    {
      name: "typecheck",
      command: "pnpm typecheck",
      available: Boolean(toolchain.raw.pnpm.ok),
      status: runTypecheck.status,
      summary: sanitizeText(runTypecheck.summary, { maxChars: 180 }),
    },
    {
      name: "lint",
      command: "pnpm lint",
      available: Boolean(toolchain.raw.pnpm.ok),
      status: runLint.status,
      summary: sanitizeText(runLint.summary, { maxChars: 180 }),
    },
    {
      name: "cargo check",
      command: "cargo check --manifest-path src-tauri/Cargo.toml",
      available: Boolean(toolchain.raw.cargo.ok),
      status: runCargoCheck.status,
      summary: sanitizeText(runCargoCheck.summary, { maxChars: 180 }),
    },
    {
      name: "cargo test",
      command: "cargo test --manifest-path src-tauri/Cargo.toml",
      available: Boolean(toolchain.raw.cargo.ok),
      status: runCargoTest.status,
      summary: sanitizeText(runCargoTest.summary, { maxChars: 180 }),
    },
    {
      name: "test:ui",
      command: "pnpm test:ui",
      available: Boolean(toolchain.raw.pnpm.ok),
      status: runUi.status,
      summary: sanitizeText(runUi.summary, { maxChars: 180 }),
    },
  ].map((entry) => ({
    ...entry,
    status: entry.status === "missing" ? "missing" : entry.status === "pass" ? "pass" : "fail",
  }));
}

function computeOverallStatus(checks, betaDoctor) {
  if (checks.some((check) => check.status === "fail" || check.status === "missing")) return "blocked";
  if (betaDoctor.verdict === "ready_with_warnings" || betaDoctor.verdict === "blocked") return "ready_with_warnings";
  return "ready";
}

function buildReport() {
  const packageInfo = loadPackageInfo();
  const git = gitInfo();
  const toolchain = loadToolchain();
  const persistenceDiagnostics = loadPersistenceDiagnostics();
  const betaDoctor = loadBetaDoctor();
  const scriptAvailabilityMatrixValue = scriptAvailabilityMatrix(packageInfo.scripts);
  const appLogPath =
    persistenceDiagnostics.data?.appLogPath ?? join(os.homedir(), "AppData", "Local", "com.replyline.app", "logs", "app.log");
  const lastError = loadLastError(appLogPath);
  const runtimeConfig = {
    deepgramKeyPresent: Boolean(persistenceDiagnostics.data?.deepgramKeyPresent ?? false),
    llmKeyPresent: Boolean(persistenceDiagnostics.data?.llmKeyPresent ?? false),
    llmRouteConfigured: Boolean(
      persistenceDiagnostics.data?.llmBaseUrlPresent && persistenceDiagnostics.data?.llmModelPresent,
    ),
    selectedModelPresetId: sanitizeText(persistenceDiagnostics.data?.selectedModelPreset ?? "unknown", { maxChars: 80 }),
    settingsFileExists: Boolean(persistenceDiagnostics.data?.settingsFileExists ?? false),
    settingsValidationOk: Boolean(persistenceDiagnostics.data?.settingsValidationOk ?? false),
    runtimePathReady: Boolean(persistenceDiagnostics.data?.runtimePathReady ?? false),
  };
  const checks = buildChecks({ betaDoctor, persistenceDiagnostics, toolchain });
  const status = computeOverallStatus(checks, betaDoctor);

  const report = {
    schema: "replyline.beta-smoke-report.v1",
    generatedAt: new Date().toISOString(),
    status,
    git,
    versions: {
      package: packageInfo.packageVersion,
      cargo: packageInfo.cargoVersion,
      tauri: packageInfo.tauriVersion,
    },
    toolchain: {
      node: toolchain.node,
      pnpm: toolchain.pnpm,
      rustc: toolchain.rustc,
      cargo: toolchain.cargo,
      rustup: toolchain.rustup,
    },
    scriptAvailabilityMatrix: scriptAvailabilityMatrixValue,
    runtimeConfig,
    betaDoctor,
    checks,
    lastError,
    references: [
      { label: "Engineering release guide", path: "docs/engineering/release.md" },
      { label: "Operations guide", path: "docs/engineering/operations.md" },
      { label: "Beta doctor", path: "docs/beta-doctor.md" },
      { label: "Troubleshooting", path: "docs/troubleshooting.md" },
      { label: "Privacy and trust", path: "docs/privacy-and-trust.md" },
    ],
  };

  return { report, markdown: renderMarkdown(report) };
}

export function renderMarkdown(report) {
  const lines = [];
  lines.push("# Replyline Sanitized Smoke Report");
  lines.push("");
  lines.push(`- schema: \`${report.schema}\``);
  lines.push(`- generatedAt: \`${report.generatedAt}\``);
  lines.push(`- status: \`${report.status}\``);
  lines.push(`- commit: \`${report.git.commitSha}\``);
  lines.push(`- branch: \`${report.git.branch}\``);
  lines.push(`- dirty: \`${report.git.dirty}\``);
  lines.push("");
  lines.push("## Versions");
  lines.push("| item | value |");
  lines.push("| --- | --- |");
  lines.push(`| package | ${report.versions.package} |`);
  lines.push(`| cargo | ${report.versions.cargo} |`);
  lines.push(`| tauri | ${report.versions.tauri} |`);
  lines.push(`| node | ${report.toolchain.node} |`);
  lines.push(`| pnpm | ${report.toolchain.pnpm ?? "missing"} |`);
  lines.push(`| rustc | ${report.toolchain.rustc ?? "missing"} |`);
  lines.push(`| cargo toolchain | ${report.toolchain.cargo ?? "missing"} |`);
  lines.push(`| rustup | ${report.toolchain.rustup ?? "missing"} |`);
  lines.push("");
  lines.push("## Runtime Readiness");
  lines.push(`- Deepgram key present: ${report.runtimeConfig.deepgramKeyPresent}`);
  lines.push(`- LLM key present: ${report.runtimeConfig.llmKeyPresent}`);
  lines.push(`- LLM route configured: ${report.runtimeConfig.llmRouteConfigured}`);
  lines.push(`- Selected model preset: ${report.runtimeConfig.selectedModelPresetId}`);
  lines.push(`- Settings file exists: ${report.runtimeConfig.settingsFileExists}`);
  lines.push(`- Settings validation ok: ${report.runtimeConfig.settingsValidationOk}`);
  lines.push(`- Runtime path ready: ${report.runtimeConfig.runtimePathReady}`);
  lines.push("");
  lines.push("## Check Summary");
  lines.push("| check | status | command | summary |");
  lines.push("| --- | --- | --- | --- |");
  for (const check of report.checks) {
    lines.push(
      `| ${check.name} | ${check.status} | ${check.command} | ${sanitizeText(check.summary ?? "", { maxChars: 120 }) || "-"} |`,
    );
  }
  lines.push("");
  lines.push("## Beta Doctor");
  lines.push(`- available: ${report.betaDoctor.available}`);
  lines.push(`- verdict: ${report.betaDoctor.verdict}`);
  if (report.betaDoctor.data?.summary) {
    lines.push(`- summary: ${JSON.stringify(report.betaDoctor.data.summary)}`);
  }
  lines.push("");
  lines.push("## Script Availability");
  lines.push("| script | available |");
  lines.push("| --- | --- |");
  for (const row of report.scriptAvailabilityMatrix) {
    lines.push(`| ${row.name} | ${row.available} |`);
  }
  lines.push("");
  lines.push("## Last Error Category");
  lines.push(`- category: ${report.lastError.category}`);
  if (report.lastError.code) {
    lines.push(`- code: ${report.lastError.code}`);
  }
  lines.push(`- source: ${report.lastError.source}`);
  lines.push(`- summary: ${report.lastError.summary}`);
  lines.push("");
  lines.push("## Attach To GitHub");
  lines.push("- Attach `smoke-report.md` and `smoke-report.json` from `artifacts/beta-smoke-report/`.");
  lines.push("- Keep the report as the source of truth and avoid retyping raw logs into the issue body.");
  lines.push("");
  lines.push("## Docs");
  for (const doc of report.references) {
    lines.push(`- [${doc.label}](${doc.path})`);
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("- This report is sanitized by default.");
  lines.push("- It excludes raw transcript, raw prompt, Candidate Pack values, API keys, Authorization headers, and full home paths.");
  return `${lines.join("\n")}\n`;
}

function writeReportFiles(report, markdown) {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(outputMdPath, markdown, "utf8");
}

export function collectAndBuildReport() {
  return buildReport();
}

function main() {
  const { report, markdown } = buildReport();
  writeReportFiles(report, markdown);
  console.log(`[beta-smoke-report] markdown: ${relative(rootDir, outputMdPath)}`);
  console.log(`[beta-smoke-report] json: ${relative(rootDir, outputJsonPath)}`);
  console.log(`[beta-smoke-report] status=${report.status} checks=${report.checks.length}`);
  if (report.status === "blocked") {
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}

export { buildReport, writeReportFiles };
