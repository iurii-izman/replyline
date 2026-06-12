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
  "scripts:lifecycle",
  "test:security-lanes",
  "test:public-footprint",
  "test:runtime-quality",
  "report:sonar-residual",
  "report:live-evidence-pack",
];

const RELEASE_STAGES = new Set(["internal", "rc", "public"]);

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
  manualEvidenceGap: 10,
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

function tokenizeShellCommand(command) {
  const tokens = [];
  let current = "";
  let quote = null;

  const flush = () => {
    if (current) {
      tokens.push(current);
      current = "";
    }
  };

  for (const char of command) {
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
    } else if (/\s/u.test(char)) {
      flush();
    } else if (";&|".includes(char)) {
      flush();
      tokens.push(char);
    } else {
      current += char;
    }
  }

  flush();
  return tokens;
}

function isCommandBoundary(token) {
  return token === ";" || token === "&" || token === "|";
}

function executableName(token) {
  return token.toLowerCase().split(/[\\/]/u).at(-1);
}

export function extractScriptFileRefs(command) {
  const refs = [];
  if (!command) return refs;

  const tokens = tokenizeShellCommand(command);
  for (let index = 0; index < tokens.length; index += 1) {
    const executable = executableName(tokens[index]);

    if (executable === "node" || executable === "node.exe") {
      for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
        if (isCommandBoundary(tokens[cursor])) break;
        if (/\.(?:mjs|cjs|js)$/iu.test(tokens[cursor])) {
          refs.push(tokens[cursor]);
          break;
        }
      }
    }

    if (
      executable === "pwsh" ||
      executable === "pwsh.exe" ||
      executable === "powershell" ||
      executable === "powershell.exe"
    ) {
      for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
        if (isCommandBoundary(tokens[cursor])) break;
        if (tokens[cursor].toLowerCase() === "-file" && tokens[cursor + 1]) {
          refs.push(tokens[cursor + 1]);
          break;
        }
      }
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
    reason: "manual GUI/provider steps require structured external tester evidence",
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
    rows.find((x) => x.area === "Manual evidence gap").score * WEIGHTS.manualEvidenceGap;

  const overallScore = Math.round(weightedTotal / 100);
  const overallStatus =
    blockers.length > 0 ? "block" : warnings.length > 0 ? "warn" : statusFromScore(overallScore);

  return { rows, overallScore, overallStatus };
}

export function runReleaseReadiness(options = {}) {
  const strict = Boolean(options.strict);
  const betaStageRaw = (options.betaStage ?? process.env.RELEASE_BETA_STAGE ?? "internal")
    .toString()
    .toLowerCase();
  const betaStage = RELEASE_STAGES.has(betaStageRaw) ? betaStageRaw : "internal";
  const root = options.root ?? DEFAULT_ROOT;
  const now = options.now ?? new Date();
  const stamp = now.toISOString().slice(0, 10);

  const pkgPath = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const releaseWorkflowPath = join(root, ".github", "workflows", "release-on-tag.yml");
  const releaseWorkflowText = readText(releaseWorkflowPath) ?? "";
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
  const hasReleaseArtifactBuild =
    releaseWorkflowText.includes("windows-artifact") &&
    releaseWorkflowText.includes("pnpm tauri build");
  const hasUnsignedReleasePath =
    releaseWorkflowText.includes("windows-internal-unsigned") ||
    (releaseWorkflowText.includes("internal-unsigned") &&
      releaseWorkflowText.includes("artifactName") &&
      releaseWorkflowText.includes("posture"));
  const hasSignedReleasePath =
    releaseWorkflowText.includes("windows-signed") &&
    releaseWorkflowText.includes("Get-AuthenticodeSignature");

  const blockers = [];
  const warnings = [];
  const staticGateBlockers = [];
  const dependencySecurityBlockers = [];
  const runtimeArtifactBlockers = [];
  const releaseFreezeBlockers = [];

  for (const scriptName of REQUIRED_SCRIPTS) {
    if (!hasScript(pkg, scriptName)) {
      const msg = `Missing required script: ${scriptName}`;
      blockers.push(msg);
      staticGateBlockers.push(msg);
    }
  }

  if (!hasScript(pkg, "test:product-scenarios")) {
    warnings.push("test:product-scenarios is not configured.");
  }

  if (!hasScript(pkg, "report:release-readiness")) {
    const msg = "Missing required script: report:release-readiness";
    blockers.push(msg);
    staticGateBlockers.push(msg);
  }

  const hasDesktopOptionalLane = hasScript(pkg, "test:e2e:desktop");
  const hasDesktopRequiredLane = hasScript(pkg, "test:e2e:desktop:required");
  if (!hasDesktopOptionalLane) {
    const msg = "Desktop optional lane script is missing: test:e2e:desktop";
    blockers.push(msg);
    staticGateBlockers.push(msg);
  }
  if (!hasDesktopRequiredLane) {
    const msg = "Desktop required lane script is missing: test:e2e:desktop:required";
    if (betaStage === "rc" || betaStage === "public") {
      blockers.push(msg);
      staticGateBlockers.push(msg);
    } else {
      warnings.push(`${msg} (required only for RC/public beta stage)`);
    }
  }

  const verifyFast = pkg.scripts?.["verify:fast"] ?? "";
  if (
    !verifyFast ||
    !verifyFast.includes("pnpm smoke") ||
    !verifyFast.includes("pnpm test:security-lanes") ||
    !verifyFast.includes("pnpm test:public-footprint")
  ) {
    const msg =
      "verify:fast is missing or weakened (must include smoke + security-lanes + public-footprint).";
    blockers.push(msg);
    staticGateBlockers.push(msg);
  }

  if (!sonarConfigPresent) {
    const msg = "Missing sonar-project.properties while Sonar readiness is part of policy.";
    blockers.push(msg);
    dependencySecurityBlockers.push(msg);
  }
  if (!sonarResidualReport.pass) {
    const msg = "Sonar residual readiness report generation failed policy checks.";
    blockers.push(msg);
    dependencySecurityBlockers.push(msg);
  }

  if (!runtimeSummaryToday) {
    const msg = "Missing runtime quality summary for today.";
    blockers.push(msg);
    runtimeArtifactBlockers.push(msg);
  }

  const hasProductScenarioScript = hasScript(pkg, "test:product-scenarios");
  if (hasProductScenarioScript && !productScenarioToday) {
    const msg = "Missing product scenario benchmark report for today.";
    blockers.push(msg);
    runtimeArtifactBlockers.push(msg);
  }

  if (!existsSync(join(root, "scripts", "check-public-footprint.mjs"))) {
    const msg = "Public footprint test config missing: scripts/check-public-footprint.mjs";
    blockers.push(msg);
    dependencySecurityBlockers.push(msg);
  }
  if (!existsSync(join(root, "scripts", "check-report-secret-leaks.mjs"))) {
    const msg = "Report secret leak scan script missing: scripts/check-report-secret-leaks.mjs";
    blockers.push(msg);
    dependencySecurityBlockers.push(msg);
  }

  const freezePresent = Boolean(freeze);
  const freezeHasOutsideGuardrails = Boolean(
    freeze &&
    ((freeze.outsideGuardrails?.length ?? 0) > 0 || (freeze.outsideFreeze?.length ?? 0) > 0),
  );
  if (freezeHasOutsideGuardrails) {
    const msg = "Release freeze report has files outside guardrails.";
    blockers.push(msg);
    releaseFreezeBlockers.push(msg);
  }

  if (!sonarResidualToday && sonarConfigPresent) {
    const msg = "Sonar residual readiness report for today is missing after auto-generation.";
    blockers.push(msg);
    dependencySecurityBlockers.push(msg);
  }
  if (!liveEvidencePack.pass) {
    const msg = "Live evidence pack is missing required automated artifacts.";
    blockers.push(msg);
    runtimeArtifactBlockers.push(msg);
  }

  if (!hasReleaseArtifactBuild) {
    const msg = "release-on-tag workflow is missing Windows release artifact build/upload path.";
    blockers.push(msg);
    staticGateBlockers.push(msg);
  }

  if (!hasUnsignedReleasePath) {
    const msg = "release-on-tag workflow is missing explicit internal-unsigned artifact labeling.";
    blockers.push(msg);
    staticGateBlockers.push(msg);
  }

  if (!hasSignedReleasePath) {
    const msg =
      "release-on-tag workflow is missing verified signed artifact path (naming + Authenticode check).";
    if (betaStage === "rc" || betaStage === "public") {
      blockers.push(msg);
      staticGateBlockers.push(msg);
    } else {
      warnings.push(`${msg} (required only for RC/public beta stage)`);
    }
  }

  warnings.push(
    "Live GUI/provider evidence requires manual attestation rows in reports/manual/live-evidence-pack-YYYY-MM-DD.json.",
  );

  const secretLeakScan = scanReportSecretLeaks({ repoRoot: root });
  if (secretLeakScan.violations.length > 0) {
    const msg = "Secret-like patterns detected in reports/docs.";
    blockers.push(msg);
    dependencySecurityBlockers.push(msg);
  }

  if (existsSync(join(root, ".env"))) {
    const msg = "Tracked/working .env file detected in repository root; keep secrets local-only.";
    blockers.push(msg);
    dependencySecurityBlockers.push(msg);
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
    `Release stage: ${betaStage}`,
    "",
    "## Release Gate Snapshot",
    `- blockers: ${blockers.length}`,
    `- warnings: ${warnings.length}`,
    `- overall score: ${risk.overallScore}`,
    `- overall status: ${risk.overallStatus}`,
    "",
    "## Gate Domains",
    `- static gate blockers: ${staticGateBlockers.length}`,
    `- dependency/security blockers: ${dependencySecurityBlockers.length}`,
    `- runtime evidence blockers: ${runtimeArtifactBlockers.length}`,
    `- release-freeze blockers: ${releaseFreezeBlockers.length}`,
    "",
    "## Required Script Presence",
    ...REQUIRED_SCRIPTS.map((name) => `- ${name}: ${hasScript(pkg, name) ? "present" : "missing"}`),
    `- test:e2e:desktop (optional lane): ${hasDesktopOptionalLane ? "present" : "missing"}`,
    `- test:e2e:desktop:required (required lane): ${hasDesktopRequiredLane ? "present" : "missing"}`,
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
    `- release-on-tag windows artifact build path: ${hasReleaseArtifactBuild ? "present" : "missing"}`,
    `- release-on-tag internal unsigned labeling: ${hasUnsignedReleasePath ? "present" : "missing"}`,
    `- release-on-tag signed+verified path: ${hasSignedReleasePath ? "present" : "missing"}`,
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
    betaStage,
    pass: blockers.length === 0,
    overallScore: risk.overallScore,
    overallStatus: risk.overallStatus,
    blockers,
    warnings,
    riskSnapshot: risk.rows,
    requiredScripts: Object.fromEntries(
      REQUIRED_SCRIPTS.map((name) => [name, hasScript(pkg, name)]),
    ),
    desktopE2EPolicy: {
      optionalLaneScriptPresent: hasDesktopOptionalLane,
      requiredLaneScriptPresent: hasDesktopRequiredLane,
      requiredForStage: betaStage === "rc" || betaStage === "public",
    },
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
      releaseWorkflow: {
        path: releaseWorkflowPath,
        windowsArtifactBuildPath: hasReleaseArtifactBuild,
        internalUnsignedLabeling: hasUnsignedReleasePath,
        signedVerifiedPath: hasSignedReleasePath,
      },
    },
    gateDomains: {
      staticGates: staticGateBlockers,
      dependencySecurity: dependencySecurityBlockers,
      runtimeEvidence: runtimeArtifactBlockers,
      releaseFreeze: releaseFreezeBlockers,
      missingRuntimeArtifacts: {
        runtimeQualitySummaryToday: !runtimeSummaryToday,
        productScenarioBenchmarkToday: hasProductScenarioScript && !productScenarioToday,
        liveEvidencePackAutomation: !liveEvidencePack.pass,
      },
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
  const betaStageArgIndex = process.argv.findIndex((arg) => arg === "--beta-stage");
  const betaStage =
    betaStageArgIndex >= 0 && process.argv[betaStageArgIndex + 1]
      ? process.argv[betaStageArgIndex + 1]
      : undefined;
  const result = runReleaseReadiness({ strict, betaStage });

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
