import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const root = cwd;
const args = new Set(process.argv.slice(2).map((arg) => arg.toLowerCase()));
const jsonMode = args.has("--json") || args.has("-json");
const simulateNonWindows = args.has("--simulate-non-windows");
const isWindows = process.platform === "win32" && !simulateNonWindows;

function parseVersion(text) {
  const match = String(text ?? "").trim().match(/(\d+)\.(\d+)\.(\d+)/u);
  if (!match) return null;
  return {
    raw: match[0],
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function run(command, commandArgs = [], extra = {}) {
  const shell = extra.shell ?? (process.platform === "win32" && /\.(cmd|bat)$/iu.test(command));
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    shell,
    windowsHide: true,
    ...extra,
  });

  return {
    ok: !result.error && result.status === 0,
    status: result.status,
    error: result.error ? String(result.error.message || result.error) : null,
    stdout: String(result.stdout ?? "").trim(),
    stderr: String(result.stderr ?? "").trim(),
  };
}

function commandName(name) {
  if (process.platform === "win32" && !name.endsWith(".exe") && !name.endsWith(".cmd")) {
    if (name === "pnpm") return "pnpm.cmd";
  }
  return name;
}

function addRow(rows, check, status, evidence, nextAction = "") {
  rows.push({ check, status, evidence, nextAction });
}

function formatCell(value, width) {
  const text = String(value ?? "").replace(/\s+/gu, " ").trim();
  if (text.length <= width) return text.padEnd(width, " ");
  if (width <= 3) return text.slice(0, width);
  return `${text.slice(0, width - 3)}...`;
}

function printTable(rows) {
  const widths = [30, 8, 44, 56];
  const line = `+${widths.map((w) => "-".repeat(w + 2)).join("+")}+`;
  const header = ["Check", "Status", "Evidence", "Next action"];

  console.log(line);
  console.log(
    `| ${formatCell(header[0], widths[0])} | ${formatCell(header[1], widths[1])} | ${formatCell(header[2], widths[2])} | ${formatCell(header[3], widths[3])} |`,
  );
  console.log(line);
  for (const row of rows) {
    console.log(
      `| ${formatCell(row.check, widths[0])} | ${formatCell(row.status, widths[1])} | ${formatCell(row.evidence, widths[2])} | ${formatCell(row.nextAction, widths[3])} |`,
    );
  }
  console.log(line);
}

function detectVswhere() {
  if (!isWindows) return null;
  const candidates = [
    join(process.env["ProgramFiles(x86)"] ?? "", "Microsoft Visual Studio", "Installer", "vswhere.exe"),
    join(process.env.ProgramFiles ?? "", "Microsoft Visual Studio", "Installer", "vswhere.exe"),
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null;
}

function detectWebView2() {
  if (!isWindows) {
    return null;
  }

  const roots = [
    join(process.env["ProgramFiles(x86)"] ?? "", "Microsoft", "EdgeWebView", "Application"),
    join(process.env.ProgramFiles ?? "", "Microsoft", "EdgeWebView", "Application"),
  ].filter(Boolean);

  for (const base of roots) {
    if (!existsSync(base)) continue;
    const entries = readdirSync(base, { withFileTypes: true }).filter((entry) => entry.isDirectory());
    entries.sort((a, b) => b.name.localeCompare(a.name));
    for (const entry of entries) {
      if (existsSync(join(base, entry.name, "msedgewebview2.exe"))) {
        return entry.name;
      }
    }
  }

  const reg = run("reg", ["query", "HKLM\\SOFTWARE\\Microsoft\\EdgeUpdate\\Clients", "/s", "/v", "name"]);
  if (reg.ok && /WebView2/iu.test(reg.stdout)) {
    return "registry";
  }

  return null;
}

function detectMSVC() {
  if (!isWindows) {
    return {
      status: "WARN",
      evidence: "Windows-only toolchain check skipped on this platform.",
      nextAction: "Run beta:doctor on Windows 10/11 to verify MSVC prerequisites.",
    };
  }

  const whereCl = run("where", ["cl"]);
  if (whereCl.ok && whereCl.stdout) {
    return { status: "PASS", evidence: "cl.exe is available in PATH." };
  }

  const vswhere = detectVswhere();
  if (vswhere) {
    const probe = run(vswhere, [
      "-products",
      "*",
      "-requires",
      "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
      "-property",
      "installationPath",
    ]);
    if (probe.ok && probe.stdout) {
      return { status: "PASS", evidence: "vswhere found a VC tools installation." };
    }
  }

  return {
    status: "WARN",
    evidence: "MSVC build tools were not confirmed.",
    nextAction: "Install Visual Studio Build Tools with the C++ workload and MSVC v143.",
  };
}

function detectPowerShellVersion() {
  const envVersion = parseVersion(process.env.BETA_DOCTOR_PS_VERSION ?? "");
  if (envVersion) return envVersion;

  const probe = run(commandName("pwsh"), ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"]);
  return probe.ok ? parseVersion(probe.stdout) : null;
}

const packageJsonPath = join(root, "package.json");
const lockfilePath = join(root, "pnpm-lock.yaml");
const cargoTomlPath = join(root, "src-tauri", "Cargo.toml");
const rows = [];

let packageJson;
try {
  packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
} catch {
  packageJson = undefined;
}

addRow(
  rows,
  "OS",
  isWindows ? "PASS" : "WARN",
  isWindows ? "Windows detected." : "Non-Windows runtime detected.",
  isWindows ? "" : "Use Windows 10/11 for an actual beta readiness check.",
);

const psVersion = detectPowerShellVersion();
addRow(
  rows,
  "PowerShell",
  psVersion?.major >= 7 ? "PASS" : "WARN",
  psVersion ? `pwsh ${psVersion.raw}` : "PowerShell version could not be detected.",
  psVersion?.major >= 7 ? "" : "Use PowerShell 7.x for parity with the repository scripts.",
);

const git = run("git", ["--version"]);
addRow(
  rows,
  "Git",
  git.ok ? "PASS" : "FAIL",
  git.ok ? git.stdout : git.error || "git was not found in PATH.",
  git.ok ? "" : "Install Git and ensure it is available in PATH.",
);

const nodeVersion = parseVersion(process.version);
addRow(
  rows,
  "Node.js",
  nodeVersion ? "PASS" : "FAIL",
  process.version,
  nodeVersion ? "" : "Install Node.js LTS and rerun beta:doctor.",
);

const pnpm = run(commandName("pnpm"), ["--version"]);
const requiredPnpm = String(packageJson?.packageManager ?? "").match(/^pnpm@(.+)$/u)?.[1] ?? null;
const pnpmVersion = parseVersion(pnpm.stdout);
let pnpmStatus = "FAIL";
let pnpmNextAction = "Install pnpm@9.15.9 or enable Corepack, then rerun beta:doctor.";
if (pnpm.ok && pnpmVersion && requiredPnpm) {
  if (pnpmVersion.raw === requiredPnpm) {
    pnpmStatus = "PASS";
    pnpmNextAction = "";
  } else if (pnpmVersion.major === 9) {
    pnpmStatus = "WARN";
    pnpmNextAction = "Switch to pnpm@9.15.9 so dependency resolution matches the lockfile.";
  } else {
    pnpmStatus = "FAIL";
    pnpmNextAction = "Switch to pnpm@9.15.9 before running beta:doctor.";
  }
} else if (pnpm.ok) {
  pnpmStatus = "WARN";
  pnpmNextAction = "Align to pnpm@9.15.9 via Corepack to match package.json.";
}
addRow(
  rows,
  "pnpm",
  pnpmStatus,
  pnpm.ok && pnpmVersion ? `pnpm ${pnpmVersion.raw} (expected ${requiredPnpm ?? "unknown"})` : pnpm.error || "pnpm was not found in PATH.",
  pnpmNextAction,
);

addRow(
  rows,
  "Repo root",
  existsSync(packageJsonPath) && existsSync(lockfilePath) && existsSync(cargoTomlPath) ? "PASS" : "FAIL",
  existsSync(packageJsonPath) && existsSync(lockfilePath) && existsSync(cargoTomlPath)
    ? "package.json, pnpm-lock.yaml, and src-tauri/Cargo.toml are present."
    : "One or more required root files are missing.",
  existsSync(packageJsonPath) && existsSync(lockfilePath) && existsSync(cargoTomlPath)
    ? ""
    : "Run beta:doctor from the repository root and restore missing project files.",
);

const scriptNames = ["smoke", "verify", "beta:doctor"];
const missingScripts = [];
for (const name of scriptNames) {
  if (!packageJson?.scripts || !(name in packageJson.scripts)) {
    missingScripts.push(name);
  }
}
addRow(
  rows,
  "Package scripts",
  missingScripts.length === 0 ? "PASS" : "FAIL",
  missingScripts.length === 0 ? "smoke, verify, and beta:doctor are present." : `Missing: ${missingScripts.join(", ")}`,
  missingScripts.length === 0 ? "" : "Add the missing package scripts and rerun beta:doctor.",
);

{
  const hasTauriPackage = Boolean(packageJson?.devDependencies?.["@tauri-apps/cli"]);
  const hasTauriScript = Boolean(packageJson?.scripts?.tauri);
  if (hasTauriPackage && hasTauriScript) {
    const tauri = run(commandName("pnpm"), ["exec", "tauri", "--version"]);
    addRow(
      rows,
      "Tauri CLI",
      tauri.ok ? "PASS" : "WARN",
      tauri.ok ? tauri.stdout || "tauri CLI is available through pnpm exec." : "tauri CLI was not confirmed through pnpm exec.",
      tauri.ok ? "" : "Run pnpm install --frozen-lockfile so the local Tauri CLI becomes available.",
    );
  } else {
    addRow(
      rows,
      "Tauri CLI",
      "FAIL",
      "Tauri CLI package or script is missing.",
      "Add @tauri-apps/cli and the tauri script, then rerun beta:doctor.",
    );
  }
}

if (isWindows) {
  const rustc = run("rustc", ["--version"]);
  addRow(
    rows,
    "rustc",
    rustc.ok ? "PASS" : "FAIL",
    rustc.ok ? rustc.stdout : rustc.error || "rustc was not found in PATH.",
    rustc.ok ? "" : "Install Rust via rustup and rerun beta:doctor.",
  );

  const cargo = run("cargo", ["--version"]);
  addRow(
    rows,
    "cargo",
    cargo.ok ? "PASS" : "FAIL",
    cargo.ok ? cargo.stdout : cargo.error || "cargo was not found in PATH.",
    cargo.ok ? "" : "Install Rust via rustup and rerun beta:doctor.",
  );

  const rustup = run("rustup", ["show", "active-toolchain"]);
  const targets = run("rustup", ["target", "list", "--installed"]);
  const windowsTarget = "x86_64-pc-windows-msvc";
  const hasTarget = targets.ok && targets.stdout.split(/\r?\n/u).some((line) => line.trim() === windowsTarget);
  addRow(
    rows,
    "Rust toolchain/target",
    rustup.ok && targets.ok && hasTarget ? "PASS" : "WARN",
    rustup.ok && targets.ok && hasTarget
      ? `active toolchain and ${windowsTarget} target are available.`
      : rustup.ok && targets.ok
        ? `${windowsTarget} is missing from installed targets.`
        : "rustup target availability could not be confirmed.",
    rustup.ok && targets.ok && hasTarget
      ? ""
      : "Run `rustup target add x86_64-pc-windows-msvc` and rerun beta:doctor.",
  );
} else {
  addRow(
    rows,
    "rustc",
    "WARN",
    "Windows-only toolchain check skipped on this platform.",
    "Run beta:doctor on Windows 10/11 to verify Rust prerequisites.",
  );
  addRow(
    rows,
    "cargo",
    "WARN",
    "Windows-only toolchain check skipped on this platform.",
    "Run beta:doctor on Windows 10/11 to verify Rust prerequisites.",
  );
  addRow(
    rows,
    "Rust toolchain/target",
    "WARN",
    "Windows MSVC target check skipped on this platform.",
    "Run beta:doctor on Windows 10/11 to verify the MSVC target.",
  );
}

const msvc = detectMSVC();
addRow(rows, "Visual Studio Build Tools / MSVC", msvc.status, msvc.evidence, msvc.nextAction ?? "");

const webView2Version = detectWebView2();
addRow(
  rows,
  "WebView2 Runtime",
  webView2Version ? "PASS" : "WARN",
  webView2Version ? `WebView2 Runtime detected (${webView2Version}).` : "WebView2 Runtime was not confirmed by file or registry checks.",
  webView2Version ? "" : "Install Microsoft Edge WebView2 Runtime or rerun on a machine that has Edge WebView2.",
);

const summary = {
  pass: rows.filter((row) => row.status === "PASS").length,
  warn: rows.filter((row) => row.status === "WARN").length,
  fail: rows.filter((row) => row.status === "FAIL").length,
};
const verdict = summary.fail > 0 ? "blocked" : summary.warn > 0 ? "ready_with_warnings" : "ready";

const report = {
  schema: "replyline.beta-doctor.v1",
  generatedAt: new Date().toISOString(),
  verdict,
  platform: {
    isWindows,
    powerShellVersion: psVersion?.raw ?? process.env.BETA_DOCTOR_PS_VERSION ?? "unknown",
  },
  summary,
  checks: rows,
};

if (jsonMode) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  console.log("# Replyline beta doctor");
  console.log("");
  printTable(rows);
  console.log("");
  console.log(`Verdict: ${verdict}`);
  console.log(`Pass: ${summary.pass}  Warn: ${summary.warn}  Fail: ${summary.fail}`);
}

process.exit(verdict === "blocked" ? 1 : 0);
