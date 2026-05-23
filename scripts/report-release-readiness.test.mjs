import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runReleaseReadiness } from "./report-release-readiness.mjs";

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

  const today = "2026-05-22";
  const scripts = {
    "verify:fast": includeRequiredScripts
      ? "pnpm smoke && pnpm test:security-lanes && pnpm test:public-footprint"
      : "pnpm smoke",
    "verify:full": "pnpm verify:fast",
    "verify:release-local": "pnpm verify:fast && pnpm report:release-readiness:strict",
    "test:security-lanes": "node scripts/check-security-lanes.mjs",
    "test:public-footprint":
      "node scripts/check-public-footprint.mjs && node scripts/check-report-secret-leaks.mjs",
    "test:runtime-quality": "node scripts/test-runtime-quality.mjs",
    "test:report-secret-leaks": "node scripts/check-report-secret-leaks.mjs",
    "report:release-readiness": "node scripts/report-release-readiness.mjs",
    "report:sonar-residual": "node scripts/report-sonar-residual-readiness.mjs",
    "report:live-evidence-pack": "node scripts/report-live-evidence-pack.mjs",
    "test:product-scenarios": "node scripts/evaluate-product-scenarios.mjs",
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
  writeFileSync(
    join(root, "scripts", "evaluate-product-scenarios.mjs"),
    "console.log('ok')\n",
    "utf8",
  );
  writeFileSync(join(root, "scripts", "test-runtime-quality.mjs"), "console.log('ok')\n", "utf8");

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
  writeFileSync(
    join(root, "reports", "docker", "docker-stack-hardening-2026-05-21.md"),
    "ok\n",
    "utf8",
  );
  writeFileSync(join(root, "docs", "note.md"), "placeholder\n", "utf8");
  writeFileSync(join(root, "docs", "manual-closure-pack.html"), "<html></html>\n", "utf8");
  writeFileSync(join(root, ".env.docker.example"), "OPENAI_API_KEY=change-me\n", "utf8");

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

  return { root, now: new Date(`${today}T10:00:00.000Z`) };
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
    result.blockers.some((x) => x.includes("verify:fast is missing or weakened")),
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
