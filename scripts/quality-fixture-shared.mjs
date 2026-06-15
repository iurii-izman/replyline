export const SECRET_PATTERNS = [
  /\bsk-[a-z0-9_-]{12,}\b/i,
  /\bdg_[a-z0-9_-]{12,}\b/i,
  /\bBearer\s+\S+/i,
  /\bOPENAI_API_KEY\b/i,
  /\bDEEPGRAM_API_KEY\b/i,
  /\bOPENROUTER_API_KEY\b/i,
];

export const RAW_PROMPT_LEAK = /(system prompt|developer message|BEGIN PROMPT|### instruction)/i;
export const APOLOGY_SPAM = /(извините|простите|сожалею).*(извините|простите|сожалею)/i;
export const FORBIDDEN_SAY_NOW_MARKDOWN = [/```/, /^\s*#/m, /^\s*\|.+\|/m, /^\s*[-*]\s+/m];
export const MARKDOWN_TABLE = /^\s*\|.+\|/m;

// Risky advice patterns — card should never suggest harmful, unethical, or illegal actions
export const RISKY_ADVICE_PATTERNS = [
  /обман/i,
  /солг/i,
  /поддел/i,
  /взлом/i,
  /парол/i,
  /скрытно/i,
  /незаметно/i,
  /stealth/i,
  /cheat/i,
  /bypass/i,
  /фальсифиц/i,
  /подстав/i,
  /шпион/i,
  /манипулир/i,
];

// Fabricated facts — card should not invent numbers, dates, or claims not in transcript
export const FABRICATED_FACT_MARKERS = [
  /\b\d{2,}%\b/,
  /\b\d+\s*(млн|тыс|million|thousand|миллион|тысяч)/i,
  /увеличил на \d+/i,
  /снизил на \d+/i,
  /рост \d+/i,
  /падение \d+/i,
];

// Actionable next_step markers — next_move should contain concrete channel/artifact
export const ACTIONABLE_NEXT_STEP_MARKERS = [
  /письм|чат|тикет|таблиц|список|созвон|встреч|слот|план|черновик|резюме|коммент|документ|задача|issue|pr|pull request/i,
  /зафиксир|отправлю|напишу|пришлю|разошлю|создам|опубликую|заведу/i,
];

// Groundedness — at least one key transcript token should appear in the card
export function extractTranscriptTokens(transcript) {
  const words = transcript
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  return [...new Set(words)];
}

export function assertMinArraySize(value, minSize, message) {
  if (!Array.isArray(value) || value.length < minSize) {
    throw new Error(message);
  }
}

export function matchesAnyPattern(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

export function findFirstMatch(text, patterns) {
  return patterns.find((pattern) => pattern.test(text)) ?? null;
}
