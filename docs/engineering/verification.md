# Engineering Verification Guide

This compatibility page moved to [testing.md](testing.md).

Current canonical quality bundle is `pnpm test:quality`:

- `pnpm test:interview-quality`
- `pnpm test:runtime-answer-quality:gate`
- `pnpm test:product-scenarios:gate`
- `pnpm test:say-now-scenarios`
- `pnpm check:slo`

`pnpm verify:full` runs that bundle once. `pnpm verify:extended` stays addon-only (`test:ui:coverage`, fixture lanes, optional E2E, experimental lanes) and must not rerun runtime/product/interview quality.

Use [testing.md](testing.md) for canonical verification profiles, lane boundaries, fixture ownership, E2E semantics, and CI alignment.
