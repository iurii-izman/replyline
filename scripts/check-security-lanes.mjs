import { spawnSync } from "node:child_process";

const checks = [
  ["pnpm", ["audit:npm"]],
  ["pnpm", ["rust:deps"]],
];

for (const [cmd, args] of checks) {
  const pretty = [cmd, ...args].join(" ");
  console.log(`\n[security-lane] ${pretty}`);
  const run = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (run.status !== 0) {
    process.exit(run.status ?? 1);
  }
}

console.log("\n[security-lane] all checks passed");
