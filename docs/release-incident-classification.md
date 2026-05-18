# Release Incident Classification (Stable Beta)

## Severity lanes

| Severity | Definition                                                             | Release decision                           |
| -------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| S0       | data leak, credential exposure, or critical trust/security breach      | No-Go                                      |
| S1       | core path unavailable (`capture -> card`) or repeat crash/restart loop | No-Go                                      |
| S2       | degraded core quality with workaround (retry helps, partial failure)   | Conditional Go with explicit risk sign-off |
| S3       | minor UX/doc drift, no core path break                                 | Go                                         |

## Security lane sync

- Any `pnpm audit:npm` high/critical advisory -> treat as `S0` blocker.
- Any `pnpm rust:deps` non-allowlisted fail -> treat as `S0` blocker.
- Diagnostics missing required fields (`stage/outcome/code`) in new bundle -> minimum `S1`.

## Release readiness sync

This classification is applied together with:

- `docs/release-readiness.md`
- `docs/verification-lanes.md`
- `docs/release-freeze-matrix.md`

## Decision rule

1. If any open S0/S1 -> No-Go.
2. If only S2 issues remain -> release owner chooses Go/No-Go with documented mitigation and follow-up owner/date.
3. S3 issues do not block stable beta release.
