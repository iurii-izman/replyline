# Interview Golden Dataset V1

Offline deterministic gate for interview-answer quality.

## Commands

- `pnpm test:interview-quality` — blocking gate (fails on any scenario failure)
- `pnpm report:interview-quality` — category summary + failed cases

## Dataset

Path: `tests/fixtures/interview-quality/golden-dataset-v1.json`

Each fixture includes:
- `transcript`
- optional `candidatePack`
- `expected.questionType`
- `expected.mustMention`
- `expected.mustNotMention`
- `expected.allowClarifier`
- `expected.requiresResumeAnchor`
- `expected.requiresNoFabrication`
- deterministic `deterministicOutput` (InterviewCardSchemaV1 mock)

## Quality gates

- `answer.main` profile limits
- no fabricated metrics
- no fake company/project claims
- clarifier only when allowed
- direct answer present
- STAR-like structure for behavioral answers
- hints/signals are non-empty and useful
- no coaching fluff
- no transcript retell

The lane is provider-free, does not call real LLMs, and does not require API keys.
