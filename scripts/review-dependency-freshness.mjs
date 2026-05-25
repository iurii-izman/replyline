import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function readPackageJson() {
  const path = resolve(repoRoot, "package.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

function readLockfile() {
  return readFileSync(resolve(repoRoot, "pnpm-lock.yaml"), "utf8");
}

function reviewOverrides(pkg, lockfile) {
  const overrides = pkg?.pnpm?.overrides ?? {};
  const entries = Object.entries(overrides);

  console.log("\n[deps:review] pnpm overrides");
  if (entries.length === 0) {
    console.log("[deps:review] no overrides configured");
    return;
  }

  let staleCount = 0;
  for (const [name, version] of entries) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matcher = new RegExp(`^\\s{2}${escaped}@`, "mu");
    const presentInLock = matcher.test(lockfile);
    const flag = presentInLock ? "active" : "stale-candidate";
    if (!presentInLock) staleCount += 1;
    console.log(`[deps:review] ${name} -> ${version} [${flag}]`);
  }

  if (staleCount > 0) {
    console.log(
      `[deps:review] ${staleCount} override(s) not found in lockfile; review whether cleanup is safe.`,
    );
  }
}

function runOutdated() {
  console.log("\n[deps:review] pnpm outdated");
  const command = process.env.npm_execpath ? process.execPath : "pnpm";
  const args = process.env.npm_execpath
    ? [process.env.npm_execpath, "outdated", "--recursive"]
    : ["outdated", "--recursive"];

  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });

  if (result.error) {
    console.error(`[deps:review] failed to run pnpm outdated: ${result.error.message}`);
    process.exit(1);
  }

  // pnpm outdated can exit non-zero when stale dependencies are present.
  if (result.status && result.status !== 0) {
    console.log(
      `[deps:review] pnpm outdated returned ${result.status}; treat as review signal, not blocking failure.`,
    );
  }
}

const pkg = readPackageJson();
const lockfile = readLockfile();
reviewOverrides(pkg, lockfile);
runOutdated();
console.log("\n[deps:review] completed");
