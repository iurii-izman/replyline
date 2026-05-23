# Release Readiness Summary

Generated at: 2026-05-23T16:26:35.579Z
Strict mode: enabled

## Release Gate Snapshot
- blockers: 1
- warnings: 3
- overall score: 79
- overall status: block

## Required Script Presence
- verify:fast: present
- verify:full: present
- verify:release-local: present
- test:security-lanes: present
- test:public-footprint: present
- test:runtime-quality: present

## Script File Link Validation
- scanned referenced script files: 46
- missing referenced files: 0

## Artifact Presence
- runtime-quality summary (2026-05-23): present
- product-scenario benchmark (2026-05-23): present
- sonar residual report (2026-05-23): missing
- release freeze report: present
- docker hardening report: present

## Risk Snapshot
| Area | Score | Status | Reason |
| --- | ---: | --- | --- |
| Runtime quality automation | 100 | pass | runtime-quality summary for today is present |
| Product scenario coverage | 100 | pass | product scenario benchmark for today is present |
| Security lanes | 100 | pass | security/public-footprint scripts are configured |
| Public footprint | 100 | pass | public footprint config and secret scan are clean |
| Sonar readiness | 75 | warn | sonar residual report is stale (today file missing) |
| Docker optional stack | 75 | warn | docker hardening evidence present, strict check remains external |
| Release freeze | 30 | block | release freeze reports outside guardrails |
| Manual evidence gap | 60 | warn | manual GUI/live-provider and external docker strict evidence is intentionally out of local gate |

## Blockers
- Release freeze report has files outside guardrails.

## Warnings
- Sonar residual readiness report for today is missing (stale evidence).
- docker:replyline:check:strict is external-state/manual and not part of strict local blocker.
- Live GUI/provider evidence remains manual and out of strict local gate.

