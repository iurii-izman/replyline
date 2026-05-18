import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const cwd = process.cwd();
const sloPath = join(cwd, "docs", "core-pipeline-slo.json");
const summaryPath = join(cwd, "reports", "runtime", "soak-summary.json");
const latencySummaryPath = join(cwd, "reports", "runtime", "pipeline-latency-summary.json");

if (!existsSync(sloPath)) {
  console.error("slo-check: missing docs/core-pipeline-slo.json");
  process.exit(1);
}

const slo = JSON.parse(readFileSync(sloPath, "utf8"));
const thresholds = slo.corePipeline;
const blockerKeys = new Set(slo.classification?.blocker ?? []);
const violations = [];

function percentile(values, p) {
  if (values.length === 0) return null;
  const idx = Math.min(values.length - 1, Math.ceil((p / 100) * values.length) - 1);
  return values[idx];
}

const soakAvailable = existsSync(summaryPath);
if (!soakAvailable) {
  console.log(
    "slo-check: reports/runtime/soak-summary.json not found — skipping probe/failure envelope checks.",
  );
} else {
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  const runs = (summary.runs ?? []).filter((r) => r && typeof r === "object");
  const successRuns = runs.filter((r) => r.success && typeof r.releaseToCardMs === "number");

  const releaseToCardSorted = successRuns
    .map((r) => Number(r.releaseToCardMs))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  const p95 = percentile(releaseToCardSorted, 95);
  const failPercent =
    runs.length > 0 ? ((runs.length - successRuns.length) / runs.length) * 100 : 100;
  const retryPercent =
    runs.length > 0
      ? (runs.reduce((sum, r) => sum + Number(r.retryUsed ?? 0), 0) / runs.length) * 100
      : 0;
  const failCount = runs.length - successRuns.length;

  const globalChecks = [
    {
      metric: "releaseToCardP95Ms",
      actual: p95,
      threshold: thresholds.releaseToCardP95Ms,
      blocker: blockerKeys.has("releaseToCardP95Ms"),
    },
    {
      metric: "pipelineFailPercentMax",
      actual: failPercent,
      threshold: thresholds.pipelineFailPercentMax,
      blocker: blockerKeys.has("pipelineFailPercentMax"),
    },
    {
      metric: "retryPercentMax",
      actual: retryPercent,
      threshold: thresholds.retryPercentMax,
      blocker: blockerKeys.has("retryPercentMax"),
    },
    {
      metric: "probe_max_allowed_failures",
      actual: failCount,
      threshold: thresholds.fixture_probe?.maxAllowedFailures ?? 1,
      blocker: false,
    },
  ];

  for (const c of globalChecks) {
    const pass = c.actual != null ? c.actual <= c.threshold : false;
    violations.push({
      metric: c.metric,
      actual: c.actual != null ? Number(c.actual.toFixed?.(2) ?? c.actual) : null,
      threshold: c.threshold,
      blocker: c.blocker,
      pass,
    });
  }
}

const stagesAvailable = existsSync(latencySummaryPath);
if (!stagesAvailable) {
  console.log("slo-check: reports/runtime/pipeline-latency-summary.json not found.");
  console.log(
    "slo-check: fallback mode — per-stage SLO cannot be evaluated without parsed app_log pipeline_timing events.",
  );
  console.log(
    "slo-check: run pnpm parse:latency (or pnpm evidence:bundle) after a runtime capture.",
  );
} else if (thresholds.stages) {
  const latencyData = JSON.parse(readFileSync(latencySummaryPath, "utf8"));
  const stageMetrics = latencyData.stages ?? {};

  for (const [stageName, stageSlo] of Object.entries(thresholds.stages)) {
    const data = stageMetrics[stageName];
    if (!data) {
      console.log(`slo-check: no data for stage "${stageName}" — skipping.`);
      continue;
    }
    const checks = [
      {
        metric: `${stageName}_p50_ms`,
        actual: data.p50Ms ?? null,
        threshold: stageSlo.p50TargetMs,
      },
      {
        metric: `${stageName}_p95_ms`,
        actual: data.p95Ms ?? null,
        threshold: stageSlo.p95TargetMs,
      },
      {
        metric: `${stageName}_fail_percent`,
        actual: data.failPercent ?? null,
        threshold: stageSlo.maxFailuresPercent,
      },
    ];
    for (const c of checks) {
      const pass = c.actual != null ? c.actual <= c.threshold : false;
      violations.push({
        metric: c.metric,
        actual: c.actual != null ? Number(c.actual.toFixed?.(2) ?? c.actual) : null,
        threshold: c.threshold,
        blocker: false,
        pass,
      });
    }
  }
}

console.log("SLO check results:");
for (const row of violations) {
  console.log(
    `- ${row.metric}: actual=${row.actual} threshold=${row.threshold} blocker=${row.blocker} pass=${row.pass}`,
  );
}

const failedBlockers = violations.filter((v) => !v.pass && v.blocker);
if (failedBlockers.length > 0) {
  console.error("Blocking SLO violations detected.");
  process.exit(2);
}

const failedNonBlockers = violations.filter((v) => !v.pass && !v.blocker);
if (failedNonBlockers.length > 0) {
  console.log("Non-blocker SLO violations detected.");
}

if (!soakAvailable) {
  console.log(
    "slo-check: fixture/probe fallback — no soak summary found, maxAllowedFailures check skipped.",
  );
}
