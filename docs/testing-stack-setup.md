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
- `pnpm test:optional:api`
- `pnpm test:optional:e2e:web`
- `pnpm test:optional:e2e:desktop`
- `pnpm test:optional:ux:lighthouse`
