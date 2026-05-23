import type { AppPlatform } from "./platform";

const FORBIDDEN_KEYS = [
  "transcript",
  "prompt",
  "response",
  "api_key",
  "apikey",
  "token",
  "secret",
  "candidate_raw",
  "resume",
  "job_description",
  "company_values",
  "answer_text",
];

export type UiEventFields = Record<string, string | number | boolean | null | undefined>;

function isForbiddenKey(key: string): boolean {
  const lower = key.toLowerCase();
  return FORBIDDEN_KEYS.some((item) => lower.includes(item));
}

function sanitizeValue(value: string | number | boolean): string {
  return String(value).replace(/[\r\n\t]/g, " ").slice(0, 120);
}

function serialize(fields: UiEventFields): string {
  const chunks: string[] = [];
  for (const key of Object.keys(fields).sort()) {
    if (isForbiddenKey(key)) continue;
    const raw = fields[key];
    if (raw === null || raw === undefined) continue;
    const val = sanitizeValue(raw);
    if (!val.trim()) continue;
    if (/\s|=/.test(val)) chunks.push(`${key}="${val.replace(/"/g, "'")}"`);
    else chunks.push(`${key}=${val}`);
  }
  if (!chunks.some((item) => item.startsWith("privacy_class="))) {
    chunks.push("privacy_class=safe_metadata");
  }
  chunks.push("schema=1");
  return chunks.join(" ");
}

export async function emitUiEvent(
  platform: AppPlatform,
  event: string,
  fields: UiEventFields = {},
): Promise<void> {
  try {
    await platform.invoke("log_client_event", { event, detail: serialize(fields) });
  } catch {
    // Best-effort only.
  }
}

export function stripUnsafeUiFields(fields: UiEventFields): string {
  return serialize(fields);
}
