import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { extractScriptFileRefs, runReleaseReadiness } from "./report-release-readiness.mjs";

function setupFixture({
  includeRequiredScripts = true,
  includeMissingScriptRef = false,
  includeSecretLeak = false,
  onlyWarnings = false,
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "replyline-readiness-"));

  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "reports", "runtime-quality"), { recursive: true });
  mkdirSync(join(root, "reports", "sonar"), { recursive: true });
  mkdirSync(join(root, "reports", "docker"), { recursive: true });
  mkdirSync(join(root, "reports", "product-quality"), { recursive: true });
  mkdirSync(join(root, "reports", "release"), { recursive: true });
  mkdirSync(join(root, "docs"), { recursive: true });
  mkdirSync(join(root, ".github", "workflows"), { recursive: true });

  const today = "2026-05-22";
  const scripts = {
    verify: includeRequiredScripts
      ? "pnpm smoke && pnpm test:security-lanes && pnpm test:public-footprint"
      : "pnpm smoke",
    "verify:full": "pnpm verify",
    "scripts:lifecycle": "node scripts/check-script-lifecycle.mjs",
    "test:security-lanes": "node scripts/check-security-lanes.mjs",
    "test:public-footprint":
      "node scripts/check-public-footprint.mjs && node scripts/check-report-secret-leaks.mjs",
    "test:quality": "node scripts/test-quality.mjs",
    "test:e2e:desktop": "node scripts/run-tauri-driver-tests.mjs",
    "test:e2e:desktop:required": "node scripts/run-tauri-driver-tests.mjs --required",
    "test:report-secret-leaks": "node scripts/check-report-secret-leaks.mjs",
    "report:release-readiness": "node scripts/report-release-readiness.mjs",
    "report:sonar-residual": "node scripts/report-sonar-residual-readiness.mjs",
    "report:live-evidence-pack": "node scripts/report-live-evidence-pack.mjs",
    "check:product-scenarios": "node scripts/evaluate-product-scenarios.mjs",
    "custom:missing": includeMissingScriptRef
      ? "node scripts/missing-file.mjs"
      : "node scripts/check-release-freeze.mjs",
  };

  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "fixture", scripts }, null, 2),
    "utf8",
  );

  writeFileSync(
    join(root, "sonar-project.properties"),
    [
      "sonar.projectKey=test",
      "sonar.organization=test-org",
      "sonar.sources=src,scripts,src-tauri/src",
      "sonar.tests=src,tests",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(join(root, "scripts", "check-public-footprint.mjs"), "console.log('ok')\n", "utf8");
  writeFileSync(
    join(root, "scripts", "check-report-secret-leaks.mjs"),
    "console.log('ok')\n",
    "utf8",
  );
  writeFileSync(join(root, "scripts", "check-release-freeze.mjs"), "console.log('ok')\n", "utf8");
  writeFileSync(
    join(root, "scripts", "report-runtime-quality-summary.mjs"),
    "console.log('ok')\n",
    "utf8",
  );
  writeFileSync(
    join(root, "scripts", "report-sonar-residual-readiness.mjs"),
    "console.log('ok')\n",
    "utf8",
  );
  writeFileSync(
    join(root, "scripts", "report-live-evidence-pack.mjs"),
    "console.log('ok')\n",
    "utf8",
  );
  writeFileSync(
    join(root, "scripts", "report-release-readiness.mjs"),
    "console.log('ok')\n",
    "utf8",
  );
  writeFileSync(join(root, "scripts", "check-security-lanes.mjs"), "console.log('ok')\n", "utf8");
  writeFileSync(join(root, "scripts", "check-script-lifecycle.mjs"), "console.log('ok')\n", "utf8");
  writeFileSync(
    join(root, "scripts", "evaluate-product-scenarios.mjs"),
    "console.log('ok')\n",
    "utf8",
  );
  writeFileSync(join(root, "scripts", "test-quality.mjs"), "console.log('ok')\n", "utf8");
  writeFileSync(join(root, "scripts", "run-tauri-driver-tests.mjs"), "console.log('ok')\n", "utf8");
  writeFileSync(
    join(root, ".github", "workflows", "release-on-tag.yml"),
    [
      "name: release fixture",
      "windows-artifact",
      "pnpm tauri build",
      "windows-internal-unsigned",
      "windows-signed",
      "Get-AuthenticodeSignature",
    ].join("\n"),
    "utf8",
  );

  writeFileSync(
    join(root, "reports", "release-freeze-check.json"),
    JSON.stringify({ status: "in-guardrails", outsideFreeze: [], outsideGuardrails: [] }, null, 2),
    "utf8",
  );

  writeFileSync(
    join(root, "reports", "runtime-quality", `runtime-quality-summary-${today}.md`),
    "ok\n",
    "utf8",
  );
  writeFileSync(
    join(root, "reports", "product-quality", `product-scenario-benchmark-${today}.md`),
    "ok\n",
    "utf8",
  );
  writeFileSync(
    join(root, "reports", "sonar", `sonar-residual-readiness-${today}.md`),
    "ok\n",
    "utf8",
  );
  writeFileSync(join(root, "docs", "note.md"), "placeholder\n", "utf8");

  if (includeSecretLeak) {
    writeFileSync(
      join(root, "reports", "release", "leak.md"),
      "token sk-live-thisisasecretvalue123456\n",
      "utf8",
    );
  }

  if (onlyWarnings) {
    writeFileSync(
      join(root, "reports", "sonar", `sonar-residual-readiness-2026-05-21.md`),
      "stale\n",
      "utf8",
    );
  }

  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });

  return { root, now: new Date(`${today}T10:00:00.000Z`) };
}

{
  assert.deepEqual(
    extractScriptFileRefs(
      "node --trace-warnings \"scripts/check one.mjs\" && pwsh -NoProfile -ExecutionPolicy Bypass -File 'scripts/check two.ps1'",
    ),
    ["scripts/check one.mjs", "scripts/check two.ps1"],
  );
  assert.deepEqual(extractScriptFileRefs(`node "${"a".repeat(100_000)}"`), []);
}

{
  const fixture = setupFixture();
  const result = runReleaseReadiness({ strict: true, root: fixture.root, now: fixture.now });
  assert.equal(result.blockers.length, 0);
  assert.equal(result.overallScore > 0, true);
}

{
  const fixture = setupFixture({ includeRequiredScripts: false });
  const result = runReleaseReadiness({ strict: true, root: fixture.root, now: fixture.now });
  assert.equal(
    result.blockers.some((x) => x.includes("verify is missing or weakened")),
    true,
  );
}

{
  const fixture = setupFixture({ includeMissingScriptRef: true });
  const result = runReleaseReadiness({ strict: true, root: fixture.root, now: fixture.now });
  assert.equal(
    result.blockers.some((x) => x.includes("references missing file")),
    true,
  );
}

{
  const fixture = setupFixture({ includeSecretLeak: true });
  const result = runReleaseReadiness({ strict: true, root: fixture.root, now: fixture.now });
  assert.equal(
    result.blockers.some((x) => x.includes("Secret-like patterns detected")),
    true,
  );
}

{
  const fixture = setupFixture({ onlyWarnings: true });
  const staleTodayPath = join(
    fixture.root,
    "reports",
    "sonar",
    "sonar-residual-readiness-2026-05-22.md",
  );
  writeFileSync(staleTodayPath, "ok\n", "utf8");
  const result = runReleaseReadiness({ strict: true, root: fixture.root, now: fixture.now });
  assert.equal(result.blockers.length, 0);
  assert.equal(result.warnings.length > 0, true);
}

{
  const fixture = setupFixture();
  const result = runReleaseReadiness({ strict: true, root: fixture.root, now: fixture.now });
  const json = JSON.parse(readFileSync(result.jsonOutPath, "utf8"));
  assert.equal(typeof json.overallScore, "number");
  assert.equal(Array.isArray(json.riskSnapshot), true);
  assert.equal(json.strict, true);
}

console.log("All report-release-readiness tests passed.");
