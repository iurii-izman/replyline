import { spawnSync } from "node:child_process";

const checks = [
  ["pnpm", ["audit:npm"]],
  ["pnpm", ["rust:deps"]],
];

for (const [cmd, args] of checks) {
  const pretty = [cmd, ...args].join(" ");
  console.log(`\n[security-lane] ${pretty}`);
  const command = cmd === "pnpm" && process.env.npm_execpath ? process.execPath : cmd;
  const commandArgs = cmd === "pnpm" && process.env.npm_execpath ? [process.env.npm_execpath, ...args] : args;
  const run = spawnSync(command, commandArgs, {
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });
  if (run.error) {
    console.error(`[security-lane] failed to start "${pretty}": ${run.error.message}`);
    process.exit(1);
  }
  if (run.status !== 0) {
    process.exit(run.status ?? 1);
  }
}

console.log("\n[security-lane] all checks passed");
