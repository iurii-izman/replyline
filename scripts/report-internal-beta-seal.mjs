import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const COMMANDS = [
  { name: "verify:fast", command: ["pnpm", "verify:fast"], blocking: true },
  { name: "test:doc-links", command: ["pnpm", "test:doc-links"], blocking: true },
  { name: "copy:check", command: ["pnpm", "copy:check"], blocking: true },
  { name: "report:runtime-quality", command: ["pnpm", "report:runtime-quality"], blocking: true },
  { name: "report:product-quality", command: ["pnpm", "report:product-quality"], blocking: true },
  {
    name: "report:live-evidence-pack",
    command: ["pnpm", "report:live-evidence-pack"],
    blocking: true,
  },
  { name: "release:freeze:check", command: ["pnpm", "release:freeze:check"], blocking: true },
  {
    name: "report:release-readiness:strict",
    command: ["pnpm", "report:release-readiness:strict"],
    blocking: true,
  },
  { name: "test:e2e:desktop", command: ["pnpm", "test:e2e:desktop"], blocking: false },
];

function runCommand(spec) {
  const shellCommand = spec.command.join(" ");
  const result = spawnSync(shellCommand, {
    cwd: rootDir,
    encoding: "utf8",
    shell: true,
    windowsHide: true,
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  process.stdout.write(stdout);
  process.stderr.write(stderr);

  const output = `${stdout}\n${stderr}`;
  const skipped = result.status === 0 && /\[optional-lane\]\s+SKIP\b/iu.test(output);
  const status = skipped ? "skipped" : result.status === 0 ? "pass" : "fail";

  return {
    ...spec,
    shellCommand,
    status,
    exitCode: result.status ?? 1,
    output,
  };
}

function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function extractReleaseReadiness(stamp) {
  const path = join(rootDir, "reports", "release", `release-readiness-${stamp}.json`);
  const json = readJsonIfExists(path);
  return {
    path,
    present: Boolean(json),
    blockers: json?.blockers ?? [],
    warnings: json?.warnings ?? [],
    signedVerifiedPath: Boolean(json?.artifacts?.releaseWorkflow?.signedVerifiedPath),
  };
}

function extractLiveEvidence(stamp) {
  const path = join(rootDir, "reports", "manual", `live-evidence-pack-${stamp}.json`);
  const json = readJsonIfExists(path);
  const missingDimensions = json?.summary?.missingDimensions ?? {};
  const pendingRows = [];
  if ((missingDimensions.callApps ?? []).length > 0) {
    pendingRows.push(`missing call apps: ${missingDimensions.callApps.join(", ")}`);
  }
  if ((missingDimensions.scenarios ?? []).length > 0) {
    pendingRows.push(`missing scenarios: ${missingDimensions.scenarios.join(", ")}`);
  }
  if ((missingDimensions.multiMachineCoverage ?? []).length > 0) {
    pendingRows.push(`multi-machine: ${missingDimensions.multiMachineCoverage.join(", ")}`);
  }
  if ((missingDimensions.crossTesterCoverage ?? []).length > 0) {
    pendingRows.push(`cross-tester: ${missingDimensions.crossTesterCoverage.join(", ")}`);
  }
  return {
    path,
    present: Boolean(json),
    status: json?.status ?? "missing",
    pendingRows,
  };
}

function testerKitStatus() {
  const required = ["BETA_TESTING.md", "docs/engineering/manual-qa.md"];
  const missing = required.filter((rel) => !existsSync(join(rootDir, rel)));
  return { required, missing, ok: missing.length === 0 };
}

function main() {
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  const commitSha = spawnSync("git rev-parse HEAD", {
    cwd: rootDir,
    encoding: "utf8",
    shell: true,
    windowsHide: true,
  }).stdout.trim();

  const commandResults = COMMANDS.map(runCommand);
  const releaseReadiness = extractReleaseReadiness(stamp);
  const liveEvidence = extractLiveEvidence(stamp);
  const testerKit = testerKitStatus();

  const blockers = [];
  for (const row of commandResults) {
    if (row.blocking && row.status === "fail") {
      blockers.push(`blocking command failed: ${row.name}`);
    }
  }
  if (!testerKit.ok) {
    blockers.push(`tester kit missing required docs: ${testerKit.missing.join(", ")}`);
  }
  for (const rrBlocker of releaseReadiness.blockers) {
    blockers.push(`release-readiness blocker: ${rrBlocker}`);
  }

  const warnings = [];
  const optionalSkipped = commandResults
    .filter((row) => !row.blocking && row.status === "skipped")
    .map((row) => row.name);

  if (!releaseReadiness.signedVerifiedPath) {
    warnings.push(
      "signed binary path is not verified (warning for internal beta, blocker for RC/public).",
    );
  }

  const desktopLane = commandResults.find((row) => row.name === "test:e2e:desktop");
  if (desktopLane?.status === "skipped") {
    warnings.push("desktop E2E lane skipped (allowed for internal beta seal).");
  }
  if (desktopLane?.status === "fail") {
    warnings.push(
      "desktop E2E lane failed (optional for internal beta, investigate before RC/public).",
    );
  }

  if (liveEvidence.pendingRows.length > 0 || liveEvidence.status !== "partial_measured_evidence") {
    warnings.push(
      "live multi-machine evidence is pending and must be collected during tester cycle.",
    );
  }
  warnings.push("public beta readiness is not asserted by beta:seal and requires RC/public gates.");
  for (const rrWarn of releaseReadiness.warnings) {
    warnings.push(`release-readiness warning: ${rrWarn}`);
  }

  const dedupWarnings = [...new Set(warnings)];
  const status =
    blockers.length > 0 ? "blocked" : dedupWarnings.length > 0 ? "ready-with-warnings" : "ready";

  const reportLines = [
    "# Internal Beta Seal Report",
    "",
    `- status: ${status}`,
    `- commit: ${commitSha}`,
    `- generatedAt: ${now.toISOString()}`,
    "",
    "## Commands run",
    "| command | status | exit code | blocking |",
    "| --- | --- | ---: | --- |",
    ...commandResults.map(
      (row) => `| ${row.name} | ${row.status} | ${row.exitCode} | ${row.blocking ? "yes" : "no"} |`,
    ),
    "",
    "## Blockers",
    ...(blockers.length ? blockers.map((row) => `- ${row}`) : ["- none"]),
    "",
    "## Warnings",
    ...(dedupWarnings.length ? dedupWarnings.map((row) => `- ${row}`) : ["- none"]),
    "",
    "## Optional lanes skipped",
    ...(optionalSkipped.length ? optionalSkipped.map((row) => `- ${row}`) : ["- none"]),
    "",
    "## Pending live evidence",
    `- live-evidence report: ${liveEvidence.present ? "present" : "missing"}`,
    `- live-evidence status: ${liveEvidence.status}`,
    ...(liveEvidence.pendingRows.length
      ? liveEvidence.pendingRows.map((row) => `- ${row}`)
      : ["- none"]),
    "",
    "## Signed binary status",
    `- signed+verified release path: ${releaseReadiness.signedVerifiedPath ? "present" : "missing"}`,
    "",
    "## Desktop E2E status",
    `- test:e2e:desktop: ${desktopLane?.status ?? "not-run"}`,
    "- note: non-skipped desktop E2E is RC/public beta requirement.",
    "",
    "## Tester kit status",
    `- status: ${testerKit.ok ? "ready" : "missing-files"}`,
    ...(testerKit.ok ? ["- missing: none"] : testerKit.missing.map((row) => `- missing: ${row}`)),
    "",
    "## Public footprint status",
    `- verify:fast: ${commandResults.find((row) => row.name === "verify:fast")?.status ?? "not-run"}`,
    `- release-readiness blockers: ${releaseReadiness.blockers.length}`,
    "",
    "## Recommended next manual actions",
    "1. Start tester wave only when status is `ready` or `ready-with-warnings` and no blockers remain.",
    "2. Collect multi-machine live evidence rows and refresh `reports/manual/live-evidence-pack-YYYY-MM-DD.json`.",
    "3. For RC/public beta, run non-skipped desktop E2E required lane and provide signed binary evidence.",
  ];

  const releaseDir = join(rootDir, "reports", "release");
  mkdirSync(releaseDir, { recursive: true });
  const mdPath = join(releaseDir, `internal-beta-seal-${stamp}.md`);
  const jsonPath = join(releaseDir, `internal-beta-seal-${stamp}.json`);

  const jsonReport = {
    schema: "replyline.internal-beta-seal.v1",
    generatedAt: now.toISOString(),
    commitSha,
    status,
    commands: commandResults.map((row) => ({
      name: row.name,
      command: row.shellCommand,
      status: row.status,
      exitCode: row.exitCode,
      blocking: row.blocking,
    })),
    blockers,
    warnings: dedupWarnings,
    optionalSkipped,
    liveEvidence,
    signedBinary: {
      signedVerifiedPath: releaseReadiness.signedVerifiedPath,
      sourceReport: releaseReadiness.path,
    },
    testerKit,
    releaseReadiness,
  };

  writeFileSync(mdPath, `${reportLines.join("\n")}\n`, "utf8");
  writeFileSync(jsonPath, `${JSON.stringify(jsonReport, null, 2)}\n`, "utf8");

  console.log(`[internal-beta-seal] markdown: ${mdPath}`);
  console.log(`[internal-beta-seal] json: ${jsonPath}`);
  console.log(
    `[internal-beta-seal] status=${status} blockers=${blockers.length} warnings=${dedupWarnings.length}`,
  );

  if (status === "blocked") process.exit(1);
}

main();
