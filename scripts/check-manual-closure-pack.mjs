import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const htmlPath = resolve(root, "docs/manual-closure-pack.html");
const mdPath = resolve(root, "docs/manual-closure-pack.md");

function fail(msg) {
  console.error(`[manual-closure-pack] ${msg}`);
  process.exit(1);
}

if (!existsSync(htmlPath)) fail("missing docs/manual-closure-pack.html");
if (!existsSync(mdPath)) fail("missing docs/manual-closure-pack.md");

const html = readFileSync(htmlPath, "utf8");
const md = readFileSync(mdPath, "utf8");

const forbiddenPatterns = [
  { token: "http://", reason: "remote http link is forbidden" },
  { token: "https://", reason: "remote https link is forbidden" },
  { token: "<script src=", reason: "external script src is forbidden" },
  { token: '<link rel="stylesheet" href=', reason: "external stylesheet link is forbidden" },
  { token: "@import url", reason: "css @import remote/local indirection is forbidden" },
  { token: "sk-", reason: "OpenAI-like secret marker detected" },
  { token: "dg_", reason: "Deepgram-like secret marker detected" },
  { token: "Bearer", reason: "Bearer token marker detected" },
  { token: "OPENAI_API_KEY=", reason: "OpenAI API key assignment detected" },
  { token: "DEEPGRAM_API_KEY=", reason: "Deepgram API key assignment detected" },
  { token: "api_key=", reason: "generic api_key assignment detected" },
];

for (const { token, reason } of forbiddenPatterns) {
  if (html.includes(token)) {
    fail(`${reason}: found \`${token}\` in docs/manual-closure-pack.html`);
  }
}

const requiredSections = [
  "Live runtime + hotkey evidence / Доказательства live runtime и hotkey",
  "Audio robustness matrix / Матрица устойчивости аудио",
  "Human answer quality review / Ручной review качества ответов",
  "First-run onboarding / Проверка первого запуска",
  "Privacy, logs, exports, reports / Приватность, логи, экспорты, отчёты",
  "Installer / clean machine check / Проверка инсталлятора и чистой машины",
  "External Docker compose hardening / Усиление внешнего Docker compose",
  "SonarCloud final review / Финальный review SonarCloud",
  "Visual QA snapshot / Визуальный QA-снимок",
  "Release / handoff / Релиз и handoff",
  "Go / No-Go / Финальное решение",
];

for (const section of requiredSections) {
  if (!html.includes(section)) {
    fail(`missing required section: \`${section}\``);
  }
}

const requiredCapabilities = [
  "localStorage",
  "Экспорт JSON",
  "Импорт JSON",
  "MD отчёт",
  "Todo / К выполнению",
  "Pass / Пройдено",
  "Warn / Риск",
  "Block / Блокер",
];

for (const marker of requiredCapabilities) {
  if (!html.includes(marker)) {
    fail(`missing interactive capability marker: \`${marker}\``);
  }
}

if (!md.includes("manual-closure-pack.html")) {
  fail("docs/manual-closure-pack.md must link to docs/manual-closure-pack.html");
}

console.log("[manual-closure-pack] OK: static artifact, safety patterns, and docs link validated.");
