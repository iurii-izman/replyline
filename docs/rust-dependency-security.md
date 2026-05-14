# Replyline Rust Dependency Security

Replyline keeps Rust dependency governance lean: one advisory scan and one policy scan.

## Commands

From repo root:

```powershell
pnpm rust:audit
pnpm rust:deny
pnpm rust:deps
pnpm test:security-lanes
```

What they do:

- `rust:audit` -> `cargo audit --file src-tauri/Cargo.lock`
  - configured by `.cargo/audit.toml` with explicit allowlist
  - checks RustSec advisory database against `src-tauri/Cargo.lock`
- `rust:deny` -> runs `cargo deny check --config deny.toml advisories bans sources` inside `src-tauri`
  - checks advisories, crate bans, and source policy from `src-tauri/deny.toml`
  - intentionally skips license-policy enforcement in this early lean gate
- `rust:deps` -> runs both in sequence
- `test:security-lanes` -> regression check that executes both JS and Rust security gates and fails on any non-zero status

## Local tool installation

If `cargo-audit` and `cargo-deny` are not installed:

```powershell
cargo install cargo-audit
cargo install cargo-deny
```

Then rerun `pnpm rust:deps`.

## Current policy stance

`src-tauri/deny.toml` and `.cargo/audit.toml` are intentionally compact:

- advisory warnings are upgraded to blocking unless explicitly allowlisted
- wildcard dependency denial
- duplicate dependency versions reported as warning
- crates.io registry allowed, unknown registries/git sources warned
- allowlist entries require reason + `REVIEW_DATE` and are revisited on dependency refresh

This avoids overfitting early-alpha policy while still flagging high-signal supply-chain issues.

## Current warning posture

- `pnpm rust:deps` is the authoritative Rust supply-chain gate for this repo.
- The current warning set is dominated by Tauri / GTK transitive crates and duplicate-version notices.
- These warnings are triaged via explicit allowlist entries with review date; they are not treated as "already solved" unless the dependency tree actually changes.
- A green `rust:deps` run here means policy + audit completed with zero unhandled warnings.

## What this proves

- known Rust dependency advisories are checked locally
- dependency source/pattern checks run with a documented policy

## What this does not prove

- absence of all vulnerabilities
- correctness of business logic, unsafe usage, or runtime behavior
- JavaScript/Node supply-chain integrity (separate concern)
