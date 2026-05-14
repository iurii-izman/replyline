# Script Lifecycle Matrix

Единая классификация команд из `package.json` для stable beta.

## Required

- Owner: engineering
- Purpose: обязательный локальный quality/security gate перед merge/release-candidate
- Scripts:
  - `pnpm smoke`
  - `pnpm verify`
  - `pnpm test:security-lanes`
  - `pnpm rust:deps`
  - `pnpm audit:npm`

## Optional

- Owner: QA + feature owners
- Purpose: углублённая проверка без блокировки ежедневного цикла
- Scripts:
  - `pnpm verify:extended`
  - `pnpm test:ui:coverage`
  - `pnpm test:fixtures`
  - `pnpm test:say-now-scenarios`
  - `pnpm test:optional:api`
  - `pnpm test:optional:e2e:web`
  - `pnpm test:optional:e2e:desktop`
  - `pnpm test:optional:ux:lighthouse`

## Experimental

- Owner: runtime/perf/security tracks
- Purpose: сигнал по нестабильным или machine-dependent lane
- Scripts:
  - `pnpm test:optional:perf:k6`
  - `pnpm test:optional:sec:zap`
  - `pnpm test:experimental`

## Deprecated

- Owner: release operations
- Purpose: legacy handoff flow, не часть default stable-beta цикла
- Scripts:
  - `pnpm alpha:handoff`
  - `pnpm alpha:preflight`

## Validation

- `pnpm scripts:lifecycle` проверяет, что матрица ссылается только на существующие scripts.
