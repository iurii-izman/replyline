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
- archived strategic docs: `docs/archive/strategic/`
- internal cleanup notes: `docs-cleanup-task.md`, `test-out.txt`
- local infrastructure and observability stacks: `infra/`
- ad-hoc helper scripts/notebooks: `scratch/`
- generated runtime evidence and manual live evidence: `reports/runtime/`, `reports/runtime-evidence-*`, `reports/beta-handoff-*`, `reports/manual/live-evidence/`
- generated interview exports and ad-hoc export folders: `exports/`, `interview-exports/`, `*-interview-report-full.md`, `*-full-interview-export.md`
- debug and packet captures from local troubleshooting: `*.har`, `*.trace`, `*.pcap`, `*.pcapng`

## Sensitive vs safer artifacts

- sensitive (do not commit/share publicly): full transcript exports, raw transcript snippets, raw Candidate Pack values, provider response payload dumps, Authorization/Bearer headers, local credentials.
- safer but still review-before-share: redacted interview markdown export (`no transcript`) and redacted runtime notes.
- always sanitize absolute machine paths in reports before sharing outside internal need-to-know.

## Guardrail

- `pnpm test:public-footprint` checks that blocked local-only paths are not tracked.
- CI job `public-footprint-guard` runs this check on every PR/push to `main`.

## Notes

- Local-only does not mean deleted from workstation: files can exist locally and stay ignored.
- Historical archive docs under `docs/archive/` may remain tracked when they are part of the public project history; only `docs/archive/strategic/` is local-only by default.
- If a local-only path becomes required for public usage, move it explicitly into tracked scope and update this doc in the same PR.
- Runtime `.env` files remain local-only and must never be committed.
- Release binaries/installers are distributed as GitHub Actions artifacts/Release assets; they must not be committed into this repository.
