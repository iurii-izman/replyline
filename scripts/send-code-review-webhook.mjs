#!/usr/bin/env node
/**
 * POST a minimal code-review payload to the n8n webhook.
 * Exits 1 if HTTP fails or JSON body has ok !== true.
 *
 * Env: N8N_CODE_REVIEW_URL (default http://localhost:5678/webhook/replyline-code-review)
 *
 * Usage:
 *   pnpm code-review:webhook
 *   node scripts/send-code-review-webhook.mjs "diff line" "src/app/foo.ts"
 *   git diff HEAD~1 -- src | node scripts/send-code-review-webhook.mjs --stdin src/app/foo.ts
 */
import { readFileSync } from "node:fs";

const url =
  process.env.N8N_CODE_REVIEW_URL ?? "http://localhost:5678/webhook/replyline-code-review";

const stdinMode = process.argv.includes("--stdin");
const pos = process.argv.slice(2).filter((a) => a !== "--stdin");

let diff;
let filePath = "src/app/model.ts";
if (stdinMode) {
  diff = readFileSync(0, "utf8").trim() || "- (empty stdin)";
  if (pos[0]) filePath = pos[0];
} else {
  diff = pos[0] ?? "- smoke: trivial change\n+ smoke: ok";
  if (pos[1]) filePath = pos[1];
}

const body = JSON.stringify({ diff, file: filePath });
const truncateForLog = (value, limit = 200) => {
  const text = String(value ?? "");
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}...`;
};
const responseSummary = (status, payload) => {
  if (payload && typeof payload === "object") {
    const safe = {};
    for (const key of ["ok", "error", "message", "code"]) {
      if (key in payload) safe[key] = payload[key];
    }
    return { status, ...safe };
  }
  return { status, payload: truncateForLog(payload) };
};

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body,
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error("Non-JSON response:", truncateForLog(`status=${res.status}; body=${text}`));
  process.exit(1);
}

if (!res.ok) {
  console.error("HTTP error:", JSON.stringify(responseSummary(res.status, json)));
  process.exit(1);
}

if (json.ok !== true) {
  console.error("Review failed:", JSON.stringify(responseSummary(res.status, json), null, 2));
  process.exit(1);
}

console.log(JSON.stringify(json, null, 2));
