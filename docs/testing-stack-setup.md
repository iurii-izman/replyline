# Testing Stack Setup

## Required Gates

- Install deps: `pnpm install --frozen-lockfile`
- Required quality/security gate: `pnpm verify`
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
- Collection path: `tests/api/postman/Replyline.postman_collection.json`
- Environment path: `tests/api/postman/Replyline.local.postman_environment.json`

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
