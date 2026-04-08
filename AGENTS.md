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
- Do not claim checks passed unless they were actually executed.

## Architecture Boundaries

- Keep frontend state and types in `src/app/model.ts`.
- Keep platform integration in `src/app/platform.ts`.
- Keep orchestration logic in `src/app/controller.ts`.
- Do not move controller logic into component files.
- Keep UI reactivity in Solid.js patterns, not React patterns.

## Source of Truth

- Follow `CONTRIBUTING.md` for contribution workflow and verification.
- Follow `docs/copy-rules.md` for product/trust wording constraints.
- Respect automated policy scripts in `scripts/check-consistency.mjs` and `scripts/check-prompt-contract.mjs`.
- For multi-tool governance and precedence, follow `docs/ai-tooling-policy-matrix.md`.

## Policy Precedence

- Apply rules in this order:
  1. Repository policy files and automated checks
  2. Tool-specific adapter files in this repository
  3. Machine-level global rules
  4. Personal preferences
