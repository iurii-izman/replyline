# Replyline Release Readiness

This is the lean handoff gate for Replyline internal stable beta builds.

## Minimum green set (required)

1. `pnpm verify`
2. manual critical path spot-check from `docs/smoke-checks.md`
3. `pnpm rust:deps`
4. `pnpm audit:npm`
5. `pnpm release:freeze:check`

## Lightweight checklist

- Build/test lane is green (`pnpm smoke`, including `pnpm test:ui` and `pnpm test:consistency`).
- Manual critical path smoke pass is complete (`docs/smoke-checks.md`).
- Runtime preflight/evidence artifacts are optional unless explicitly required by release owner.
- Public/runtime claims are label-correct (`target` / `measured` / `pending verification`).
- Rust supply-chain gate is green with current warnings triaged, not hand-waved (`pnpm rust:deps`).
- JavaScript supply-chain gate is green (`pnpm audit:npm`).
- Security regression lane is green (`pnpm test:security-lanes`).
- Release freeze guardrails reviewed (`pnpm release:freeze:check`, artifact in `reports/release-freeze-check.json`).
- SLO budget check is evaluated when soak artifact exists (`pnpm check:slo`).

## What this proves

- the app builds
- the UI state machine passes mock automation on the current code
- the local Windows capture path works on this machine
- the configured STT + LLM path produced a real card
- a concrete latency artifact exists
- claim labels can be tied to concrete local evidence files

## What this does not prove

- every workstation behaves the same
- every conferencing app behaves the same
- the product is ready for broad marketing claims
- `measured` on one workstation is not global readiness
- `pnpm rust:deps` warnings from Tauri/GTK transitives are triaged, not solved by default

## Security Release Blockers

- Block release if `pnpm audit:npm` reports any high/critical advisory.
- Block release if `pnpm rust:deps` fails or reports non-allowlisted warnings.
- Block release if allowlist review date has passed without refresh decision.
- Block release if logs/diagnostics can include raw credential material.
- Block release if `diagnostics/runtime-events.json` is missing schema fields (`stage/outcome/code`) in newly generated bundles.
- Block release if Advanced Mode docs/UI copy drift from governance intent (`docs/advanced-mode-governance.md`).

## Optional Runtime Evidence Lane

For machine-local transfer discipline, use `pnpm alpha:handoff` (legacy name) to generate one compact `reports/alpha-handoff-*` package that combines:

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
- `docs/release-freeze-matrix.md`
- `docs/release-incident-classification.md`
- `docs/core-pipeline-slo.json`
