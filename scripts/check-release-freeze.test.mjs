import { strict as assert } from "node:assert";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(process.cwd());
const scriptSource = join(repoRoot, "scripts", "check-release-freeze.mjs");
const baselineSource = join(repoRoot, "docs", "release-freeze-baseline.json");

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

function runFreeze(root, args = []) {
  const run = spawnSync("node", [join(root, "scripts", "check-release-freeze.mjs"), ...args], {
    cwd: root,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  const artifact = JSON.parse(
    readFileSync(join(root, "reports", "release-freeze-check.json"), "utf8"),
  );
  return { status: run.status ?? 1, stdout: run.stdout, stderr: run.stderr, artifact };
}

function setupFixture() {
  const root = mkdtempSync(join(tmpdir(), "replyline-freeze-test-"));
  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "docs"), { recursive: true });
  mkdirSync(join(root, "reports"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "tmp"), { recursive: true });

  cpSync(scriptSource, join(root, "scripts", "check-release-freeze.mjs"));
  cpSync(baselineSource, join(root, "docs", "release-freeze-baseline.json"));
  writeFileSync(join(root, "src", "seed.txt"), "seed\n", "utf8");
  writeFileSync(join(root, "README.md"), "# fixture\n", "utf8");

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
    writeFileSync(join(root, "docs", "verification-lanes.md"), "staged doc change\n", "utf8");
    runGit(root, ["add", "docs/verification-lanes.md"]);
    const staged = runFreeze(root);
    assert.equal(staged.status, 0);
    assert.equal(staged.artifact.changedFiles.includes("docs/verification-lanes.md"), true);

    writeFileSync(join(root, "scripts", "scratch.mjs"), "console.log('ok')\n", "utf8");
    const allowedUntracked = runFreeze(root);
    assert.equal(allowedUntracked.status, 0);
    assert.equal(allowedUntracked.artifact.changedFiles.includes("scripts/scratch.mjs"), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = setupFixture();
  try {
    writeFileSync(join(root, "CODE_OF_CONDUCT.md"), "# Community standards\n", "utf8");
    const governanceFile = runFreeze(root, ["--strict"]);
    assert.equal(governanceFile.status, 0);
    assert.equal(governanceFile.artifact.changedFiles.includes("CODE_OF_CONDUCT.md"), true);
    assert.deepEqual(governanceFile.artifact.outsideFreeze, []);
    assert.deepEqual(governanceFile.artifact.outsideGuardrails, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = setupFixture();
  try {
    writeFileSync(join(root, "tmp", "outside.txt"), "outside\n", "utf8");
    const strictFail = runFreeze(root, ["--strict"]);
    assert.equal(strictFail.status, 2);
    assert.equal(strictFail.artifact.changedFiles.includes("tmp/outside.txt"), true);
    assert.equal(strictFail.artifact.outsideFreeze.includes("tmp/outside.txt"), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = setupFixture();
  try {
    writeFileSync(join(root, "scripts", "base-check.mjs"), "console.log('base')\n", "utf8");
    runGit(root, ["add", "scripts/base-check.mjs"]);
    runGit(root, ["commit", "-m", "base-check"]);
    const head = runGit(root, ["rev-parse", "HEAD"]);
    const parent = runGit(root, ["rev-parse", "HEAD~1"]);

    const baseMode = runFreeze(root, ["--base", parent]);
    assert.equal(baseMode.status, 0);
    assert.equal(baseMode.artifact.diffLabel, `${parent}...HEAD`);
    assert.equal(baseMode.artifact.changedFiles.includes("scripts/base-check.mjs"), true);
    assert.equal(baseMode.artifact.changedFiles.includes("README.md"), false);
    assert.equal(typeof head, "string");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

console.log("All check-release-freeze tests passed.");
