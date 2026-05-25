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

## Windows packaging posture (current vs future)

- Current (implemented): release publication is notes-only via `release-on-tag.yml`.
- Current (implemented): `.github/workflows/windows-packaging-manual.yml` provides a manual `workflow_dispatch` packaging lane for Windows artifacts and uploads workflow artifacts for operator review.
- Future (not implemented): publish-capable release packaging with explicit operator approval.
- Forbidden until explicit approval: signing secrets setup, code-signing enablement in CI, and automatic artifact publication on tag push.

## Packaging prerequisites before public beta

- Signing readiness:
  - choose signing certificate source and operator workflow;
  - document signing step ownership and failure handling;
  - verify SmartScreen/Defender first-run behavior on fresh Windows profile.
- Checksum and integrity:
  - generate SHA-256 checksums for each packaged artifact;
  - publish checksum files together with artifact naming convention and verification command examples.
- Measured evidence (must be collected, not assumed):
  - installer success rate on clean Windows 10/11 profiles;
  - launch success and tray/open/quit behavior after installation;
  - uninstall behavior (what is removed vs preserved in `%APPDATA%`);
  - packaged build runtime sanity (`capture -> stt -> llm -> card`) with same-day evidence report.
