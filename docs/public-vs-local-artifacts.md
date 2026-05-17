# Public vs Local Artifacts

Minimal policy for what should be tracked in GitHub vs kept local-only.

## Goal

- keep public repository focused on buildable product source and core docs
- avoid accidental publication of internal operational artifacts
- preserve local flexibility for one-developer workflows

## Tracked in GitHub (public footprint)

- product source code (`src/`, `src-tauri/`)
- build/tooling configuration (`package.json`, lockfiles, lint/format configs)
- stable-beta documentation used by contributors
- CI workflows and guardrails

## Local-only by default (not tracked in GitHub)

- assistant/editor policy folders: `.roo/`, `.windsurf/`, `.zed/`
- archived strategic docs: `docs/archive/`
- internal cleanup notes: `docs-cleanup-task.md`, `test-out.txt`
- local infrastructure overrides: `infra/`
- ad-hoc helper scripts/notebooks: `scratch/`
- Postman assets and local API environments: `postman/`, `tests/api/postman/`

## Guardrail

- `pnpm test:public-footprint` checks that blocked local-only paths are not tracked.
- CI job `public-footprint-guard` runs this check on every PR/push to `main`.

## Notes

- Local-only does not mean deleted from workstation: files can exist locally and stay ignored.
- If a local-only path becomes required for public usage, move it explicitly into tracked scope and update this doc in the same PR.
