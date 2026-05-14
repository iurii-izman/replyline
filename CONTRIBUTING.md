# Contributing to Replyline

This document covers the practical workflow for contributing to Replyline during the internal alpha phase.

## Prerequisites

| Tool        | Minimum version | Notes                       |
| ----------- | --------------- | --------------------------- |
| Node.js     | 20+             | LTS recommended             |
| pnpm        | 9+              | Package manager             |
| Rust        | stable (latest) | `rustup update stable`      |
| Windows     | 10 or 11        | Primary target platform     |
| cargo-deny  | latest          | `cargo install cargo-deny`  |
| cargo-audit | latest          | `cargo install cargo-audit` |

Optional but recommended:

- PowerShell 7+ (for runtime evidence scripts)
- Deepgram API key + LLM endpoint (for end-to-end runtime testing)

## Setup

```bash
git clone <repo-url>
cd replyline
pnpm install
pnpm tauri dev
```

The app launches as a tray icon. If provider keys are not configured, the UI will show the setup flow on first open.

## Windsurf workflow

Windsurf is supported as an IDE for this repository.

- Install Windsurf on Windows and import your Cursor/VS Code setup during onboarding if needed.
- Keep project-level agent instructions in version control:
  - Root `AGENTS.md` for repository-wide instructions.
  - `.windsurf/rules/*.md` for targeted Cascade rules with triggers.
- Keep personal defaults in global Windsurf rules (`~/.codeium/windsurf/memories/global_rules.md`) and avoid putting machine-specific behavior into repo rules.
- After adding or changing project rules, re-open the workspace in Windsurf and verify rules are visible in Cascade Customizations.

## AI Tooling Governance

This project supports multiple AI IDE/CLI tools under one governance model.

- Canonical matrix and precedence: `docs/ai-tooling-policy-matrix.md`.
- Repository policy is mandatory across all tools (`AGENTS.md`, this document, docs, and policy scripts).
- Tool-specific adapter files may refine behavior but cannot override repository policy.
- Global machine profiles are allowed for defaults, but they cannot contradict repository policy.

## Verification before PR

Run the full smoke gate before submitting:

```bash
pnpm smoke
```

This executes: TypeScript typecheck, ESLint, Vite build, `cargo check`, Vitest UI lane, consistency gate, and IPC contract gate.

Run the unified local verification gate:

```bash
pnpm verify
```

`pnpm verify` runs `pnpm smoke` + `pnpm test:security-lanes` (`pnpm rust:deps` + `pnpm audit:npm`).

Additional required checks:

- If `package.json` or `pnpm-lock.yaml` changed: run `pnpm audit:npm`.
- If Rust dependencies changed (`src-tauri/Cargo.toml`/`Cargo.lock`): run `pnpm rust:deps`.

All applicable gates must pass before a PR is mergeable.

## Branch strategy

- Feature branches off `main`, short-lived.
- Name branches descriptively: `feat/streaming-stt`, `fix/context-ttl-edge`, `docs/architecture`.
- Rebase onto `main` before merging to keep history linear.
- Delete the branch after merge.

## Commit messages

Follow conventional commits style:

```
feat: connect streaming STT path for Deepgram
fix: prevent context lock poisoning on rapid hotkey press
docs: add architecture overview
chore: update cargo-deny config
test: add fixture for empty transcript edge case
```

Keep the subject line under 72 characters. Use the body for context when the change is non-obvious.

## PR guidelines

Every PR should include:

- **What**: Brief description of the change.
- **Why**: Motivation -- what problem does this solve or what goal does it advance.
- **How to test**: Steps for the reviewer to verify the change, including which smoke or runtime commands to run.
- **Scope**: Note if the change touches backend (Rust), frontend (TS/Solid.js), scripts, or docs.

Keep PRs focused. One logical change per PR is easier to review and revert if needed.

### PR checklist

- [ ] `pnpm smoke` passes locally.
- [ ] `pnpm verify` passes locally.
- [ ] `pnpm audit:npm` run if JS dependencies changed.
- [ ] `pnpm rust:deps` run if Rust dependencies changed.
- [ ] CI status is green for required gates.

## Code style

### Rust

- Format with `cargo fmt` before committing.
- Run `cargo clippy` and address all warnings.
- Use `thiserror` for error types. Avoid bare `String` errors in new code.
- Log significant events through `app_log::append_event`.

### TypeScript

- Strict mode enabled (`tsconfig.json` has `strict: true`).
- Solid.js for UI reactivity -- no React patterns.
- Types go in `model.ts`. Platform abstraction goes in `platform.ts`.
- Keep controller logic in `controller.ts`, not in component files.

### CSS

- Follow the existing token structure in `App.css`.
- Use existing CSS custom properties where available.
- No CSS-in-JS. Plain CSS only.

## Security

- Never commit API keys, tokens, or secrets. The app stores secrets in Windows Credential Manager, not in config files.
- Run `pnpm rust:deps` before submitting any PR that touches `Cargo.toml` or `Cargo.lock`.
- Run `pnpm audit:npm` if you change `package.json` or `pnpm-lock.yaml`.
- CSP is configured in `tauri.conf.json`. Do not widen it without explicit review.
- If you add a new Rust crate dependency, document the reason and verify it passes `cargo deny check`.
