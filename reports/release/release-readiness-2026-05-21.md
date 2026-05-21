# Release Readiness Summary

Generated at: 2026-05-21T20:32:43.908Z

## Package Script Topology
- verify:fast: present
- verify:full: present
- verify:release-local: present
- release:freeze:check: present

## Sonar Residual State
- sonar-project.properties: present
- local sonar residual report (2026-05-21): present

## Runtime Quality Evidence
- runtime quality summary (2026-05-21): present

## Docker Hardening State
- pinned hardening report: present
- strict docker check remains external-state/manual gate and is not auto-marked pass.

## Public Footprint + Freeze
- release-freeze-check.json status: attention-required
- changed files in freeze snapshot: 7
- outside freeze: 4
- outside guardrails: 6

## Security Lane State
- test:security-lanes script: present
- test:report-secret-leaks script: present

## Known Manual-Only Gaps
- Real-provider runtime probes (runtime:preflight/probe:runtime) remain environment-dependent.
- docker:replyline:check:strict depends on external Docker compose state.

## Release Blockers
- Release freeze report shows files outside baseline guardrails.

## Non-Blocking Warnings
- none
