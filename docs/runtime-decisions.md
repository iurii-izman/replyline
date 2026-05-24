# Replyline Runtime Decisions

## Current production path

Keep this as the main MVP runtime path:

- system audio only via WASAPI loopback
- Deepgram batch STT
- one fast LLM route: `openai/gpt-4o-mini`
- LLM JSON contract: **CardSchemaV3** (`question_brief`, `answer_now`, `star_evidence`, `next_step`, optional `risk_or_clarifier`)
- IPC/UI legacy mapping: `gist / say_now / next_move` (unchanged for clients)
- repair-first normalization in `card_v3.rs`; `next_step` fallback uses 10 intent-aware templates (email, chat, ticket, meeting, owner/deadline, document, plan, blocker/risk, approval, default)
- paragraph-style `answer_now` with dynamic char/word limits by `chars_band`
- RAM-only context memo

Claim status for this path must follow `docs/benchmark-policy.md` labels.

## What is not in the main path

Do not use these as default MVP behavior:

- streaming STT
- multiple default LLM routes
- microphone capture
- full transcript UI
- snippet history
- raw audio persistence
- local STT endpoint switching
- provider expansion claims beyond documented shipped path
- packaging/distribution expansion claims

## Capture duration policy

Replyline now supports a configurable capture limit from `5` to `180` seconds.

Product guidance:

- `5-15s`: best for short objections and direct questions
- `15-60s`: acceptable for more context-heavy work talk
- `120-180s`: experimental only, not the promised fast path

Long captures are supported so the founder can test real usage, but the interactive product promise should still be built around short-to-medium snippets.

## Why long capture is not the whole answer

If the user needs minutes of context every time, the right solution is not to keep stretching one hotkey hold forever. The better long-term shape is a separate memory layer.

Scope note:

- this memory direction is a future track;
- it is not part of the current user-facing MVP stable-beta flow.

That future layer should:

- store distilled facts, not raw audio by default
- keep separate conversation memory per team / thread / contact group
- save commitments, terminology, and stable context
- stay clearly separated from the live response card

## Current recommendation

- default capture limit: `30s`
- recommended practical range for live use: `5-60s`
- keep `120-180s` available only as an advanced setting while runtime evidence is still noisy
- for repeated latency summaries, use `15/30/60` averages before changing fast-path messaging

## Readiness wording guardrail

- "Ready" requires runtime evidence (`pnpm probe:runtime`) plus a bundle (`pnpm evidence:bundle`).
- If those artifacts are missing or stale, mark claims as `pending verification`.
- live-source app claims (Teams/Meet/Zoom/Telemost/browser) remain `pending verification` unless each app has repeated local runs.

See also:

- `docs/runtime-bringup.md`
- `docs/runtime-evidence.md`
- `docs/release-readiness.md`
