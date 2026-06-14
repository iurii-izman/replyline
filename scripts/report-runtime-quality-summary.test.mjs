import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runRuntimeQualitySummaryReport } from "./report-runtime-quality-summary.mjs";

function setupFixture() {
  const root = mkdtempSync(join(tmpdir(), "replyline-runtime-quality-summary-"));
  mkdirSync(join(root, "reports", "runtime-quality"), { recursive: true });
  mkdirSync(join(root, "reports", "product-quality"), { recursive: true });
  mkdirSync(join(root, "reports", "runtime"), { recursive: true });

  return { root, now: new Date("2026-06-14T10:00:00.000Z") };
}

{
  const fixture = setupFixture();
  writeFileSync(
    join(fixture.root, "reports", "runtime-quality", "runtime-answer-quality-2026-06-14.json"),
    JSON.stringify({
      aggregate: {
        total: 10,
        passCount: 10,
        averageScore: 100,
      },
    }),
    "utf8",
  );
  writeFileSync(
    join(fixture.root, "reports", "product-quality", "product-scenario-benchmark-2026-06-14.json"),
    JSON.stringify({
      overallScore: 97.2,
      pass: true,
    }),
    "utf8",
  );

  const result = runRuntimeQualitySummaryReport({ root: fixture.root, now: fixture.now });
  assert.equal(result.pass, true);
  assert.equal(result.summary.steps.qualityEvidence.ok, true);
  assert.equal(result.summary.steps.latencySummary.ok, false);

  const saved = JSON.parse(readFileSync(result.jsonPath, "utf8"));
  assert.equal(saved.productScenarioSummary.overallScore, 97.2);
  assert.equal(saved.answerQualityAggregate.averageScore, 100);
}

{
  const fixture = setupFixture();
  const result = runRuntimeQualitySummaryReport({ root: fixture.root, now: fixture.now });
  assert.equal(result.pass, false);
  assert.equal(result.summary.steps.qualityEvidence.ok, false);
}

console.log("All report-runtime-quality-summary tests passed.");
