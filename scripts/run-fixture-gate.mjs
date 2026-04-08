import { spawnSync } from "node:child_process";

const enabled = process.env.REPLYLINE_FIXTURE_GATE === "1";
if (!enabled) {
  console.log("Fixture gate skipped (set REPLYLINE_FIXTURE_GATE=1 to enable).");
  process.exit(0);
}

const result = spawnSync(
  "cargo",
  ["run", "--manifest-path", "src-tauri/Cargo.toml", "--bin", "fixture_gate"],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("Fixture gate command completed.");
