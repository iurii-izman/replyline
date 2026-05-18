# Candidate Pack

`Candidate Pack` is a local preparation artifact for Interview Mode.

## Storage and scope

- Stored locally in user settings/profile flow.
- Not a hidden cloud memory feature.
- Intended for explicit preparation assistance.

## Data quality rules

- Use evidence-based facts only.
- Do not fabricate metrics, team size, impact values, or project outcomes.
- If a metric is unknown, keep it unknown and reframe safely.

These rules are enforced by interview quality fixtures and checks.

## AI preparation boundary

- AI preparation is explicit.
- User triggers preparation and saving actions in UI.
- No stealth automation for interview answers.

## Operational guardrails

Before beta handoff, verify:

1. Candidate Pack examples in docs do not contain fabricated metrics.
2. `pnpm test:interview-quality` is green.
3. `pnpm report:interview-quality` report is attached to release evidence.
