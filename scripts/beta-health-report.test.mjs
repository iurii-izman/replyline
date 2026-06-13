import assert from "node:assert/strict";
import { buildReport, renderMarkdown } from "./beta-health-report.mjs";

function stubRunFactory(map) {
  return (command, args = []) => {
    const key = `${command} ${args.join(" ")}`.trim();
    return map[key] ?? { ok: false, missingTool: true, status: "missing", stdout: "", stderr: "", error: "missing" };
  };
}

const degradedRun = stubRunFactory({
  "git rev-parse HEAD": { ok: true, missingTool: false, status: "pass", stdout: "abc123\n", stderr: "", error: null },
  "gh --version": { ok: false, missingTool: true, status: "missing", stdout: "", stderr: "", error: "ENOENT" },
});

const degraded = buildReport({
  now: new Date("2026-06-13T00:00:00.000Z"),
  run: degradedRun,
  latencySummaryPath: "missing.json",
  repo: "iurii-izman/replyline",
});

assert.equal(degraded.report.gh.mode, "manual");
assert.equal(degraded.report.gitSha, "abc123");
assert.ok(degraded.markdown.includes("Manual mode"));
assert.ok(degraded.markdown.includes("Launch Channel Performance"));

const liveRun = stubRunFactory({
  "git rev-parse HEAD": { ok: true, missingTool: false, status: "pass", stdout: "def456\n", stderr: "", error: null },
  "gh --version": { ok: true, missingTool: false, status: "pass", stdout: "gh version 2.89.0\n", stderr: "", error: null },
  "gh auth status": { ok: true, missingTool: false, status: "pass", stdout: "ok\n", stderr: "", error: null },
  "gh issue list --repo iurii-izman/replyline --state open --limit 200 --json number,title,labels,updatedAt,url": {
    ok: true,
    missingTool: false,
    status: "pass",
    stdout: JSON.stringify([
      {
        number: 101,
        title: "LM Studio route needs manual header tweak",
        labels: [{ name: "type:compatibility" }, { name: "area:llm" }],
        updatedAt: "2026-06-12T10:00:00Z",
        url: "https://example.com/issues/101",
      },
      {
        number: 102,
        title: "Windows Defender prompt blocks first-run setup",
        labels: [{ name: "area:setup" }, { name: "type:question" }, { name: "status:stale-candidate" }],
        updatedAt: "2026-06-11T09:00:00Z",
        url: "https://example.com/issues/102",
      },
    ]),
    stderr: "",
    error: null,
  },
  "gh pr list --repo iurii-izman/replyline --state all --limit 10 --json number,title,state,updatedAt,url,isDraft": {
    ok: true,
    missingTool: false,
    status: "pass",
    stdout: JSON.stringify([
      {
        number: 55,
        title: "chore: tighten beta smoke docs",
        state: "OPEN",
        updatedAt: "2026-06-12T14:00:00Z",
        url: "https://example.com/pr/55",
        isDraft: true,
      },
    ]),
    stderr: "",
    error: null,
  },
  "gh api repos/iurii-izman/replyline/milestones?state=all&per_page=100": {
    ok: true,
    missingTool: false,
    status: "pass",
    stdout: JSON.stringify([
      {
        title: "beta-feedback",
        state: "open",
        open_issues: 5,
        closed_issues: 2,
        html_url: "https://example.com/milestone/beta-feedback",
      },
    ]),
    stderr: "",
    error: null,
  },
});

const live = buildReport({
  now: new Date("2026-06-13T00:00:00.000Z"),
  run: liveRun,
  latencySummaryPath: "missing.json",
  repo: "iurii-izman/replyline",
});

assert.equal(live.report.gh.mode, "live");
assert.equal(live.report.providerCompatibilityNotes.length, 1);
assert.equal(live.report.setupPainPoints.length, 1);
assert.equal(live.report.staleCandidates.length, 1);

const markdown = renderMarkdown(live.report);
assert.ok(markdown.includes("| type:compatibility | 1 |"));
assert.ok(markdown.includes("Human review needed for 1 stale candidate issue(s)."));

console.log("beta-health-report live and degraded modes are covered.");
