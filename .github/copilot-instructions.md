# Replyline Copilot Instructions

Use this file as a thin adapter to repository policy.

## Required References

- `AGENTS.md`
- `CONTRIBUTING.md`
- `docs/ai-tooling-policy-matrix.md`
- `docs/copy-rules.md`

## Mandatory Behavior

- Keep changes scoped and avoid unrelated refactors.
- Follow architecture boundaries from `AGENTS.md` and `CONTRIBUTING.md`.
- Before claiming completion on substantial changes, run required checks (`pnpm smoke` and dependency-specific gates when applicable).
- Do not present unverified behavior or benchmark claims as facts.
