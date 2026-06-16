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
    contextPack: null,
    expected: {
      mustContain: ["завтра"],
      mustNotContain: ["выдуманный факт"],
      maxSayNowChars: 420,
      requiresNextStep: true,
      requiresNoApologySpam: true,
      requiresRuTone: true,
      requiresNoContextHallucination: true,
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

// ContextPack-specific tests

{
  // Russian context pack evidence extraction — mustContain/mustNotContain guards
  const fixture = baseFixture();
  fixture.id = "ctx-ru-guard";
  fixture.transcript = "Расскажи про статус проекта.";
  fixture.contextPack = {
    claims: "Я тимлид платформенной команды. Проект: миграция на Kubernetes, срок — Q4.",
    constraints: "Не упоминай бюджет. Не называй конкретных имён.",
    metrics: null,
  };
  fixture.expected = {
    mustContain: ["kubernetes", "q4"],
    mustNotContain: ["бюджет", "имён"],
    maxSayNowChars: 420,
    requiresNextStep: true,
    requiresNoApologySpam: true,
    requiresRuTone: true,
    requiresNoContextHallucination: false,
    requiresGroundedTranscript: true,
    requiresNoFabricatedFacts: true,
  };
  fixture.mockCardOverrides = {
    gist: "Миграция на Kubernetes — Q4.",
    say_now: "Миграция на Kubernetes идёт по плану, срок Q4. Детали уточню и напишу в чат.",
    next_move: "Подготовлю статус-документ по миграции и отправлю команде в чат.",
  };
  const row = evaluateFixture(fixture, thresholds);
  assert.equal(
    row.pass,
    true,
    `ctx-ru-guard should pass, got score=${row.score} reasons=${row.reasons.join("; ")}`,
  );
}

{
  // Russian context pack constraint violation — mustNotContain catch
  const fixture = baseFixture();
  fixture.id = "ctx-ru-constraint-violation";
  fixture.transcript = "Какой бюджет проекта?";
  fixture.contextPack = {
    claims: "Проект: миграция на Kubernetes.",
    constraints: "Не упоминай бюджет.",
    metrics: null,
  };
  fixture.expected = {
    mustContain: ["kubernetes"],
    mustNotContain: ["бюджет"],
    maxSayNowChars: 420,
    requiresNextStep: true,
    requiresNoApologySpam: true,
    requiresRuTone: true,
    requiresNoContextHallucination: false,
    requiresGroundedTranscript: true,
    requiresNoFabricatedFacts: true,
  };
  fixture.mockCardOverrides = {
    say_now: "Бюджет проекта — 5 миллионов. Миграция на Kubernetes продолжается.",
    next_move: "Подготовлю бюджетную таблицу и отправлю в чат.",
  };
  const row = evaluateFixture(fixture, thresholds);
  assert.equal(
    row.pass,
    false,
    `ctx-ru-constraint-violation should fail (бюджет violated), got score=${row.score}`,
  );
  assert.match(row.reasons.join(" "), /mustNotContain violated/i);
}

console.log("All ContextPack-specific tests passed.");
