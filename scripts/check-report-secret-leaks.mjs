import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const defaultScanRoots = ["reports", "docs", ".env.docker.example"];

const secretRules = [
  { label: "OpenAI API key", regex: /\bsk-[A-Za-z0-9_-]{16,}\b/g },
  { label: "Deepgram key", regex: /\bdg_[A-Za-z0-9_-]{16,}\b/g },
  { label: "Bearer token", regex: /\bBearer\s+[A-Za-z0-9._-]{16,}\b/gi },
  { label: "Generic api_key", regex: /\bapi[_-]?key\s*=\s*[^\s#]+/gi },
  { label: "OpenAI env", regex: /\bOPENAI_API_KEY\s*=\s*[^\s#]+/gi },
  { label: "Deepgram env", regex: /\bDEEPGRAM_API_KEY\s*=\s*[^\s#]+/gi },
  { label: "Langfuse secret", regex: /\bLANGFUSE_SECRET_KEY\s*=\s*[^\s#]+/gi },
  { label: "Postgres password", regex: /\bPOSTGRES_PASSWORD\s*=\s*[^\s#]+/gi },
];

const allowTokens = [
  "[redacted]",
  "change-me",
  "placeholder",
  "example",
  "<redacted>",
  "<value>",
  "your_",
  "your-",
  "sk-local-dev-key",
  "fake",
  "local-id",
];

function shouldIgnoreValue(raw) {
  const value = raw.toLowerCase();
  const normalized = value.replace(/\s+/g, "");
  if (normalized.endsWith("api_key=`") || normalized.endsWith("api_key=<value>`")) return true;
  return allowTokens.some((token) => value.includes(token));
}

function listFiles(repoRoot, inputPath) {
  const abs = resolve(repoRoot, inputPath);
  const out = [];
  let st;
  try {
    st = statSync(abs);
  } catch {
    return out;
  }
  if (st.isFile()) {
    out.push(abs);
    return out;
  }
  const entries = readdirSync(abs);
  for (const entry of entries) {
    out.push(...listFiles(repoRoot, resolve(abs, entry)));
  }
  return out;
}

export function scanReportSecretLeaks(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const scanRoots = options.scanRoots ?? defaultScanRoots;
  const files = scanRoots.flatMap((root) => listFiles(repoRoot, root));
  const violations = [];

  for (const file of files) {
    const rel = relative(repoRoot, file).replaceAll("\\", "/");
    const content = readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/u);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const rule of secretRules) {
        rule.regex.lastIndex = 0;
        const matches = [...line.matchAll(rule.regex)];
        for (const match of matches) {
          const snippet = match[0];
          if (shouldIgnoreValue(snippet)) continue;
          violations.push({ rel, line: i + 1, label: rule.label, snippet });
        }
      }
    }
  }

  return { filesScanned: files.length, violations };
}

function runCli() {
  const { filesScanned, violations } = scanReportSecretLeaks();

  if (violations.length > 0) {
    console.error("[report-secret-leaks] potential secret leaks detected:");
    for (const v of violations) {
      console.error(`- ${v.rel}:${v.line} (${v.label}) -> ${v.snippet}`);
    }
    process.exit(1);
  }

  console.log(
    `[report-secret-leaks] OK: scanned ${filesScanned} files in reports/docs/.env.docker.example`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli();
}
