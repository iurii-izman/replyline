/** Shared deterministic card checks for prompt-contract and scenario eval. */

export function normalize(text) {
  return text.toLowerCase().replace(/\s+/gu, " ").trim();
}

export const LEGACY_CARD_KEYS = ["gist", "next_move", "say_now"];

export const V3_CARD_KEYS = ["answer_now", "next_step", "question_brief", "star_evidence"];

export const V4_CARD_KEYS = [
  "answer_short",
  "answer_full",
  "next_step",
  "question_brief",
  "follow_up_line",
  "evidence",
];

/** Map CardSchemaV3 object to legacy gist/say_now/next_move for IPC/UI regression. */
export function mapV3ToLegacy(cardV3) {
  const question = String(cardV3.question_brief ?? "").trim();
  const answer = String(cardV3.answer_now ?? "").trim();
  const star = String(cardV3.star_evidence ?? "").trim();
  const next = String(cardV3.next_step ?? "").trim();
  const risk = String(cardV3.risk_or_clarifier ?? "").trim();

  let sayNow = answer;
  if (star && !normalize(sayNow).includes(normalize(star))) {
    sayNow =
      sayNow.endsWith(".") || sayNow.endsWith("?")
        ? `${sayNow} Опора: ${star}`
        : `${sayNow}. Опора: ${star}`;
  }
  if (risk && !normalize(sayNow).includes(normalize(risk))) {
    sayNow = `${sayNow} Риск/уточнение: ${risk}`;
  }

  return {
    gist: question,
    say_now: sayNow,
    next_move: next,
  };
}

export function isV3Card(card) {
  return (
    typeof card === "object" &&
    card != null &&
    !Array.isArray(card) &&
    ("question_brief" in card || "answer_now" in card)
  );
}

export function validateCardV3(card, snippet) {
  if (typeof card !== "object" || card == null || Array.isArray(card)) {
    return "card must be an object";
  }

  const required = [...V3_CARD_KEYS];
  const shapeError = validateV3Shape(card, required);
  if (shapeError) return shapeError;
  const requiredStringError = validateV3RequiredStrings(card, required);
  if (requiredStringError) return requiredStringError;
  const answerError = validateV3Answer(card.answer_now);
  if (answerError) return answerError;

  return validateCard(mapV3ToLegacy(card), snippet);
}

function validateV3Shape(card, required) {
  const keys = Object.keys(card).sort((a, b) => a.localeCompare(b));
  const allowedOptional = new Set(["risk_or_clarifier"]);
  const isAllowedField = (key) => required.includes(key) || allowedOptional.has(key);
  for (const key of required) {
    if (!(key in card)) return `missing required v3 field: ${key}`;
  }
  for (const key of keys) {
    if (!isAllowedField(key)) return `unexpected v3 field: ${key}`;
  }
  if ("risk_or_clarifier" in card && card.risk_or_clarifier != null) {
    if (typeof card.risk_or_clarifier !== "string") {
      return "risk_or_clarifier must be a string when present";
    }
  }
  return null;
}

function validateV3RequiredStrings(card, required) {
  for (const key of required) {
    if (typeof card[key] !== "string" || !card[key].trim()) {
      return `${key} must be a non-empty string`;
    }
  }
  return null;
}

function validateV3Answer(rawAnswer) {
  const answer = rawAnswer.trim();
  const words = answer.split(/\s+/u).filter(Boolean);
  const sentences = answer.split(/[.!?]/u).filter((part) => part.trim()).length;
  if (answer.length > 1200) return "answer_now must be <= 1200 chars";
  if (words.length < 10) return "answer_now should be paragraph-shaped (>= 10 words)";
  if (sentences < 2 && words.length < 18) {
    return "answer_now should read as a paragraph (2+ sentences or >= 18 words)";
  }
  return null;
}

export function validateCard(card, snippet) {
  if (typeof card !== "object" || card == null || Array.isArray(card)) {
    return "card must be an object";
  }

  const keys = Object.keys(card).sort((a, b) => a.localeCompare(b));
  const expected = [...LEGACY_CARD_KEYS].sort((a, b) => a.localeCompare(b));
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    return `keys must be exactly gist/say_now/next_move, got: ${keys.join(", ")}`;
  }

  for (const key of LEGACY_CARD_KEYS) {
    if (typeof card[key] !== "string" || !card[key].trim()) {
      return `${key} must be a non-empty string`;
    }
  }

  const sayNow = card.say_now.trim();
  if (sayNow.length > 1200) {
    return "say_now must be <= 1200 chars";
  }
  if (sayNow.split(/\s+/u).length > 200) {
    return "say_now should stay speakable (<= 200 words)";
  }

  const banned = [
    "терап",
    "психолог",
    "тревож",
    "эмоци",
    "тональ",
    "язык тела",
    "харизм",
    "коуч",
    "stealth",
    "undetectable",
    "anti-proctoring",
    "invisible overlay",
    "answers for you automatically",
    "автоматически отвеч",
    "автоответ",
  ];

  const full = normalize(`${card.gist} ${card.say_now} ${card.next_move}`);
  for (const token of banned) {
    if (full.includes(token)) {
      return `contains banned wording: ${token}`;
    }
  }

  const snippetNorm = normalize(snippet);
  const actionText = normalize(`${card.say_now} ${card.next_move}`);
  if (snippetNorm.length >= 60 && actionText.includes(snippetNorm.slice(0, 60))) {
    return "looks like transcript dump in say_now/next_move";
  }

  return null;
}

export function deterministicCardFromSnippet(snippet) {
  const compact = snippet.replace(/\s+/gu, " ").trim();
  const gist = compact.length <= 100 ? compact : `${compact.slice(0, 97)}...`;
  return {
    gist,
    say_now:
      "Давайте зафиксируем решение и срок: сегодня подтверждаю следующий шаг письменно. После согласования отправлю короткий итог с владельцем и контрольной датой. Если будут дополнительные вопросы — соберу уточнения в отдельном сообщении. Это позволит всем участникам синхронизироваться и двигаться дальше без потери контекста.",
    next_move: "Уточню владельца действия и время контрольной проверки в чате.",
  };
}

export function deterministicCardV3FromSnippet(snippet) {
  const legacy = deterministicCardFromSnippet(snippet);
  return {
    question_brief: legacy.gist,
    answer_now: legacy.say_now,
    star_evidence: "В фрагменте звучит рабочий запрос на согласование шага.",
    next_step: legacy.next_move,
  };
}

// ── CardSchemaV4 helpers ──────────────────────────────────────────────────

export function isV4Card(card) {
  return (
    typeof card === "object" &&
    card != null &&
    !Array.isArray(card) &&
    ("answer_short" in card || "answer_full" in card)
  );
}

export function validateCardV4(card, snippet) {
  if (typeof card !== "object" || card == null || Array.isArray(card)) {
    return "card must be an object";
  }

  const required = [...V4_CARD_KEYS];
  const shapeError = validateV4Shape(card, required);
  if (shapeError) return shapeError;
  const requiredStringError = validateV4RequiredStrings(card, required);
  if (requiredStringError) return requiredStringError;
  const answerError = validateV4Answer(card.answer_short, card.answer_full);
  if (answerError) return answerError;

  return validateCard(mapV4ToLegacy(card), snippet);
}

function validateV4Shape(card, required) {
  const keys = Object.keys(card).sort((a, b) => a.localeCompare(b));
  const allowedOptional = new Set(["risk_or_clarifier"]);
  const isAllowedField = (key) => required.includes(key) || allowedOptional.has(key);
  for (const key of required) {
    if (!(key in card)) return `missing required v4 field: ${key}`;
  }
  for (const key of keys) {
    if (!isAllowedField(key)) return `unexpected v4 field: ${key}`;
  }
  if ("risk_or_clarifier" in card && card.risk_or_clarifier != null) {
    if (typeof card.risk_or_clarifier !== "string") {
      return "risk_or_clarifier must be a string when present";
    }
  }
  return null;
}

function validateV4RequiredStrings(card, required) {
  for (const key of required) {
    if (typeof card[key] !== "string" || !card[key].trim()) {
      return `${key} must be a non-empty string`;
    }
  }
  return null;
}

function validateV4Answer(rawShort, rawFull) {
  const short = (rawShort ?? "").trim();
  const full = (rawFull ?? "").trim();
  if (!short && !full) return "both answer_short and answer_full are empty";
  if (short.length > 400) return "answer_short must be <= 400 chars";
  if (full.length > 1200) return "answer_full must be <= 1200 chars";
  const shortWords = short.split(/\s+/u).filter(Boolean).length;
  if (short && shortWords < 3) return "answer_short too short (need >= 3 words)";
  return null;
}

export function mapV4ToLegacy(cardV4) {
  const question = String(cardV4.question_brief ?? "").trim();
  const short = String(cardV4.answer_short ?? "").trim();
  const full = String(cardV4.answer_full ?? "").trim();
  const evidence = String(cardV4.evidence ?? "").trim();
  const next = String(cardV4.next_step ?? "").trim();
  const risk = String(cardV4.risk_or_clarifier ?? "").trim();

  let sayNow = short;
  if (full && full !== short) {
    const sep = short.endsWith(".") || short.endsWith("?") || short.endsWith("!") ? " " : ". ";
    sayNow = `${short}${sep}${full}`;
  }
  if (evidence && !normalize(sayNow).includes(normalize(evidence))) {
    sayNow =
      sayNow.endsWith(".") || sayNow.endsWith("?")
        ? `${sayNow} Evidence: ${evidence}`
        : `${sayNow}. Evidence: ${evidence}`;
  }
  if (risk && !normalize(sayNow).includes(normalize(risk))) {
    sayNow = `${sayNow} Risk/clarification: ${risk}`;
  }

  return {
    gist: question,
    say_now: sayNow,
    next_move: next,
  };
}

export function deterministicCardV4FromSnippet(snippet) {
  const legacy = deterministicCardFromSnippet(snippet);
  const sentences = legacy.say_now.split(/(?<=[.!?])\s+/);
  return {
    question_brief: legacy.gist,
    answer_short: sentences[0] || legacy.say_now,
    answer_full: sentences.slice(1).join(" ") || "Additional context and explanation.",
    follow_up_line: "Если потребуется, уточню детали в чате.",
    evidence: "В фрагменте звучит рабочий запрос на согласование шага.",
    next_step: legacy.next_move,
  };
}
