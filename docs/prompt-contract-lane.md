# Replyline Prompt-Contract Lane

This lane keeps the result-card contract stable without requiring any provider calls.

## Command

```bash
pnpm test:prompt-contract
pnpm test:say-now-scenarios
```

Default mode is deterministic and local-only. Scenario checks add a small product-shaped gate on example cards (deadline, pushback, escalation, ownership, «не обзор») using explicit heuristics only — no LLM-as-judge.

## What it checks

- contract shape is exactly `gist / say_now / next_move`
- `say_now` stays short and speakable
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

See also:

- `docs/verification-lanes.md`
- `docs/runtime-evidence.md`
