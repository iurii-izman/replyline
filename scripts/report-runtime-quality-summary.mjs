import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const runtimeQualityDir = join(rootDir, "reports", "runtime-quality");
const runtimeDir = join(rootDir, "reports", "runtime");
const fixturesDir = join(rootDir, "tests", "fixtures", "runtime-quality");

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function runNode(scriptRelativePath, envExtras = {}) {
  const result = spawnSync(process.execPath, [join(rootDir, scriptRelativePath)], {
    cwd: rootDir,
    encoding: "utf8",
    env: { ...process.env, ...envExtras },
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function latestRuntimeAnswerReport() {
  const path = join(runtimeQualityDir, `runtime-answer-quality-${todayStamp()}.json`);
  return readJsonIfExists(path);
}

function computeLatencyMetrics(summaryJson) {
  if (!summaryJson?.stages) return null;
  const stages = summaryJson.stages;
  const getStage = (name) => stages[name] ?? null;

  return {
    captureDurationMs: getStage("capture_stop")?.meanMs ?? null,
    sttLatencyMs: getStage("stt_request")?.p95Ms ?? null,
    llmLatencyMs: getStage("llm_request")?.p95Ms ?? null,
    cardAssemblyLatencyMs: getStage("card_normalization")?.p95Ms ?? null,
    totalHotkeyToCardLatencyMs: getStage("release_to_card")?.p95Ms ?? null,
    median: {
      capture: getStage("capture_stop")?.p50Ms ?? null,
      stt: getStage("stt_request")?.p50Ms ?? null,
      llm: getStage("llm_request")?.p50Ms ?? null,
      card: getStage("card_normalization")?.p50Ms ?? null,
      total: getStage("release_to_card")?.p50Ms ?? null,
    },
    failureReasons: Object.entries(stages)
      .filter(([, row]) => Number(row?.failCount ?? 0) > 0)
      .map(
        ([stage, row]) => `${stage}: failCount=${row.failCount}, failPercent=${row.failPercent}`,
      ),
  };
}

function renderMarkdown(summary) {
  const lines = [];
  lines.push("# Runtime Quality Summary");
  lines.push("");
  lines.push(`Generated at: ${summary.generatedAt}`);
  lines.push(`Overall pass: ${summary.pass}`);
  lines.push("");
  lines.push("## Inputs");
  lines.push(`- latency parser: ${summary.steps.latencyParser.ok ? "pass" : "fail"}`);
  lines.push(`- slo check: ${summary.steps.sloCheck.ok ? "pass" : "fail"}`);
  lines.push(`- answer quality: ${summary.steps.answerQuality.ok ? "pass" : "fail"}`);
  lines.push(`- interview quality: ${summary.steps.interviewQuality.ok ? "pass" : "fail"}`);
  lines.push(`- say-now scenarios: ${summary.steps.sayNowScenarios.ok ? "pass" : "fail"}`);
  lines.push("");
  lines.push("## Latency Metrics");
  if (summary.latencyMetrics) {
    lines.push(`- capture duration (mean): ${summary.latencyMetrics.captureDurationMs}`);
    lines.push(`- STT latency (p95): ${summary.latencyMetrics.sttLatencyMs}`);
    lines.push(`- LLM latency (p95): ${summary.latencyMetrics.llmLatencyMs}`);
    lines.push(`- card assembly latency (p95): ${summary.latencyMetrics.cardAssemblyLatencyMs}`);
    lines.push(
      `- total hotkey-to-card latency (p95): ${summary.latencyMetrics.totalHotkeyToCardLatencyMs}`,
    );
    for (const reason of summary.latencyMetrics.failureReasons) {
      lines.push(`- failure reason: ${reason}`);
    }
  } else {
    lines.push("- not available");
  }
  lines.push("");
  if (summary.answerQualityAggregate) {
    lines.push("## Answer Quality");
    lines.push(
      `- pass=${summary.answerQualityAggregate.passCount}/${summary.answerQualityAggregate.total}`,
    );
    lines.push(`- averageScore=${summary.answerQualityAggregate.averageScore}`);
  }
  return lines.join("\n");
}

function main() {
  ensureDir(runtimeQualityDir);
  ensureDir(runtimeDir);

  const sampleLog = join(fixturesDir, "pipeline-latency-sample.log");
  const latencyParser = runNode("scripts/parse-pipeline-latency.mjs", {
    REPLYLINE_LOG_PATH: sampleLog,
  });
  const sloCheck = runNode("scripts/check-slo-budget.mjs");
  const answerQuality = runNode("scripts/evaluate-runtime-answer-quality.mjs");
  const interviewQuality = runNode("scripts/test-interview-quality.mjs");
  const sayNowScenarios = runNode("scripts/check-say-now-scenarios.mjs");

  const latencySummary = readJsonIfExists(join(runtimeDir, "pipeline-latency-summary.json"));
  const answerQualityReport = latestRuntimeAnswerReport();

  const summary = {
    generatedAt: new Date().toISOString(),
    pass:
      latencyParser.ok &&
      sloCheck.ok &&
      answerQuality.ok &&
      interviewQuality.ok &&
      sayNowScenarios.ok,
    steps: {
      latencyParser,
      sloCheck,
      answerQuality,
      interviewQuality,
      sayNowScenarios,
    },
    latencyMetrics: computeLatencyMetrics(latencySummary),
    answerQualityAggregate: answerQualityReport?.aggregate ?? null,
  };

  const stamp = todayStamp();
  const jsonPath = join(runtimeQualityDir, `runtime-quality-summary-${stamp}.json`);
  const mdPath = join(runtimeQualityDir, `runtime-quality-summary-${stamp}.md`);

  writeFileSync(jsonPath, JSON.stringify(summary, null, 2), "utf8");
  writeFileSync(mdPath, `${renderMarkdown(summary)}\n`, "utf8");

  console.log(`runtime-quality-summary: JSON report -> ${jsonPath}`);
  console.log(`runtime-quality-summary: MD report -> ${mdPath}`);

  if (!summary.pass) process.exit(1);
}

main();
