# Script Lifecycle Matrix

Canonical lifecycle policy moved to [engineering/testing.md](engineering/testing.md).

Run `pnpm scripts:lifecycle` to validate the classifications from [`scripts/check-script-lifecycle.mjs`](../scripts/check-script-lifecycle.mjs).

Compatibility aliases are not canonical profiles just because they resolve to the same underlying command. In particular:

- `pnpm verify` is the public canonical profile name; `pnpm verify:fast` remains an internal building block
- `pnpm test:e2e:web` is a compatibility alias, not a canonical E2E profile
- canonical threshold gates live under `check:*`
