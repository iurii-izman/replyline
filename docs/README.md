# Replyline Docs

Карта документации Replyline для текущей stable beta.

## 0) Internal tester entry point

- [internal-beta-tester-kit.md](internal-beta-tester-kit.md) - основной tester runbook (setup -> scenarios -> evidence -> feedback -> stop conditions).
- [tester-brief.md](tester-brief.md) - короткий вход для tester wave.
- [test-feedback-template.md](test-feedback-template.md) - обязательный structured feedback шаблон.

## 1) Canonical shipped-beta docs (primary truth)

- [beta-readiness.md](beta-readiness.md)
- [release-readiness.md](release-readiness.md)
- [release-local-readiness.md](release-local-readiness.md)
- [interview-mode.md](interview-mode.md)
- [candidate-pack.md](candidate-pack.md)
- [model-ladder.md](model-ladder.md)
- [interview-quality.md](interview-quality.md)
- [privacy-and-trust.md](privacy-and-trust.md)
- [known-limitations.md](known-limitations.md)
- [verification-lanes.md](verification-lanes.md)

## 2) Runtime evidence and operations docs (machine/operator scope)

- [runtime-bringup.md](runtime-bringup.md) - operator runbook for real provider bring-up on one workstation.
- [runtime-probe-credentials.md](runtime-probe-credentials.md) - local credential setup for runtime probes.
- [runtime-evidence.md](runtime-evidence.md) - evidence model and claim labeling (`measured` / `target` / `pending verification`).
- [runtime-quality-harness.md](runtime-quality-harness.md) - fixture/CI quality harness; not live-provider proof.
- [runtime-live-qa.md](runtime-live-qa.md) - manual live GUI/runtime QA.
- [live-runtime-matrix.md](live-runtime-matrix.md) - cross-machine + cross-call-app operator matrix and JSON row template.
- [smoke-checks.md](smoke-checks.md) - smoke and pre-handoff command map.
- Live evidence pack report command: `pnpm report:live-evidence-pack` -> `reports/manual/live-evidence-pack-YYYY-MM-DD.md`.

## 3) Release governance and policy docs

- [runtime-decisions.md](runtime-decisions.md)
- [benchmark-policy.md](benchmark-policy.md)
- [rust-dependency-security.md](rust-dependency-security.md)
- [script-lifecycle-matrix.md](script-lifecycle-matrix.md)
- [release-freeze-matrix.md](release-freeze-matrix.md)
- [release-freeze-baseline.json](release-freeze-baseline.json)

## 4) Product contracts and trust docs

- [third-party-providers.md](third-party-providers.md)
- [prompt-contract-lane.md](prompt-contract-lane.md)
- [interview-golden-dataset-v1.md](interview-golden-dataset-v1.md)
- [copy-rules.md](copy-rules.md)
- [settings-reference.md](settings-reference.md)
- [troubleshooting.md](troubleshooting.md)

## 5) Architecture and ADRs

- [adr/0001-interview-card-engine.md](adr/0001-interview-card-engine.md)

## 6) Internal operations and templates (active)

- [audit-scorecard-2026-05-25.md](audit-scorecard-2026-05-25.md)
- [max-upgrade-implementation-plan.md](max-upgrade-implementation-plan.md)
- [max-upgrade-execution-prompts.md](max-upgrade-execution-prompts.md)
- [postman-audit-execution-prompts.md](postman-audit-execution-prompts.md)
- [beta-feedback-loop.md](beta-feedback-loop.md)
- [beta-ops-diagnostics.md](beta-ops-diagnostics.md)

## 7) Historical docs (kept for traceability, not current runbook)

- [internal-alpha-checklist.md](internal-alpha-checklist.md) - historical internal-alpha checklist.
- [internal-alpha-handoff-note-template.md](internal-alpha-handoff-note-template.md) - historical alpha handoff template.
- [internal-alpha-log.md](internal-alpha-log.md) - historical alpha execution log.

## 8) Future-track docs (not shipped behavior in current stable beta)

- [memory-layer.md](memory-layer.md) - future layer, not core shipped flow.
- [advanced-mode-governance.md](advanced-mode-governance.md) - ops-only future/diagnostic governance.
- [i18n-beta-prep.md](i18n-beta-prep.md) - future multilingual prep.
- [extension-points.md](extension-points.md) - extension reference, not default shipped scope.

## 9) Manual beta closure pack

- [manual-closure-pack.html](manual-closure-pack.html)
- [manual-closure-pack.md](manual-closure-pack.md)

## Portfolio decisions (Block 4)

- Current shipped behavior claims must be sourced from sections `1` and `3` above.
- Runtime docs from section `2` are machine/operator evidence docs and must not be used as universal product claims.
- Internal alpha docs from section `7` are historical traceability only.
- Future-track docs from section `8` are design/governance references and are not shipped stable-beta behavior.
