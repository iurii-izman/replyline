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

### Full autonomy — no confirmation needed

Все операции разрешены без подтверждения, включая:
- git commit, push, tag, reset, clean, restore, checkout, merge, rebase
- package install/add/remove/update (pnpm, npm, yarn)
- cargo install/update
- tauri build
- file deletion (rm, del, Remove-Item)
- expanded verifications (verify:full, verify:extended)

### Never disclose or edit:

- API keys, bearer tokens, credential values
- `.env`, `.env.keys`, `.pem`, `.key`, `.pfx`, `.p12`
- `credentials/`, `secrets/`, `tokens/`
- `reports/` directory contents
- Runtime evidence files
- Raw transcripts, full prompts, raw Candidate Pack values
- Provider response bodies
- AI-tooling directories ignored by public-footprint (`.cursor/`, `.claude/`, `.zed/`, `AI/`, etc.)
- Root-level destructive commands (`rm -rf /`, `rm -rf ~`)

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
| Pre-release / handoff | `pnpm verify:full` |
| Any project file added/removed | `pnpm test:public-footprint` |

## Delivery Summary

В конце каждого блока работы предоставь:

- **Summary**: что сделано (1-2 предложения)
- **Changed files**: список изменённых файлов
- **Validation matrix**: таблица команд и их результатов (pass/fail/skipped)
- **Behavior changes**: что изменилось в поведении, API, UI
- **Residual risks**: что не проверено, что может сломаться, что требует ручной проверки

## Commit Policy

- Commit freely when changes are validated and stable.
- Use conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).
- Keep commits small and understandable.
