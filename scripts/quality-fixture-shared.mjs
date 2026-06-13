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
