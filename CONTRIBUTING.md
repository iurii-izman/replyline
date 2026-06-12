# Contributing

By participating, you agree to follow the
[Code of Conduct](CODE_OF_CONDUCT.md). Use the private reporting channel
described there for enforcement concerns.

## Scope

Keep Replyline in Slim Stable Beta scope:

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
pnpm verify:fast
```

## Release candidate profile

```bash
pnpm verify:full
```

`verify:full` includes:

- `pnpm verify:fast`
- `pnpm release:freeze:check`
- `pnpm rust:deps`
- `pnpm audit:npm`

## Solo workflow mode

- Repository currently assumes one active developer.
- Direct work to `main` is acceptable after required checks pass.
