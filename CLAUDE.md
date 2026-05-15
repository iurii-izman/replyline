# Replyline Claude Adapter

This file maps Claude-based tooling to the repository's canonical policy.

## Canonical Policy Sources

- `AGENTS.md`
- `CONTRIBUTING.md`
- `docs/ai-tooling-policy-matrix.md`
- `docs/copy-rules.md`
- `scripts/check-consistency.mjs`
- `scripts/check-prompt-contract.mjs`

## Language / Язык общения

- Общайся на русском языке.
- Технические термины, названия файлов, команд, флагов и API оставляй на английском.
- Англицизмы допустимы (например: «зачекать», «закоммитить», «пропатчить», «флоу», «бейзлайн», «артефакт»).
- Комментарии в коде — на английском. Коммит-месседжи — на английском (conventional commits).
- Вывод в консоль (логи, ошибки, артефакты) — на английском.

## Operating Rules

- Apply policy precedence from `docs/ai-tooling-policy-matrix.md`.
- Keep edits minimal and aligned with existing architecture boundaries.
- Run and report required quality gates before finalizing substantial changes.
- Never claim checks or runtime behavior without command evidence.
