# Engineering Verification Guide

Canonical public guide for verification profiles and how they should be used in normal development.

Public profiles are intentionally small. Internal building blocks still exist, but they are not the main commands contributors should memorize or treat as canonical handoff profiles.

## Public / canonical profiles

| Profile | Command | When to run | What it proves |
| --- | --- | --- | --- |
| Quick local loop | `pnpm test:quick` | During small UI/TypeScript iteration when you want the shortest deterministic feedback loop | TypeScript and UI regressions caught by `typecheck`, `lint`, and `test:ui` |
| Default verification | `pnpm verify` | Normal code changes and default local validation | Required baseline for code changes through the repo's default verify lane |
| Release verification | `pnpm verify:full` | Before release decisions, dependency-sensitive handoff, or strict evidence generation | Strict freeze, dependency, runtime-quality, product-scenario, and report gates |
| Extended addon lane | `pnpm verify:extended` | After the required baseline is already green and extra confidence is useful | Coverage, fixture hygiene, optional E2E, and experimental addon checks |

## Recommended developer flow

For normal work, a contributor should run:

1. `pnpm test:quick`
2. `pnpm verify`
3. `pnpm verify:full` before release-sensitive handoff or release decisions

`pnpm verify:extended` is optional addon coverage. It does not replace `pnpm verify:full`.

If `package.json` or `pnpm-lock.yaml` changes, also run `pnpm audit:npm`.
If Rust dependencies or `src-tauri/Cargo.toml` change, also run `pnpm rust:deps`.

## Internal building blocks

These commands remain supported because they compose the public profiles or serve targeted workflows, but they are not the main public verification entry points:

- `pnpm test:unit`
- `pnpm test:contracts`
- `pnpm smoke`
- `pnpm verify:fast`
- `pnpm verify:standard`

Use them when you need targeted diagnosis, local composition details, or lifecycle-specific debugging. Treat them as implementation details behind the public model, not as the canonical profile set.

## Relationship to detailed testing policy

Use [testing.md](testing.md) for detailed lane boundaries, fixture ownership, E2E semantics, runtime-vs-deterministic distinctions, lifecycle classes, and CI alignment.
