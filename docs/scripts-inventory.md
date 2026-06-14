# Scripts Inventory

Temporary inventory for script-surface reduction. Source of truth for command semantics remains [docs/engineering/testing.md](engineering/testing.md).

Columns:

- `class`: lifecycle class enforced by `pnpm scripts:lifecycle`
- `surface`: `public`, `internal`, `targeted`, or `operator`
- `called by`: canonical upstream profile or primary consumer
- `decision`: `keep`, `delete`, or `merge`

| script | class | called by | surface | decision |
| --- | --- | --- | --- | --- |
| `start` | optional | local dev only | operator | keep |
| `dev` | optional | local dev only | operator | keep |
| `build` | required | `smoke` | internal | keep |
| `serve` | optional | local preview only | operator | keep |
| `tauri` | optional | local Tauri CLI only | operator | keep |
| `test:rust` | required | `test:unit` | internal | keep |
| `test:unit` | required | `smoke` | internal | keep |
| `test:contracts` | required | `smoke` | internal | keep |
| `test:consistency` | required | `test:contracts` | internal | keep |
| `test:contracts:docs` | required | `test:consistency` | internal | keep |
| `test:contracts:ui` | required | `test:consistency` | internal | keep |
| `test:contracts:model` | required | `test:consistency` | internal | keep |
| `test:contracts:runtime` | required | `test:consistency` | internal | keep |
| `test:contracts:observability` | required | `test:consistency` | internal | keep |
| `test:contracts:beta` | required | `test:contracts` | internal | keep |
| `test:doc-links` | required | `test:contracts`, docs changes | targeted | keep |
| `test:public-footprint` | required | `verify` | internal | keep |
| `test:fixture-gate` | advisory | `verify:extended` | targeted | keep |
| `test:fixtures` | advisory | `verify:extended` | targeted | keep |
| `test:ui` | required | `test:quick`, `test:unit` | internal | keep |
| `test:ui:coverage` | advisory | `verify:extended` | targeted | keep |
| `test:prompt-contract` | required | `test:contracts` | targeted | keep |
| `test:interview-quality` | required | `test:quality` | targeted | keep |
| `test:beta-doctor` | required | `test:contracts:beta` | internal | keep |
| `test:beta-health-report` | required | `test:unit` | internal | keep |
| `test:beta-start` | required | `test:contracts:beta` | internal | keep |
| `test:beta-smoke-report` | required | `test:unit` | internal | keep |
| `test:report-release-readiness` | required | `test:unit` | internal | keep |
| `test:report-runtime-quality-summary` | required | `test:unit` | internal | keep |
| `test:ipc-contract` | required | `test:contracts` | internal | keep |
| `test:locale-keys` | required | `test:contracts` | internal | keep |
| `copy:check` | required | `test:contracts` | targeted | keep |
| `probe:runtime` | optional | direct operator use | targeted | keep |
| `probe:bench` | optional | direct operator use | targeted | keep |
| `probe:durations` | optional | direct operator use | targeted | keep |
| `probe:durations:avg` | optional | direct operator use | targeted | keep |
| `probe:live-source` | optional | direct operator use | targeted | keep |
| `evidence:bundle` | optional | `beta:preflight`, `beta:handoff` internals | operator | keep |
| `runtime:preflight` | optional | `beta:preflight` | operator | keep |
| `beta:handoff` | optional | direct operator handoff bundle | operator | keep |
| `beta:doctor` | optional | direct operator use | targeted | keep |
| `beta:health-report` | optional | direct operator use | targeted | keep |
| `beta:smoke-report` | optional | direct operator use | targeted | keep |
| `beta:release-check` | optional | direct operator use | targeted | keep |
| `beta:start` | optional | direct operator use | targeted | keep |
| `rust:deny` | optional | `rust:deps` | targeted | keep |
| `rust:audit` | optional | `rust:deps` | targeted | keep |
| `rust:deps` | optional | `verify:full`, dependency policy | targeted | keep |
| `audit:npm` | optional | `verify:full`, dependency policy | targeted | keep |
| `deps:review` | optional | direct operator use | operator | keep |
| `test:security-lanes` | required | `verify` | internal | keep |
| `typecheck` | required | `test:quick`, `smoke` | internal | keep |
| `lint` | required | `test:quick`, `smoke` | internal | keep |
| `lint:fix` | optional | local dev only | operator | keep |
| `format` | optional | local dev only | operator | keep |
| `format:check` | optional | local dev only | operator | keep |
| `beta:preflight` | optional | direct operator use | targeted | keep |
| `smoke` | required | `verify` | internal | keep |
| `verify` | required | public default profile | public | keep |
| `verify:full` | required | public release profile | public | keep |
| `verify:extended` | advisory | public addon profile | public | keep |
| `test:quality` | required | `verify:full` | internal | keep |
| `test:e2e:web:smoke` | optional | `verify:extended` | targeted | keep |
| `test:e2e:web:visual` | optional | `verify:extended` | targeted | keep |
| `test:e2e:web:required` | optional | direct operator use | targeted | keep |
| `test:e2e:desktop` | optional | `verify:extended`, `report:internal-beta-seal` | targeted | keep |
| `test:e2e:desktop:required` | optional | direct operator use | targeted | keep |
| `test:sec:zap` | experimental | `verify:extended` | targeted | keep |
| `test:ux:lighthouse` | optional | `verify:extended` | targeted | keep |
| `test:quick` | required | public quick profile | public | keep |
| `scripts:lifecycle` | required | `verify:full` | internal | keep |
| `test:release-freeze-guard` | required | `test:unit` | internal | keep |
| `test:public-footprint-guard` | required | `test:unit` | internal | keep |
| `release:freeze:check` | advisory | direct operator use | targeted | keep |
| `release:freeze:check:strict` | required | `verify:full` | targeted | keep |
| `probe:soak` | optional | direct operator use | targeted | keep |
| `check:slo` | required | `test:quality` | targeted | keep |
| `parse:latency` | optional | direct operator use | operator | keep |
| `test:latency-parser` | required | `test:unit` | internal | keep |
| `check:runtime-answer-quality` | required | `test:quality` | targeted | keep |
| `test:runtime-answer-quality:unit` | required | `test:unit` | internal | keep |
| `check:product-scenarios` | required | `test:quality` | targeted | keep |
| `test:product-scenarios:unit` | required | `test:unit` | internal | keep |
| `check:say-now-scenarios` | required | `test:quality` | targeted | keep |
| `report:card-quality` | optional | direct operator use | targeted | keep |
| `report:interview-quality:strict` | advisory | direct operator use | targeted | keep |
| `report:runtime-answer-quality` | advisory | direct operator use | targeted | keep |
| `report:runtime-quality:strict` | advisory | `verify:full` | targeted | keep |
| `report:product-quality` | optional | direct operator use | targeted | keep |
| `test:report-secret-leaks` | required | `test:public-footprint` | internal | keep |
| `report:sonar-residual` | optional | `report:release-readiness(:strict)` | targeted | keep |
| `report:live-evidence-pack` | optional | `report:release-readiness(:strict)`, `report:internal-beta-seal` | targeted | keep |
| `report:internal-beta-seal` | optional | internal beta operator seal | operator | keep |
| `report:release-readiness` | advisory | direct operator use | targeted | keep |
| `report:release-readiness:strict` | required | `verify:full` | targeted | keep |
| `verify:fast` | removed alias | replaced by `verify` | internal | delete |
| `verify:standard` | removed alias | merged into `verify:full` | internal | merge |
| `benchmark:evidence` | removed helper alias | no in-repo callers; script still callable directly | operator | delete |
| `smoke:template` | removed helper alias | no in-repo callers; script still callable directly | operator | delete |
| `test:e2e:web:ui` | removed convenience alias | no in-repo callers; use `pnpm exec playwright test ... --ui` | operator | delete |
