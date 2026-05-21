# Runtime Quality Harness

## Purpose

`runtime-quality` harness is an automated evidence layer for core flow quality on synthetic fixtures:

`recorded/transcribed input -> prompt/LLM contract fixture -> answer card -> validation -> latency budget report -> quality score report`

It runs in CI/local without real Deepgram/OpenAI/OpenRouter keys and without manual GUI/hotkey steps.

## What it validates

- fixture-based answer card quality (`tests/fixtures/runtime-quality/runtime-answer-fixtures.json`)
- card schema/contract checks via `validateCard` from `scripts/prompt-contract-core.mjs`
- policy checks:
  - `say_now`/`next_move` presence
  - `mustContain` / `mustNotContain`
  - max length
  - no apology spam
  - no raw prompt leakage
  - no secret-like patterns
  - no markdown dump in `say_now`
  - RU tone check for RU scenarios
  - no candidate hallucination when `candidatePack` is absent
- synthetic latency parsing from `tests/fixtures/runtime-quality/pipeline-latency-sample.log`
- SLO budget checks via existing `pnpm check:slo`
- aggregate summary across runtime, interview, and say-now lanes

## What it does not prove

- live provider behavior on real network calls
- real STT/LLM latency on user hardware
- manual call UX correctness

Use this harness for regression guardrails, not as replacement for live runtime evidence.

## Thresholds

`tests/fixtures/runtime-quality/quality-thresholds.json`

- `minAverageScore`: aggregate minimum
- `minScenarioScore`: per-scenario minimum
- `maxSayNowChars`: global cap
- `maxTotalLatencyMs`, `maxSttLatencyMs`, `maxLlmLatencyMs`: synthetic budget references

## Fixtures

Path: `tests/fixtures/runtime-quality/runtime-answer-fixtures.json`

Required fields per fixture:

- `id`
- `mode`
- `transcript`
- `candidatePack` (`null` or synthetic object)
- `expected` with rules (`mustContain`, `mustNotContain`, length/behavior flags)

Rules:

- no real PII
- no real secrets
- only synthetic candidate content

## Commands

- `pnpm test:runtime-answer-quality`
- `pnpm test:runtime-answer-quality:unit`
- `pnpm test:runtime-quality`
- `pnpm report:runtime-quality`

`pnpm verify:extended` now includes `pnpm test:runtime-quality`.

## Reports

Generated under `reports/runtime-quality/`:

- `runtime-answer-quality-YYYY-MM-DD.json`
- `runtime-answer-quality-YYYY-MM-DD.md`
- `runtime-quality-summary-YYYY-MM-DD.json`
- `runtime-quality-summary-YYYY-MM-DD.md`

## How to add fixture

1. Add scenario object to `runtime-answer-fixtures.json`.
2. Define deterministic expectations in `expected`.
3. Optionally set `mockCardOverrides` for scenario-specific output shape.
4. Run `pnpm test:runtime-answer-quality` and `pnpm report:runtime-quality`.
5. If needed, tune thresholds only for realistic regression guardrails (no fake perfection).
