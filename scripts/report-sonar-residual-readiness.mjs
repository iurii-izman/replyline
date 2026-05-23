import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(__dirname, "..");

function parseSonarProperties(raw) {
  const pairs = {};
  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    pairs[key] = value;
  }
  return pairs;
}

export function runSonarResidualReadiness(options = {}) {
  const root = options.root ?? DEFAULT_ROOT;
  const now = options.now ?? new Date();
  const stamp = now.toISOString().slice(0, 10);
  const sonarDir = join(root, "reports", "sonar");
  const mdPath = join(sonarDir, `sonar-residual-readiness-${stamp}.md`);
  const jsonPath = join(sonarDir, `sonar-residual-readiness-${stamp}.json`);
  const sonarPath = join(root, "sonar-project.properties");

  const sonarExists = existsSync(sonarPath);
  const sonarRaw = sonarExists ? readFileSync(sonarPath, "utf8") : "";
  const sonar = parseSonarProperties(sonarRaw);
  const requiredKeys = ["sonar.projectKey", "sonar.organization", "sonar.sources", "sonar.tests"];
  const missingKeys = requiredKeys.filter((key) => !String(sonar[key] ?? "").trim());
  const pass = sonarExists && missingKeys.length === 0;

  const report = {
    schemaVersion: "replyline.sonar-residual.v1",
    generatedAt: now.toISOString(),
    stamp,
    pass,
    sonarProjectProperties: {
      present: sonarExists,
      path: "sonar-project.properties",
      requiredKeys,
      missingKeys,
      values: {
        projectKey: sonar["sonar.projectKey"] ?? null,
        organization: sonar["sonar.organization"] ?? null,
        sources: sonar["sonar.sources"] ?? null,
        tests: sonar["sonar.tests"] ?? null,
        exclusions: sonar["sonar.exclusions"] ?? null,
        coverageExclusions: sonar["sonar.coverage.exclusions"] ?? null,
        cpdExclusions: sonar["sonar.cpd.exclusions"] ?? null,
      },
    },
    residualNotes: [
      "Repository-level readiness only; SonarCloud UI and token-gated checks stay external.",
      "Freshness is enforced by same-day report generation in release-readiness flow.",
    ],
  };

  const lines = [
    "# Sonar Residual Readiness",
    "",
    `Generated at: ${report.generatedAt}`,
    `Stamp: ${stamp}`,
    `Status: ${pass ? "pass" : "block"}`,
    "",
    "## Key Presence",
    `- sonar-project.properties: ${sonarExists ? "present" : "missing"}`,
    `- missing required keys: ${missingKeys.length}`,
    ...missingKeys.map((key) => `- missing: ${key}`),
    "",
    "## Effective Values",
    `- sonar.projectKey: ${report.sonarProjectProperties.values.projectKey ?? "missing"}`,
    `- sonar.organization: ${report.sonarProjectProperties.values.organization ?? "missing"}`,
    `- sonar.sources: ${report.sonarProjectProperties.values.sources ?? "missing"}`,
    `- sonar.tests: ${report.sonarProjectProperties.values.tests ?? "missing"}`,
    "",
    "## Residual Notes",
    ...report.residualNotes.map((note) => `- ${note}`),
    "",
  ];

  mkdirSync(sonarDir, { recursive: true });
  writeFileSync(mdPath, `${lines.join("\n")}\n`, "utf8");
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return {
    pass,
    stamp,
    mdPath,
    jsonPath,
    missingKeys,
    sonarExists,
  };
}

function runCli() {
  const result = runSonarResidualReadiness();
  console.log(`[sonar-residual] markdown: ${result.mdPath}`);
  console.log(`[sonar-residual] json: ${result.jsonPath}`);
  console.log(
    `[sonar-residual] pass=${result.pass} sonar-project.properties=${result.sonarExists ? "present" : "missing"} missing_keys=${result.missingKeys.length}`,
  );
  if (!result.pass) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli();
}
