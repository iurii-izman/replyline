# Replyline Verification Profiles

Этот документ фиксирует canonical hierarchy тестовых и verification profiles. Старые имена-алиасы сохранены только для совместимости и не должны быть главным reference в новых docs/workflows.

## Canonical Profiles

| Profile | Command | Role |
| --- | --- | --- |
| quick local loop | `pnpm test:quick` | Самый быстрый локальный цикл: `typecheck` + `lint` + frontend component tests |
| deterministic unit/component | `pnpm test:unit` | Все deterministic unit/component/script-unit проверки |
| deterministic contracts | `pnpm test:contracts` | Docs/copy/prompt/ipc/locale/consistency contract checks |
| fast default gate | `pnpm verify:fast` | Обязательный PR/local baseline: `smoke` + security/public-footprint |
| standard handoff gate | `pnpm verify:standard` | Локальный pre-handoff gate: `verify:fast` + lifecycle + advisory freeze report |
| full release gate | `pnpm verify:full` | Release-quality gate: standard + strict freeze + dependency/security + runtime/product quality + strict reports |
| extended addon lane | `pnpm verify:extended` | Nightly/operator addon lane: coverage + fixtures + runtime/product gates + optional E2E/experimental lanes, без повторного `verify:full` |

## Profile Composition

1. `test:quick`

- Состав: `typecheck` + `lint` + `test:ui`.
- Это developer shortcut, не заменяет `test:unit` или `verify:*`.

2. `test:unit`

- Состав: `test:rust` + `test:ui` + `test:latency-parser` + `test:runtime-answer-quality:unit` + `test:product-scenarios:unit` + `test:release-freeze-guard`.
- Здесь только deterministic unit/component/script-unit checks.

3. `test:contracts`

- Состав: `test:consistency` + `test:doc-links` + `test:ipc-contract` + `test:locale-keys` + `test:prompt-contract` + `copy:check`.
- Важно: `test:consistency` уже включает часть contract checks, поэтому дополнительные шаги здесь только те, которые не покрываются транзитивно.

4. `smoke`

- Состав: compile/build/Rust static gates + `test:unit` + `test:contracts` + `test:interview-quality`.
- Это canonical compile-and-test baseline для `verify:fast`.

5. `verify:fast`

- Состав: `smoke` + `test:security-lanes` + `test:public-footprint`.
- Default PR/local gate.

6. `verify:standard`

- Состав: `verify:fast` + `scripts:lifecycle` + `release:freeze:check`.
- Это основной локальный pre-handoff gate, когда нужен читаемый baseline без release-only тяжёлых lanes.

7. `verify:full`

- Состав: `verify:standard` + `release:freeze:check:strict` + `rust:deps` + `audit:npm` + `test:runtime-quality` + `test:product-scenarios` + `report:runtime-quality:strict` + `report:interview-quality:strict` + `report:release-readiness:strict`.
- Это release-quality gate. Здесь разрешены strict report lanes, потому что они являются explicit blocking release gates.

8. `verify:extended`

- Состав: `test:ui:coverage` + `test:fixtures` + `test:runtime-quality` + `test:product-scenarios` + `test:optional:e2e:web` + `test:optional:e2e:desktop` + `test:experimental`.
- Этот профиль не вызывает `verify:full`, чтобы nightly/CI не гонял full дважды.
- `test:runtime-quality` уже включает `test:say-now-scenarios` и `test:interview-quality`, поэтому `verify:extended` не должен вызывать их отдельно.
- Запускать его следует как addon после `verify:full`, а не вместо `verify:full`.

## Tests vs Reports

- `test:*` scripts являются gate-командами и должны падать при нарушении ожиданий.
- `report:*` scripts существуют для evidence/report generation.
- Если report-команда должна быть blocking gate, canonical имя обязано явно содержать `:strict`.
- Поэтому canonical blocking report lanes: `report:runtime-quality:strict`, `report:interview-quality:strict`, `report:release-readiness:strict`.

## Compatibility Aliases

| Alias | Canonical target |
| --- | --- |
| `pnpm verify` | `pnpm verify:fast` |
| `pnpm test:runtime-answer-quality` | `pnpm test:runtime-answer-quality:gate` |
| `pnpm test:product-scenarios` | `pnpm test:product-scenarios:gate` |
| `pnpm report:runtime-quality` | `pnpm report:runtime-quality:strict` |
| `pnpm report:interview-quality` | `pnpm report:interview-quality:strict` |

## Supporting Lanes

- Security/dependency lanes: `pnpm test:security-lanes`, `pnpm test:public-footprint`, `pnpm rust:deps`, `pnpm audit:npm`.
- Runtime quality gate: `pnpm test:runtime-quality`.
- Product quality gate: `pnpm test:product-scenarios`.
- Lifecycle governance: `pnpm scripts:lifecycle`.
- Operator release lane: `pnpm verify:release-local`.

## CI Alignment

- `.github/workflows/ci.yml`: blocking `verify:fast` baseline.
- `.github/workflows/extended-quality.yml`: `verify:full` и затем addon-only `verify:extended`, без отдельного повторного запуска addon lanes вне `verify:extended`.
- `.github/workflows/release-on-tag.yml`: tag/release validation path.
