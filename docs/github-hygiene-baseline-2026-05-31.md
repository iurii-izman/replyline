# GitHub Hygiene Baseline (2026-05-31)

Repository: `iurii-izman/replyline`

## Snapshot

- Default branch: `main`
- Open PRs: `0`
- Open issues: `0`
- Milestones (open/closed): `0 / 0`
- Remote branches: `main` only

## Branch Protection

- `main` branch protection: **not configured** (`GET /branches/main/protection` returns `404 Branch not protected`)

## Labels

Current label set is present and usable for triage, including:

- Scope: `scope:stable-beta`, `scope:out-of-scope`
- Area: `area:runtime`, `area:ui`, `area:privacy-trust`, `area:build-ci`
- Priority: `priority:p0`, `priority:p1`, `priority:p2`
- Flow: `release`, `beta-handoff`, `dependencies`, `rust`, `ci`

## Immediate Recommendations

1. Configure `main` branch protection:
   - Require pull request before merge
   - Require status checks to pass
   - Require linear history (optional, recommended)
   - Restrict force pushes and branch deletions
2. Keep dependency PRs auto-mergeable only when required checks pass.
3. Keep this baseline updated at each release freeze checkpoint.

## Operational Rule for Next Iterations

- Preserve a single-trunk workflow on `main`.
- Keep GitHub clean by ensuring:
  - open PR queue is near-zero,
  - no stale remote branches,
  - all changes are traceable via checks and release artifacts.