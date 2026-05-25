# Interview Mode

Replyline supports two product paths:

- WorkConversation Mode
- Interview Mode

## Scope and allowed use

Interview Mode is designed for interview preparation and allowed assistance.

- No stealth cheating features.
- No hidden audio-capture behavior.
- Use only where interview assistance is allowed by employer/platform/law.
- Replyline is a visible local UI assistant (no hidden/click-through workflow).
- No claims of guaranteed correctness for every question.

## Runtime switch and card contracts

- WorkConversation path uses `CardSchemaV3` and maps to UI card `gist / say_now / next_move`.
- Interview path uses `InterviewCardSchemaV1` and enriches UI with interview cards.
- Runtime switch is explicit:
  - Interview path is active only while interview session is active (`start_interview_session` -> `end_interview_session`).
  - Otherwise runtime uses WorkConversation path.
- `retry_last_analysis` reuses the latest available mode; fallback mode is WorkConversation.
- WorkConversation path excludes Candidate Pack context by default.

Reference: `docs/adr/0001-interview-card-engine.md`.

## Candidate Pack usage in Interview path

- Candidate Pack is optional but supported.
- You can prepare a draft via `prepare_candidate_pack`, then persist it with `save_prepared_candidate_pack` and/or save final pack with `save_candidate_pack`.
- Stored Candidate Pack is used as context for interview generation and interview report scoring heuristics.

## Session controls and report flow

Session commands:

- `start_interview_session` starts a new interview session state.
- `end_interview_session` finalizes and saves report to local store.
- `get_interview_report` returns latest stored report.
- `export_interview_report_markdown` writes full markdown file (includes transcript) only on explicit user action.
- `export_interview_report_redacted_markdown` writes redacted markdown file (no transcript) only on explicit user action.
- `clear_interview_reports` removes local reports and resets in-memory interview session state.
- `interviewReportRetentionDays` controls optional automatic purge (`0`, `7`, `30`, `90`):
  - `0` means keep until explicit `clear_interview_reports`.
  - purge runs only when retention policy explicitly requires it.

Report structure (`InterviewReportDto`) includes:

- session metadata (`sessionId`, `startedAt`, `endedAt`, `language`)
- per-question entries (`rawTranscript`, `cleanQuestion`, `answerMain`, etc.)
- `fullTranscript`
- heuristic scores (`clarity`, `relevance`, `accuracy`)
- feedback arrays

Storage and export boundaries:

- Report store is local-only (`%LOCALAPPDATA%\com.replyline.app\reports\interview-reports.json`).
- Reports are never exported unless user explicitly calls `export_interview_report_markdown`.
- Safer sharing path: prefer `export_interview_report_redacted_markdown` for external sharing.
- Full export warning: `export_interview_report_markdown` can include raw transcript text and should be treated as sensitive.
- Redacted export warning: even redacted markdown is a share candidate only after manual review for residual identifiers/context.
- Public repo rule: generated interview exports must stay local-only and must not be committed.

## Prompt profiles

Interview output style is controlled by predefined answer profiles (for example `interview_default`, `interview_star`, `interview_technical`).

Beta constraint:

- There is no raw prompt editor in beta UI.
- Prompt/profile behavior is validated through `pnpm test:prompt-contract` and `pnpm test:interview-quality`.

## Current limitations

- This path does not guarantee perfect correctness for all interviews.
- It does not provide stealth mode or invisible overlay behavior.
- It does not provide transcript/history/team workflow UI.
- Report scores are deterministic heuristics, not formal assessment guarantees.

## Validation flow

For Interview Mode changes run:

1. `pnpm smoke` (includes `pnpm test:interview-quality`)
2. `pnpm verify:fast`
3. `pnpm verify:full` (includes `pnpm report:interview-quality`)
4. `pnpm beta:preflight` for runtime evidence handoff (non-replacement for verify lanes)
