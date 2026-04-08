/** Shared deterministic card checks for prompt-contract and scenario eval. */

export function normalize(text) {
  return text.toLowerCase().replace(/\s+/gu, " ").trim();
}

export function validateCard(card, snippet) {
  if (typeof card !== "object" || card == null || Array.isArray(card)) {
    return "card must be an object";
  }

  const keys = Object.keys(card).sort();
  const expected = ["gist", "next_move", "say_now"];
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    return `keys must be exactly gist/say_now/next_move, got: ${keys.join(", ")}`;
  }

  for (const key of expected) {
    if (typeof card[key] !== "string" || !card[key].trim()) {
      return `${key} must be a non-empty string`;
    }
  }

  const sayNow = card.say_now.trim();
  if (sayNow.length > 220) {
    return "say_now must be <= 220 chars";
  }
  if (sayNow.split(/\s+/u).length > 32) {
    return "say_now should stay short and speakable (<= 32 words)";
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
      "Давайте зафиксируем решение и срок: сегодня подтверждаю следующий шаг письменно.",
    next_move: "Уточните владельца действия и время контрольной проверки.",
  };
}
