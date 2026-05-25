# Candidate Pack

`Candidate Pack` is a local preparation artifact for Interview Mode.

## Storage and scope

- Saved pack file: `%APPDATA%\com.replyline.app\candidate-pack.v1.json`.
- Prepared draft file (`save_prepared_candidate_pack`): `%APPDATA%\com.replyline.app\candidate-pack-latest.json`.
- Feature is explicit user-driven preparation, not hidden memory.

## What is logged and what is not

- Raw `resume`, raw `job description`, raw `company values` are not written to app logs.
- Prepare/save logs keep only compact counters/status (`facts`, `weak_facts`, quality score).
- Prepared/Final pack files themselves are local artifacts and may contain sensitive profile content.

## Data quality rules

- Use evidence-based facts only.
- Do not fabricate metrics, team size, impact values, or project outcomes.
- If a metric is unknown, keep it unknown and reframe safely.

These rules are enforced by interview quality fixtures and checks.

## Cloud/local boundary

- Raw `resume`, raw `job description`, raw `company values` stay local until user explicitly runs `prepare_candidate_pack`.
- During `prepare_candidate_pack`, relevant content is sent to the configured LLM provider for draft generation.
- Saved compact context (`candidate-pack.v1.json`) stays local.
- By default, saved Candidate Pack context is used for Interview Mode only (active interview session), not WorkConversation.

## What is sent to LLM

During `prepare_candidate_pack`, Replyline sends:

- `Resume` text (raw input)
- `Job description` text (raw input)
- `Company values/about text` (raw input)
- Fixed preparation system prompt with anti-fabrication rules

During Interview Mode card generation, compact Candidate Pack context can be included in LLM context to anchor answers.
WorkConversation generation excludes Candidate Pack context by default.

## Privacy caveats

- Candidate Pack data can leave the machine when you use cloud LLM providers.
- Provider-side retention/logging policies are controlled by provider terms, not by Replyline.
- Treat local pack files and interview reports as sensitive and redact before sharing.
- Never commit raw Candidate Pack examples, full interview exports, or provider payload dumps into the public repository footprint.

## AI preparation boundary

- AI preparation is explicit.
- User triggers preparation and saving actions in UI.
- No stealth automation for interview answers.

## Operational guardrails

Before beta handoff, verify:

1. Candidate Pack examples in docs do not contain fabricated metrics.
2. `pnpm test:interview-quality` is green.
3. `pnpm report:interview-quality` report is attached to release evidence.
