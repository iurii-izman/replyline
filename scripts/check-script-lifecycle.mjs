import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const scripts = pkg.scripts ?? {};

const matrix = {
  required: [
    "smoke",
    "verify",
    "verify:fast",
    "verify:full",
    "verify:extended",
    "scripts:lifecycle",
    "test:quick",
    "beta:preflight",
    "test:security-lanes",
    "typecheck",
    "lint",
    "build",
    "test:ui",
    "test:consistency",
    "test:ipc-contract",
    "test:locale-keys",
    "test:public-footprint",
    "test:report-secret-leaks",
    "test:prompt-contract",
    "test:observability-contract",
    "test:interview-quality",
    "copy:check",
    "release:freeze:check:strict",
    "report:release-readiness:strict",
    "beta:seal",
    "test:runtime-quality",
    "verify:release-local",
    "verify:release-local:required-e2e",
  ],
  optional: [
    "start",
    "dev",
    "serve",
    "tauri",
    "test:rust",
    "test:doc-links",
    "test:fixture-gate",
    "test:fixtures",
    "test:runtime-preflight-contract",
    "test:ui-shell-contract",
    "test:ui:coverage",
    "test:say-now-scenarios",
    "probe:runtime",
    "probe:bench",
    "probe:durations",
    "probe:durations:avg",
    "probe:live-source",
    "probe:soak",
    "evidence:bundle",
    "runtime:preflight",
    "check:slo",
    "test:slo-budget",
    "parse:latency",
    "test:latency-parser",
    "test:runtime-answer-quality",
    "test:runtime-answer-quality:unit",
    "test:product-scenarios",
    "test:live-runtime-evidence",
    "report:card-quality",
    "report:runtime-quality",
    "report:product-quality",
    "report:sonar-residual",
    "report:live-evidence-pack",
    "report:internal-beta-seal",
    "benchmark:evidence",
    "smoke:template",
    "beta:handoff",
    "rust:deny",
    "rust:audit",
    "rust:deps",
    "audit:npm",
    "deps:review",
    "lint:fix",
    "format",
    "format:check",
    "test:e2e:web",
    "test:e2e:web:required",
    "test:e2e:web:ui",
    "test:e2e:desktop",
    "test:e2e:desktop:required",
    "test:ux:lighthouse",
    "test:release-freeze-guard",
    "test:optional:e2e:web",
    "test:optional:e2e:desktop",
    "test:optional:ux:lighthouse",
  ],
  advisory: ["release:freeze:check", "report:interview-quality", "report:release-readiness"],
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
