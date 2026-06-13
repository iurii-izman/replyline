# CardSchemaV3 Migration Notes

## Summary

Replyline now generates **CardSchemaV3** at the LLM boundary and maps it to the legacy IPC/UI shape (`gist` / `say_now` / `next_move`).

## V3 fields

| V3 field                       | Legacy mapping                     | Role                                     |
| ------------------------------ | ---------------------------------- | ---------------------------------------- |
| `question_brief`               | `gist`                             | What the other side is asking or pushing |
| `answer_now`                   | `say_now`                          | Paragraph-style words to say now         |
| `star_evidence`                | folded into `say_now` when needed  | Short anchor from the fragment           |
| `next_step`                    | `next_move`                        | Concrete coordination artifact           |
| `risk_or_clarifier` (optional) | appended to `say_now` when present | Risk or clarifier                        |

## Compatibility

- **IPC / UI** still expose `gist`, `sayNow`, `nextMove` — no frontend breaking change.
- **LLM prompt** requests V3 JSON only.
- **Parser** accepts V3 first, then legacy `gist/say_now/next_move` JSON for regression and partial recovery.

## Validation and repair

1. Parse JSON (direct → brace slice → partial field extract).
2. Map V3 → legacy field names.
3. Validate each section; on failure run **local repair** (question/answer) or **intent-aware fallback** (`next_step`, 10 templates).
4. Re-validate; fail with `Card output invalid: …` only after repair attempt.

## Dynamic limits (`chars_band`)

Limits scale with `transcript_chars`:

| Band   | Transcript chars | `answer_now` max (chars) | Min words |
| ------ | ---------------- | ------------------------ | --------- |
| short  | ≤ 40             | 360                      | 10        |
| medium | ≤ 120            | 480                      | 14        |
| long   | > 120            | 560                      | 16        |

## Quality logging

Successful `llm` / `retry` runtime events include:

- `repair_used=true|false`
- `fallback_used=true|false`
- `chars_band=short|medium|long`

Failed `RL_CARD_INVALID` events include:

- `invalid_reason=…`
- `chars_band=…` (capture/analyze path)

## Rollback

To force legacy-only parsing during an incident, revert `src-tauri/src/card_v3.rs` and `src-tauri/src/llm.rs` to the previous commit and redeploy. UI/DTO remain unchanged.

## Related docs

- `docs/architecture.md` — card pipeline overview
- `docs/reference/errors.md` — `RL_CARD_INVALID` and runtime event fields
- `docs/prompt-contract-lane.md` — deterministic contract checks
- `tests/fixtures/runtime/settings-v7-legacy.json` + `settings-v8-legacy.json` — legacy install migration fixtures
