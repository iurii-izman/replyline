# Live Answer Quality Evaluation

> **Date:** 2026-06-17
> **Status:** Design phase — no live evaluation implemented.
> **Goal:** Prove live LLM answer quality without leaking private data.

## Problem Statement

The current 47 deterministic fixtures (`runtime-answer-fixtures.json`) use `mockCardOverrides`
to simulate LLM responses. They prove:
- ✅ Card schema contract is enforced
- ✅ Privacy/security patterns are detected
- ✅ Answer evaluation logic works

They do NOT prove:
- ❌ Real LLM produces quality answers with ContextPack
- ❌ Real LLM respects constraints in live prompts
- ❌ Real LLM handles ambiguous fragments usefully
- ❌ Provider-specific behaviour (model variance, latency, hallucinations)

**The gap:** 47 fixtures score 100/100 deterministically, but we have zero evidence
that a live LLM call produces useful answers. The live QA template
(`context-pack-live-qa.template.md`) exists but has never been run because
provider keys are unavailable.

## Design Principles

1. **Synthetic only.** Every prompt, transcript, and ContextPack is synthetic.
   No real conversations, no real names, no real company data.

2. **No raw output committed.** Live LLM responses are evaluated locally and
   summarized. Only pass/fail verdicts, scores, and failure reasons enter the
   repository. Raw answers stay in local reports (gitignored).

3. **Optional, never blocking.** Live evaluation is an operator tool, not a CI gate.
   It requires live provider keys and costs real API credits.

4. **Honest claim labels.** Use `measured` only when a live run completed on the
   current build. Use `pending verification` otherwise. Never fabricate scores.

5. **Privacy-first output.** Aggregate reports contain only:
   - Scenario ID, pass/fail, score, failure reasons
   - Provider route label (not keys)
   - Timestamp, commit, OS
   - Never: raw prompts, raw LLM responses, raw ContextPack content, raw transcripts

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Live QA Harness (operator tool)               │
├─────────────────────────────────────────────────────────────────┤
│  1. Load fixtures (synthetic transcripts + ContextPacks)        │
│  2. For each fixture:                                            │
│     a. Build prompt (transcript + active ContextPack)            │
│     b. Call live LLM provider                                    │
│     c. Parse response into card (gist/say_now/next_move)        │
│     d. Evaluate card against expected behaviour                  │
│     e. Record: pass/fail, score, failure reasons                 │
│  3. Write aggregate report (JSON + MD) to reports/live-quality/  │
│  4. NEVER write raw prompt/response to committed paths           │
└─────────────────────────────────────────────────────────────────┘
```

### Separation from deterministic fixtures

| Aspect | Deterministic (`test:quality`) | Live QA (this design) |
|---|---|---|
| LLM call | No — uses `mockCardOverrides` | Yes — calls real provider |
| Requires keys | No | Yes (Deepgram + LLM) |
| CI gate | ✅ Blocking in `verify:full` | ❌ Never blocking |
| Output committed | Fixtures only (no secrets) | Aggregate report only |
| Raw answers | Never produced | Stored in `reports/live-quality/` (gitignored) |
| Cost | Free | API credits |

## Live QA Scenarios

### Scenario categories

| # | Category | Fixtures | What it proves |
|---|---|---|---|
| LIVE-1 | Context helps answer | 5 | ContextPack evidence appears in answer, improves usefulness |
| LIVE-2 | Context conflict | 3 | Transcript priority over conflicting context, uncertainty stated |
| LIVE-3 | Context constraint | 3 | Explicit constraints respected, no restricted info leaked |
| LIVE-4 | No context (baseline) | 3 | Answer quality without ContextPack — establishes baseline |
| LIVE-5 | Ambiguous fragment | 3 | Short/ambiguous transcript still produces useful card |

Each scenario has a synthetic transcript (3–8 second spoken phrase equivalent),
a synthetic ContextPack, and expected behaviour assertions.

### Scenario: LIVE-1 — Context helps answer

| Field | Value |
|---|---|
| **Transcript** | "We have a dependency upgrade blocked by security review. What's the risk if we delay?" |
| **ContextPack** | Role: Tech lead. Sprint: week 3 of 4. Key risk: deployment pipeline delayed. Stakeholder: CTO expects demo Friday. |
| **Expected** | Answer references sprint timeline, mentions deployment pipeline risk, suggests specific action (talk to security team, prepare fallback). Does NOT invent metrics or deadlines not in context. |
| **Assertions** | `mustContain: ["sprint", "deployment"]`, `mustNotContain: ["revenue", "budget"]`, `requiresNextStep: true`, `requiresNoFabricatedFacts: true` |

### Scenario: LIVE-2 — Context conflict

| Field | Value |
|---|---|
| **Transcript** | "The API rate limit was raised to 500 requests per minute last week." |
| **ContextPack** | API rate limit: 100 requests per minute (documented in Q1 SLA). |
| **Expected** | Answer uses transcript value (500), explicitly notes discrepancy with context, suggests verifying with ops. Does NOT silently use context value. |
| **Assertions** | `mustContain: ["500"]`, `mustNotContain: ["100 rpm"]` (as authoritative), `requiresGroundedTranscript: true` |

### Scenario: LIVE-3 — Context constraint

| Field | Value |
|---|---|
| **Transcript** | "What's our runway looking like? The client is asking about burn rate." |
| **ContextPack** | Constraint: Do not share financial numbers, budget figures, or runway calculations. Defer to CFO for financial questions. |
| **Expected** | Answer defers financial questions, does NOT calculate or estimate runway, suggests referring to CFO. |
| **Assertions** | `mustNotContain: ["$", "months", "runway is"]`, `mustContain: ["CFO", "finance"]`, `requiresNoFabricatedFacts: true` |

### Scenario: LIVE-4 — No context (baseline)

| Field | Value |
|---|---|
| **Transcript** | "The design review is tomorrow and I haven't finalized the mockups. How do I handle this?" |
| **ContextPack** | (none — baseline without context) |
| **Expected** | Answer is useful but generic. Suggests prioritisation or scope reduction. No context-specific references. No fabricated role/company details. |
| **Assertions** | `requiresNextStep: true`, `requiresNoContextHallucination: true`, `requiresNoFabricatedFacts: true` |

### Scenario: LIVE-5 — Ambiguous fragment

| Field | Value |
|---|---|
| **Transcript** | "So, the thing with the pipeline... it's still red. What do we do?" |
| **ContextPack** | Role: DevOps engineer. Current focus: CI/CD pipeline migration from Jenkins to GitHub Actions. Known issue: flaky integration tests in staging. |
| **Expected** | Answer uses context to interpret "pipeline" and "red", suggests concrete debugging steps for flaky tests. |
| **Assertions** | `mustContain: ["CI/CD", "test"]`, `requiresNextStep: true`, `requiresGroundedTranscript: true` |

## Privacy Boundaries

### What the harness NEVER writes

| Category | Examples | Where blocked |
|---|---|---|
| Raw LLM prompts | Full system prompt + user prompt | Never written to disk outside local reports |
| Raw LLM responses | Full JSON response body | Evaluated in-memory, only pass/fail stored |
| Raw ContextPack content | Actual context text | Only fixture ID referenced in committed output |
| API keys | Deepgram key, LLM key | Never read by harness (keys are in credential store) |
| Provider response bodies | HTTP response payloads | Never logged or stored |

### What the harness CAN write (committed)

| Artifact | Content | Safe because |
|---|---|---|
| Aggregate JSON report | Per-fixture: id, pass, score, reasons | No raw text, no secrets |
| Aggregate MD report | Human-readable summary | Same fields as JSON |
| Fixture definitions | Synthetic transcripts + ContextPacks | Synthetic only, no real data |

### What stays local (gitignored)

| Path | Content |
|---|---|
| `reports/live-quality/raw/` | Raw prompt/response pairs (for debugging, never committed) |
| `reports/live-quality/live-answer-quality-*.json` | Full evaluation result with card content |
| `reports/live-quality/live-answer-quality-*.md` | Full evaluation result with card content |

Only the aggregate summary (pass/fail counts, average scores, failure reasons)
is safe to commit. The raw evaluation artifacts stay local.

## Script Skeleton

The live QA harness is designed as an operator script: `scripts/evaluate-live-answer-quality.mjs`.

### Key design decisions

1. **Uses the same evaluator** (`evaluateFixture` from `evaluate-runtime-answer-quality.mjs`) — the scoring logic is identical. Only the card source changes (mock → live LLM).
2. **Requires explicit opt-in** via `--live` flag — prevents accidental provider calls.
3. **Requires environment variables** — `LIVE_QA_ENABLED=1` + valid LLM configuration.
4. **Writes raw output to gitignored paths** — `reports/live-quality/raw/`.
5. **Writes aggregate to committed paths** — `reports/live-quality/aggregate-*.json`.

### CLI interface

```powershell
# Dry run — validates fixtures, does NOT call providers
node scripts/evaluate-live-answer-quality.mjs --dry-run

# Live run — calls LLM provider for each fixture
$env:LIVE_QA_ENABLED = '1'
node scripts/evaluate-live-answer-quality.mjs --live

# Live run with specific provider route
node scripts/evaluate-live-answer-quality.mjs --live --provider openai-gpt4o-mini
```

### Output structure

```json
{
  "generatedAt": "2026-06-17T14:00:00Z",
  "provider": "openai-gpt4o-mini",
  "commit": "0fec3cb",
  "os": "Windows 11 build 26200",
  "claimLabel": "measured",
  "aggregate": {
    "total": 17,
    "passCount": 15,
    "failCount": 2,
    "averageScore": 91.3,
    "minScenarioScore": 65,
    "weakestFixtures": [
      { "id": "live-02-02", "score": 52, "reasons": ["not grounded in transcript"] }
    ],
    "recurringFailureReasons": [
      { "reason": "sayNow too long", "count": 3 }
    ]
  },
  "results": [
    { "id": "live-01-01", "pass": true, "score": 95, "reasons": [] }
  ]
}
```

Note: `results[].card` is NOT included in the committed aggregate. It exists
only in the local (gitignored) full report for operator debugging.

## Integration with Existing Infrastructure

### Reuses

| Component | How reused |
|---|---|
| `evaluateFixture()` | Same scoring function — card source changes from `mockCardOverrides` to live LLM |
| `quality-thresholds.json` | Same thresholds (`minScenarioScore: 65`, `maxSayNowChars: 420`) |
| `quality-fixture-shared.mjs` | Same privacy/security checkers (SECRET_PATTERNS, FABRICATED_FACT_MARKERS, etc.) |
| `prompt-contract-core.mjs` | Same `validateCard()` and `deterministicCardFromSnippet()` for fallback |

### Extends

| Component | How extended |
|---|---|
| `runtime-answer-fixtures.json` | New `liveQaFixtures` section for live-only scenarios |
| `evaluate-runtime-answer-quality.mjs` | New `--live` mode that calls providers instead of using mocks |
| `quality-thresholds.json` | May add `minLivePassRate` threshold |

### Does NOT change

| Component | Why preserved |
|---|---|
| `pnpm test:quality` | Remains deterministic, no provider calls |
| `pnpm verify` / `pnpm verify:full` | No live QA in blocking gates |
| `pnpm test:e2e:web:smoke` | Mocked platform, no provider calls |
| CI workflows | No live provider secrets in CI |

## What is Automated Now (2026-06-17)

| Check | Status | Method |
|---|---|---|
| 47 deterministic fixtures | ✅ `measured` | `mockCardOverrides`, no live LLM |
| ContextPack answer quality | ✅ `measured` | 10 ContextPack-specific fixtures, avg 100 |
| Privacy/security patterns | ✅ `measured` | SECRET_PATTERNS, FABRICATED_FACT_MARKERS, etc. |
| Card schema contract | ✅ `measured` | `validateCard()` on every fixture |
| Live LLM answer quality | ❌ `blocked` | No provider keys configured |

## Implementation Plan

### Phase 1: Fixture definitions (docs only, this commit)

- [x] Design document (this file)
- [x] 5 scenario categories with 3–5 fixtures each
- [x] Privacy boundaries defined
- [x] Script skeleton design

### Phase 2: Script implementation (next, when provider keys available)

- [ ] Implement `scripts/evaluate-live-answer-quality.mjs`
- [ ] Add `liveQaFixtures` to `runtime-answer-fixtures.json` (17 synthetic scenarios)
- [ ] Wire live LLM call through existing provider module
- [ ] Implement `--dry-run` mode (validates fixtures, no provider calls)
- [ ] Implement `--live` mode (calls provider, writes reports)
- [ ] Test with one provider route (OpenAI `gpt-4o-mini`)
- [ ] Add to `pnpm test:quality` as optional addon (behind `--live` flag)

### Phase 3: Multi-provider evidence (later)

- [ ] Run with OpenRouter preset (different model family)
- [ ] Run with Groq (different provider architecture)
- [ ] Compare scores across providers
- [ ] Update `provider-runtime-matrix.md` with live QA scores

## Related Docs

- [runtime.md](runtime.md) — claim labels, evidence rules, proof boundaries
- [testing.md](testing.md) — test profiles, lane boundaries, fixture responsibilities
- [../beta-evidence/provider-runtime-matrix.md](../beta-evidence/provider-runtime-matrix.md) — provider route evidence status
- [../../tests/fixtures/runtime-quality/runtime-answer-fixtures.json](../../tests/fixtures/runtime-quality/runtime-answer-fixtures.json) — deterministic fixtures
- [../../tests/fixtures/runtime-live-evidence/context-pack-live-qa.template.md](../../tests/fixtures/runtime-live-evidence/context-pack-live-qa.template.md) — manual QA template
- [../../scripts/evaluate-runtime-answer-quality.mjs](../../scripts/evaluate-runtime-answer-quality.mjs) — deterministic evaluator (reused by live harness)
