# Script Lifecycle Matrix

Единая lifecycle-классификация команд `package.json` для internal stable beta.

## Class Definitions

| Class | Owner | Purpose |
| --- | --- | --- |
| `required` | engineering | merge/release quality gate, блокирующий |
| `optional` | engineering + QA + ops | полезный, но не блокирующий lane |
| `experimental` | perf/security owners | нестабильные machine-dependent проверки |
| `deprecated` | release operations | legacy aliases |

## Required

`smoke`, `verify`, `verify:fast`, `verify:full`, `verify:extended`, `verify:release-local`, `scripts:lifecycle`, `test:quick`, `beta:preflight`, `typecheck`, `lint`, `build`, `test:ui`, `test:consistency`, `test:ipc-contract`, `test:locale-keys`, `test:prompt-contract`, `test:observability-contract`, `copy:check`, `test:interview-quality`, `test:security-lanes`, `test:public-footprint`, `test:report-secret-leaks`, `test:runtime-quality`, `release:freeze:check`, `release:freeze:check:strict`, `report:interview-quality`, `report:release-readiness`, `report:release-readiness:strict`

## Optional

`start`, `dev`, `serve`, `tauri`, `test:rust`, `test:doc-links`, `test:manual-closure-pack`, `test:fixture-gate`, `test:fixtures`, `test:runtime-preflight-contract`, `test:ui-shell-contract`, `test:ui:coverage`, `test:say-now-scenarios`, `probe:runtime`, `probe:bench`, `probe:durations`, `probe:durations:avg`, `probe:live-source`, `probe:soak`, `evidence:bundle`, `runtime:preflight`, `check:slo`, `parse:latency`, `test:latency-parser`, `test:runtime-answer-quality`, `test:runtime-answer-quality:unit`, `test:product-scenarios`, `test:live-runtime-evidence`, `report:card-quality`, `report:runtime-quality`, `report:product-quality`, `report:sonar-residual`, `report:live-evidence-pack`, `docker:replyline:check`, `docker:replyline:check:strict`, `docker:replyline:check:dry`, `docker:replyline:heal`, `docker:replyline:heal:dry`, `docker:replyline:restore:ai`, `docker:replyline:restore:ai:dry`, `docker:replyline:down`, `docker:replyline:down:dry`, `docker:replyline:logs`, `docker:replyline:logs:dry`, `benchmark:evidence`, `smoke:template`, `beta:handoff`, `rust:deny`, `rust:audit`, `rust:deps`, `audit:npm`, `lint:fix`, `format`, `format:check`, `code-review:webhook`, `test:api:postman`, `test:e2e:web`, `test:e2e:web:required`, `test:e2e:web:ui`, `test:e2e:desktop`, `test:ux:lighthouse`, `test:release-freeze-guard`, `test:optional:api`, `test:optional:e2e:web`, `test:optional:e2e:desktop`, `test:optional:ux:lighthouse`

## Experimental

`test:perf:k6`, `test:sec:zap`, `test:optional:perf:k6`, `test:optional:sec:zap`, `test:experimental`

## Deprecated

`alpha:handoff`, `alpha:preflight`

## Validation

`pnpm scripts:lifecycle` проверяет:
- все scripts из matrix существуют в `package.json`
- нет необъявленных scripts
- нет двойной lifecycle-классификации одного и того же script
