import { accessSync, constants } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

function fail(message) {
  console.error(`[optional-lane] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = {
    tool: "",
    checkPaths: [],
    checkPackage: "",
    checkEnv: "",
    exec: "",
    execArgs: [],
  };
  let i = 0;
  while (i < argv.length) {
    const token = argv[i];
    if (token === "--") {
      out.execArgs = argv.slice(i + 1);
      break;
    }
    if (token === "--tool") out.tool = argv[++i] ?? "";
    else if (token === "--checkPath") out.checkPaths.push(argv[++i] ?? "");
    else if (token === "--checkPackage") out.checkPackage = argv[++i] ?? "";
    else if (token === "--checkEnv") out.checkEnv = argv[++i] ?? "";
    else if (token === "--exec") out.exec = argv[++i] ?? "";
    i += 1;
  }
  return out;
}

function canReadPath(inputPath) {
  if (!inputPath) return true;
  const target = resolve(inputPath);
  try {
    accessSync(target, constants.F_OK | constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function findMissingPaths(checkPaths) {
  const missing = [];
  for (const checkPath of checkPaths) {
    if (!canReadPath(checkPath)) missing.push(resolve(checkPath));
  }
  return missing;
}

function hasOptionalPackage(pkgName) {
  if (!pkgName) return true;
  return canReadPath(resolve("node_modules", pkgName, "package.json"));
}

function hasRequiredEnvVar(name) {
  if (!name) return true;
  const raw = process.env[name];
  return typeof raw === "string" && raw.trim().length > 0;
}

const opts = parseArgs(process.argv.slice(2));
if (!opts.exec) fail("missing --exec");
if (!opts.tool) fail("missing --tool");

const missingPaths = findMissingPaths(opts.checkPaths);
if (missingPaths.length > 0) {
  console.log(
    `[optional-lane] SKIP ${opts.tool}: required path is missing (${missingPaths.join(", ")}).`,
  );
  process.exit(0);
}

if (!hasOptionalPackage(opts.checkPackage)) {
  console.log(
    `[optional-lane] SKIP ${opts.tool}: optional package "${opts.checkPackage}" is not installed.`,
  );
  process.exit(0);
}

if (!hasRequiredEnvVar(opts.checkEnv)) {
  console.log(`[optional-lane] SKIP ${opts.tool}: required env "${opts.checkEnv}" is not set.`);
  process.exit(0);
}

let run;
if (process.platform === "win32" && opts.exec === "pnpm") {
  const command = [opts.exec, ...opts.execArgs].join(" ");
  run = spawnSync("cmd.exe", ["/d", "/s", "/c", command], {
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });
} else {
  run = spawnSync(opts.exec, opts.execArgs, {
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });
}
if (run.error) fail(`failed to run ${opts.exec}: ${run.error.message}`);
process.exit(run.status ?? 1);
