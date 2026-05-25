import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(__dirname, "..");
const REQUIRED_CALL_APPS = [
  "Zoom",
  "Microsoft Teams",
  "Google Meet",
  "Yandex Telemost",
  "Browser audio",
  "Local media playback/system audio fallback",
];
const REQUIRED_SCENARIOS = [
  "WorkConversation short capture",
  "WorkConversation medium capture",
  "Retry",
  "Interview Mode",
];

function latestMatchingPath(dirPath, prefix) {
  if (!existsSync(dirPath)) return null;
  const entries = readdirSync(dirPath)
    .filter((name) => name.startsWith(prefix))
    .map((name) => {
      const absPath = join(dirPath, name);
      return { name, absPath, mtimeMs: statSync(absPath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return entries[0] ?? null;
}

function toBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["yes", "true", "ok", "pass", "passed", "success", "successful"].includes(normalized);
  }
  return false;
}

function normalizeCallApp(value) {
  const text = String(value ?? "").trim();
  const low = text.toLowerCase();
  if (low.includes("zoom")) return "Zoom";
  if (low.includes("teams")) return "Microsoft Teams";
  if (low.includes("google meet") || low.includes("meet")) return "Google Meet";
  if (low.includes("telemost")) return "Yandex Telemost";
  if (low.includes("browser")) return "Browser audio";
  if (low.includes("local media") || low.includes("system audio")) {
    return "Local media playback/system audio fallback";
  }
  return text || "unknown";
}

function normalizeScenario(value) {
  const text = String(value ?? "").trim();
  const low = text.toLowerCase();
  if (low.includes("short")) return "WorkConversation short capture";
  if (low.includes("medium")) return "WorkConversation medium capture";
  if (low.includes("retry")) return "Retry";
  if (low.includes("interview")) return "Interview Mode";
  return text || "unknown";
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseEvidenceRows(json, sourcePath) {
  if (!json || typeof json !== "object") return [];
  if (Array.isArray(json)) return json.map((row) => ({ ...row, sourcePath }));
  if (Array.isArray(json.rows)) return json.rows.map((row) => ({ ...row, sourcePath }));
  if (json.row && typeof json.row === "object") return [{ ...json.row, sourcePath }];
  return [];
}

function listStructuredEvidenceFiles(reportsDir) {
  const manualDir = join(reportsDir, "manual");
  const candidates = [];
  if (!existsSync(manualDir)) return candidates;

  for (const entry of readdirSync(manualDir)) {
    if (extname(entry).toLowerCase() !== ".json") continue;
    if (entry.startsWith("live-evidence-pack-")) continue;
    if (!entry.includes("live-evidence")) continue;
    candidates.push(join(manualDir, entry));
  }

  const nestedDir = join(manualDir, "live-evidence");
  if (existsSync(nestedDir)) {
    for (const entry of readdirSync(nestedDir)) {
      if (extname(entry).toLowerCase() !== ".json") continue;
      candidates.push(join(nestedDir, entry));
    }
  }

  return candidates;
}

function collectEvidenceRows(reportsDir) {
  const files = listStructuredEvidenceFiles(reportsDir);
  const rows = [];
  const parseErrors = [];

  for (const filePath of files) {
    try {
      const parsed = readJson(filePath);
      rows.push(...parseEvidenceRows(parsed, resolve(filePath)));
    } catch (error) {
      parseErrors.push({ path: resolve(filePath), error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { files: files.map((path) => resolve(path)), rows, parseErrors };
}

function collectSummary(rows) {
  const uniqueTesters = new Set();
  const uniqueMachines = new Set();
  const callApps = new Set();
  const scenarios = new Set();
  const blockers = new Set();
  const missingFields = new Set();
  let successfulCaptures = 0;
  let failedCaptures = 0;
  let sttFailures = 0;
  let llmFailures = 0;
  let measuredLatencyEntries = 0;
  const usefulnessScores = [];

  const requiredFields = [
    "testerId",
    "machineProfile",
    "windowsVersion",
    "cpuRam",
    "audioDevice",
    "callApp",
    "appVersionOrBrowser",
    "scenarioType",
    "captureDuration",
    "sttProvider",
    "llmProviderModel",
    "sttSuccess",
    "llmSuccess",
    "cardGenerated",
    "usefulnessScore",
    "privacyConcern",
    "blocker",
    "artifactPath",
  ];

  for (const row of rows) {
    for (const field of requiredFields) {
      if (row[field] == null || row[field] === "") {
        missingFields.add(field);
      }
    }

    const testerId = String(row.testerId ?? "").trim();
    if (testerId) uniqueTesters.add(testerId);
    const machineProfile = String(row.machineProfile ?? "").trim();
    if (machineProfile) uniqueMachines.add(machineProfile);

    const callApp = normalizeCallApp(row.callApp);
    callApps.add(callApp);
    scenarios.add(normalizeScenario(row.scenarioType));

    const sttOk = toBool(row.sttSuccess);
    const llmOk = toBool(row.llmSuccess);
    const cardOk = toBool(row.cardGenerated);
    if (sttOk && llmOk && cardOk) successfulCaptures += 1;
    else failedCaptures += 1;
    if (!sttOk) sttFailures += 1;
    if (!llmOk) llmFailures += 1;

    if (row.releaseToCardLatencyMs != null && Number.isFinite(Number(row.releaseToCardLatencyMs))) {
      measuredLatencyEntries += 1;
    }

    const score = Number(row.usefulnessScore);
    if (Number.isFinite(score)) usefulnessScores.push(score);

    const blocker = String(row.blocker ?? "").trim();
    if (blocker && blocker.toLowerCase() !== "no" && blocker.toLowerCase() !== "none") {
      blockers.add(blocker);
    }
  }

  const missingCallApps = REQUIRED_CALL_APPS.filter((app) => !callApps.has(app));
  const missingScenarios = REQUIRED_SCENARIOS.filter((scenario) => !scenarios.has(scenario));
  const averageUsefulness =
    usefulnessScores.length > 0
      ? Number((usefulnessScores.reduce((sum, current) => sum + current, 0) / usefulnessScores.length).toFixed(2))
      : null;

  return {
    totalRows: rows.length,
    totalTesters: uniqueTesters.size,
    totalMachines: uniqueMachines.size,
    totalCallApps: callApps.size,
    successfulCaptures,
    failedCaptures,
    sttFailures,
    llmFailures,
    measuredLatencyEntries,
    usefulnessScores,
    averageUsefulness,
    blockers: Array.from(blockers),
    missingDimensions: {
      requiredFields: Array.from(missingFields),
      callApps: missingCallApps,
      scenarios: missingScenarios,
      multiMachineCoverage: uniqueMachines.size >= 2 ? [] : ["need at least 2 distinct machines"],
      crossTesterCoverage: uniqueTesters.size >= 2 ? [] : ["need at least 2 testers"],
    },
    coveredCallApps: Array.from(callApps).sort(),
  };
}

export function runLiveEvidencePackReport(options = {}) {
  const root = options.root ?? DEFAULT_ROOT;
  const now = options.now ?? new Date();
  const stamp = now.toISOString().slice(0, 10);
  const timestamp = now.toISOString().replace(/[-:]/gu, "").replace(/\..+$/u, "Z");
  const manualDir = join(root, "reports", "manual");
  const runtimeQualityDir = join(root, "reports", "runtime-quality");
  const productQualityDir = join(root, "reports", "product-quality");
  const runtimeRoot = join(root, "reports");
  const evidenceScan = collectEvidenceRows(runtimeRoot);
  const evidenceSummary = collectSummary(evidenceScan.rows);

  const runtimeSummaryMd = join(runtimeQualityDir, `runtime-quality-summary-${stamp}.md`);
  const productScenarioMd = join(productQualityDir, `product-scenario-benchmark-${stamp}.md`);
  const latestRuntimeBundle = latestMatchingPath(runtimeRoot, "runtime-evidence-");
  const latestLiveRuntimeEvidence = latestMatchingPath(runtimeRoot, "runtime-live-evidence-");
  const supportingRefs = [
    {
      id: "runtime_quality_summary_today",
      present: existsSync(runtimeSummaryMd),
      path: existsSync(runtimeSummaryMd) ? resolve(runtimeSummaryMd) : null,
    },
    {
      id: "product_scenario_benchmark_today",
      present: existsSync(productScenarioMd),
      path: existsSync(productScenarioMd) ? resolve(productScenarioMd) : null,
    },
    {
      id: "runtime_evidence_bundle_latest",
      present: Boolean(latestRuntimeBundle),
      path: latestRuntimeBundle ? resolve(latestRuntimeBundle.absPath) : null,
    },
    {
      id: "runtime_live_evidence_latest",
      present: Boolean(latestLiveRuntimeEvidence),
      path: latestLiveRuntimeEvidence ? resolve(latestLiveRuntimeEvidence.absPath) : null,
    },
  ];
  const measured = evidenceSummary.totalRows > 0 && evidenceSummary.measuredLatencyEntries > 0;
  const status = measured
    ? "partial_measured_evidence"
    : evidenceSummary.totalRows > 0
      ? "partial_pending_verification"
      : "pending_verification";

  const report = {
    schemaVersion: "replyline.live-evidence-pack.v2",
    generatedAt: now.toISOString(),
    stamp,
    timestamp,
    status,
    measured,
    summary: evidenceSummary,
    evidenceFiles: evidenceScan.files,
    parseErrors: evidenceScan.parseErrors,
    supportingRefs,
    privacy: {
      includesRawTranscript: false,
      includesSecrets: false,
      note: "This report aggregates only structured evidence metadata and does not require transcript bodies.",
    },
    claimGuardrails: {
      readinessClaim: measured ? "measured on covered rows only" : "pending verification",
      forbiddenClaims: [
        "live-call readiness everywhere",
        "works on every machine",
        "low latency without measured entries",
      ],
    },
  };

  mkdirSync(manualDir, { recursive: true });
  const jsonPath = join(manualDir, `live-evidence-pack-${stamp}.json`);
  const mdPath = join(manualDir, `live-evidence-pack-${stamp}.md`);
  const snapshotJsonPath = join(manualDir, `live-evidence-pack-${timestamp}.json`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(snapshotJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const md = [
    "# Live GUI/Provider Evidence Pack",
    "",
    `Generated at: ${report.generatedAt}`,
    `Stamp: ${stamp}`,
    `Status: ${status}`,
    `Measured evidence present: ${measured ? "yes" : "no"}`,
    "",
    "## Coverage Summary",
    `- total testers: ${evidenceSummary.totalTesters}`,
    `- total machines: ${evidenceSummary.totalMachines}`,
    `- total call apps: ${evidenceSummary.totalCallApps}`,
    `- successful captures: ${evidenceSummary.successfulCaptures}`,
    `- failed captures: ${evidenceSummary.failedCaptures}`,
    `- STT failures: ${evidenceSummary.sttFailures}`,
    `- LLM failures: ${evidenceSummary.llmFailures}`,
    `- measured latency entries: ${evidenceSummary.measuredLatencyEntries}`,
    `- usefulness scores: ${evidenceSummary.usefulnessScores.length ? evidenceSummary.usefulnessScores.join(", ") : "none"}`,
    `- usefulness average: ${evidenceSummary.averageUsefulness ?? "n/a"}`,
    `- blockers: ${evidenceSummary.blockers.length ? evidenceSummary.blockers.join(" | ") : "none"}`,
    "",
    "## Structured Evidence Files",
    ...(evidenceScan.files.length === 0 ? ["- none found"] : evidenceScan.files.map((path) => `- ${path}`)),
    "",
    "## Missing Dimensions",
    `- required fields missing: ${evidenceSummary.missingDimensions.requiredFields.length ? evidenceSummary.missingDimensions.requiredFields.join(", ") : "none"}`,
    `- missing call apps: ${evidenceSummary.missingDimensions.callApps.length ? evidenceSummary.missingDimensions.callApps.join(", ") : "none"}`,
    `- missing scenarios: ${evidenceSummary.missingDimensions.scenarios.length ? evidenceSummary.missingDimensions.scenarios.join(", ") : "none"}`,
    `- multi-machine coverage: ${evidenceSummary.missingDimensions.multiMachineCoverage.length ? evidenceSummary.missingDimensions.multiMachineCoverage.join(", ") : "ok"}`,
    `- cross-tester coverage: ${evidenceSummary.missingDimensions.crossTesterCoverage.length ? evidenceSummary.missingDimensions.crossTesterCoverage.join(", ") : "ok"}`,
    "",
    "## Supporting Runtime Artifacts",
    "| id | present | path |",
    "| --- | --- | --- |",
    ...supportingRefs.map((item) => `| ${item.id} | ${item.present ? "yes" : "no"} | ${item.path ?? "n/a"} |`),
    "",
    "## Pending Verification Guardrail",
    measured
      ? "- Measured latency exists for covered rows only; do not generalize to unsupported machines/apps."
      : "- No measured latency entries found; readiness stays pending verification.",
    "",
  ];
  writeFileSync(mdPath, `${md.join("\n")}\n`, "utf8");

  return {
    pass: true,
    stamp,
    jsonPath,
    mdPath,
    snapshotJsonPath,
    requiredAutomatedMissing: [],
    status,
  };
}

function runCli() {
  const result = runLiveEvidencePackReport();
  console.log(`[live-evidence-pack] markdown: ${result.mdPath}`);
  console.log(`[live-evidence-pack] json: ${result.jsonPath}`);
  console.log(`[live-evidence-pack] snapshot: ${result.snapshotJsonPath}`);
  console.log(`[live-evidence-pack] status=${result.status}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli();
}
