# Local Release Readiness

## One-command non-manual gate

Run:

```bash
pnpm verify:release-local
```

This gate is local and non-manual. It does not require GUI actions, Sonar token, live credentials, or destructive Docker commands.

## Gate composition

`verify:release-local` runs:

1. `pnpm verify:fast`
2. `pnpm test:doc-links`
3. `pnpm report:release-readiness`

## Blocking vs warning

Blocking in local gate:

- `verify:fast` failures (`smoke`, `test:security-lanes`, `test:public-footprint`)
- broken markdown links
- release-readiness report script failures

Warnings (non-blocking, reported in summary):

- missing runtime-quality summary artifact for today
- missing local Sonar residual report for today
- strict Docker release check not executed (external-state lane)

## Manual/external checks outside this block

- `docker:replyline:check:strict` (depends on external Docker compose state)
- runtime probes with live providers (`runtime:preflight`, `probe:runtime`, benches)
- optional lanes (`test:optional:*`, `test:experimental`)

## Release handoff profile

For broader release confidence, run:

```bash
pnpm verify:full
pnpm report:runtime-quality
pnpm report:release-readiness
```

Use `verify:release-local` as the baseline automatic readiness gate.
