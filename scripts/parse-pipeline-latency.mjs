#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const cwd = process.cwd();
const logPath =
  process.env.REPLYLINE_LOG_PATH ??
  join(
    process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"),
    "com.replyline.app",
    "logs",
    "app.log",
  );

const outDir = join(cwd, "reports", "runtime");
const outPath = join(outDir, "pipeline-latency-summary.json");

if (!existsSync(logPath)) {
  console.error(`parse-pipeline-latency: log file not found: ${logPath}`);
  process.exit(1);
}

const raw = readFileSync(logPath, "utf8");
const lines = raw.split(/\r?\n/);

/** @typedef {{ stage: string, durationMs: number, outcome: string, code: string }} TimingRecord */
/** @type {TimingRecord[]} */
const records = [];

const timingRe =
  /\[pipeline_timing\]\s+stage=(\S+)\s+duration_ms=(\d+)\s+outcome=(\S+)\s+code=(\S+)/;

for (const line of lines) {
  const m = line.match(timingRe);
  if (!m) continue;
  const [, stage, durationStr, outcome, code] = m;
  const durationMs = Number.parseInt(durationStr, 10);
  if (!Number.isFinite(durationMs)) continue;
  records.push({ stage, durationMs, outcome, code });
}

if (records.length === 0) {
  const emptySummary = {
    generatedAt: new Date().toISOString(),
    sourceLogPath: logPath,
    totalTimingRecords: 0,
    note: "No pipeline_timing events found.",
    stages: {},
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(emptySummary, null, 2), "utf8");
  console.log(`parse-pipeline-latency: empty summary written to ${outPath}`);
  process.exit(0);
}

/** @type {Record<string, { durations: number[], failCount: number }>} */
const stageAgg = {};
for (const rec of records) {
  if (!stageAgg[rec.stage]) {
    stageAgg[rec.stage] = { durations: [], failCount: 0 };
  }
  stageAgg[rec.stage].durations.push(rec.durationMs);
  if (rec.outcome === "fail") {
    stageAgg[rec.stage].failCount += 1;
  }
}

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

/** @type {Record<string, { p50Ms: number|null, p95Ms: number|null, minMs: number, maxMs: number, meanMs: number, count: number, failCount: number, failPercent: number }>} */
const stages = {};
for (const [stage, agg] of Object.entries(stageAgg)) {
  const { durations, failCount } = agg;
  const sorted = [...durations].sort((a, b) => a - b);
  const count = durations.length;
  const meanMs =
    count > 0 ? Math.round((durations.reduce((a, b) => a + b, 0) / count) * 10) / 10 : 0;
  stages[stage] = {
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    minMs: sorted[0] ?? 0,
    maxMs: sorted.at(-1) ?? 0,
    meanMs,
    count,
    failCount,
    failPercent: count > 0 ? Math.round((failCount / count) * 1000) / 10 : 0,
  };
}

const summary = {
  generatedAt: new Date().toISOString(),
  sourceLogPath: logPath,
  totalTimingRecords: records.length,
  stages,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf8");
console.log(`Pipeline latency summary written to: ${outPath}`);
