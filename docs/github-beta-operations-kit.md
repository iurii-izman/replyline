# GitHub Beta Operations Kit

This document defines the GitHub-side beta intake and weekly review workflow for Replyline.

## Guardrails

- Do not auto-close beta issues.
- Do not add bot-style auto-comment spam.
- Do not add external analytics SDKs.
- Do not collect user data automatically.
- Do not commit private smoke reports into the repo.

## Issue Intake

Use the issue forms under `.github/ISSUE_TEMPLATE/`:

- `bug_report.yml`
- `setup_help.yml`
- `provider_compatibility.yml`
- `feature_request.yml`
- `beta_smoke_report.yml`

Routing guidance:

- reproducible defect: `Bug report`
- setup blockage or configuration question: `Setup help`
- provider route compatibility evidence: `Provider compatibility`
- beta-scoped product improvement: `Feature request`
- structured smoke result with sanitized attachment: `Beta smoke report`

`beta_smoke_report.yml` requires:

- app version
- OS version
- `beta:doctor` verdict
- `beta:smoke-report` attachment confirmation
- provider type (`OpenRouter preset` / `custom OpenAI-compatible` / `local/custom`)
- STT provider (`Deepgram`)
- reproduction steps
- expected vs actual behavior
- sanitized logs only
- explicit confirmation that no secrets, API keys, or raw transcripts are attached

## Labels Plan

Apply the following labels manually or via the helper script:

| Label | Purpose |
| --- | --- |
| `area:setup` | install, prerequisites, settings, first-run blockers |
| `area:runtime` | runtime behavior, capture flow, retries, tray, state flow |
| `area:stt` | Deepgram path, STT failures, transcript-stage quality |
| `area:llm` | provider route, model compatibility, request/response issues |
| `area:interview` | Interview Mode issues and feedback |
| `area:candidate-pack` | Candidate Pack import, parsing, or UX |
| `area:report` | interview report generation and export path |
| `area:privacy-trust` | privacy, data handling, trust wording, redaction |
| `area:docs` | docs clarity, setup guidance, support text |
| `area:release` | beta launch, packaging, signing, release process |
| `type:bug` | confirmed or suspected defect |
| `type:feedback` | user feedback, smoke summary, scoped improvement |
| `type:question` | setup/help request |
| `type:compatibility` | provider compatibility result |
| `priority:p0` | release-blocking beta risk |
| `priority:p1` | significant beta issue for current cycle |
| `priority:p2` | non-blocking beta follow-up |
| `status:needs-info` | triage waiting for tester follow-up |
| `status:confirmed` | reproducible or validated |
| `status:blocked` | blocked by external dependency or prerequisite |
| `status:stale-candidate` | candidate for human stale review only |
| `beta` | beta program tracking umbrella |

Optional helper:

```powershell
pwsh -File scripts/github-beta-ops.ps1 -ApplyLabels -ApplyMilestones
```

The helper only applies changes when `gh` is installed and authenticated. Otherwise it prints manual follow-up instructions and exits without pretending the repo was modified.

## Milestones Plan

Track the following milestones:

- `v0.2.0-beta.2`
- `beta-feedback`
- `provider-compatibility`

Manual setup is acceptable. If `gh` is ready, the helper script can create any missing milestones.

## Discussions Topic Plan

Discussions cannot be enabled from repository files, so treat the following as a proposed manual structure:

- `Setup Help`
  For install blockers, environment setup, and first-run troubleshooting.
- `Provider Compatibility`
  For OpenRouter preset notes, custom OpenAI-compatible routes, and local/custom reports.
- `Interview Mode Feedback`
  For Interview Mode trust, usefulness, and confusion feedback.
- `Candidate Pack Examples`
  For sanitized examples, import friction, and expected-output discussion.
- `Beta Announcements`
  For release-wave notes, known blockers, and tester instructions.

If Discussions stay disabled, route the same topics through issue forms plus `docs/beta-feedback-loop.md`.

## Weekly Health Report

Generate the local scaffold with:

```bash
pnpm beta:health-report
```

Output path:

- `artifacts/beta-health-report/YYYY-MM-DD.md`

Behavior:

- If `gh` is available and authenticated, the report includes issue, PR, and milestone summaries.
- If `gh` is unavailable or unauthenticated, the report falls back to manual placeholders and states that GitHub data was skipped.
- The report never submits anything automatically and does not collect external analytics.

## Manual Review Rhythm

- daily: triage new `type:bug`, `type:question`, and `type:compatibility`
- weekly: run `pnpm beta:health-report`, review setup pain points and stale candidates
- before beta cut: recheck `priority:p0`, `priority:p1`, and `provider-compatibility`
