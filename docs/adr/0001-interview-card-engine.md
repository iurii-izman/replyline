# ADR 0001: Interview Card Engine Architecture (Pre-Implementation)

- Status: Accepted
- Date: 2026-05-17
- Owners: Replyline maintainers

## Context

Replyline currently uses WorkConversation-oriented structures (`AnalysisCardDto` and `CardSchemaV3`) with fields such as `question_brief`, `answer_now`, `star_evidence`, `next_step`, and `risk_or_clarifier`.

This is sufficient for the current WorkConversation scope, but not sufficient for interview-specific response framing. Interview usage needs a dedicated model with explicit cards for response, interviewer intent, signals, risks, and follow-ups.

This ADR is intentionally architecture-only and must not change runtime behavior in the current product.

## Decision

### 1) Keep WorkConversation unchanged

- WorkConversation mode remains on current `CardSchemaV3` / `AnalysisCardDto`.
- No DTO migration is introduced in this ADR stage.
- Existing runtime behavior for current mode remains unchanged.

### 2) Introduce a separate interview schema

- Interview Mode will use a distinct `InterviewCardSchemaV1`.
- The schema is logically split into cards:
  - `Answer` (primary)
  - `Question`
  - `Signals`
  - `Risks`
  - `FollowUps`

### 3) Single-pass generation by default

- Default generation path is one LLM request returning a single structured JSON payload for all interview cards.
- This is selected as default to reduce:
  - synchronization failures across independently generated card fragments,
  - cost amplification from multiple calls,
  - tail latency amplification from waiting on the slowest call.

### 4) Multi-request strategy is non-default

- Three parallel LLM requests are explicitly not used as default.
- A conditional second pass is allowed only when the first pass fails the quality gate.

### 5) Card responsibilities in live UI

- `Answer` card is the primary live UI surface.
- `Question` card includes:
  - `rawTranscript`
  - `cleanQuestion`
  - `type`
  - `interviewerIntent`
- `Signals` card includes:
  - `mustMention`
  - `keywords`
  - `metrics`
  - `resumeAnchors`
- `Risks` card includes:
  - `avoid`
  - `weakPoints`
  - `safeReframe`
- `FollowUps` card includes likely next interviewer questions and bridge phrases.

## Explicit Non-Goals (Anti-Goals)

The Interview Card Engine must not include:

- no stealth cheating mode
- no screen-share bypass
- no invisible overlay
- no click-through stealth mode
- no fabricated metrics
- no hallucinated resume facts
- no mandatory clarifier

## Boundaries for This Stage

This ADR does not introduce:

- runtime behavior changes,
- UI changes,
- prompt changes,
- `Candidate Pack`,
- `OpenRouter` presets.

## Rationale

- Separation of concerns: WorkConversation remains stable while Interview Mode evolves independently.
- Risk control: single-pass structured output provides a simpler consistency model and clearer quality-gate handling.
- Product trust: explicit anti-goals prevent accidental drift toward stealth or deceptive behavior.

## Future Stages Roadmap

1. `InterviewCardSchemaV1`
2. Interview golden dataset
3. Interview UI
4. Prompt Registry and profiles
5. Candidate Pack
6. OpenRouter Model Ladder
7. Conditional second pass
8. Session UX
9. Post-interview report

## Consequences

- Immediate: architecture is documented before implementation; no production behavior changes.
- Near term: interview implementation can proceed with schema-first constraints and quality-gate policy.
- Long term: WorkConversation compatibility is preserved while interview-specific capabilities scale on a dedicated path.
