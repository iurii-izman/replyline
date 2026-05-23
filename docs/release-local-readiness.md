# Local Release Readiness

## One-command strict local gate

Run:

```bash
pnpm verify:release-local
```

This gate is local and non-manual. It does not require GUI actions, Sonar token, live credentials, or destructive Docker commands.

## Gate composition

`verify:release-local` runs:

1. `pnpm verify:fast`
2. `pnpm test:doc-links`
3. `pnpm report:runtime-quality`
4. `pnpm test:product-scenarios`
5. `pnpm report:release-readiness:strict`

## Strict mode behavior

`report:release-readiness:strict`:

- always generates Markdown + JSON reports in `reports/release/`
- prints blockers/warnings summary
- exits `1` when blockers exist
- exits `0` when only warnings exist

## Blockers vs warnings

Blockers (fail strict local gate):

- missing required scripts (`verify:fast`, `verify:full`, `verify:release-local`, `test:security-lanes`, `test:public-footprint`, `test:runtime-quality`, `report:release-readiness:strict`)
- weakened `verify:fast`
- missing required script files or broken `package.json` script file references
- missing `sonar-project.properties`
- missing same-day runtime quality summary
- missing same-day product scenario benchmark when product scenario lane is configured
- release freeze report outside guardrails
- missing public footprint / report-secret-leak checks
- secret-like values detected in `reports/**`, `docs/**`, `.env.docker.example`

Warnings (reported but non-blocking):

- Docker strict check (`docker:replyline:check:strict`) is external-state/manual
- live GUI/provider evidence is manual
- optional E2E/perf/UX lanes are outside this local baseline
- Sonar residual report stale/missing for today while config is present

## Risk snapshot scoring

Release readiness report includes `Risk Snapshot` with per-area score (0-100), status (`pass`/`warn`/`block`), and reason.

Weights:

- runtime quality automation: 20
- product scenario coverage: 15
- security/public footprint: 20
- Sonar readiness: 15
- release gates/freeze: 20
- Docker optional stack: 5
- manual evidence gap: 5

Overall score is a weighted average and is included in both Markdown and JSON reports.

## Why Docker strict and live GUI stay manual

- `docker:replyline:check:strict` depends on external compose/runtime state outside repository-only automation.
- GUI/live-provider evidence requires local environment and credentials by design.
- Strict local gate remains credential-free and deterministic for repository checks.

## Release handoff profile

For broader release confidence, run:

```bash
pnpm verify:full
pnpm report:runtime-quality
pnpm test:product-scenarios
pnpm report:release-readiness:strict
```

Use `verify:release-local` as the baseline automated readiness gate.
