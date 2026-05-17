# Script Lifecycle Matrix

Единая lifecycle-классификация команд `package.json` для internal stable beta.

## Class Definitions

| Class | Owner | Purpose |
| --- | --- | --- |
| `required` | engineering | merge/release quality gate, блокирующий |
| `optional` | engineering + QA + ops | полезные, но не блокирующие lane |
| `experimental` | perf/security track owners | нестабильные machine-dependent проверки |
| `deprecated` | release operations | legacy aliases, не использовать в новом потоке |

## Required

`smoke`, `verify`, `test:security-lanes`, `typecheck`, `lint`, `build`, `test:ui`, `test:consistency`, `test:ipc-contract`, `test:locale-keys`, `test:prompt-contract`, `copy:check`

## Optional

`start`, `dev`, `serve`, `tauri`, `test:rust`, `test:doc-links`, `test:fixture-gate`, `test:fixtures`, `test:ui:coverage`, `test:say-now-scenarios`, `probe:runtime`, `probe:bench`, `probe:durations`, `probe:durations:avg`, `probe:live-source`, `probe:soak`, `evidence:bundle`, `runtime:preflight`, `check:slo`, `parse:latency`, `test:latency-parser`, `report:card-quality`, `docker:replyline:check`, `docker:replyline:check:dry`, `docker:replyline:heal`, `docker:replyline:heal:dry`, `docker:replyline:restore:ai`, `docker:replyline:restore:ai:dry`, `docker:replyline:down`, `docker:replyline:down:dry`, `docker:replyline:logs`, `docker:replyline:logs:dry`, `benchmark:evidence`, `smoke:template`, `beta:handoff`, `rust:deny`, `rust:audit`, `rust:deps`, `audit:npm`, `lint:fix`, `format`, `format:check`, `code-review:webhook`, `beta:preflight`, `verify:extended`, `test:api:postman`, `test:e2e:web`, `test:e2e:web:ui`, `test:e2e:desktop`, `test:ux:lighthouse`, `test:quick`, `test:optional:api`, `test:optional:e2e:web`, `test:optional:e2e:desktop`, `test:optional:ux:lighthouse`, `scripts:lifecycle`, `release:freeze:check`, `release:freeze:check:strict`

## Experimental

`test:perf:k6`, `test:sec:zap`, `test:optional:perf:k6`, `test:optional:sec:zap`, `test:experimental`

## Deprecated

`alpha:handoff`, `alpha:preflight`

## Validation

`pnpm scripts:lifecycle` проверяет:
- что каждое имя в матрице существует в `package.json`
- что ни один script из `package.json` не остался без lifecycle-класса
