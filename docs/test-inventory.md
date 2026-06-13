# Test Inventory Audit Note

Canonical testing policy moved to [engineering/testing.md](engineering/testing.md).

This file remains only as a historical audit note from the 2026-06-13 test-surface cleanup. It is not a source of truth for profile policy, lane boundaries, or CI expectations.

Key audit outcomes preserved here:

- `verify:fast -> verify:standard -> verify:full` is the required baseline chain.
- `verify:extended` is a separate addon lane and does not replace `verify:full`.
- `verify:full` intentionally re-runs interview-quality evaluation through `report:interview-quality:strict` for evidence output.
- `test:fixtures` overlaps partly with `test:prompt-contract`, but remains the lighter fixture-hygiene addon lane.
- `verify`/`verify:fast`, `test:e2e:web`/`test:e2e:web:smoke`, and `check:slo`/`test:slo-budget` are compatibility aliases.
- Optional wrappers may report `SKIP`; that must not be presented as full validation.

For current commands, when-to-run guidance, fixture boundaries, strict/report gates, and CI alignment, use [engineering/testing.md](engineering/testing.md).
