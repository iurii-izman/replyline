import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, "..");
const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== "--");
const result = spawnSync(
  "pwsh",
  ["-NoProfile", "-File", join(scriptDir, "beta-start.ps1"), ...forwardedArgs],
  {
    cwd: rootDir,
    stdio: "inherit",
    shell: false,
    windowsHide: false,
  },
);

if (result.error) {
  console.error(
    `[beta-start] Unable to run PowerShell 7: ${String(result.error.message || result.error)}`,
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
