import { strict as assert } from "node:assert";
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(process.cwd());
const scriptSource = join(repoRoot, "scripts", "check-public-footprint.mjs");

function runGit(root, args) {
  const run = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (run.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${(run.stderr || run.stdout || "").trim()}`);
  }
  return run.stdout.trim();
}

function runCheck(root) {
  return spawnSync("node", [join(root, "scripts", "check-public-footprint.mjs")], {
    cwd: root,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
}

function setupFixture() {
  const root = mkdtempSync(join(tmpdir(), "replyline-public-footprint-test-"));
  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, ".github"), { recursive: true });
  mkdirSync(join(root, "docs", "engineering"), { recursive: true });

  cpSync(scriptSource, join(root, "scripts", "check-public-footprint.mjs"));
  writeFileSync(join(root, "AGENTS.md"), "- `CONTRIBUTING.md`\n- `docs/engineering/testing.md`\n", "utf8");
  writeFileSync(
    join(root, ".github", "copilot-instructions.md"),
    "- `AGENTS.md`\n- `docs/copy-rules.md`\n",
    "utf8",
  );
  writeFileSync(join(root, "CONTRIBUTING.md"), "# Contributing\n", "utf8");
  writeFileSync(join(root, "docs", "engineering", "testing.md"), "# Testing\n", "utf8");
  writeFileSync(join(root, "docs", "copy-rules.md"), "# Copy\n", "utf8");

  runGit(root, ["init"]);
  runGit(root, ["config", "user.name", "replyline-test"]);
  runGit(root, ["config", "user.email", "replyline-test@example.com"]);
  runGit(root, ["add", "."]);
  runGit(root, ["commit", "-m", "seed"]);

  return root;
}

{
  const root = setupFixture();
  try {
    writeFileSync(join(root, ".env.keys"), "DEEPGRAM_API_KEY\n", "utf8");
    runGit(root, ["add", ".env.keys"]);
    const run = runCheck(root);
    assert.equal(run.status, 1);
    assert.equal(run.stderr.includes(".env.keys"), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = setupFixture();
  try {
    writeFileSync(join(root, ".env.keys.example"), "DEEPGRAM_API_KEY=\n", "utf8");
    runGit(root, ["add", ".env.keys.example"]);
    const run = runCheck(root);
    assert.equal(run.status, 0);
    assert.equal(run.stdout.includes("[public-footprint] OK"), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = setupFixture();
  try {
    writeFileSync(join(root, "AGENTS.md"), "- `docs/ai-tooling-policy-matrix.md`\n", "utf8");
    const run = runCheck(root);
    assert.equal(run.status, 1);
    assert.equal(
      run.stderr.includes("AGENTS.md: references non-public doc docs/ai-tooling-policy-matrix.md"),
      true,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

console.log("All check-public-footprint tests passed.");
