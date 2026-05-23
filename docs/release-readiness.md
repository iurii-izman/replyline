# Release Readiness

Release gate for Slim Stable Beta.

## Must pass

- `pnpm verify:fast`
- `pnpm verify:full`
- `pnpm verify:release-local` (non-manual local release baseline)
- `pnpm rust:deps`
- `pnpm audit:npm` (no high/critical)
- `pnpm report:release-readiness:strict`

## Product scope check

- only `capture -> stt -> llm -> card`
- Settings only: hotkey, capture max seconds, Deepgram key, LLM base URL/model/key(optional)
- no Advanced Mode / memory UI / diagnostic UI in user path

## Strict readiness evidence model

`pnpm report:release-readiness:strict` auto-generates same-day artifacts:

- `reports/sonar/sonar-residual-readiness-YYYY-MM-DD.{md,json}`
- `reports/manual/live-evidence-pack-YYYY-MM-DD.{md,json}`
- `reports/release/release-readiness-YYYY-MM-DD.{md,json}`

Blockers in strict mode:

- missing/invalid required scripts and script file references
- weakened `verify:fast` chain
- missing `sonar-project.properties`
- failed Sonar residual report policy checks
- missing same-day runtime/product reports
- missing required automated refs in live evidence pack
- release-freeze outside guardrails
- secret-like leaks in checked report/doc/env surfaces

Warnings (non-blocking, but always reported):

- external Docker strict state remains manual/external
- manual GUI/provider attestation rows remain `pending` until explicitly verified in checklist JSON
