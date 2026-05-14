# Advanced Mode Governance

This document defines lightweight governance for `showAdvanced` mode in Replyline.

## Purpose

Advanced Mode exists for controlled beta-ops diagnostics and targeted experiments:
- custom system prompt
- streaming STT toggle
- dev fixture run (debug builds only)

It is not a hidden automation mode and does not bypass explicit user capture actions.

## User-visible behavior

When enabled:
- advanced sections are shown in Settings UI
- user sees explicit risk copy and control intent
- changes still require manual `Save on this machine`

When disabled:
- advanced sections are hidden from normal setup flow
- core capture pipeline behavior remains unchanged

## Risks and constraints

Potential risks:
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

- UI copy for Advanced Mode must stay RU/EN parity (`src/app/locale.parity.test.ts`).
- Release notes/docs must not describe Advanced Mode as default safe path.
- Any temporary policy allowlist/exception must include reason + review date in docs.
