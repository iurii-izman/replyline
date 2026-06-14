import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeText } from "./beta-smoke-report.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const outputDir = join(rootDir, "artifacts", "beta-health-report");
const packageJsonPath = join(rootDir, "package.json");
const defaultLatencySummaryPath = join(rootDir, "scripts", "reports", "runtime", "pipeline-latency-summary.json");
const trackedMilestones = ["v0.2.0-beta.2", "beta-feedback", "provider-compatibility"];
const trackedLabels = [
  "area:setup",
  "area:runtime",
  "area:stt",
  "area:llm",
  "area:interview",
  "area:candidate-pack",
  "area:report",
  "area:privacy-trust",
  "area:docs",
  "area:release",
  "type:bug",
  "type:feedback",
  "type:question",
  "type:compatibility",
  "priority:p0",
  "priority:p1",
  "priority:p2",
  "status:needs-info",
  "status:confirmed",
  "status:blocked",
  "status:stale-candidate",
  "beta",
];

function commandName(name) {
  if (process.platform === "win32" && name === "pnpm") return "pnpm.cmd";
  return name;
}

function runCommand(command, args = [], { cwd = rootDir } = {}) {
  const useNodeLauncher = command === "pnpm" && process.env.npm_execpath;
  const launchCommand = useNodeLauncher ? process.execPath : commandName(command);
  const launchArgs = useNodeLauncher ? [process.env.npm_execpath, ...args] : args;
  const result = spawnSync(launchCommand, launchArgs, {
    cwd,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  const missingTool =
    result.error &&
    ["ENOENT", "ENOTDIR", "EACCES"].includes(String(result.error.code ?? "")) &&
    result.status == null;

  return {
    ok: !result.error && result.status === 0,
    missingTool,
    status: missingTool ? "missing" : result.status === 0 ? "pass" : "fail",
    stdout: String(result.stdout ?? ""),
    stderr: String(result.stderr ?? ""),
    error: result.error ? String(result.error.message || result.error) : null,
  };
}

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function readPackageVersion() {
  const pkg = readJson(packageJsonPath) ?? {};
  return sanitizeText(pkg.version ?? "unknown", { maxChars: 48 }) || "unknown";
}

function gitSha(run = runCommand) {
  const result = run("git", ["rev-parse", "HEAD"]);
  return result.ok ? sanitizeText(result.stdout.trim(), { maxChars: 64 }) : "unknown";
}

function detectGh(run = runCommand) {
  const version = run("gh", ["--version"]);
  if (version.missingTool || !version.ok) {
    return { available: false, authenticated: false, mode: "manual", note: "gh CLI unavailable; GitHub sections left as manual placeholders." };
  }

  const auth = run("gh", ["auth", "status"]);
  if (!auth.ok) {
    return {
      available: true,
      authenticated: false,
      mode: "manual",
      note: "gh CLI is installed but unauthenticated; GitHub sections left as manual placeholders.",
    };
  }

  return { available: true, authenticated: true, mode: "live", note: "GitHub data loaded via gh CLI." };
}

function labelNames(issue) {
  return Array.isArray(issue.labels) ? issue.labels.map((label) => label.name).filter(Boolean) : [];
}

function summarizeLabelCounts(issues) {
  return trackedLabels.map((label) => ({
    label,
    count: issues.filter((issue) => labelNames(issue).includes(label)).length,
  }));
}

function summarizeIssueList(issues, label) {
  return issues
    .filter((issue) => labelNames(issue).includes(label))
    .slice(0, 5)
    .map((issue) => ({
      number: issue.number,
      title: sanitizeText(issue.title, { maxChars: 120 }),
      updatedAt: sanitizeText(issue.updatedAt ?? "", { maxChars: 32 }),
      url: issue.url,
    }));
}

function summarizeMilestones(milestones) {
  return trackedMilestones.map((title) => {
    const match = milestones.find((milestone) => milestone.title === title);
    if (!match) {
      return { title, state: "missing", openIssues: null, closedIssues: null, url: null };
    }
    return {
      title,
      state: sanitizeText(match.state ?? "open", { maxChars: 16 }),
      openIssues: Number(match.open_issues ?? 0),
      closedIssues: Number(match.closed_issues ?? 0),
      url: match.html_url ?? null,
    };
  });
}

function loadLatencySummary(path = defaultLatencySummaryPath) {
  const json = readJson(path);
  if (!json?.stages) {
    return { available: false, path: relative(rootDir, path), lines: [] };
  }

  const lines = [];
  const releaseToCard = json.stages.release_to_card;
  const sttRequest = json.stages.stt_request;
  const llmRequest = json.stages.llm_request;

  if (releaseToCard) {
    lines.push(`release_to_card p50=${releaseToCard.p50Ms}ms p95=${releaseToCard.p95Ms}ms count=${releaseToCard.count}`);
  }
  if (sttRequest) {
    lines.push(`stt_request p50=${sttRequest.p50Ms}ms p95=${sttRequest.p95Ms}ms failPercent=${sttRequest.failPercent}%`);
  }
  if (llmRequest) {
    lines.push(`llm_request p50=${llmRequest.p50Ms}ms p95=${llmRequest.p95Ms}ms failPercent=${llmRequest.failPercent}%`);
  }

  return {
    available: lines.length > 0,
    path: relative(rootDir, path),
    generatedAt: sanitizeText(json.generatedAt ?? "", { maxChars: 32 }),
    totalTimingRecords: Number(json.totalTimingRecords ?? 0),
    lines,
  };
}

function loadGithubData(run, repo) {
  const gh = detectGh(run);
  if (gh.mode !== "live") {
    return {
      gh,
      issues: [],
      prs: [],
      milestones: [],
    };
  }

  const issuesResult = run("gh", ["issue", "list", "--repo", repo, "--state", "open", "--limit", "200", "--json", "number,title,labels,updatedAt,url"]);
  const prsResult = run("gh", ["pr", "list", "--repo", repo, "--state", "all", "--limit", "10", "--json", "number,title,state,updatedAt,url,isDraft"]);
  const milestonesResult = run("gh", ["api", `repos/${repo}/milestones?state=all&per_page=100`]);

  const issues = issuesResult.ok ? JSON.parse(issuesResult.stdout || "[]") : [];
  const prs = prsResult.ok ? JSON.parse(prsResult.stdout || "[]") : [];
  const milestones = milestonesResult.ok ? JSON.parse(milestonesResult.stdout || "[]") : [];

  return { gh, issues, prs, milestones };
}

function buildNextActions({ staleCandidates, setupPainPoints, providerCompatibilityNotes, milestones }) {
  const actions = [];
  if (staleCandidates.length > 0) {
    actions.push(`Human review needed for ${staleCandidates.length} stale candidate issue(s).`);
  }
  if (setupPainPoints.length > 0) {
    actions.push("Review setup blockers and decide whether docs or beta:doctor should absorb them.");
  }
  if (providerCompatibilityNotes.length > 0) {
    actions.push("Update provider compatibility coverage and close the highest-friction routes first.");
  }
  const missingMilestones = milestones.filter((milestone) => milestone.state === "missing");
  if (missingMilestones.length > 0) {
    actions.push(`Create missing milestones: ${missingMilestones.map((item) => item.title).join(", ")}.`);
  }
  if (actions.length === 0) {
    actions.push("Fill the manual review sections and confirm current beta priorities for the next week.");
  }
  return actions;
}

export function buildReport({
  now = new Date(),
  run = runCommand,
  repo = process.env.GITHUB_REPOSITORY || "iurii-izman/replyline",
  latencySummaryPath = defaultLatencySummaryPath,
} = {}) {
  const dateKey = now.toISOString().slice(0, 10);
  const githubData = loadGithubData(run, repo);
  const issues = githubData.issues;
  const milestones = summarizeMilestones(githubData.milestones);
  const labelCounts = summarizeLabelCounts(issues);
  const providerCompatibilityNotes = summarizeIssueList(issues, "type:compatibility");
  const setupPainPoints = summarizeIssueList(issues, "area:setup");
  const usefulFeedback = summarizeIssueList(issues, "type:feedback");
  const staleCandidates = summarizeIssueList(issues, "status:stale-candidate");
  const latencySummary = loadLatencySummary(latencySummaryPath);

  const report = {
    dateKey,
    generatedAt: now.toISOString(),
    repo,
    appVersion: readPackageVersion(),
    gitSha: gitSha(run),
    gh: githubData.gh,
    validationSummaryPlaceholder: [
      "- [ ] `pnpm verify` reviewed for this week",
      "- [ ] `pnpm smoke` reviewed for this week",
      "- [ ] `pnpm release:freeze:check` reviewed for this week",
    ],
    labelCounts,
    recentPrs: githubData.prs.slice(0, 10).map((pr) => ({
      number: pr.number,
      title: sanitizeText(pr.title, { maxChars: 120 }),
      state: pr.isDraft ? "draft" : sanitizeText(pr.state ?? "unknown", { maxChars: 16 }),
      updatedAt: sanitizeText(pr.updatedAt ?? "", { maxChars: 32 }),
      url: pr.url,
    })),
    milestones,
    providerCompatibilityNotes,
    setupPainPoints,
    launchChannelPerformance: latencySummary,
    usefulFeedback,
    staleCandidates,
    nextActions: buildNextActions({ staleCandidates, setupPainPoints, providerCompatibilityNotes, milestones }),
  };

  return { report, markdown: renderMarkdown(report) };
}

function renderIssueLines(items, emptyText) {
  if (items.length === 0) return [`- ${emptyText}`];
  return items.map((item) => `- #${item.number} ${item.title} (${item.updatedAt || "unknown update"}) [link](${item.url})`);
}

export function renderMarkdown(report) {
  const lines = [];
  lines.push("# Replyline Weekly Beta Health Report");
  lines.push("");
  lines.push(`- current date: \`${report.dateKey}\``);
  lines.push(`- app version: \`${report.appVersion}\``);
  lines.push(`- git SHA: \`${report.gitSha}\``);
  lines.push(`- GitHub data mode: \`${report.gh.mode}\``);
  lines.push(`- note: ${report.gh.note}`);
  lines.push("");
  lines.push("## Validation Summary Placeholder");
  lines.push(...report.validationSummaryPlaceholder);
  lines.push("");
  lines.push("## Open Issues By Label");
  if (report.gh.mode !== "live") {
    lines.push("- Manual mode: fill label counts from GitHub UI or `gh` after authentication.");
  } else {
    lines.push("| label | open issues |");
    lines.push("| --- | --- |");
    for (const row of report.labelCounts) {
      lines.push(`| ${row.label} | ${row.count} |`);
    }
  }
  lines.push("");
  lines.push("## Recent PRs");
  if (report.gh.mode !== "live") {
    lines.push("- Manual mode: add recent PRs after `gh` authentication.");
  } else if (report.recentPrs.length === 0) {
    lines.push("- No recent PRs returned by `gh pr list`.");
  } else {
    for (const pr of report.recentPrs) {
      lines.push(`- #${pr.number} ${pr.title} [${pr.state}] (${pr.updatedAt || "unknown update"}) [link](${pr.url})`);
    }
  }
  lines.push("");
  lines.push("## Milestone Status");
  if (report.gh.mode !== "live") {
    lines.push("- Manual mode: confirm milestone progress in GitHub UI.");
  } else {
    lines.push("| milestone | state | open | closed |");
    lines.push("| --- | --- | --- | --- |");
    for (const milestone of report.milestones) {
      lines.push(`| ${milestone.title} | ${milestone.state} | ${milestone.openIssues ?? "-"} | ${milestone.closedIssues ?? "-"} |`);
    }
  }
  lines.push("");
  lines.push("## Provider Compatibility Notes");
  lines.push(...renderIssueLines(report.providerCompatibilityNotes, "No `type:compatibility` issues in the current query. Add manual notes if compatibility feedback exists elsewhere."));
  lines.push("");
  lines.push("## Setup Pain Points");
  lines.push(...renderIssueLines(report.setupPainPoints, "No `area:setup` issues in the current query. Add manual tester friction notes if needed."));
  lines.push("");
  lines.push("## Launch Channel Performance");
  if (!report.launchChannelPerformance.available) {
    lines.push("- No local tracker summary found. Add manual launch/runtime notes if available.");
  } else {
    lines.push(`- source: \`${report.launchChannelPerformance.path}\``);
    lines.push(`- generatedAt: \`${report.launchChannelPerformance.generatedAt}\``);
    lines.push(`- total timing records: \`${report.launchChannelPerformance.totalTimingRecords}\``);
    for (const item of report.launchChannelPerformance.lines) {
      lines.push(`- ${item}`);
    }
  }
  lines.push("");
  lines.push("## Useful Feedback");
  lines.push(...renderIssueLines(report.usefulFeedback, "No `type:feedback` issues in the current query. Add manual highlights from the latest tester wave."));
  lines.push("");
  lines.push("## Stale Candidates Requiring Human Confirmation");
  lines.push(...renderIssueLines(report.staleCandidates, "No current `status:stale-candidate` issues returned."));
  lines.push("");
  lines.push("## Next Actions");
  for (const action of report.nextActions) {
    lines.push(`- ${action}`);
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("- This report is a local scaffold only. It does not submit, comment, or close anything automatically.");
  lines.push("- Keep private smoke artifacts local; reference sanitized attachments instead.");
  return `${lines.join("\n")}\n`;
}

export function writeReportFiles(report, markdown) {
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, `${report.dateKey}.md`);
  writeFileSync(outputPath, markdown, "utf8");
  return outputPath;
}

function main() {
  const { report, markdown } = buildReport();
  const outputPath = writeReportFiles(report, markdown);
  console.log(`[beta-health-report] markdown: ${relative(rootDir, outputPath)}`);
  console.log(`[beta-health-report] mode=${report.gh.mode} appVersion=${report.appVersion} sha=${report.gitSha}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
