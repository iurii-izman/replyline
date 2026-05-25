# Testing Stack Setup

## Required Gates

- Install deps: `pnpm install --frozen-lockfile`
- Required PR/local profile: `pnpm verify:fast`
- Release profile: `pnpm verify:full`
- Rust supply chain lane: `pnpm rust:deps`
- npm advisories: `pnpm audit:npm`

`pnpm smoke` is required and includes:

- `cargo test --manifest-path src-tauri/Cargo.toml`
- `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`
- required policy checks: `pnpm test:prompt-contract`, `pnpm copy:check`

## API Test Stack (single source of truth)

Replyline keeps one API stack: **Postman/Newman**.

- API smoke: `pnpm test:api:postman`
- In this minimal public footprint, Postman collection/environment files may remain local-only.
- If local Postman files are absent, `pnpm test:api:postman` exits with `SKIP` and does not fail the pipeline.

Bruno assets and scripts were removed to avoid duplicate maintenance.

## Optional Lanes

Optional tooling is excluded from the default install profile (`optional=false` in `.npmrc`).
Before running optional lanes, install optional packages explicitly:

```bash
pnpm install --include=optional
```

- `pnpm verify:extended`
- `pnpm deps:review` (dependency freshness + override maintenance review; non-blocking lane)
- `pnpm test:optional:api`
- `pnpm test:optional:e2e:web`
- `pnpm test:optional:e2e:desktop`
- `pnpm test:optional:ux:lighthouse`

## Frontend Test Strategy

- `pnpm test:ui` is the default frontend regression lane for PR/local changes touching `src/app/*`.
- Keep tests deterministic: mock platform IPC (`invoke`, shortcuts, listeners), avoid timers unless controlled with fake timers, and avoid full snapshots.
- Coverage intent:
  - `src/app/controller/*`: direct unit tests for pure/action modules plus integration coverage via `App.ui.test.tsx`.
  - Critical UI states: mode state banner, Candidate Pack state machine, Settings diagnostics warnings, and export safety copy.
- Run `pnpm test:ui:coverage` when:
  - changing controller orchestration or setup/mode/privacy flows;
  - adding/removing UI states in `MainSurface`, `SettingsSurface`, or `CandidatePackStudio`;
  - preparing risk-sensitive handoff where proof of frontend coverage delta is required.
