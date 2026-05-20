import { strict as assert } from "node:assert";

function parseTimingRecords(lines) {
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
  return records;
}

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function aggregateStages(records) {
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
  return stages;
}

{
  const lines = [
    "x",
    "2026-04-07T12:00:00 [pipeline_timing] stage=capture_stop duration_ms=100 outcome=ok code=RL_CAPTURE_STOP_TIMED",
    "2026-04-07T12:00:00 [pipeline_timing] stage=stt_request duration_ms=2000 outcome=fail code=RL_STT_REQUEST_TIMED",
    "2026-04-07T12:00:00 [pipeline_timing] stage=release_to_card duration_ms=3200 outcome=ok code=RL_TIMING_SUMMARY",
  ];
  const records = parseTimingRecords(lines);
  assert.equal(records.length, 3);
  assert.equal(records[2].stage, "release_to_card");

  const stages = aggregateStages(records);
  assert.equal(stages.capture_stop.count, 1);
  assert.equal(stages.stt_request.failCount, 1);
  assert.equal(stages.release_to_card.p50Ms, 3200);
}

console.log("All parse-pipeline-latency tests passed.");
