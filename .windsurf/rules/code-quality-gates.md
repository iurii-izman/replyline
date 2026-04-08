---
trigger: model_decision
description: Use this rule when editing TypeScript, Rust, scripts, or config files that affect behavior, dependencies, or tests.
---

# Code Quality Gates

- Keep changes scoped and avoid unrelated refactors.
- For substantial implementation changes, run `pnpm smoke` before finalizing.
- If JS/TS dependencies changed (`package.json`, `pnpm-lock.yaml`), run `pnpm audit:npm`.
- If Rust dependencies changed (`src-tauri/Cargo.toml`, `Cargo.lock`), run `pnpm rust:deps`.
- Keep architecture separation from `CONTRIBUTING.md`:
  - types in `src/app/model.ts`
  - platform abstractions in `src/app/platform.ts`
  - controller logic in `src/app/controller.ts`
- Report command failures clearly and avoid stating success without execution evidence.
