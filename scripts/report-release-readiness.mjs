import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scanReportSecretLeaks } from "./check-report-secret-leaks.mjs";
import { runSonarResidualReadiness } from "./report-sonar-residual-readiness.mjs";
import { runLiveEvidencePackReport } from "./report-live-evidence-pack.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(__dirname, "..");

const REQUIRED_SCRIPTS = [
  "verify:fast",
  "verify:full",
  "verify:release-local",
  "test:security-lanes",
  "test:public-footprint",
  "test:runtime-quality",
  "report:sonar-residual",
  "report:live-evidence-pack",
];

const REQUIRED_SCRIPT_FILES = [
  "scripts/check-public-footprint.mjs",
  "scripts/check-report-secret-leaks.mjs",
  "scripts/check-release-freeze.mjs",
  "scripts/report-runtime-quality-summary.mjs",
  "scripts/report-sonar-residual-readiness.mjs",
  "scripts/report-live-evidence-pack.mjs",
  "scripts/report-release-readiness.mjs",
];

const WEIGHTS = {
  runtimeQualityAutomation: 20,
  productScenarioCoverage: 15,
  securityAndPublicFootprint: 20,
  sonarReadiness: 15,
  releaseGatesAndFreeze: 20,
  dockerOptionalStack: 5,
  manualEvidenceGap: 5,
};

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function readText(path) {
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

function hasScript(pkg, name) {
  return Object.prototype.hasOwnProperty.call(pkg.scripts ?? {}, name);
}

function statusFromScore(score) {
  if (score < 60) return "block";
  if (score < 85) return "warn";
  return "pass";
}

function extractScriptFileRefs(command) {
  const refs = [];
  if (!command) return refs;

  const nodePattern = /(?:^|\s)node\s+((?:"[^"]+"|'[^']+'|[^\s;&|])+\.(?:mjs|cjs|js))/giu;
  const pwshPattern =
    /(?:^|\s)pwsh(?:\s+-[\w:]+(?:\s+[^\s;&|]+)?)*\s+-File\s+((?:"[^"]+"|'[^']+'|[^\s;&|])+\.ps1)/giu;

  for (const pattern of [nodePattern, pwshPattern]) {
    let match;
    while ((match = pattern.exec(command)) !== null) {
      refs.push(match[1].replace(/^['"]|['"]$/g, ""));
    }
  }

  return refs;
}

function validateScriptFileRefs(root, pkg, blockers) {
  const refs = new Set(REQUIRED_SCRIPT_FILES);
  const missing = [];

  for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
    for (const scriptFile of extractScriptFileRefs(command)) {
      refs.add(scriptFile);
      const abs = resolve(root, scriptFile);
      if (!existsSync(abs)) {
        missing.push({ scriptName: name, scriptFile });
      }
    }
  }

  for (const requiredFile of REQUIRED_SCRIPT_FILES) {
    if (!existsSync(resolve(root, requiredFile))) {
      blockers.push(`Missing required script file: ${requiredFile}`);
    }
  }

  for (const miss of missing) {
    blockers.push(
      `package.json script "${miss.scriptName}" references missing file: ${miss.scriptFile}`,
    );
  }

  return { scannedScriptFiles: [...refs].sort(), missingScriptRefs: missing };
}

function buildRiskSnapshot(state, blockers, warnings) {
  const rows = [];

  const runtimeScore = state.runtimeSummaryToday ? 100 : 40;
  rows.push({
    area: "Runtime quality automation",
    score: runtimeScore,
    status: runtimeScore >= 85 ? "pass" : "block",
    reason: state.runtimeSummaryToday
      ? "runtime-quality summary for today is present"
      : "runtime-quality summary for today is missing",
  });

  const productScore = state.hasProductScenarioScript
    ? state.productScenarioToday
      ? 100
      : 40
    : 90;
  rows.push({
    area: "Product scenario coverage",
    score: productScore,
    status: state.hasProductScenarioScript
      ? state.productScenarioToday
        ? "pass"
        : "block"
      : "warn",
    reason: state.hasProductScenarioScript
      ? state.productScenarioToday
        ? "product scenario benchmark for today is present"
        : "product scenario benchmark for today is missing"
      : "product scenarios lane is not configured",
  });

  const securityScore =
    state.hasSecurityScript && state.hasPublicFootprintScript && state.hasSecretLeakScript
      ? 100
      : 45;
  rows.push({
    area: "Security lanes",
    score: securityScore,
    status: securityScore >= 85 ? "pass" : "block",
    reason:
      securityScore >= 85
        ? "security/public-footprint scripts are configured"
        : "required security/public-footprint scripts are missing",
  });

  const publicFootprintScore =
    state.hasPublicFootprintCheckFile && state.secretLeakViolations.length === 0 ? 100 : 45;
  rows.push({
    area: "Public footprint",
    score: publicFootprintScore,
    status: publicFootprintScore >= 85 ? "pass" : "block",
    reason:
      publicFootprintScore >= 85
        ? "public footprint config and secret scan are clean"
        : "public footprint config missing or secret-like patterns detected",
  });

  const sonarScore = state.sonarConfigPresent ? (state.sonarResidualToday ? 100 : 75) : 40;
  rows.push({
    area: "Sonar readiness",
    score: sonarScore,
    status: sonarScore >= 85 ? "pass" : sonarScore >= 60 ? "warn" : "block",
    reason: !state.sonarConfigPresent
      ? "sonar-project.properties is missing"
      : state.sonarResidualToday
        ? "sonar residual report for today is present"
        : "sonar residual report is stale (today file missing)",
  });

  const dockerScore = state.dockerHardeningReport ? 75 : 60;
  rows.push({
    area: "Docker optional stack",
    score: dockerScore,
    status: "warn",
    reason: state.dockerHardeningReport
      ? "docker hardening evidence present, strict check remains external"
      : "docker hardening report missing, strict check remains external",
  });

  const freezeScore = state.freezeHasOutsideGuardrails ? 30 : state.freezePresent ? 100 : 50;
  rows.push({
    area: "Release freeze",
    score: freezeScore,
    status: freezeScore >= 85 ? "pass" : freezeScore >= 60 ? "warn" : "block",
    reason: !state.freezePresent
      ? "release-freeze-check.json missing"
      : state.freezeHasOutsideGuardrails
        ? "release freeze reports outside guardrails"
        : "release freeze is within guardrails",
  });

  rows.push({
    area: "Manual evidence gap",
    score: 60,
    status: "warn",
    reason:
      "manual GUI/provider steps are formalized in structured attestation; external docker strict remains manual",
  });

  const weightedTotal =
    rows.find((x) => x.area === "Runtime quality automation").score *
      WEIGHTS.runtimeQualityAutomation +
    rows.find((x) => x.area === "Product scenario coverage").score *
      WEIGHTS.productScenarioCoverage +
    ((rows.find((x) => x.area === "Security lanes").score +
      rows.find((x) => x.area === "Public footprint").score) /
      2) *
      WEIGHTS.securityAndPublicFootprint +
    rows.find((x) => x.area === "Sonar readiness").score * WEIGHTS.sonarReadiness +
    rows.find((x) => x.area === "Release freeze").score * WEIGHTS.releaseGatesAndFreeze +
    rows.find((x) => x.area === "Docker optional stack").score * WEIGHTS.dockerOptionalStack +
    rows.find((x) => x.area === "Manual evidence gap").score * WEIGHTS.manualEvidenceGap;

  const overallScore = Math.round(weightedTotal / 100);
  const overallStatus =
    blockers.length > 0 ? "block" : warnings.length > 0 ? "warn" : statusFromScore(overallScore);

  return { rows, overallScore, overallStatus };
}

export function runReleaseReadiness(options = {}) {
  const strict = Boolean(options.strict);
  const root = options.root ?? DEFAULT_ROOT;
  const now = options.now ?? new Date();
  const stamp = now.toISOString().slice(0, 10);

  const pkgPath = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const releaseDir = join(root, "reports", "release");
  const jsonOutPath = join(releaseDir, `release-readiness-${stamp}.json`);
  const mdOutPath = join(releaseDir, `release-readiness-${stamp}.md`);

  const freeze = readJson(join(root, "reports", "release-freeze-check.json"));
  const sonarConfigPresent = existsSync(join(root, "sonar-project.properties"));
  const sonarResidualReport = runSonarResidualReadiness({ root, now });
  const liveEvidencePack = runLiveEvidencePackReport({ root, now });
  const sonarResidualToday = existsSync(
    join(root, "reports", "sonar", `sonar-residual-readiness-${stamp}.md`),
  );
  const runtimeSummaryToday = existsSync(
    join(root, "reports", "runtime-quality", `runtime-quality-summary-${stamp}.md`),
  );
  const productScenarioToday = existsSync(
    join(root, "reports", "product-quality", `product-scenario-benchmark-${stamp}.md`),
  );
  const dockerHardeningReport = existsSync(
    join(root, "reports", "docker", "docker-stack-hardening-2026-05-21.md"),
  );

  const blockers = [];
  const warnings = [];

  for (const scriptName of REQUIRED_SCRIPTS) {
    if (!hasScript(pkg, scriptName)) blockers.push(`Missing required script: ${scriptName}`);
  }

  if (!hasScript(pkg, "test:product-scenarios")) {
    warnings.push("test:product-scenarios is not configured.");
  }

  if (!hasScript(pkg, "report:release-readiness")) {
    blockers.push("Missing required script: report:release-readiness");
  }

  const verifyFast = pkg.scripts?.["verify:fast"] ?? "";
  if (
    !verifyFast ||
    !verifyFast.includes("pnpm smoke") ||
    !verifyFast.includes("pnpm test:security-lanes") ||
    !verifyFast.includes("pnpm test:public-footprint")
  ) {
    blockers.push(
      "verify:fast is missing or weakened (must include smoke + security-lanes + public-footprint).",
    );
  }

  if (!sonarConfigPresent) {
    blockers.push("Missing sonar-project.properties while Sonar readiness is part of policy.");
  }
  if (!sonarResidualReport.pass) {
    blockers.push("Sonar residual readiness report generation failed policy checks.");
  }

  if (!runtimeSummaryToday) {
    blockers.push("Missing runtime quality summary for today.");
  }

  const hasProductScenarioScript = hasScript(pkg, "test:product-scenarios");
  if (hasProductScenarioScript && !productScenarioToday) {
    blockers.push("Missing product scenario benchmark report for today.");
  }

  if (!existsSync(join(root, "scripts", "check-public-footprint.mjs"))) {
    blockers.push("Public footprint test config missing: scripts/check-public-footprint.mjs");
  }
  if (!existsSync(join(root, "scripts", "check-report-secret-leaks.mjs"))) {
    blockers.push("Report secret leak scan script missing: scripts/check-report-secret-leaks.mjs");
  }

  const freezePresent = Boolean(freeze);
  const freezeHasOutsideGuardrails = Boolean(
    freeze &&
    ((freeze.outsideGuardrails?.length ?? 0) > 0 || (freeze.outsideFreeze?.length ?? 0) > 0),
  );
  if (freezeHasOutsideGuardrails) {
    blockers.push("Release freeze report has files outside guardrails.");
  }

  if (!sonarResidualToday && sonarConfigPresent) {
    blockers.push("Sonar residual readiness report for today is missing after auto-generation.");
  }
  if (!liveEvidencePack.pass) {
    blockers.push("Live evidence pack is missing required automated artifacts.");
  }

  warnings.push(
    "docker:replyline:check:strict is external-state/manual and not part of strict local blocker.",
  );
  warnings.push(
    "Live GUI/provider evidence requires manual attestation rows in reports/manual/live-evidence-pack-YYYY-MM-DD.json.",
  );

  const secretLeakScan = scanReportSecretLeaks({ repoRoot: root });
  if (secretLeakScan.violations.length > 0) {
    blockers.push("Secret-like patterns detected in reports/docs/.env.docker.example.");
  }

  if (existsSync(join(root, ".env"))) {
    blockers.push(
      "Tracked/working .env file detected in repository root; keep secrets local-only.",
    );
  }

  const envDockerExample = readText(join(root, ".env.docker.example"));
  if (envDockerExample) {
    const suspiciousEnvValue =
      /(?:OPENAI_API_KEY|DEEPGRAM_API_KEY|LANGFUSE_SECRET_KEY|POSTGRES_PASSWORD)\s*=\s*(?!\s*(?:\[redacted\]|change-me|placeholder|example|<value>|your[_-]|fake|local-id))/i;
    if (suspiciousEnvValue.test(envDockerExample)) {
      blockers.push(".env.docker.example contains non-placeholder secret-looking values.");
    }
  }

  const scriptRefValidation = validateScriptFileRefs(root, pkg, blockers);

  const state = {
    runtimeSummaryToday,
    hasProductScenarioScript,
    productScenarioToday,
    hasSecurityScript: hasScript(pkg, "test:security-lanes"),
    hasPublicFootprintScript: hasScript(pkg, "test:public-footprint"),
    hasSecretLeakScript:
      hasScript(pkg, "test:report-secret-leaks") || hasScript(pkg, "test:public-footprint"),
    hasPublicFootprintCheckFile: existsSync(join(root, "scripts", "check-public-footprint.mjs")),
    secretLeakViolations: secretLeakScan.violations,
    sonarConfigPresent,
    sonarResidualToday,
    dockerHardeningReport,
    freezePresent,
    freezeHasOutsideGuardrails,
    liveEvidencePackPass: liveEvidencePack.pass,
  };

  const risk = buildRiskSnapshot(state, blockers, warnings);

  const riskRowsMd = risk.rows
    .map((row) => `| ${row.area} | ${row.score} | ${row.status} | ${row.reason} |`)
    .join("\n");

  const mdLines = [
    "# Release Readiness Summary",
    "",
    `Generated at: ${now.toISOString()}`,
    `Strict mode: ${strict ? "enabled" : "disabled"}`,
    "",
    "## Release Gate Snapshot",
    `- blockers: ${blockers.length}`,
    `- warnings: ${warnings.length}`,
    `- overall score: ${risk.overallScore}`,
    `- overall status: ${risk.overallStatus}`,
    "",
    "## Required Script Presence",
    ...REQUIRED_SCRIPTS.map((name) => `- ${name}: ${hasScript(pkg, name) ? "present" : "missing"}`),
    "",
    "## Script File Link Validation",
    `- scanned referenced script files: ${scriptRefValidation.scannedScriptFiles.length}`,
    `- missing referenced files: ${scriptRefValidation.missingScriptRefs.length}`,
    "",
    "## Artifact Presence",
    `- runtime-quality summary (${stamp}): ${runtimeSummaryToday ? "present" : "missing"}`,
    `- product-scenario benchmark (${stamp}): ${productScenarioToday ? "present" : "missing"}`,
    `- sonar residual report (${stamp}): ${sonarResidualToday ? "present" : "missing"}`,
    `- live evidence pack (${stamp}): ${liveEvidencePack.pass ? "present+structured" : "missing-required-automation"}`,
    `- release freeze report: ${freezePresent ? "present" : "missing"}`,
    `- docker hardening report: ${dockerHardeningReport ? "present" : "missing"}`,
    "",
    "## Risk Snapshot",
    "| Area | Score | Status | Reason |",
    "| --- | ---: | --- | --- |",
    riskRowsMd,
    "",
    "## Blockers",
    ...(blockers.length === 0 ? ["- none"] : blockers.map((b) => `- ${b}`)),
    "",
    "## Warnings",
    ...(warnings.length === 0 ? ["- none"] : warnings.map((w) => `- ${w}`)),
    "",
  ];

  mkdirSync(releaseDir, { recursive: true });
  writeFileSync(mdOutPath, `${mdLines.join("\n")}\n`, "utf8");

  const jsonReport = {
    generatedAt: now.toISOString(),
    strict,
    pass: blockers.length === 0,
    overallScore: risk.overallScore,
    overallStatus: risk.overallStatus,
    blockers,
    warnings,
    riskSnapshot: risk.rows,
    requiredScripts: Object.fromEntries(
      REQUIRED_SCRIPTS.map((name) => [name, hasScript(pkg, name)]),
    ),
    artifacts: {
      runtimeQualitySummaryToday: runtimeSummaryToday,
      productScenarioBenchmarkToday: productScenarioToday,
      sonarResidualToday,
      liveEvidencePack: {
        pass: liveEvidencePack.pass,
        jsonPath: liveEvidencePack.jsonPath,
        mdPath: liveEvidencePack.mdPath,
        requiredAutomatedMissing: liveEvidencePack.requiredAutomatedMissing,
      },
      freezeReportPresent: freezePresent,
      dockerHardeningReport,
    },
    scriptFileValidation: scriptRefValidation,
    secretLeakScan,
  };

  writeFileSync(jsonOutPath, `${JSON.stringify(jsonReport, null, 2)}\n`, "utf8");

  return {
    strict,
    stamp,
    blockers,
    warnings,
    overallScore: risk.overallScore,
    overallStatus: risk.overallStatus,
    mdOutPath,
    jsonOutPath,
  };
}

function runCli() {
  const strict = process.argv.includes("--strict");
  const result = runReleaseReadiness({ strict });

  console.log(`[release-readiness] markdown: ${result.mdOutPath}`);
  console.log(`[release-readiness] json: ${result.jsonOutPath}`);
  console.log(
    `[release-readiness] blockers=${result.blockers.length} warnings=${result.warnings.length} overallScore=${result.overallScore}`,
  );

  if (strict && result.blockers.length > 0) {
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli();
}
