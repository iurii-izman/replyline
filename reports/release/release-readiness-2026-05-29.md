# Release Readiness Summary

Generated at: 2026-05-29T16:41:05.848Z
Strict mode: enabled
Release stage: internal

## Release Gate Snapshot
- blockers: 1
- warnings: 3
- overall score: 83
- overall status: block

## Gate Domains
- static gate blockers: 0
- dependency/security blockers: 0
- runtime evidence blockers: 0
- release-freeze blockers: 1

## Required Script Presence
- verify:fast: present
- verify:full: present
- verify:release-local: present
- scripts:lifecycle: present
- test:security-lanes: present
- test:public-footprint: present
- test:runtime-quality: present
- report:sonar-residual: present
- report:live-evidence-pack: present
- test:e2e:desktop (optional lane): present
- test:e2e:desktop:required (required lane): present

## Script File Link Validation
- scanned referenced script files: 53
- missing referenced files: 0

## Artifact Presence
- runtime-quality summary (2026-05-29): present
- product-scenario benchmark (2026-05-29): present
- sonar residual report (2026-05-29): present
- live evidence pack (2026-05-29): present+structured
- release freeze report: present
- docker hardening report: present
- release-on-tag windows artifact build path: present
- release-on-tag internal unsigned labeling: present
- release-on-tag signed+verified path: missing

## Risk Snapshot
| Area | Score | Status | Reason |
| --- | ---: | --- | --- |
| Runtime quality automation | 100 | pass | runtime-quality summary for today is present |
| Product scenario coverage | 100 | pass | product scenario benchmark for today is present |
| Security lanes | 100 | pass | security/public-footprint scripts are configured |
| Public footprint | 100 | pass | public footprint config and secret scan are clean |
| Sonar readiness | 100 | pass | sonar residual report for today is present |
| Docker optional stack | 75 | warn | docker hardening evidence present, strict check remains external |
| Release freeze | 30 | block | release freeze reports outside guardrails |
| Manual evidence gap | 60 | warn | manual GUI/provider steps are formalized in structured attestation; external docker strict remains manual |

## Blockers
- Release freeze report has files outside guardrails.

## Warnings
- release-on-tag workflow is missing verified signed artifact path (naming + Authenticode check). (required only for RC/public beta stage)
- docker:replyline:check:strict is external-state/manual and not part of strict local blocker.
- Live GUI/provider evidence requires manual attestation rows in reports/manual/live-evidence-pack-YYYY-MM-DD.json.

