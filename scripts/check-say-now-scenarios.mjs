import { readFile } from "node:fs/promises";
import { validateCard } from "./prompt-contract-core.mjs";

const scenariosPath = new URL("../fixtures/say-now-scenarios.json", import.meta.url);

function fail(message) {
  throw new Error(message);
}

const RULES = {
  specificity_marker(sayNow, nextMove) {
    const text = `${sayNow} ${nextMove}`.toLowerCase();
    if (
      /\d|сегодня|завтра|до\s|к\s|вариант|статус|владел|письм|чат|тикет|staging|qa|срок|план|список|встреч|созвон|чекпоинт|директор|клиент|команд/i.test(
        text
      )
    ) {
      return null;
    }
    return "card: слишком абстрактно, не хватает конкретного объекта/срока/артефакта";
  },

  time_anchor(sayNow) {
    const t = sayNow.toLowerCase();
    if (
      /\d|пятниц|сред|понедельник|четверг|вторник|суббот|воскрес|сегодня|завтра|до\s|срок|час|дн|недел|18:00|17:00|12:00/i.test(
        t
      )
    ) {
      return null;
    }
    return "say_now: нет явного якоря времени или срока для этого сценария";
  },

  next_move_signal(nextMove) {
    const t = nextMove.toLowerCase();
    if (
      /уточн|зафиксир|согласу|напиш|пришл|разошл|владел|контроль|срок|завтра|письм|чат|встреч|чекпоинт|черновик|документ/i.test(
        t
      )
    ) {
      return null;
    }
    return "next_move: нет явного шага координации";
  },

  min_say_now_words(sayNow, min) {
    const n = sayNow.trim().split(/\s+/u).filter(Boolean).length;
    if (n >= min) return null;
    return `say_now: слишком коротко (${n} слов, нужно >= ${min})`;
  },

  not_defensive_only(sayNow) {
    const t = sayNow.trim().toLowerCase();
    if (
      /^(простите|извините|я не уверен|сложно сказать)([\s,.;:!?]|$)/u.test(t) &&
      t.length < 70
    ) {
      return "say_now: слишком оборонительно, без движения к решению";
    }
    return null;
  },

  decision_not_generic_overview(sayNow) {
    const t = sayNow.toLowerCase();
    const generic =
      /(^|[\s,.;:])(в целом|в общем|на высоком уровне|много факторов)([\s,.;:!?]|$)/u.test(
        t
      );
    const hasAnchor =
      /сделаю|закрою|фиксиру|отправлю|даю|беру|сегодня|завтра|\d/u.test(t);
    if (generic && !hasAnchor) {
      return "say_now: слишком общо, нет конкретного обязательства или якоря";
    }
    return null;
  },

  decision_verb_or_owner(sayNow) {
    const t = sayNow.toLowerCase();
    if (/беру|закрою|фиксиру|внедр|отправлю|даю|делаю|шаг|вариант|переключ|подтвержда/u.test(t)) {
      return null;
    }
    return "say_now: нет явного решения или действия (глагол/выбор варианта)";
  },

  owner_or_actor(sayNow, nextMove) {
    const text = `${sayNow} ${nextMove}`.toLowerCase();
    if (/я |мы |владел|команда|ответствен|беру|назначу|кто/i.test(text)) {
      return null;
    }
    return "card: не видно исполнителя или носителя решения";
  },

  artifact_or_channel(nextMove) {
    const t = nextMove.toLowerCase();
    if (/письм|чат|тикет|таблиц|список|созвон|встреч|слот|план|черновик|резюме|коммент/i.test(t)) {
      return null;
    }
    return "next_move: нет явного артефакта или канала фиксации";
  },

  question_or_clarify(sayNow) {
    const t = sayNow.toLowerCase();
    if (sayNow.includes("?") || /уточн|правильно ли|что из|какой из|подтвердите|верно ли/i.test(t)) {
      return null;
    }
    return "say_now: нет безопасной уточняющей формулировки";
  },

  boundary_language(sayNow) {
    const t = sayNow.toLowerCase();
    if (/не обещ|не беру|не смогу|могу после|не успею|реально могу|сейчас не готов/i.test(t)) {
      return null;
    }
    return "say_now: нет явной boundary/formal refusal language";
  },

  not_apology_only(sayNow) {
    const t = sayNow.toLowerCase();
    if (/^(простите|извините|сожалею)/i.test(t) && !/сделаю|пришлю|даю|сегодня|завтра|до\s/i.test(t)) {
      return "say_now: извинение без плана";
    }
    return null;
  },
};

function applyRule(name, card) {
  if (name === "specificity_marker") return RULES.specificity_marker(card.say_now, card.next_move);
  if (name === "time_anchor") return RULES.time_anchor(card.say_now);
  if (name === "next_move_signal") return RULES.next_move_signal(card.next_move);
  if (name === "not_defensive_only") return RULES.not_defensive_only(card.say_now);
  if (name === "not_apology_only") return RULES.not_apology_only(card.say_now);
  if (name === "decision_not_generic_overview")
    return RULES.decision_not_generic_overview(card.say_now);
  if (name === "decision_verb_or_owner") return RULES.decision_verb_or_owner(card.say_now);
  if (name === "owner_or_actor") return RULES.owner_or_actor(card.say_now, card.next_move);
  if (name === "artifact_or_channel") return RULES.artifact_or_channel(card.next_move);
  if (name === "question_or_clarify") return RULES.question_or_clarify(card.say_now);
  if (name === "boundary_language") return RULES.boundary_language(card.say_now);
  if (name.startsWith("min_say_now_words:")) {
    const min = Number.parseInt(name.split(":")[1], 10);
    if (!Number.isFinite(min)) return `unknown rule: ${name}`;
    return RULES.min_say_now_words(card.say_now, min);
  }
  return `unknown rule: ${name}`;
}

function collectIssues(card, snippet, ruleNames) {
  const issues = [];
  const shape = validateCard(card, snippet);
  if (shape) issues.push(shape);
  for (const rule of ruleNames) {
    const err = applyRule(rule, card);
    if (err) issues.push(err);
  }
  return issues;
}

const raw = await readFile(scenariosPath, "utf8");
const data = JSON.parse(raw);
if (!data.scenarios || !Array.isArray(data.scenarios)) {
  fail("say-now-scenarios.json must contain a scenarios array");
}

let acceptCount = 0;
let rejectCount = 0;

for (const scenario of data.scenarios) {
  if (!scenario.id || !scenario.snippet || !Array.isArray(scenario.cases)) {
    fail(`Invalid scenario entry: ${JSON.stringify(scenario?.id)}`);
  }
  for (const c of scenario.cases) {
    if (!c.name || !c.expect || !c.card) {
      fail(`Invalid case in ${scenario.id}`);
    }
    if (c.expect === "accept") {
      acceptCount += 1;
      const rules = Array.isArray(c.rules) ? c.rules : [];
      const issues = collectIssues(c.card, scenario.snippet, rules);
      if (issues.length > 0) {
        fail(
          `[${scenario.id} / ${c.name}] expected accept, got: ${issues.join(" | ")}`
        );
      }
    } else if (c.expect === "reject") {
      rejectCount += 1;
      const rules = [
        "time_anchor",
        "next_move_signal",
        "min_say_now_words:6",
        "not_defensive_only",
        "not_apology_only",
        "decision_not_generic_overview",
        "decision_verb_or_owner",
        "specificity_marker",
        "owner_or_actor",
      ];
      const fullScan = collectIssues(c.card, scenario.snippet, rules);
      if (fullScan.length === 0) {
        fail(
          `[${scenario.id} / ${c.name}] expected reject, but card passed contract + quality scan`
        );
      }
    } else {
      fail(`Unknown expect: ${c.expect}`);
    }
  }
}

if (data.scenarios.length < 15 || acceptCount < 15 || rejectCount < 15) {
  fail("Scenario corpus too small for meaningful gate (need >= 15 accept/reject pairs).");
}

console.log(
  `Say-now scenarios OK: ${data.scenarios.length} scenarios, ${acceptCount} accept, ${rejectCount} reject.`
);
