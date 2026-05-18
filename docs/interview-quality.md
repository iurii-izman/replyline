# Interview Quality Gate

Deterministic Interview Engine quality lane for real `InterviewCardSchemaV1`.

## Commands

- `pnpm test:interview-quality` — blocking quality gate.
- `pnpm report:interview-quality` — quality report for handoff/release evidence.

Dataset and expectations are documented in `docs/interview-golden-dataset-v1.md`.

## What this gate checks

- JSON shape must match `InterviewCardSchemaV1` (`question`, `answer`, `signals`, `risks`, `followUps`, `clarifier`)
- profile word limits from backend `prompt_registry.rs` (`answer_word_min/max`, `short_word_max`, `strong_word_max`)
- no fabricated metrics and no fabricated resume anchors
- direct-answer framing (no vague filler/coaching fluff)
- STAR-like structure when required (behavioral/star-like scenarios)
- clarifier only when allowed and actually needed
- no transcript retell / copy-paste behavior
- expected question-type alignment and mustMention/mustNotMention expectations

## What this gate does not guarantee

- It does not guarantee 100% correctness for any real interview question.
- It does not replace human review for legal/compliance context.
- It does not prove equal behavior across all providers and all runtime conditions.

## Required release artifacts

1. Green `pnpm test:interview-quality` run (blocking).
2. `pnpm report:interview-quality` report with totals, summary by question type, and failure reasons.
3. Updated `docs/known-limitations.md` when behavior/coverage changed.

Blocking means fail fast in CI/local:
- any schema mismatch
- any fabricated metrics/resume anchors
- any profile-limit violation
- any forbidden clarifier usage
- any STAR/direct-answer violation for required scenarios
