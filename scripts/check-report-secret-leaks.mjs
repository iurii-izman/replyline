import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const defaultScanRoots = ["reports/", "docs/", ".env.docker.example"];

const secretRules = [
  { label: "OpenAI API key", regex: /\bsk-[A-Za-z0-9_-]{16,}\b/g },
  { label: "Deepgram key", regex: /\bdg_[A-Za-z0-9_-]{16,}\b/g },
  { label: "Bearer token", regex: /\bBearer\s+[A-Za-z0-9._-]{16,}\b/gi },
  { label: "Generic api_key", regex: /\bapi[_-]?key\s*=\s*[^\s#]+/gi },
  { label: "OpenAI env", regex: /\bOPENAI_API_KEY\s*=\s*[^\s#]+/gi },
  { label: "Deepgram env", regex: /\bDEEPGRAM_API_KEY\s*=\s*[^\s#]+/gi },
  { label: "Langfuse secret", regex: /\bLANGFUSE_SECRET_KEY\s*=\s*[^\s#]+/gi },
  { label: "Postgres password", regex: /\bPOSTGRES_PASSWORD\s*=\s*[^\s#]+/gi },
  {
    label: "Authorization header value",
    regex: /\bAuthorization\s*:\s*(Bearer\s+)?[A-Za-z0-9._~+/-]{16,}\b/gi,
  },
  {
    label: "Postman environment secret value",
    regex: /"key"\s*:\s*"(apiKey|token|secret|password)".{0,120}"value"\s*:\s*"[^"]{8,}"/gi,
  },
  {
    label: "Candidate data leak marker",
    regex: /\b(Resume|Job Description|Company Values)\s*:\s*(?!\[redacted\]|<redacted>|redacted)/gi,
  },
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

function getTrackedFiles(repoRoot) {
  const lines = execSync("git ls-files", { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((relPath) => relPath.replaceAll("\\", "/"));
}

function matchesScanRoot(relPath, scanRoots) {
  return scanRoots.some((root) => {
    const normalizedRoot = root.replaceAll("\\", "/");
    if (normalizedRoot.endsWith("/")) {
      return relPath.startsWith(normalizedRoot);
    }
    return relPath === normalizedRoot;
  });
}

function shouldSkipPathRule(relPath, label) {
  if (!relPath.startsWith("reports/")) return false;
  if (label === "Candidate data leak marker" && relPath.includes("candidate-pack")) return true;
  return false;
}

function isSensitiveAbsolutePath(relPath, line) {
  if (!line.includes(":\\") && !line.includes("/Users/") && !line.includes("/home/")) return false;
  if (line.includes("C:\\Dev\\replyline")) return false;
  if (
    (relPath === "reports/docker/docker-stack-audit-2026-05-21.md" ||
      relPath === "reports/docker/docker-stack-hardening-2026-05-21.md") &&
    line.includes("ai-stack\\docker-compose.yml")
  ) {
    return false;
  }
  if (line.includes("placeholder") || line.includes("example")) return false;
  return true;
}

export function scanReportSecretLeaks(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const scanRoots = options.scanRoots ?? defaultScanRoots;
  const trackedFiles = getTrackedFiles(repoRoot).filter((file) => matchesScanRoot(file, scanRoots));
  const files = trackedFiles.map((relPath) => resolve(repoRoot, relPath));
  const violations = [];

  for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
    const file = files[fileIdx];
    const rel = trackedFiles[fileIdx] ?? relative(repoRoot, file).replaceAll("\\", "/");
    const content = readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/u);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (rel.startsWith("reports/") && isSensitiveAbsolutePath(rel, line)) {
        violations.push({
          rel,
          line: i + 1,
          label: "Sensitive absolute path",
          snippet: line.trim().slice(0, 160),
        });
      }
      for (const rule of secretRules) {
        if (shouldSkipPathRule(rel, rule.label)) continue;
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
