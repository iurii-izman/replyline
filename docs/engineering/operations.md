# Beta Operations Guide

Compact operator guide for beta intake, smoke-report handling, issue routing, and release-facing follow-up.

Use this document for operator policy. Keep detailed manual UI checklists in [manual-qa.md](manual-qa.md), release decision rules in [release.md](release.md), and runtime proof/evidence boundaries in [runtime.md](runtime.md).

## 1. Operator purpose and guardrails

Operator goals:

- keep beta intake reproducible, sanitized, and actionable
- route reports into the right GitHub queue without bot spam
- connect tester evidence to release severity and readiness
- avoid publishing sensitive local artifacts or overclaiming release posture

Non-negotiable guardrails:

- do not auto-close beta issues
- do not post recurring stale-bot comments
- do not ask for raw transcripts, raw prompts, raw ContextPack values, provider bodies, or secrets
- do not commit local smoke reports, runtime bundles, or private evidence into the repo
- do not claim public installer readiness from unsigned artifacts

## 2. Beta tester intake

Preferred intake paths:

- reproducible defect: `Bug report`
- setup blockage or config question: `Setup help`
- provider route result: `Provider compatibility`
- beta improvement or usability signal: `Feature request`
- structured smoke run with attachments: `Beta smoke report`

Minimum intake payload:

- app version or commit SHA
- Windows version
- scenario and expected vs actual behavior
- reproducibility: `once` / `sometimes` / `always`
- severity guess: `S0` / `S1` / `S2` / `S3`
- provider type and whether `pnpm beta:doctor` passed, warned, or blocked
- sanitized attachments only

When the report is incomplete, request only the smallest missing delta:

- current build/version
- blocked step or repro step
- `beta:doctor` verdict
- sanitized `smoke-report.md` / `smoke-report.json` if runtime behavior is involved

## 3. Smoke report flow

Ask testers to use the short beta path in [BETA_TESTING.md](../../BETA_TESTING.md). For structured evidence:

1. Run `pnpm beta:doctor`.
2. Reproduce the issue or complete the smoke pass.
3. Run `pnpm beta:smoke-report`.
4. Attach `artifacts/beta-smoke-report/smoke-report.md` and `smoke-report.json`.
5. Paste only a short issue summary; do not paste raw logs.

### Quick feedback (redacted)

For a rapid redacted issue body without running the full smoke report:

```powershell
pnpm beta:feedback           # stdout
pnpm beta:feedback --clipboard  # copies to clipboard
pnpm beta:feedback --json       # JSON for tooling
```

The feedback payload includes:

- App version, commit SHA, OS
- Settings summary (hotkey, model preset, route kind — no keys or secrets)
- Last error category and code
- Deterministic card quality summary (pass/fail, score)
- Reproduction steps placeholder
- Safety checklist

Excluded by default:

- Raw transcript
- ContextPack content
- Full prompts or provider response bodies
- API keys, bearer tokens, credential values
- Absolute user paths (redacted to `%USERPROFILE%` or `[PATH_REDACTED]`)

No telemetry. No network requests.

What the smoke report is for:

- workstation readiness snapshot
- sanitized toolchain and check summary
- last error category without raw provider output
- operator handoff when a bug is not obvious from the issue body

If smoke-report files are missing or clearly insufficient, move to diagnostics collection instead of asking for raw logs.

## 4. GitHub issue routing and labels

Apply labels manually or with:

```powershell
pwsh -File scripts/github-beta-ops.ps1 -ApplyLabels -ApplyMilestones
```

Label families:

- area: `area:setup`, `area:runtime`, `area:stt`, `area:llm`, `area:interview`, `area:context-pack`, `area:report`, `area:privacy-trust`, `area:docs`, `area:release`
- type: `type:bug`, `type:feedback`, `type:question`, `type:compatibility`
- priority: `priority:p0`, `priority:p1`, `priority:p2`
- status: `status:needs-info`, `status:confirmed`, `status:blocked`, `status:stale-candidate`
- umbrella: `beta`

Milestones:

- `v0.2.0-beta.3`
- `beta-feedback`
- `provider-compatibility`

Routing rules:

- same symptom, same root cause, same build family: cluster into one issue thread
- same symptom across different providers or versions: keep separate until triage confirms one cause
- Discussions topics, if used, mirror the same intake buckets; if not, keep routing through issue forms

## 5. Feedback triage cadence

Per-issue triage fields:

- frequency: `once` / `sometimes` / `always`
- reproducibility: `high` / `medium` / `low`
- action: `fix now` / `schedule` / `monitor`
- owner and next review date

Cadence:

- daily: triage new `type:bug`, `type:question`, and `type:compatibility`
- weekly: run `pnpm beta:health-report`, cluster repeated friction, and review stale candidates
- pre-release: clear all open `S0` and `S1`; review every `S2` for mitigation, owner, and recheck date

Keep one compact operator note or weekly report with:

- issue id/title
- class or affected path
- frequency, severity, reproducibility, action
- owner, target date, and linked evidence

For tester-wave summaries, store only summary evidence. Never store raw transcript or raw report content in the ledger.

## 6. Severity and release link

Use release severity from [release.md](release.md):

- `S0`: security/privacy/trust breach, secret leak, or similar critical exposure
- `S1`: core path broken (`capture -> stt -> llm -> card`) or repeat crash/restart loop
- `S2`: degraded but usable with workaround, retry, or partial failure
- `S3`: minor docs, UX, or non-core drift

Release link:

- any open `S0` or `S1` means `No-Go`
- `S2` can ship only with explicit mitigation, owner, and recheck date
- `S3` does not block release, but still affects operator confidence and release notes quality

Escalate to release review immediately when:

- multiple testers report the same `S1` path
- a sanitized artifact suggests redaction failed
- diagnostics lose required stable fields needed for triage

## 7. Diagnostics collection

Use progressively stronger evidence:

1. `pnpm beta:doctor` for setup/readiness.
2. `pnpm beta:smoke-report` for sanitized issue attachment.
3. `pnpm evidence:bundle` for deeper runtime triage.

Operator quick-read flow:

1. Check `beta:doctor` verdict.
2. Read smoke-report status and last error category.
3. If still unclear, open the evidence bundle and inspect `diagnostics/runtime-events.json`.
4. Correlate the last failure with `logs/app.log` locally.
5. Reproduce with `pnpm probe:runtime` only when live-provider proof is actually needed.

Do not duplicate the full event schema here. The stable `diag_runtime_event` contract and `RL_*` codes live in [../reference/errors.md](../reference/errors.md).

Blocker examples:

- repeated same-stage runtime failure under normal setup
- `RL_STT_KEY_MISSING` in a supposedly ready default path
- redaction failure in any shared artifact
- bundle missing the stable fields needed for stage/code triage

## 8. Public vs local artifact sharing

Safe public-share default:

- issue text
- sanitized smoke report
- short redacted excerpts
- release notes and stable docs

Local-only by default:

- `reports/runtime/`
- `reports/runtime-evidence-*`
- `reports/beta-handoff-*`
- `reports/manual/live-evidence/`
- `exports/`, `interview-exports/`
- full interview exports, full transcripts, raw ContextPack inputs
- packet captures, traces, and any file with secrets or personal data

Sharing rules:

- review sanitized artifacts before posting
- strip absolute machine paths when sharing outside local operator need-to-know
- prefer redacted export variants over full exports
- runtime `.env` files, keys, and provider payloads never leave local scope

## 9. Stale beta policy

`status:stale-candidate` is a review marker, not an auto-close state.

Mark an issue stale-candidate only when all conditions hold:

1. no meaningful update for at least 14 days
2. minimal missing info was already requested
3. not `priority:p0`
4. no active assignee is currently working it
5. the main blocker is missing confirmation, missing repro data, or outdated beta context

Before human close, confirm:

1. current docs or beta version did not already resolve it
2. no linked PR, milestone, or dependent issue still relies on it
3. the reporter has a clear path to reopen with updated sanitized details

Never auto-close, and never use recurring bot comments as policy.

## 10. Minimal manual QA pointer

Use [manual-qa.md](manual-qa.md) for the canonical operator checklist covering:

- launch, tray, window, and layout sanity
- settings and setup flows
- capture, card, retry, and export behavior
- ContextPack panel and privacy-sensitive surfaces

For beta testers, keep the quick smoke flow in [BETA_TESTING.md](../../BETA_TESTING.md) and the compact tester matrix in [../smoke-checks.md](../smoke-checks.md).

## 11. Notification hygiene and CI noise reduction

### GitHub notification filters

Create custom filters in GitHub notification settings to separate signal from noise:

| Filter | Purpose |
| --- | --- |
| `repo:iurii-izman/replyline reason:ci_activity` | CI failures only — check daily, clear after triage |
| `repo:iurii-izman/replyline reason:assign` | Direct assignment — immediate review |
| `repo:iurii-izman/replyline reason:mention` | Mentions — same-day review |
| `repo:iurii-izman/replyline reason:security_alert` | Dependabot/security — immediate review |
| `repo:iurii-izman/replyline is:issue` | Issues — daily triage |
| `repo:iurii-izman/replyline is:pr author:@me` | Own PRs — as needed |

### Workflow noise design

| Workflow | Noise level | Action |
| --- | --- | --- |
| CI (push/PR) | Low — only fails on real gate issues | Advisory release-freeze, concurrency cancels stale runs |
| Extended Quality (weekly) | Low — non-blocking, concurrency cancels stale runs, FAIl_NON_BLOCKING status |
| Dependency Checks (weekly) | Low — concurrency cancels stale runs |
| Release On Tag (tag push) | Critical — blocking, always review |
| Auto Close Deps PRs (push) | None — automated, silent |

### Reducing SonarQubeCloud comment noise

SonarQubeCloud may post PR comments for new issues. Configuration lives in `sonar-project.properties`. To reduce noise:
- Focus on new issues only (default); acknowledged/won't-fix issues stay silent
- Adjust quality gate thresholds in SonarQubeCloud dashboard if comments are too frequent for minor issues
- Use custom notification filter: `repo:iurii-izman/replyline bot:sonarqubecloud`
