# Replyline Agent Instructions

These instructions apply to the whole repository.

## Stack and Core Workflow

- Tech stack: TypeScript + Solid.js (frontend), Rust + Tauri (desktop backend).
- Package manager: `pnpm`.
- Primary target platform: Windows 10/11.
- Before finishing substantial work, run the quality gate: `pnpm smoke`.

## Quality Gates

- If `package.json` or `pnpm-lock.yaml` changed, also run: `pnpm audit:npm`.
- If `src-tauri/Cargo.toml` or Rust dependencies changed, also run: `pnpm rust:deps`.
- Before merge, run release-freeze guardrail check: `pnpm release:freeze:check`.
- Do not claim checks passed unless they were actually executed.

## Verification Profiles

- Public profiles: `pnpm test:quick`, `pnpm verify`, `pnpm verify:full`, `pnpm verify:extended`.
- Internal building blocks: `pnpm test:unit`, `pnpm test:contracts`, `pnpm test:quality`, `pnpm smoke`.
- Internal compatibility aliases: `pnpm verify:fast` behind `pnpm verify`, `pnpm verify:standard` behind `pnpm verify:full`.
- Canonical testing guide: `docs/engineering/testing.md`.

## Task Lifecycle (Mandatory)

- Kickoff snapshot (before any code edits):
  - run `git status --short --branch`
  - run `git rev-parse HEAD`
  - if the worktree is already dirty, list pre-existing changed files and avoid touching unrelated files
- Scope before patch:
  - reproduce or inspect the issue first
  - if the requested issue is already fixed, prefer a no-op with evidence instead of speculative edits
- Implementation:
  - keep the patch minimal and task-scoped
  - avoid cosmetic churn and opportunistic refactors unless explicitly requested
  - never weaken or delete tests to force green checks
- Verification:
  - run required commands from the matrix below
  - report commands with real pass/fail outcome; never present unexecuted checks as completed
- Delivery summary must include:
  - changed files
  - validation matrix (command + status)
  - residual risks / what was not validated
  - next recommended work block

## Validation Matrix

- Docs-only edits:
  - run targeted doc/policy checks when relevant (`pnpm test:consistency`, `pnpm test:doc-links`)
- Any code behavior change (default):
  - run `pnpm verify`
- Substantial code change before handoff:
  - run `pnpm smoke` (already included in `pnpm verify`)
  - run `pnpm verify:full`
- If `package.json` or `pnpm-lock.yaml` changed:
  - additionally run `pnpm audit:npm`
- If `src-tauri/Cargo.toml` or Rust dependency graph changed:
  - additionally run `pnpm rust:deps`
- Release/handoff readiness checks:
  - run `pnpm release:freeze:check` (or use `pnpm verify:full`)

## Architecture Boundaries

- Keep frontend state and types in `src/app/model.ts`.
- Keep platform integration in `src/app/platform.ts`.
- Keep orchestration logic in `src/app/controller.ts`.
- Do not move controller logic into component files.
- Keep UI reactivity in Solid.js patterns, not React patterns.

## Source of Truth

- Follow `CONTRIBUTING.md` for contribution workflow and verification.
- Follow `docs/engineering/testing.md` for canonical test profiles, lane boundaries, and CI alignment.
- Follow `docs/copy-rules.md` for product/trust wording constraints.

## Cursor/Codex Rule Hygiene

- Keep this file high-signal and concise; avoid restating full docs when a file reference is enough.
- If instructions become large or path-specific, split scoped guidance into `.cursor/rules` and keep `AGENTS.md` as canonical cross-tool summary.
- Keep repository-level guidance semantically aligned across supported agent surfaces to avoid conflicting instructions.

## Language / Язык общения

- Общайся на русском языке.
- Технические термины, названия файлов, команд, флагов и API оставляй на английском (например: `merge-base`, `guardrail`, `--strict`, `spawnSync`, `allowlist`).
- Англицизмы допустимы там, где русский аналог громоздок или неупотребим (например: «зачекать», «закоммитить», «пропатчить», «флоу», «бейзлайн», «артефакт»).
- Комментарии в коде — на английском. Коммит-месседжи — на английском (conventional commits).
- Вывод в консоль (логи, ошибки, артефакты) — на английском.
- Объяснения, рассуждения и выводы — на русском.

## Policy Precedence

- Apply rules in this order:
  1. Repository policy files and automated checks
  2. Tool-specific adapter files in this repository
  3. Machine-level global rules
  4. Personal preferences

## Solo Main Workflow

- Current repository mode: single developer.
- Default integration path is direct into `main` after local verification.
- Feature branches remain optional for risky or long-running changes.

## Next-Cycle Delivery Rules

- Repository: `iurii-izman/replyline`.
- Product direction is fixed for this cycle: quality, safety, reliability, beta readiness, local UX, and developer confidence.
- Do not propose a new product direction unless explicitly requested.

### Main-Only Execution

- Work directly on `main`.
- Do not open PRs for routine local delivery in this repository mode.
- Do not create long-lived feature branches unless a temporary local safety backup is required.
- Before changing code, run `git status` and record current `HEAD`.
- Keep commits small and understandable; avoid splitting one coherent change into unrelated partial features.
- Commit only after validation commands are green, or explicitly document why a command could not run locally.
- Never hide or soften failures.
- Never remove or weaken tests only to make validation green.
- If a test is flaky, isolate it, explain the failure mode, and fix determinism.
- Do not run destructive git/file cleanup commands unless explicitly requested by the user.

### Stack and Platform Constraints

- Keep the existing stack: Tauri v2 + Rust backend + Solid.js + TypeScript frontend + `pnpm`.
- Preserve current provider boundaries for OpenAI-compatible/OpenRouter and Deepgram integrations.
- Preserve current local storage/keyring/privacy approach.
- Do not add cloud account/auth/billing flows, external DB/vector DB, or heavy new dependencies unless strictly necessary and explicitly justified.
- Do not introduce stealth/cheating/screen-share bypass patterns, click-through overlays, or unrelated product directions.

### Privacy and Data Handling

- Never log API keys, bearer tokens, credential values, raw transcripts, full prompts, raw Candidate Pack values, raw resume/JD/company values, or provider response bodies.
- Sensitive local transcript data may appear only where explicitly required by local feature design.
- Any export of sensitive information must be explicit user action.
- Redacted export must never include full transcript or raw Candidate Pack content.

### Quality and Behavior Constraints

- Preserve WorkConversation Mode behavior.
- Preserve Interview Mode behavior.
- Preserve RU-first UX with EN mirror.
- Preserve existing smoke/verify gates and policy scripts.
- Add tests before or together with behavior changes.
- Update docs when behavior changes.

### Done Criteria

- For code changes: code compiles.
- For code changes: UI tests pass.
- For code changes: Rust tests pass.
- Relevant contract/security/prompt/locale/docs checks pass for the touched scope.
- Final delivery summary includes changed files, validation matrix, residual risks, and the next recommended work block.
