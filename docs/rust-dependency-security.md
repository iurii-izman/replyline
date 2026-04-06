# Replyline Rust Dependency Security

Replyline keeps Rust dependency governance lean: one advisory scan and one policy scan.

## Commands

From repo root:

```powershell
pnpm rust:audit
pnpm rust:deny
pnpm rust:deps
```

What they do:

- `rust:audit` -> `cargo audit --file src-tauri/Cargo.lock`
  - checks RustSec advisory database against `src-tauri/Cargo.lock`
- `rust:deny` -> runs `cargo deny check --config deny.toml advisories bans sources` inside `src-tauri`
  - checks advisories, crate bans, and source policy from `src-tauri/deny.toml`
  - intentionally skips license-policy enforcement in this early lean gate
- `rust:deps` -> runs both in sequence

## Local tool installation

If `cargo-audit` and `cargo-deny` are not installed:

```powershell
cargo install cargo-audit
cargo install cargo-deny
```

Then rerun `pnpm rust:deps`.

## Current policy stance

`src-tauri/deny.toml` is intentionally compact:

- advisory warnings for yanked/unmaintained crates
- wildcard dependency denial
- duplicate dependency versions reported as warning
- crates.io registry allowed, unknown registries/git sources warned

This avoids overfitting early-alpha policy while still flagging high-signal supply-chain issues.

## What this proves

- known Rust dependency advisories are checked locally
- dependency source/pattern checks run with a documented policy

## What this does not prove

- absence of all vulnerabilities
- correctness of business logic, unsafe usage, or runtime behavior
- JavaScript/Node supply-chain integrity (separate concern)
