# Replyline Release Readiness

This is the lean handoff gate for Replyline alpha builds.

## Minimum green set

1. `pnpm smoke`
2. manual critical path spot-check from `docs/smoke-checks.md`
3. `pnpm runtime:preflight`
4. `pnpm rust:deps` (when local Rust audit tools are installed)
5. `pnpm probe:runtime`
6. at least one saved runtime evidence bundle via `pnpm evidence:bundle`
7. one recent runtime comparison artifact:
   - `pnpm probe:bench`
   - or `pnpm probe:durations`
   - or `pnpm probe:live-source`
8. one benchmark scaffold artifact via `pnpm benchmark:evidence`

## Lightweight checklist

- Build/test lane is green (`pnpm smoke`).
- Manual critical path smoke pass is complete (`docs/smoke-checks.md`).
- Runtime preflight snapshot is available (`pnpm runtime:preflight`).
- Runtime lane has fresh artifact(s) for this release discussion.
- Evidence bundle exists and includes `manifest.json`.
- Benchmark scaffold exists and lists report sources (`pnpm benchmark:evidence`).
- Public/runtime claims are label-correct (`target` / `measured` / `pending verification`).
- Copy check is green (`pnpm copy:check`).

## What this proves

- the app builds
- the local Windows capture path works on this machine
- the configured STT + LLM path produced a real card
- a concrete latency artifact exists

## What this does not prove

- every workstation behaves the same
- every conferencing app behaves the same
- the product is ready for broad marketing claims

## Alpha handoff rule

Do not widen the alpha unless there is at least one recent evidence bundle and one repeated runtime comparison from the same build family.

For machine-local transfer discipline, use `pnpm alpha:handoff` to generate one compact `reports/alpha-handoff-*` package that combines:

- runtime evidence bundle copy
- manual smoke artifact template
- benchmark evidence scaffold artifact(s), when available

This helps handoff clarity but does not add cross-machine certainty.

## Optional handoff note template

Use a short note alongside the generated bundle:

```text
Operator:
Workstation:
Build / revision:
Bundle path:
Runtime path used:
Main claim labels:
Open limitations:
```

See also:

- `docs/verification-lanes.md`
- `docs/runtime-evidence.md`
- `docs/benchmark-policy.md`
- `docs/smoke-checks.md`
