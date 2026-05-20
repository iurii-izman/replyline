import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const baselinePath = join(cwd, "docs", "release-freeze-baseline.json");
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));

// Argument parsing
const strictMode = process.argv.includes("--strict");
const baseArgIndex = process.argv.indexOf("--base");
const baseRef = baseArgIndex !== -1 ? process.argv[baseArgIndex + 1] : null;
if (baseArgIndex === -1 || baseRef != null) {
  // no-op
} else {
  console.error("[release-freeze] --base requires a ref argument");
  process.exit(2);
}

// Determine diff target and label for traceability
let diffArgs;
let diffLabel;
if (baseRef) {
  // Compare changes introduced by HEAD since merge-base with baseRef.
  // Three-dot diff shows what HEAD introduced relative to the common ancestor.
  // For PR CI: baseRef is the PR base SHA.
  // For push CI: baseRef is the previous commit (e.g. github.event.before).
  diffArgs = ["diff", "--name-only", `${baseRef}...HEAD`, "--", "."];
  diffLabel = `${baseRef}...HEAD`;
} else {
  // Local / legacy mode: working tree against HEAD
  diffArgs = ["diff", "--name-only", "--", "."];
  diffLabel = "working tree vs HEAD";
}

run(diffArgs, diffLabel);

// --- Main ---

function run(args, label) {
  const diff = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  });

  if (diff.status !== 0) {
    const stderr = (diff.stderr || "").trim();
    if (
      baseRef &&
      (stderr.includes("bad revision") ||
        stderr.includes("unknown revision") ||
        stderr.includes("Invalid revision"))
    ) {
      // Try HEAD~1 as a last-resort fallback (e.g. shallow clone of first push).
      console.warn(`[release-freeze] base ref "${baseRef}" not available — trying HEAD~1 fallback`);
      const fallback = spawnSync("git", ["diff", "--name-only", "HEAD~1...HEAD", "--", "."], {
        cwd,
        encoding: "utf8",
        windowsHide: true,
        shell: false,
      });
      if (fallback.status === 0) {
        const fbFiles = fallback.stdout
          .split(/\r?\n/u)
          .map((l) => l.trim())
          .filter(Boolean);
        processChangedFiles(fbFiles, "HEAD~1...HEAD (fallback)");
        return;
      }
      // Fallback also failed — genuinely no base available (first commit).
      console.warn("[release-freeze] no reachable base ref — skipping comparison (first commit?)");
      mkdirSync(join(cwd, "reports"), { recursive: true });
      writeFileSync(
        join(cwd, "reports", "release-freeze-check.json"),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            diffLabel: label,
            error: `base ref "${baseRef}" not available, HEAD~1 fallback also unavailable`,
            changedFileCount: 0,
            changedFiles: [],
            outsideFreeze: [],
            outsideGuardrails: [],
            status: "skipped-no-base-available",
          },
          null,
          2,
        ),
      );
      process.exit(0);
    }

    console.error("[release-freeze] git diff failed");
    if (diff.stderr) console.error(diff.stderr.trim());
    process.exit(diff.status ?? 1);
  }

  // Normal path
  processChangedFiles(
    diff.stdout
      .split(/\r?\n/u)
      .map((l) => l.trim())
      .filter(Boolean),
    label,
  );
}

// --- Processing ---

function processChangedFiles(changedFiles, label) {
  const allowlistPrefixes = baseline.allowlistPrefixes ?? [];
  const guardrailPaths = new Set(baseline.guardrailPaths ?? []);

  // Files explicitly listed in guardrailPaths are exempt from the allowlist
  // directory-prefix check. This allows root-level config files (AGENTS.md,
  // CLAUDE.md, CONTRIBUTING.md) and config directories (.zed/) to be
  // approved without bloating the allowlist.
  const outsideFreeze = changedFiles.filter(
    (file) =>
      !guardrailPaths.has(file) && !allowlistPrefixes.some((prefix) => file.startsWith(prefix)),
  );
  const outsideGuardrails = changedFiles.filter((file) => !guardrailPaths.has(file));

  mkdirSync(join(cwd, "reports"), { recursive: true });
  const artifactPath = join(cwd, "reports", "release-freeze-check.json");
  const artifact = {
    generatedAt: new Date().toISOString(),
    diffLabel: label,
    changedFileCount: changedFiles.length,
    changedFiles,
    outsideFreeze,
    outsideGuardrails,
    baselineScenarios: baseline.baselineScenarios ?? [],
    guardrailPaths: baseline.guardrailPaths ?? [],
    status:
      outsideFreeze.length === 0 && outsideGuardrails.length === 0
        ? "in-guardrails"
        : "attention-required",
  };
  writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

  // Console report
  console.log(`[release-freeze] comparison: ${label}`);
  console.log(`[release-freeze] changed files: ${changedFiles.length}`);
  if (changedFiles.length === 0) {
    console.log("[release-freeze] no changed files detected — guardrails satisfied");
  }
  if (outsideFreeze.length > 0) {
    console.log("[release-freeze] outside allowlist:");
    for (const file of outsideFreeze) console.log(`  - ${file}`);
  }
  if (outsideGuardrails.length > 0) {
    console.log("[release-freeze] outside baseline guardrails:");
    for (const file of outsideGuardrails) console.log(`  - ${file}`);
  }
  console.log(`[release-freeze] artifact: ${artifactPath}`);

  if (strictMode && (outsideFreeze.length > 0 || outsideGuardrails.length > 0)) {
    console.error("[release-freeze] strict mode: changes outside guardrails detected");
    process.exit(2);
  }
}
