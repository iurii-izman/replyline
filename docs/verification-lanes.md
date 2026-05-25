# Replyline Verification Lanes

Этот документ фиксирует роли verification lane и их границы. `green` в одном lane не означает `green` в другом.

## Core lanes

| Lane | Main command | Role |
| --- | --- | --- |
| internal beta seal | `pnpm beta:seal` | One-command internal tester readiness report with explicit blockers/warnings/skips |
| fast default | `pnpm verify` / `pnpm verify:fast` | Обязательный PR/local baseline: compile + lint + tests + security/public footprint checks |
| full release profile | `pnpm verify:full` | Усиленный release профиль: `verify:fast` + freeze/dependency/security/release reporting lanes |
| extended quality | `pnpm verify:extended` | Неразрушающий расширенный quality lane (coverage/fixtures/scenario/runtime-quality) |
| local release readiness | `pnpm verify:release-local` | Строгий локальный pre-handoff lane без live credentials и GUI шагов |
| local release readiness + required web E2E | `pnpm verify:release-local:required-e2e` | Operator lane: `verify:release-local` + non-skipped web E2E execution |
| desktop E2E required lane | `pnpm test:e2e:desktop:required` | Operator lane для built desktop artifact: не допускает `SKIP`, даёт только `PASS`/`FAIL` |

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
- `pnpm test:e2e:web` в этом lane остаётся optional-wrapper lane и может корректно завершиться как `SKIP` (например, если Playwright runtime отсутствует в локальном окружении).
- Для release operator есть required путь без skip-wrapper: `pnpm test:e2e:web:required` (должен дать `PASS` или `FAIL`, но не `SKIP`).

5. `verify:release-local:required-e2e`
- Состав: `verify:release-local` + `test:e2e:web:required`.
- Это decision lane для релиз-оператора, когда нужен явный non-skipped E2E сигнал в локальном handoff.

6. `beta:seal`
- Состав (operator command): `verify:fast`, `test:doc-links`, `copy:check`, `test:manual-closure-pack`, `report:runtime-quality`, `report:product-quality`, `report:live-evidence-pack`, `report:release-readiness:strict`, плюс optional lanes `test:e2e:desktop` и `test:api:postman`.
- Выход: `reports/release/internal-beta-seal-YYYY-MM-DD.md` (`ready` / `ready-with-warnings` / `blocked`).
- Не доказывает public beta readiness; signed binary / required desktop E2E остаются RC/public gates.

## Supporting lanes

- `pnpm smoke`: compile/unit + policy/contract baseline.
- Security/dependency lanes: `pnpm test:security-lanes`, `pnpm test:public-footprint`, `pnpm rust:deps`, `pnpm audit:npm`.
- Dependency maintenance lane (operator/scheduled, non-blocking): `pnpm deps:review` (`pnpm outdated --recursive` + override freshness review).
  - Decision log (2026-05-25): removed stale `pnpm.overrides` entries (`handlebars`, `node-forge`, `underscore`) after evidence that they were absent from `pnpm-lock.yaml` during `deps:review`; blocking audit gates remain unchanged.
- Runtime evidence lanes: `pnpm report:runtime-quality`, `pnpm test:product-scenarios`, `pnpm report:live-evidence-pack`.
- Lifecycle governance: `pnpm scripts:lifecycle` (coverage и конфликт классификации scripts).
- E2E lanes:
  - `pnpm test:e2e:web` is an optional-wrapper deterministic credential-free lane and is included in `verify:release-local`.
  - `pnpm test:e2e:web:required` is a non-wrapper operator lane for explicit non-skipped evidence.
  - `pnpm test:e2e:desktop` remains optional (`SKIP` when `TAURI_APP_PATH` is absent) for normal PR/dev flow.
  - `pnpm test:e2e:desktop:required` is a non-wrapper operator lane for release validation and fails if `TAURI_APP_PATH` is missing.

## CI alignment

- `.github/workflows/ci.yml`: блокирующий fast CI lane + `release:freeze:check:strict`, публикует freeze/test artifacts.
- `.github/workflows/extended-quality.yml`: non-blocking extended signal, публикует summary artifact с failed lane списком.
- `.github/workflows/release-on-tag.yml`: создаёт GitHub Release notes по тегу, строит Windows artifact и прикрепляет его к релизу; помечает `signed` только при валидной Authenticode подписи.

## Public beta blocking decision (optional lanes)

- Make blocking before public beta:
  - `pnpm test:e2e:web` in Windows CI (deterministic, credential-free).
- Keep non-blocking before public beta:
  - `pnpm test:e2e:desktop` (optional wrapper lane for dev/PR when artifact/env is unavailable).
  - `pnpm test:api:postman` (local collection/environment can be intentionally absent in public footprint; lane must stay local/mock-only and must not carry real secrets, raw transcripts, or production endpoints).
  - `pnpm test:perf:k6`, `pnpm test:sec:zap`, `pnpm test:ux:lighthouse` (heavier operator lanes, best as scheduled signal).

## Desktop E2E release policy

- PR/dev: use `pnpm test:e2e:desktop` (optional, safe `SKIP`).
- Internal beta handoff: `pnpm test:e2e:desktop:required` is recommended when built artifact is available.
- RC/public beta handoff: `pnpm test:e2e:desktop:required` is required and must be non-skipped.

Windows local run example:

```powershell
pnpm tauri build
$env:TAURI_APP_PATH = "src-tauri\\target\\release\\replyline.exe"
pnpm test:e2e:desktop:required
```
