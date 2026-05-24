# Release Readiness

Release gate for Slim Stable Beta.

## Must pass

- `pnpm verify:fast`
- `pnpm verify:full`
- `pnpm verify:release-local`
- `pnpm rust:deps`
- `pnpm audit:npm` (no high/critical)
- `pnpm report:release-readiness:strict`

## Readiness domains

`report:release-readiness:strict` classifies blockers by domain:

1. static gates
- required script presence
- `verify:fast` chain integrity
- script file reference integrity

2. dependency/security gates
- public-footprint + secret-leak controls
- `sonar-project.properties` and Sonar residual checks
- env/report secret-like leak detection

3. runtime evidence artifacts
- same-day runtime quality summary
- same-day product scenario benchmark (if lane configured)
- same-day structured live evidence pack

4. release-freeze status
- `reports/release-freeze-check.json`
- guardrail/outside-freeze violations

## Artifacts generated in strict mode

- `reports/release/release-readiness-YYYY-MM-DD.md`
- `reports/release/release-readiness-YYYY-MM-DD.json`
- `reports/sonar/sonar-residual-readiness-YYYY-MM-DD.{md,json}`
- `reports/manual/live-evidence-pack-YYYY-MM-DD.{md,json}`

## CI and release workflow truth

- `ci.yml` validates fast lane + freeze and uploads CI artifacts.
- `extended-quality.yml` reports non-blocking extended failures via artifact summary.
- `release-on-tag.yml` creates GitHub release notes only.

`release-on-tag.yml` currently does **not** build or upload desktop installers/binaries.
