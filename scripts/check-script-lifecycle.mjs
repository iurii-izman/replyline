import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const scripts = pkg.scripts ?? {};

const matrix = {
  required: [
    "build",
    "check:slo",
    "copy:check",
    "lint",
    "report:release-readiness:strict",
    "release:freeze:check:strict",
    "scripts:lifecycle",
    "smoke",
    "test:consistency",
    "test:contracts",
    "test:contracts:beta",
    "test:contracts:docs",
    "test:contracts:model",
    "test:contracts:observability",
    "test:contracts:runtime",
    "test:contracts:ui",
    "test:beta-doctor",
    "test:beta-health-report",
    "test:beta-smoke-report",
    "test:beta-start",
    "test:doc-links",
    "test:interview-quality",
    "test:ipc-contract",
    "test:latency-parser",
    "test:live-runtime-evidence",
    "test:locale-keys",
    "test:observability-contract",
    "test:quality",
    "test:product-scenarios",
    "test:product-scenarios:gate",
    "test:product-scenarios:unit",
    "test:prompt-contract",
    "test:public-footprint",
    "test:quick",
    "test:release-freeze-guard",
    "test:report-release-readiness",
    "test:report-secret-leaks",
    "test:runtime-answer-quality",
    "test:runtime-answer-quality:gate",
    "test:runtime-answer-quality:unit",
    "test:runtime-preflight-contract",
    "test:rust",
    "test:say-now-scenarios",
    "test:security-lanes",
    "test:slo-budget",
    "test:ui",
    "test:ui-shell-contract",
    "test:unit",
    "typecheck",
    "verify:fast",
    "verify:standard",
    "verify:full",
    "verify",
  ],
  optional: [
    "start",
    "dev",
    "serve",
    "tauri",
    "test:fixture-gate",
    "test:fixtures",
    "test:ui:coverage",
    "probe:runtime",
    "probe:bench",
    "probe:durations",
    "probe:durations:avg",
    "probe:live-source",
    "probe:soak",
    "evidence:bundle",
    "runtime:preflight",
    "parse:latency",
    "report:card-quality",
    "report:product-quality",
    "report:sonar-residual",
    "report:live-evidence-pack",
    "report:internal-beta-seal",
    "benchmark:evidence",
    "smoke:template",
    "beta:handoff",
    "beta:doctor",
    "beta:health-report",
    "beta:release-check",
    "beta:smoke-report",
    "beta:start",
    "beta:preflight",
    "beta:seal",
    "rust:deny",
    "rust:audit",
    "rust:deps",
    "audit:npm",
    "deps:review",
    "lint:fix",
    "format",
    "format:check",
    "test:e2e:web",
    "test:e2e:web:smoke",
    "test:e2e:web:visual",
    "test:e2e:web:required",
    "test:e2e:web:ui",
    "test:e2e:desktop",
    "test:e2e:desktop:required",
    "test:ux:lighthouse",
    "test:optional:e2e:web",
    "test:optional:e2e:desktop",
    "test:optional:ux:lighthouse",
  ],
  advisory: [
    "release:freeze:check",
    "report:interview-quality:strict",
    "report:runtime-quality:strict",
    "report:interview-quality",
    "report:runtime-answer-quality",
    "report:runtime-quality",
    "report:release-readiness",
    "test:runtime-quality",
    "verify:extended",
    "verify:release-local",
    "verify:release-local:required-e2e",
  ],
  experimental: [
    "test:perf:k6",
    "test:sec:zap",
    "test:optional:perf:k6",
    "test:optional:sec:zap",
    "test:experimental",
  ],
};

const missing = [];
const duplicateAcrossClasses = [];
const classByScript = new Map();
for (const [className, list] of Object.entries(matrix)) {
  for (const name of list) {
    const prevClass = classByScript.get(name);
    if (prevClass) {
      duplicateAcrossClasses.push(`${name} (${prevClass} + ${className})`);
    } else {
      classByScript.set(name, className);
    }
    if (!scripts[name]) missing.push(name);
  }
}

const classified = new Set(Object.values(matrix).flat());
const unclassified = Object.keys(scripts).filter((name) => !classified.has(name));

if (missing.length > 0 || unclassified.length > 0 || duplicateAcrossClasses.length > 0) {
  console.error(`[script-lifecycle] missing scripts: ${missing.join(", ")}`);
  if (duplicateAcrossClasses.length > 0) {
    console.error(
      `[script-lifecycle] duplicate lifecycle classification: ${duplicateAcrossClasses.join(", ")}`,
    );
  }
  if (unclassified.length > 0) {
    console.error(`[script-lifecycle] unclassified scripts: ${unclassified.join(", ")}`);
  }
  process.exit(1);
}

console.log("[script-lifecycle] matrix references are consistent.");
