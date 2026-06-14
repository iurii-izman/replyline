# Test Quality Fixtures

Canonical fixture-boundary guidance moved to [engineering/testing.md](engineering/testing.md).

Use that guide for:

- prompt-contract vs interview-quality vs product-scenarios vs `test:quality` boundaries
- deterministic fixture responsibilities
- canonical `test:quality` composition:
- `test:interview-quality`
- `test:runtime-answer-quality:gate`
- `test:product-scenarios:gate`
- `test:say-now-scenarios`
- `check:slo`
- strict/report gate expectations, including that `report:interview-quality:strict` remains advisory/manual instead of a second blocking full-profile pass
