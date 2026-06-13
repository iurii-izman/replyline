# Testing Stack Setup

## Required Baseline

- Install deps: `pnpm install --frozen-lockfile`
- Fast PR/local gate: `pnpm verify:fast`
- Local pre-handoff gate: `pnpm verify:standard`
- Release-quality gate: `pnpm verify:full`
- Rust supply chain lane: `pnpm rust:deps`
- npm advisories lane: `pnpm audit:npm`

## Canonical Test Profiles

- `pnpm test:quick` -> fastest local loop
- `pnpm test:unit` -> deterministic unit/component/script-unit coverage
- `pnpm test:contracts` -> docs/copy/prompt/ipc/locale plus split contract lanes

`pnpm test:consistency` remains the привычный aggregator alias, but now it is a
readable composition of focused lanes:

- `pnpm test:contracts:docs`
- `pnpm test:contracts:ui`
- `pnpm test:contracts:model`
- `pnpm test:contracts:runtime`
- `pnpm test:contracts:observability`
- `pnpm test:contracts:beta`

`pnpm smoke` is the canonical compile-and-test baseline and includes:

- `typecheck`
- `lint`
- `build`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`
- `pnpm test:unit`
- `pnpm test:contracts`
- `pnpm test:interview-quality`

## Reports and Strict Reports

- `report:*` lanes generate evidence/report artifacts.
- Blocking report lanes are named explicitly with `:strict`.
- Canonical strict report gates:
  - `pnpm report:runtime-quality:strict`
  - `pnpm report:interview-quality:strict`
  - `pnpm report:release-readiness:strict`

Compatibility aliases remain available:

- `pnpm report:runtime-quality` -> `pnpm report:runtime-quality:strict`
- `pnpm report:interview-quality` -> `pnpm report:interview-quality:strict`

## Extended / Optional Lanes

Optional tooling is excluded from the default install profile (`optional=false` in `.npmrc`).
Before running addon lanes, install optional packages explicitly:

```bash
pnpm install --include=optional
```

- `pnpm verify:extended`
- `pnpm deps:review`
- `pnpm test:optional:e2e:web`
- `pnpm test:optional:e2e:desktop`
- `pnpm test:optional:ux:lighthouse`

`verify:extended` is an addon lane. It does not rerun `verify:full`; CI/nightly should execute `verify:full` separately when full baseline is required. The extended profile itself owns coverage, fixtures, `test:runtime-quality`, `test:product-scenarios`, and the optional addon lanes, so workflows should not schedule those same lanes again outside `verify:extended`.
If optional tooling is absent, the wrapper lanes return `SKIP`; workflow/reporting
must surface that as `SKIP`, not as a silent pass.

## Workflow Expectations

- `.github/workflows/ci.yml` is the blocking PR/main lane: `verify:fast` + blocking web E2E + strict release-freeze check.
- `.github/workflows/extended-quality.yml` is a non-blocking addon workflow: `verify:full`, then `verify:extended`, with explicit summary states for `PASS`, `PASS_WITH_SKIP`, and `FAIL_NON_BLOCKING`.
- `.github/workflows/windows-packaging-manual.yml` now runs `pnpm verify:fast` before `pnpm tauri build`, so manual packaging is no longer a raw build-only path.

## Desktop/Web E2E Policy

- Blocking credential-free happy path: `pnpm test:e2e:web:smoke`.
- Optional visual snapshot lane: `pnpm test:e2e:web:visual`.
- `pnpm test:e2e:web` currently aliases the blocking smoke lane; it does not include visual snapshots by default.
- Web E2E auto-starts local Vite server (`127.0.0.1:4173`) from Playwright config.
- Desktop E2E (`pnpm test:e2e:desktop`) remains optional and returns `SKIP` when `TAURI_APP_PATH` is not set.
- Desktop E2E scope is intentionally narrow: verify that a built desktop artifact launches and still accepts minimal keyboard input. It is not a full UX regression suite.
- Desktop E2E required lane (`pnpm test:e2e:desktop:required`) is for release/operator validation and fails when prerequisites are missing.

Required desktop E2E prerequisites:

- build app artifact: `pnpm tauri build`
- set desktop binary path: `set TAURI_APP_PATH=<path-to-built-app>`
- run lane: `pnpm test:e2e:desktop:required`
