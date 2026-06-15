---
name: replyline-block-runner
description: Autonomous execution skill for Replyline development blocks. Activates when the user asks to implement a feature, fix a bug, or make changes in the Replyline repository.
---

# Replyline Block Runner

Autonomous execution skill for Replyline development blocks. Activates when the user asks to implement a feature, fix a bug, or make changes in the Replyline repository.

## Language

- Отвечай на русском.
- Технические термины, команды, имена файлов, commit messages — на английском.
- Комментарии в коде — на английском.

## Kickoff (Mandatory)

Перед любыми code edits:

```bash
git status --short --branch
git rev-parse HEAD
```

Если worktree уже грязный — перечисли pre-existing changes, не трогай несвязанные файлы.

## Authority Gates

### Safe Autopilot — allowed without confirmation

Разрешено без подтверждения:

- read / search / grep files
- normal file edits inside task scope (edit_file, write_file)
- `git status`, `git diff`, `git log`, `git show`, `git grep`, `git ls-files`, `git rev-parse`
- `pnpm test:quick`
- `pnpm test:ui`
- `pnpm test:doc-links`
- `pnpm test:contracts`
- `pnpm test:public-footprint`
- `pnpm scripts:lifecycle`
- `pnpm verify`
- `cargo check`, `cargo test`, `cargo fmt`, `cargo clippy` for `src-tauri/Cargo.toml`
- `git commit` after validation — when changes are coherent and the user explicitly asked to implement a block

### Requires explicit user approval

Всегда требовать подтверждение перед:

- `git push`
- `git tag`
- `git reset`
- `git clean`
- `git restore`
- `git checkout --`
- `git merge`
- `git rebase`
- release workflows
- `pnpm tauri build`
- `pnpm verify:full`
- `pnpm verify:extended`
- dependency add / remove / update (`pnpm add`, `npm install`, `cargo update`, etc.)
- `package.json` / `pnpm-lock.yaml` changes
- `Cargo.toml` / `Cargo.lock` changes
- `.github/workflows` changes
- deleting or moving files / directories
- editing release-freeze baseline
- changing public-footprint policy

### Always deny

Никогда не раскрывать и не редактировать:

- API keys, bearer tokens, credential values
- `.env`, `.env.keys`, `.pem`, `.key`, `.pfx`, `.p12`
- `credentials/`, `secrets/`, `tokens/`
- `reports/` directory contents
- runtime evidence files
- raw transcripts, full prompts, raw Candidate Pack values
- provider response bodies

## Required References

Follow these files in order of precedence:

1. `AGENTS.md` — canonical agent instructions
2. `CONTRIBUTING.md` — contribution workflow and verification
3. `docs/engineering/architecture.md` — architecture boundaries
4. `docs/engineering/testing.md` — canonical test profiles and lanes

## Public Beta Honesty

При любых утверждениях о продукте соблюдай public beta constraints:

- **No signed installer claim** unless a signed artifact actually exists.
- **Bilingual / live translation** is experimental and **disabled by default**. Do not claim it as a stable feature.
- **No local-only claim** unless both STT and LLM are running locally. If any component uses a remote endpoint, do not claim the pipeline is fully local.
- When in doubt, default to transparency about beta/experimental status.

## Verification by Scope

| Change type | Required command |
|---|---|
| Light frontend / docs changes | `pnpm test:quick` |
| Docs / contracts changes | `pnpm test:doc-links && pnpm test:contracts` |
| Rust / backend changes | `cargo test --manifest-path src-tauri/Cargo.toml` |
| `package.json` or lockfile changed | additionally `pnpm audit:npm` |
| `Cargo.toml` or Rust deps changed | additionally `pnpm rust:deps` |
| Substantial code change | `pnpm verify` |
| Pre-release / handoff | `pnpm verify:full` (requires explicit user approval) |
| Any project file added/removed | `pnpm test:public-footprint` |

## Delivery Summary

В конце каждого блока работы предоставь:

- **Summary**: что сделано (1-2 предложения)
- **Changed files**: список изменённых файлов
- **Validation matrix**: таблица команд и их результатов (pass/fail/skipped)
- **Behavior changes**: что изменилось в поведении, API, UI
- **Residual risks**: что не проверено, что может сломаться, что требует ручной проверки

## Commit Policy

- Commit only after validation commands pass and changes are coherent.
- Commit only when the user explicitly asked to implement a block.
- Use conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).
- Keep commits small and understandable.
