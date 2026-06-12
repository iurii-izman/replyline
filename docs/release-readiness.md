# Release Readiness

Release gate for Slim Stable Beta.

## Status and purpose

- Status: canonical release-governance gate for current stable-beta scope.
- Purpose: defines required quality/security/runtime-evidence domains for release decisions.
- Relationship:
  - use with [release-local-readiness.md](release-local-readiness.md) for strict local non-manual baseline;
  - use with [beta-readiness.md](beta-readiness.md) for wider beta handoff context.

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
- `release-on-tag.yml` creates GitHub release notes and validates a Windows release artifact.

`release-on-tag.yml` builds Windows bundle output on tag. Unsigned packages remain internal workflow artifacts; only Authenticode-verified signed packages are attached to the GitHub Release.

## Windows packaging posture (current vs future)

- Current (implemented): `release-on-tag.yml` publishes source release notes and uploads the Windows package plus SHA-256 checksum as workflow artifacts.
- Current (implemented): `.github/workflows/windows-packaging-manual.yml` provides a manual `workflow_dispatch` packaging lane for Windows artifacts and uploads workflow artifacts for operator review.
- Current signing posture: if signing secrets are absent, tag artifacts remain `internal-unsigned`; if secrets are present and Authenticode validation succeeds, `signed` artifacts and checksums are attached to the release.
- Forbidden claim: public beta readiness from unsigned artifacts.

## Remaining prerequisites before public installer release

- Signing readiness:
  - configure signing certificate source and operator workflow in GitHub secrets (`WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`);
  - document signing step ownership and failure handling;
  - verify SmartScreen/Defender first-run behavior on fresh Windows profile.
- Checksum and integrity is implemented for workflow and signed release artifacts; verification instructions still need installer-user QA.
- Measured evidence (must be collected, not assumed):
  - installer success rate on clean Windows 10/11 profiles;
  - launch success and tray/open/quit behavior after installation;
  - uninstall behavior (what is removed vs preserved in `%APPDATA%`);
  - packaged build runtime sanity (`capture -> stt -> llm -> card`) with same-day evidence report.
