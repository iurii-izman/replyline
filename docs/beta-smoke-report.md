# Sanitized Smoke Report

`pnpm beta:smoke-report` generates a sanitized local report for GitHub issues or manual handoff to a developer.

## How to generate

```bash
pnpm beta:smoke-report
pwsh -File scripts/beta-smoke-report.ps1
```

The command writes two files into `artifacts/beta-smoke-report/`:

- `smoke-report.md`
- `smoke-report.json`

## What is included

- timestamp and commit SHA
- package / Cargo / Tauri app versions when available
- sanitized OS summary
- Node, `pnpm`, and Rust toolchain versions
- `beta:doctor` result when the script exists
- package checks summary:
  - `typecheck`
  - `lint`
  - `cargo check`
  - `cargo test`
  - `test:ui`
- script availability matrix
- runtime config readiness booleans
- last error category, not raw content
- links to the relevant docs

## What is excluded

The report is sanitized by default and excludes:

- API keys and tokens
- `Authorization` and `Bearer` headers
- raw transcript text
- raw prompt text
- raw ContextPack, resume, JD, and company values
- full home paths, usernames, and machine-specific path segments
- raw `app.log` lines

If a field looks too sensitive or too large, the report replaces it with `[REDACTED]`.

## How to attach to a GitHub issue

1. Run `pnpm beta:smoke-report`.
2. Open `artifacts/beta-smoke-report/smoke-report.md` and `artifacts/beta-smoke-report/smoke-report.json`.
3. Attach both files to the issue.
4. If you paste text into the issue body, keep it short and do not paste raw logs or provider output.

## Privacy note

This report is safe to share by default, but it is still a diagnostic artifact. Double-check it before posting outside the repo.

See also:

- [docs/beta-doctor.md](beta-doctor.md)
- [docs/engineering/release.md](engineering/release.md)
- [docs/product/privacy.md](product/privacy.md)
- [docs/product/user-guide.md#8-troubleshooting-quick-table](product/user-guide.md#8-troubleshooting-quick-table)
