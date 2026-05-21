import { strict as assert } from "node:assert";
import {
  evaluateFixture,
  evaluateRuntimeAnswerQuality,
} from "./evaluate-runtime-answer-quality.mjs";

const thresholds = {
  minScenarioScore: 70,
  maxSayNowChars: 420,
};

function baseFixture() {
  return {
    id: "base",
    mode: "work_conversation",
    transcript: "Нужно закрыть задачу и назвать срок до завтра.",
    candidatePack: null,
    expected: {
      mustContain: ["завтра"],
      mustNotContain: ["выдуманный факт"],
      maxSayNowChars: 420,
      requiresNextStep: true,
      requiresNoApologySpam: true,
      requiresRuTone: true,
      requiresNoCandidateHallucination: true,
    },
  };
}

{
  const row = evaluateFixture(baseFixture(), thresholds);
  assert.equal(row.pass, true);
}

{
  const fixture = baseFixture();
  fixture.mockCardOverrides = { say_now: "", next_move: "" };
  const row = evaluateFixture(fixture, thresholds);
  assert.equal(row.pass, false);
  assert.match(row.reasons.join(" "), /sayNow missing/i);
}

{
  const fixture = baseFixture();
  fixture.mockCardOverrides = { say_now: "x".repeat(460) };
  const row = evaluateFixture(fixture, thresholds);
  assert.equal(row.pass, false);
  assert.match(row.reasons.join(" "), /too long/i);
}

{
  const fixture = baseFixture();
  fixture.expected.mustNotContain = ["не моя вина"];
  fixture.mockCardOverrides = {
    say_now:
      "Это не моя вина, но сегодня до 18:00 дам план и зафиксирую владельца, чтобы закрыть вопрос без срыва.",
  };
  const row = evaluateFixture(fixture, thresholds);
  assert.equal(row.pass, false);
  assert.match(row.reasons.join(" "), /mustNotContain violated/i);
}

{
  const fixture = baseFixture();
  fixture.mockCardOverrides = {
    say_now: "Сегодня пришлю ключ sk-live-secret-token и план закрытия.",
  };
  const row = evaluateFixture(fixture, thresholds);
  assert.equal(row.pass, false);
  assert.match(row.reasons.join(" "), /secret-like pattern/i);
}

{
  const report = evaluateRuntimeAnswerQuality();
  assert.ok(report.aggregate.total >= 10);
  assert.equal(typeof report.aggregate.averageScore, "number");
}

{
  const fixture = baseFixture();
  fixture.id = "empty";
  fixture.transcript = "";
  fixture.expected.expectsGracefulFailure = true;
  const row = evaluateFixture(fixture, thresholds);
  assert.equal(row.pass, true);
  assert.equal(row.gracefulFailure, true);
}

console.log("All evaluate-runtime-answer-quality tests passed.");
