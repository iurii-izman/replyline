import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const cwd = process.cwd();
const scriptPath = join(cwd, "scripts", "runtime-preflight.ps1");
const runtimeDir = join(cwd, "reports", "runtime");

const expectedConfiguredFields = [
  "schemaVersion",
  "hotkey",
  "llmBaseUrl",
  "llmModel",
  "selectedModelPreset",
  "captureMaxSeconds",
  "activeAnswerProfile",
  "windowOpacity",
  "hideToTrayOnClose",
  "keepOnTopDuringCapture",
  "interviewCompactMode",
  "interviewReportRetentionDays",
  "debugTraceMode",
  "debugTraceRetentionDays",
];

const secretPatterns = [
  /DEEPGRAM_API_KEY\s*=\s*\S+/iu,
  /OPENROUTER_API_KEY\s*=\s*\S+/iu,
  /LLM_API_KEY\s*=\s*\S+/iu,
  /\bsk-[a-z0-9]{16,}\b/iu,
  /\bdg_[a-z0-9]{16,}\b/iu,
];

function fail(message) {
  console.error(message);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}
function parseJsonOrFail(raw, messagePrefix) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`${messagePrefix}: ${String(error)}`);
  }
}

function runFixtureCase(fixtureName) {
  const fixturePath = join(cwd, "tests", "fixtures", "runtime", fixtureName);

  const fixtureRaw = readFileSync(fixturePath, "utf8");
  const fixtureJson = parseJsonOrFail(fixtureRaw, `Fixture JSON is invalid (${fixtureName})`);

  const run = spawnSync(
    "pwsh",
    ["-NoProfile", "-File", scriptPath, "-SettingsPath", fixturePath, "-RuntimeDir", runtimeDir],
    {
      cwd,
      encoding: "utf8",
    },
  );

  assert(!run.error, `runtime-preflight process error (${fixtureName}): ${String(run.error)}`);
  if (run.status !== 0) {
    fail(
      `runtime-preflight exited non-zero (${fixtureName}) code=${run.status}\nSTDERR:\n${run.stderr}\nSTDOUT:\n${run.stdout}`,
    );
  }

  const report = parseJsonOrFail(
    run.stdout,
    `runtime-preflight stdout is not valid JSON (${fixtureName})\nSTDOUT:\n${run.stdout}`,
  );
  assert(
    report.lane === "runtime-preflight",
    `Unexpected lane (${fixtureName}): ${String(report.lane)}`,
  );
  assert(
    report?.readiness?.settingsFile?.parseOk === true,
    `settingsFile.parseOk is not true (${fixtureName})`,
  );

  const configuredFields = report?.readiness?.configuredFields;
  assert(
    configuredFields && typeof configuredFields === "object",
    `configuredFields missing in report (${fixtureName})`,
  );

  for (const field of expectedConfiguredFields) {
    if (!(field in configuredFields)) {
      fail(`configuredFields missing expected key '${field}' (${fixtureName})`);
    }
  }

  const missingExpectedFields = report?.readiness?.schema?.missingExpectedFields;
  assert(
    Array.isArray(missingExpectedFields),
    `schema.missingExpectedFields is not an array (${fixtureName})`,
  );
  if (missingExpectedFields.length > 0) {
    fail(
      `schema.missingExpectedFields must be empty (${fixtureName}): ${missingExpectedFields.join(", ")}`,
    );
  }

  if ("primaryLanguage" in configuredFields) {
    fail(`configuredFields must not require legacy primaryLanguage (${fixtureName})`);
  }
  if (missingExpectedFields.includes("primaryLanguage")) {
    fail(`schema must not treat primaryLanguage as expected field (${fixtureName})`);
  }

  for (const pattern of secretPatterns) {
    if (pattern.test(run.stdout) || pattern.test(run.stderr) || pattern.test(fixtureRaw)) {
      fail(`Potential secret-like token detected (${fixtureName}) with pattern ${pattern}`);
    }
  }

  if (
    typeof fixtureJson !== "object" ||
    fixtureJson == null ||
    typeof fixtureJson.schemaVersion !== "number"
  ) {
    fail(`Fixture does not match AppSettings baseline shape (${fixtureName})`);
  }
}

runFixtureCase("settings-vcurrent.json");
runFixtureCase("settings-missing-optional.json");

console.log("Runtime preflight contract OK: fixture mode passes without legacy schema drift.");
