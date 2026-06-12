import assert from "node:assert/strict";
import { renderMarkdown, sanitizeDeep, sanitizeText } from "./beta-smoke-report.mjs";

const secretPayload = {
  deepgram: "dg_fake_secret_1234567890",
  authorization: "Authorization: Bearer sk-fake-secret-token",
  windowsPath: "C:\\Users\\tester\\AppData\\Local\\com.replyline.app\\logs\\app.log",
  transcript: "transcript: " + "candidate answered ".repeat(20),
};

assert.equal(sanitizeText(secretPayload.deepgram).includes("dg_fake_secret_1234567890"), false);
assert.equal(sanitizeText(secretPayload.authorization).includes("sk-fake-secret-token"), false);
assert.equal(sanitizeText(secretPayload.windowsPath).includes("tester"), false);
assert.equal(sanitizeText(secretPayload.transcript), "[REDACTED]");

const sanitized = sanitizeDeep(secretPayload);
const sanitizedJson = JSON.stringify(sanitized);
assert.equal(sanitizedJson.includes("dg_fake_secret_1234567890"), false);
assert.equal(sanitizedJson.includes("sk-fake-secret-token"), false);

const report = {
  schema: "replyline.beta-smoke-report.v1",
  generatedAt: "2026-06-12T00:00:00.000Z",
  status: "ready",
  git: { commitSha: "abc123", branch: "main", dirty: false },
  versions: { package: "0.2.0-beta.1", cargo: "0.2.0-beta.1", tauri: "0.2.0-1" },
  toolchain: {
    node: "v22.0.0",
    pnpm: "9.15.9",
    rustc: "rustc 1.89.0",
    cargo: "cargo 1.89.0",
    rustup: "stable-x86_64-pc-windows-msvc",
  },
  scriptAvailabilityMatrix: [{ name: "beta:smoke-report", available: true }],
  runtimeConfig: {
    deepgramKeyPresent: true,
    llmKeyPresent: false,
    llmRouteConfigured: true,
    selectedModelPresetId: "custom_openai_compatible",
    settingsFileExists: true,
    settingsValidationOk: true,
    runtimePathReady: true,
  },
  betaDoctor: {
    available: true,
    verdict: "ready",
    data: { summary: { pass: 8, warn: 0, fail: 0 } },
  },
  checks: [
    {
      name: "typecheck",
      status: "pass",
      command: "pnpm typecheck",
      summary: "ok sk-fake-secret-token",
      available: true,
    },
  ],
  lastError: {
    category: "llm",
    code: "RL_LLM_FAILED",
    source: "app.log",
    summary: "Authorization: Bearer sk-fake-secret-token",
  },
  references: [{ label: "Beta readiness", path: "docs/beta-readiness.md" }],
};

const safeReport = sanitizeDeep(report);
const reportJson = JSON.stringify(safeReport);
assert.equal(reportJson.includes("sk-fake-secret-token"), false);
assert.equal(reportJson.includes("Authorization: Bearer"), false);

const markdown = renderMarkdown(safeReport);
assert.equal(markdown.includes("sk-fake-secret-token"), false);
assert.equal(markdown.includes("Authorization: Bearer"), false);

const parsed = JSON.parse(reportJson);
assert.equal(parsed.schema, "replyline.beta-smoke-report.v1");
assert.equal(parsed.betaDoctor.verdict, "ready");
assert.equal(Array.isArray(parsed.checks), true);

console.log("beta-smoke-report sanitization and serialization are safe.");
