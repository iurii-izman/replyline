# Interview Quality Gate

Deterministic Interview Engine quality lane.

## Commands

- `pnpm test:interview-quality` — blocking quality gate.
- `pnpm report:interview-quality` — quality report for handoff/release evidence.

Dataset and expectations are documented in `docs/interview-golden-dataset-v1.md`.

## What this gate checks

- answer completeness and structure constraints
- no fabricated metrics/claims
- clarifier behavior constraints
- question-type alignment
- signal quality constraints

## What this gate does not guarantee

- It does not guarantee 100% correctness for any real interview question.
- It does not replace human review for legal/compliance context.
- It does not prove equal behavior across all providers and all runtime conditions.

## Required release artifacts

1. Green `pnpm test:interview-quality` run.
2. Attached `pnpm report:interview-quality` output.
3. Updated `docs/known-limitations.md` when behavior/coverage changed.
