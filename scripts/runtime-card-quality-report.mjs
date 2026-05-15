import { readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const windowArg = process.argv.find((arg) => arg.startsWith("--window=")) ?? "--window=hour";
const windowName = windowArg.split("=")[1] === "day" ? "day" : "hour";
const windowMs = windowName === "day" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;

const logPath = path.join(os.homedir(), "AppData", "Local", "com.replyline.app", "logs", "app.log");
const raw = await readFile(logPath, "utf8");
const now = Date.now();

const stats = {
  analysis_start: 0,
  analysis_ok: 0,
  analysis_card_invalid: 0,
  next_move_fallback_true: 0,
  say_now_repair_true: 0,
  transcript_chars: [],
};

for (const line of raw.split(/\r?\n/u)) {
  const m = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}) \[([^\]]+)\] (.*)$/u);
  if (!m) continue;
  const ts = new Date(m[1]).getTime();
  if (!Number.isFinite(ts) || now - ts > windowMs) continue;
  const event = m[2];
  const detail = m[3];
  if (event in stats) stats[event] += 1;
  const chars = detail.match(/transcript_chars=(\d+)/u);
  if (chars) stats.transcript_chars.push(Number(chars[1]));
  if (detail.includes("next_move_fallback=true")) stats.next_move_fallback_true += 1;
  if (detail.includes("say_now_repair=true")) stats.say_now_repair_true += 1;
}

const sorted = [...stats.transcript_chars].sort((a, b) => a - b);
const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
const min = sorted.length ? sorted[0] : 0;
const max = sorted.length ? sorted[sorted.length - 1] : 0;
const invalidRate = stats.analysis_start ? stats.analysis_card_invalid / stats.analysis_start : 0;
const fallbackRate = stats.analysis_ok ? stats.next_move_fallback_true / stats.analysis_ok : 0;

console.log(`window=${windowName}`);
console.log(`analysis_start=${stats.analysis_start}`);
console.log(`analysis_ok=${stats.analysis_ok}`);
console.log(`analysis_card_invalid=${stats.analysis_card_invalid}`);
console.log(`invalid_rate=${invalidRate.toFixed(3)}`);
console.log(`next_move_fallback_true=${stats.next_move_fallback_true}`);
console.log(`fallback_rate=${fallbackRate.toFixed(3)}`);
console.log(`say_now_repair_true=${stats.say_now_repair_true}`);
console.log(`transcript_chars min=${min} median=${median} avg=${avg.toFixed(1)} max=${max}`);
