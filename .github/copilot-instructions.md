# Replyline Copilot Instructions

Use this file as a thin adapter to repository policy.

## Language / Язык общения

- Общайся на русском языке.
- Технические термины, названия файлов, команд, флагов и API оставляй на английском (например: `merge-base`, `guardrail`, `--strict`, `spawnSync`, `allowlist`).
- Англицизмы допустимы там, где русский аналог громоздок или неупотребим (например: «зачекать», «закоммитить», «пропатчить», «флоу», «бейзлайн», «артефакт»).
- Комментарии в коде — на английском. Коммит-месседжи — на английском (conventional commits).
- Вывод в консоль (логи, ошибки, артефакты) — на английском.
- Объяснения, рассуждения и выводы — на русском.

## Required References

- `AGENTS.md`
- `CONTRIBUTING.md`
- `docs/ai-tooling-policy-matrix.md`
- `docs/copy-rules.md`

## Mandatory Behavior

- Keep changes scoped and avoid unrelated refactors.
- Follow architecture boundaries from `AGENTS.md` and `CONTRIBUTING.md`.
- Before claiming completion on substantial changes, run required checks (`pnpm verify` and dependency-specific gates when applicable).
- Do not present unverified behavior or benchmark claims as facts.
