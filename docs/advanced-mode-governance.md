# Advanced Mode Governance

This document defines lightweight governance for Advanced Mode as an ops-only diagnostics and policy draft track. Advanced Mode is not exposed in the current stable-beta Settings UI and is not part of the normal user flow.

## Purpose

Advanced Mode exists as a controlled diagnostics track for beta-ops experimentation:
- custom system prompt (ops experimentation only)
- streaming STT toggle (ops experimentation only)
- dev fixture run (debug builds only)

There is no user-visible Advanced Mode toggle, no advanced sections in Settings UI, and no user-facing risk copy in the current stable beta.

Advanced Mode is not a hidden automation mode and does not bypass explicit user capture actions.

## Risks and constraints

When exercised in ops diagnostics:
- higher latency
- lower stability or fallback churn
- card format drift under custom prompts

Constraints:
- keep user-safe error mapping active
- keep diagnostics redacted
- do not claim improved quality without evidence artifact

## Enable criteria

Enable only when all are true:
1. There is a concrete debug/experiment task.
2. One owner is responsible for the run.
3. Verification scenario is documented.
4. Rollback action is known.

## Disable criteria

Disable when any is true:
1. Returning to routine beta usage.
2. Pipeline error rate grows during test window.
3. Card quality regression is confirmed.
4. Experiment objective is reached.

## Governance checks

- Any temporary policy allowlist/exception must include reason + review date in docs.
- Release notes/docs must not describe Advanced Mode as default safe path.
- Advanced Mode is an ops-only track; it must not be described as current stable-beta user surface.
