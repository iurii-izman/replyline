// context-pack/helpers.ts — Pure helper functions extracted from ContextPackPanel.
// No SolidJS signals, no side effects. All functions are deterministic given inputs.

export const QUICK_CONTEXT_MAX_LEN = 100_000;
export const QUICK_CONTEXT_TITLE_MAX_LEN = 80;

/** Normalise a single line: strip markdown heading markers, bullet prefixes, collapse whitespace. */
export function normalizeTitleLine(line: string): string {
  return line
    .replace(/^#+\s*/, "")
    .replace(/^[-*•]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract a title from the first non-empty line of content. */
export function titleFromContent(
  content: string,
  fallbackTitle: string,
): string {
  const firstLine = content
    .split(/\r?\n/)
    .map(normalizeTitleLine)
    .find(Boolean);
  const title = firstLine || fallbackTitle;
  return title.slice(0, QUICK_CONTEXT_TITLE_MAX_LEN).trim() || fallbackTitle;
}

/** Check whether trimmed content exceeds the maximum length. */
export function quickContextTooLong(content: string): boolean {
  return content.trim().length > QUICK_CONTEXT_MAX_LEN;
}

/** Build the "too long" error message from a locale template. */
export function quickTooLongMessage(template: string): string {
  return template.replace("{{max}}", String(QUICK_CONTEXT_MAX_LEN));
}

/** Build the character count label from a locale template. */
export function quickCharCountLabel(
  template: string,
  contentLength: number,
): string {
  return template
    .replace("{{count}}", String(contentLength))
    .replace("{{max}}", String(QUICK_CONTEXT_MAX_LEN));
}

/** Count words in a string. */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
