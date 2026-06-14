# Contributing

By participating, you agree to follow the
[Code of Conduct](CODE_OF_CONDUCT.md). Use the private reporting channel
described there for enforcement concerns.

## Scope

Keep Replyline in the current beta scope:

- single user path: `capture -> stt -> llm -> card`
- compact settings only
- no Advanced Mode user surface
- no memory/diagnostics user surface

## Architecture boundaries

- `src/app/model.ts`: state/types
- `src/app/platform.ts`: platform bridge
- `src/app/controller.ts`: orchestration

## Required checks before merge

```bash
pnpm install --frozen-lockfile
pnpm verify
```

Canonical verification guide: [docs/engineering/verification.md](docs/engineering/verification.md)

## Local handoff profile

```bash
pnpm verify
```

## Release candidate profile

```bash
pnpm verify:full
```

`verify:full` includes internal building blocks such as:

- `pnpm verify:standard`
- `pnpm release:freeze:check:strict`
- `pnpm rust:deps`
- `pnpm audit:npm`
- runtime/product quality gates
- strict evidence reports

Green in one lane does not mean green everywhere. `smoke`, `verify:*`, deterministic fixture lanes, and E2E lanes prove different things.

Release policy, freeze semantics, incident severity, and packaging truth live in
[docs/engineering/release.md](docs/engineering/release.md).

## Solo workflow mode

- Repository currently assumes one active developer.
- Direct work to `main` is acceptable after required checks pass.
