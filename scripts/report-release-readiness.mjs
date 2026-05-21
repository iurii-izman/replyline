import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const reportDir = join(root, "reports", "release");
const stamp = new Date().toISOString().slice(0, 10);

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function readText(path) {
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

function hasScript(pkg, name) {
  return Object.prototype.hasOwnProperty.call(pkg.scripts ?? {}, name);
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const freeze = readJson(join(root, "reports", "release-freeze-check.json"));
const sonarResidual = existsSync(
  join(root, "reports", "sonar", `sonar-residual-readiness-${stamp}.md`),
);
const runtimeSummary = existsSync(
  join(root, "reports", "runtime-quality", `runtime-quality-summary-${stamp}.md`),
);
const dockerHardening = existsSync(
  join(root, "reports", "docker", "docker-stack-hardening-2026-05-21.md"),
);
const sonarConfig = readText(join(root, "sonar-project.properties"));

const sections = [];
sections.push("# Release Readiness Summary");
sections.push("");
sections.push(`Generated at: ${new Date().toISOString()}`);
sections.push("");
sections.push("## Package Script Topology");
sections.push(`- verify:fast: ${hasScript(pkg, "verify:fast") ? "present" : "missing"}`);
sections.push(`- verify:full: ${hasScript(pkg, "verify:full") ? "present" : "missing"}`);
sections.push(
  `- verify:release-local: ${hasScript(pkg, "verify:release-local") ? "present" : "missing"}`,
);
sections.push(
  `- release:freeze:check: ${hasScript(pkg, "release:freeze:check") ? "present" : "missing"}`,
);
sections.push("");
sections.push("## Sonar Residual State");
sections.push(`- sonar-project.properties: ${sonarConfig ? "present" : "missing"}`);
sections.push(`- local sonar residual report (${stamp}): ${sonarResidual ? "present" : "missing"}`);
sections.push("");
sections.push("## Runtime Quality Evidence");
sections.push(`- runtime quality summary (${stamp}): ${runtimeSummary ? "present" : "missing"}`);
sections.push("");
sections.push("## Docker Hardening State");
sections.push(`- pinned hardening report: ${dockerHardening ? "present" : "missing"}`);
sections.push(
  "- strict docker check remains external-state/manual gate and is not auto-marked pass.",
);
sections.push("");
sections.push("## Public Footprint + Freeze");
if (freeze) {
  sections.push(`- release-freeze-check.json status: ${freeze.status}`);
  sections.push(`- changed files in freeze snapshot: ${freeze.changedFileCount}`);
  sections.push(`- outside freeze: ${freeze.outsideFreeze?.length ?? 0}`);
  sections.push(`- outside guardrails: ${freeze.outsideGuardrails?.length ?? 0}`);
} else {
  sections.push("- release-freeze-check.json: missing (run pnpm release:freeze:check)");
}
sections.push("");
sections.push("## Security Lane State");
sections.push(
  `- test:security-lanes script: ${hasScript(pkg, "test:security-lanes") ? "present" : "missing"}`,
);
sections.push(
  `- test:report-secret-leaks script: ${hasScript(pkg, "test:report-secret-leaks") ? "present" : "missing"}`,
);
sections.push("");
sections.push("## Known Manual-Only Gaps");
sections.push(
  "- Real-provider runtime probes (runtime:preflight/probe:runtime) remain environment-dependent.",
);
sections.push("- docker:replyline:check:strict depends on external Docker compose state.");
sections.push("");
sections.push("## Release Blockers");
const blockers = [];
if (!hasScript(pkg, "verify:release-local")) blockers.push("Missing verify:release-local script.");
if (!hasScript(pkg, "report:release-readiness"))
  blockers.push("Missing report:release-readiness script.");
if (!sonarConfig) blockers.push("Missing sonar-project.properties.");
if (freeze && (freeze.outsideFreeze?.length > 0 || freeze.outsideGuardrails?.length > 0)) {
  blockers.push("Release freeze report shows files outside baseline guardrails.");
}
if (blockers.length === 0) sections.push("- none detected by this local summary script");
for (const b of blockers) sections.push(`- ${b}`);
sections.push("");
sections.push("## Non-Blocking Warnings");
const warnings = [];
if (!runtimeSummary) warnings.push("Runtime quality summary for today is missing.");
if (!sonarResidual) warnings.push("Sonar residual readiness report for today is missing.");
if (!dockerHardening) warnings.push("Pinned docker hardening report is missing.");
if (warnings.length === 0) sections.push("- none");
for (const w of warnings) sections.push(`- ${w}`);

mkdirSync(reportDir, { recursive: true });
const outPath = join(reportDir, `release-readiness-${stamp}.md`);
writeFileSync(outPath, `${sections.join("\n")}\n`, "utf8");
console.log(`[release-readiness] report generated: ${outPath}`);
