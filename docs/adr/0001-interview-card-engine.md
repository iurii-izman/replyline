# ADR 0001: Interview Card Engine Architecture

- Status: Accepted
- Date: 2026-05-17
- Last updated: 2026-05-18
- Owners: Replyline maintainers

## Context

Replyline has two production paths in current stable beta:

- WorkConversation path based on `CardSchemaV3` and legacy UI projection `gist / say_now / next_move`.
- Interview path based on `InterviewCardSchemaV1` with dedicated cards (`question`, `answer`, `signals`, `risks`, `followUps`, `clarifier`).

The architecture must keep WorkConversation stable while allowing interview-specific quality gates and session/report workflow.

## Decision

### 1) Keep WorkConversation stable on current contract

- WorkConversation mode remains on `CardSchemaV3` / `AnalysisCardDto`.
- Legacy UI projection remains compatible (`gist / say_now / next_move`).

### 2) Keep Interview contract separate

- Interview Mode uses `InterviewCardSchemaV1` contract.
- Runtime switch is explicit through interview session controls.

### 3) Generation strategy

- Single-pass generation remains default.
- Conditional second pass is allowed only when the first pass fails quality gate.

### 4) Session and report boundaries

- Session controls are explicit (`start_interview_session`, `end_interview_session`, `get_interview_report`, `export_interview_report_markdown`, `clear_interview_reports`).
- Report artifacts are local-only unless user exports/shares them manually.

### 5) Anti-goals remain strict

Interview path must not include:

- stealth cheating mode
- screen-share bypass
- invisible/click-through overlay
- fabricated metrics
- hallucinated resume facts

## Consequences

- WorkConversation and Interview paths can evolve independently with contract checks.
- Docs and guardrails must always reflect that cloud providers may receive data when configured.
- Interview quality lane (`test:interview-quality` + `report:interview-quality`) is required for release/handoff confidence.
