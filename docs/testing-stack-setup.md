# Testing Stack Setup

## Required Gates

- Install deps: `pnpm install --frozen-lockfile`
- Required quality/security gate: `pnpm verify`
- Rust supply chain lane: `pnpm rust:deps`
- npm advisories: `pnpm audit:npm`

## API Test Stack (single source of truth)

Replyline keeps one API stack: **Postman/Newman**.

- API smoke: `pnpm test:api:postman`
- Collection path: `tests/api/postman/Replyline.postman_collection.json`
- Environment path: `tests/api/postman/Replyline.local.postman_environment.json`

Bruno assets and scripts were removed to avoid duplicate maintenance.

## Optional Lanes

- `pnpm verify:extended`
- `pnpm test:optional:api`
- `pnpm test:optional:e2e:web`
- `pnpm test:optional:e2e:desktop`

## Experimental Lanes (opt-in only)

- `pnpm test:optional:perf:k6`
- `pnpm test:optional:sec:zap`
- `pnpm test:optional:ux:lighthouse`
- `pnpm test:experimental`

These are intentionally out of the daily required path.
