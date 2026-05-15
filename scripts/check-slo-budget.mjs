import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const cwd = process.cwd();
const sloPath = join(cwd, "docs", "core-pipeline-slo.json");
const summaryPath = join(cwd, "reports", "runtime", "soak-summary.json");

if (!existsSync(sloPath)) {
  console.error("slo-check: missing docs/core-pipeline-slo.json");
  process.exit(1);
}
if (!existsSync(summaryPath)) {
  console.error("slo-check: missing reports/runtime/soak-summary.json (run pnpm probe:soak first)");
  process.exit(1);
}

const slo = JSON.parse(readFileSync(sloPath, "utf8"));
const summary = JSON.parse(readFileSync(summaryPath, "utf8"));

const runs = (summary.runs ?? []).filter((r) => r && typeof r === "object");
const successRuns = runs.filter((r) => r.success && typeof r.releaseToCardMs === "number");

const releaseToCardSorted = successRuns
  .map((r) => Number(r.releaseToCardMs))
  .filter((n) => Number.isFinite(n))
  .sort((a, b) => a - b);

function percentile(values, p) {
  if (values.length === 0) return null;
  const idx = Math.min(values.length - 1, Math.ceil((p / 100) * values.length) - 1);
  return values[idx];
}

const p95 = percentile(releaseToCardSorted, 95);
const failPercent = runs.length > 0 ? ((runs.length - successRuns.length) / runs.length) * 100 : 100;
const retryPercent =
  runs.length > 0
    ? (runs.reduce((sum, r) => sum + Number(r.retryUsed ?? 0), 0) / runs.length) * 100
    : 0;

const thresholds = slo.corePipeline;
const checks = [
  { key: "releaseToCardP95Ms", actual: p95, limit: thresholds.releaseToCardP95Ms, isMax: true },
  { key: "pipelineFailPercentMax", actual: failPercent, limit: thresholds.pipelineFailPercentMax, isMax: true },
  { key: "retryPercentMax", actual: retryPercent, limit: thresholds.retryPercentMax, isMax: true },
];

const blockerKeys = new Set(slo.classification?.blocker ?? []);
const violations = [];
for (const c of checks) {
  if (c.actual == null) {
    violations.push({ metric: c.key, actual: null, threshold: c.limit, blocker: blockerKeys.has(c.key), pass: false });
    continue;
  }
  const pass = c.isMax ? c.actual <= c.limit : c.actual >= c.limit;
  violations.push({ metric: c.key, actual: Number(c.actual.toFixed(2)), threshold: c.limit, blocker: blockerKeys.has(c.key), pass });
}

console.log("SLO check results:");
for (const row of violations) {
  console.log(`- ${row.metric}: actual=${row.actual} threshold=${row.threshold} blocker=${row.blocker} pass=${row.pass}`);
}

const failedBlockers = violations.filter((v) => !v.pass && v.blocker);
if (failedBlockers.length > 0) {
  process.exit(2);
}

const failedNonBlockers = violations.filter((v) => !v.pass && !v.blocker);
if (failedNonBlockers.length > 0) {
  console.log("Non-blocker SLO violations detected.");
}
