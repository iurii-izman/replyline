# Replyline Verification Lanes

Этот документ фиксирует роли verification lane и их границы. `green` в одном lane не означает `green` в другом.

## Core lanes

| Lane | Main command | Role |
| --- | --- | --- |
| fast default | `pnpm verify` / `pnpm verify:fast` | Обязательный PR/local baseline: compile + lint + tests + security/public footprint checks |
| full release profile | `pnpm verify:full` | Усиленный release профиль: `verify:fast` + freeze/dependency/security/release reporting lanes |
| extended quality | `pnpm verify:extended` | Неразрушающий расширенный quality lane (coverage/fixtures/scenario/runtime-quality) |
| local release readiness | `pnpm verify:release-local` | Строгий локальный pre-handoff lane без live credentials и GUI шагов |

## Lane semantics

1. `verify` и `verify:fast`
- `verify` это alias к `verify:fast`.
- `verify:fast` обязан включать `pnpm smoke`, `pnpm test:security-lanes`, `pnpm test:public-footprint`.
- Это baseline для локальной и PR-проверки.

2. `verify:full`
- Состав: `verify:fast` + `release:freeze:check` + `rust:deps` + `audit:npm` + `report:interview-quality`.
- Дублирование security/dependency сигналов относительно `verify:fast` намеренно: release lane должен оставаться самодостаточным и читаемым без догадок о транзитивных шагах.

3. `verify:extended`
- Надстройка над `verify:full`, включает более тяжёлые/длинные automated проверки.
- Не заменяет `verify:fast` в основном PR флоу.

4. `verify:release-local`
- Состав: `verify:fast` + `scripts:lifecycle` + docs/link checks + runtime/product reports + manual closure pack + freeze + strict readiness report.
- Это основной локальный lane перед handoff в `main`.

## Supporting lanes

- `pnpm smoke`: compile/unit + policy/contract baseline.
- Security/dependency lanes: `pnpm test:security-lanes`, `pnpm test:public-footprint`, `pnpm rust:deps`, `pnpm audit:npm`.
- Runtime evidence lanes: `pnpm report:runtime-quality`, `pnpm test:product-scenarios`, `pnpm report:live-evidence-pack`.
- Lifecycle governance: `pnpm scripts:lifecycle` (coverage и конфликт классификации scripts).

## CI alignment

- `.github/workflows/ci.yml`: блокирующий fast CI lane + `release:freeze:check:strict`, публикует freeze/test artifacts.
- `.github/workflows/extended-quality.yml`: non-blocking extended signal, публикует summary artifact с failed lane списком.
- `.github/workflows/release-on-tag.yml`: создаёт GitHub Release notes по тегу; не строит и не публикует installers/binaries.
