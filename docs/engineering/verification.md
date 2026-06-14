# Engineering Verification Guide

This compatibility page moved to [testing.md](testing.md).

Current canonical quality bundle is `pnpm test:quality`:

- `pnpm test:interview-quality`
- `pnpm check:runtime-answer-quality`
- `pnpm check:product-scenarios`
- `pnpm check:say-now-scenarios`
- `pnpm check:slo`

`pnpm verify:full` runs that bundle once. `pnpm verify:extended` stays addon-only (`test:ui:coverage`, fixture lanes, optional E2E, `test:sec:zap`, `test:ux:lighthouse`) and must not rerun runtime/product/interview quality.

CI alignment:

- `.github/workflows/ci.yml` is the fast blocking lane and runs `pnpm verify` plus blocking web smoke and strict release-freeze guard. It does not install `cargo-deny` or `cargo-audit`.
- `.github/workflows/dependency-checks.yml` is the scheduled/manual dependency lane and owns `pnpm rust:deps` plus `pnpm audit:npm`.
- `.github/workflows/release-on-tag.yml` reruns `pnpm verify:full` before packaging a tag artifact.
- `.github/workflows/windows-packaging-manual.yml` requires at least `pnpm verify:fast` before building internal packaging artifacts.
- `.github/workflows/extended-quality.yml` keeps `verify:full` as the baseline and `verify:extended` as addon-only. `PASS_WITH_SKIP` means optional addon tools were skipped, not that a blocking baseline was skipped.

Use [testing.md](testing.md) for canonical verification profiles, lane boundaries, fixture ownership, E2E semantics, and CI alignment.
