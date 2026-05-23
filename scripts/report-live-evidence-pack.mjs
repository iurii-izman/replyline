import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(__dirname, "..");

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

function mustChecklistRow(id, title, requiredInStrict, reason) {
  return {
    id,
    title,
    requiredInStrict,
    status: "pending",
    attestation: {
      required: true,
      type: "checklist",
      note: reason,
      verifiedBy: null,
      verifiedAt: null,
    },
    evidenceRefs: [],
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

  const runtimeSummaryMd = join(runtimeQualityDir, `runtime-quality-summary-${stamp}.md`);
  const productScenarioMd = join(productQualityDir, `product-scenario-benchmark-${stamp}.md`);
  const latestRuntimeBundle = latestMatchingPath(runtimeRoot, "runtime-evidence-");
  const latestLiveRuntimeEvidence = latestMatchingPath(runtimeRoot, "runtime-live-evidence-");
  const closurePackHtml = join(root, "docs", "manual-closure-pack.html");

  const automatedRefs = [
    {
      id: "runtime_quality_summary",
      requiredInStrict: true,
      present: existsSync(runtimeSummaryMd),
      path: "reports/runtime-quality/runtime-quality-summary-YYYY-MM-DD.md".replace(
        "YYYY-MM-DD",
        stamp,
      ),
    },
    {
      id: "product_scenario_benchmark",
      requiredInStrict: true,
      present: existsSync(productScenarioMd),
      path: "reports/product-quality/product-scenario-benchmark-YYYY-MM-DD.md".replace(
        "YYYY-MM-DD",
        stamp,
      ),
    },
    {
      id: "runtime_evidence_bundle_latest",
      requiredInStrict: false,
      present: Boolean(latestRuntimeBundle),
      path: latestRuntimeBundle ? resolve(latestRuntimeBundle.absPath) : null,
      timestamp: latestRuntimeBundle ? new Date(latestRuntimeBundle.mtimeMs).toISOString() : null,
    },
    {
      id: "runtime_live_evidence_latest",
      requiredInStrict: false,
      present: Boolean(latestLiveRuntimeEvidence),
      path: latestLiveRuntimeEvidence ? resolve(latestLiveRuntimeEvidence.absPath) : null,
      timestamp: latestLiveRuntimeEvidence
        ? new Date(latestLiveRuntimeEvidence.mtimeMs).toISOString()
        : null,
    },
    {
      id: "manual_closure_pack_html",
      requiredInStrict: true,
      present: existsSync(closurePackHtml),
      path: "docs/manual-closure-pack.html",
    },
  ];

  const checklist = [
    mustChecklistRow(
      "gui_hotkey_after_restart",
      "GUI hotkey flow produces card before and after app restart",
      true,
      "Cannot be proven by repository-only automation; requires interactive desktop session.",
    ),
    mustChecklistRow(
      "provider_live_path",
      "Live STT+LLM provider route verified on this workstation",
      true,
      "Needs local credentials and live network providers.",
    ),
    mustChecklistRow(
      "privacy_log_scrub_manual",
      "Manual privacy pass confirms no raw secrets/transcripts leaked in artifacts",
      true,
      "Automated scans run, but human review is required for contextual leaks.",
    ),
    mustChecklistRow(
      "sonarcloud_ui_review",
      "SonarCloud UI quality gate/hotspot review after push",
      false,
      "External service state; outside local strict gate.",
    ),
  ];

  const requiredAutomatedMissing = automatedRefs
    .filter((ref) => ref.requiredInStrict && !ref.present)
    .map((ref) => ref.id);
  const pass = requiredAutomatedMissing.length === 0;

  const report = {
    schemaVersion: "replyline.live-evidence-pack.v1",
    generatedAt: now.toISOString(),
    stamp,
    timestamp,
    pass,
    requiredAutomatedMissing,
    status: pass ? "ready_for_manual_attestation" : "incomplete_automation",
    automatedEvidenceRefs: automatedRefs,
    manualChecklist: checklist,
    markers: {
      machineReadable: true,
      attestationFormat: "strict-checklist",
      manualRowsTotal: checklist.length,
      manualRowsRequiredInStrict: checklist.filter((row) => row.requiredInStrict).length,
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
    `Status: ${report.status}`,
    "",
    "## Automated Evidence Refs",
    "| id | requiredInStrict | present | path |",
    "| --- | --- | --- | --- |",
    ...automatedRefs.map(
      (item) =>
        `| ${item.id} | ${item.requiredInStrict ? "yes" : "no"} | ${item.present ? "yes" : "no"} | ${item.path ?? "n/a"} |`,
    ),
    "",
    "## Manual Attestation Checklist",
    "| id | requiredInStrict | status | note |",
    "| --- | --- | --- | --- |",
    ...checklist.map(
      (row) =>
        `| ${row.id} | ${row.requiredInStrict ? "yes" : "no"} | ${row.status} | ${row.attestation.note} |`,
    ),
    "",
    "## Required Automated Missing",
    ...(requiredAutomatedMissing.length === 0
      ? ["- none"]
      : requiredAutomatedMissing.map((item) => `- ${item}`)),
    "",
  ];
  writeFileSync(mdPath, `${md.join("\n")}\n`, "utf8");

  return {
    pass,
    stamp,
    jsonPath,
    mdPath,
    snapshotJsonPath,
    requiredAutomatedMissing,
  };
}

function runCli() {
  const result = runLiveEvidencePackReport();
  console.log(`[live-evidence-pack] markdown: ${result.mdPath}`);
  console.log(`[live-evidence-pack] json: ${result.jsonPath}`);
  console.log(`[live-evidence-pack] snapshot: ${result.snapshotJsonPath}`);
  console.log(
    `[live-evidence-pack] pass=${result.pass} required_missing=${result.requiredAutomatedMissing.length}`,
  );
  if (!result.pass) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli();
}
