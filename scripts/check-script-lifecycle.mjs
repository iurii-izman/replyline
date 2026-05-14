import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const scripts = pkg.scripts ?? {};

const matrix = {
  required: ["smoke", "verify", "test:security-lanes", "typecheck", "lint", "build", "test:ui"],
  optional: [
    "test:ui:coverage",
    "test:fixtures",
    "test:say-now-scenarios",
    "test:api:postman",
    "test:e2e:web",
    "test:e2e:desktop",
    "test:optional:api",
    "test:optional:e2e:web",
    "test:optional:e2e:desktop",
    "test:optional:ux:lighthouse",
  ],
  experimental: ["test:optional:perf:k6", "test:optional:sec:zap", "test:experimental"],
  deprecated: ["alpha:handoff", "alpha:preflight"],
};

const missing = [];
for (const list of Object.values(matrix)) {
  for (const name of list) {
    if (!scripts[name]) missing.push(name);
  }
}

if (missing.length > 0) {
  console.error(`[script-lifecycle] missing scripts: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("[script-lifecycle] matrix references are consistent.");
