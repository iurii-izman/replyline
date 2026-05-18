# Interview Mode

Replyline supports two product paths:

- WorkConversation Mode
- Interview Mode

## Scope and allowed use

Interview Mode is designed for interview preparation and allowed assistance.

- No stealth cheating features.
- No hidden audio-capture behavior.
- No claims of guaranteed correctness for every question.

## Card architecture

- WorkConversation path uses `CardSchemaV3`.
- Interview path uses `InterviewCardSchemaV1`.
- Runtime switch is explicit:
  - Interview path is active only while interview session is active (`start_interview_session` -> `end_interview_session`).
  - Otherwise runtime uses WorkConversation path.
- `retry_last_analysis` reuses the last card mode when available; if mode cannot be inferred, fallback is WorkConversation.
- Default generation path is single-pass.
- Conditional second pass is allowed only when the first pass fails the quality gate.

Reference: `docs/adr/0001-interview-card-engine.md`.

## Prompt profiles

Interview output style is controlled by predefined profiles (for example `interview_default`, `interview_star`, `interview_technical`).

Beta constraint:

- There is no raw prompt editor in beta UI.
- Prompt/profile behavior is validated through `pnpm test:prompt-contract` and `pnpm test:interview-quality`.

## Validation flow

For Interview Mode changes run:

1. `pnpm test:quick`
2. `pnpm smoke` (includes `pnpm test:interview-quality`)
3. `pnpm verify:fast`
4. `pnpm verify:full` (includes `pnpm report:interview-quality`)
5. `pnpm beta:preflight` for runtime evidence handoff (non-replacement for verify lanes)
