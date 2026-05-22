import { strict as assert } from "node:assert";
import {
  evaluateProductScenarios,
  runNegativeRegressionCases,
} from "./evaluate-product-scenarios.mjs";

{
  const report = evaluateProductScenarios();
  assert.ok(report.totalScenarios >= 25, "scenario count too low");
  assert.equal(typeof report.overallScore, "number");
  assert.ok(report.categoryAverages.length >= 5, "category coverage too low");
}

{
  const negative = runNegativeRegressionCases();
  assert.equal(negative.pass, true, "negative regression cases must fail by expected reasons");
  for (const row of negative.outcomes) {
    assert.equal(row.valid, true, `negative case invalid: ${row.id}`);
  }
}

console.log("All evaluate-product-scenarios tests passed.");
