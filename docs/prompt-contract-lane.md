# Replyline Prompt-Contract Lane

Canonical lane policy moved to [docs/engineering/testing.md](engineering/testing.md).

This lane keeps the result-card contract stable without requiring any provider calls.

## Command

```bash
pnpm test:prompt-contract
pnpm test:say-now-scenarios
```

Default mode is deterministic and local-only. Scenario checks add a small product-shaped gate on example cards (deadline, pushback, escalation, ownership, «не обзор») using explicit heuristics only — no LLM-as-judge.

## What it checks

- LLM contract is CardSchemaV3 (`question_brief`, `answer_now`, `star_evidence`, `next_step`, optional `risk_or_clarifier`)
- legacy IPC shape remains `gist / say_now / next_move` via deterministic V3→legacy mapping checks
- `answer_now` / `say_now` stay speakable (paragraph allowed, dynamic max length)
- banned drift is rejected:
  - transcript-dump style copy
  - therapy wording
  - emotion/tone magic
  - stealth language
  - "answers for you automatically" style claims
- `src-tauri/src/llm.rs` still contains the key prompt and clamp guardrails
- fixture corpus remains valid for deterministic contract checks

## What it proves

- contract stability and trust/copy discipline at the prompt/check layer
- deterministic regression protection in the fast default lane

## What it does not prove

- live usefulness in real calls
- provider behavior under runtime latency or noise
- cross-machine or cross-call-app quality

For those claims, use runtime lanes and evidence artifacts.

## Related guards

- `scripts/check-prompt-contract.mjs` — prompt/schema/copy regression checks
- `scripts/check-ipc-handler-contract.mjs` — IPC registration + category drift checks

See also:

- `docs/engineering/testing.md`
- `docs/engineering/runtime.md`
