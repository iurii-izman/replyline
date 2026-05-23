# Release Readiness Summary

Generated at: 2026-05-23T18:47:50.898Z
Strict mode: enabled

## Release Gate Snapshot
- blockers: 0
- warnings: 2
- overall score: 97
- overall status: warn

## Required Script Presence
- verify:fast: present
- verify:full: present
- verify:release-local: present
- test:security-lanes: present
- test:public-footprint: present
- test:runtime-quality: present
- report:sonar-residual: present
- report:live-evidence-pack: present

## Script File Link Validation
- scanned referenced script files: 48
- missing referenced files: 0

## Artifact Presence
- runtime-quality summary (2026-05-23): present
- product-scenario benchmark (2026-05-23): present
- sonar residual report (2026-05-23): present
- live evidence pack (2026-05-23): present+structured
- release freeze report: present
- docker hardening report: present

## Risk Snapshot
| Area | Score | Status | Reason |
| --- | ---: | --- | --- |
| Runtime quality automation | 100 | pass | runtime-quality summary for today is present |
| Product scenario coverage | 100 | pass | product scenario benchmark for today is present |
| Security lanes | 100 | pass | security/public-footprint scripts are configured |
| Public footprint | 100 | pass | public footprint config and secret scan are clean |
| Sonar readiness | 100 | pass | sonar residual report for today is present |
| Docker optional stack | 75 | warn | docker hardening evidence present, strict check remains external |
| Release freeze | 100 | pass | release freeze is within guardrails |
| Manual evidence gap | 60 | warn | manual GUI/provider steps are formalized in structured attestation; external docker strict remains manual |

## Blockers
- none

## Warnings
- docker:replyline:check:strict is external-state/manual and not part of strict local blocker.
- Live GUI/provider evidence requires manual attestation rows in reports/manual/live-evidence-pack-YYYY-MM-DD.json.

