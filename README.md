# Replyline

[![CI](https://github.com/iurii-izman/replyline/actions/workflows/ci.yml/badge.svg)](https://github.com/iurii-izman/replyline/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/platform-Windows%2010%2F11-blue)](docs/runtime-bringup.md)

Windows-first desktop tray app for difficult live work conversations and interview practice (public beta posture).

Core flow: `capture -> stt -> llm -> card`

## What It Does

- Hotkey-gated capture (`Ctrl+Alt+Space`) of short system-audio snippets.
- WorkConversation path returns one compact response card: `gist / say_now / next_move` (generated from `CardSchemaV3`).
- Interview path returns `InterviewCardSchemaV1` during active interview session and can produce a local post-interview report.
- Scope stays intentionally narrow for stable-beta reliability and trust.

If the LLM returns a vague `next_move`, Rust repairs it with bounded context heuristics before rendering.

## What It Is Not

Replyline is not a meeting assistant, not a transcript tool, and not a speaking coach.

Also out of scope in current stable beta:

- no transcript/history/team workflow UI
- no hidden cheating workflow
- no click-through hidden overlay
- no Advanced Mode user surface
- no memory user surface

## Supported Runtime Path

- OS: Windows 10/11
- Capture: WASAPI loopback, hold-to-capture
- STT: Deepgram
- LLM: OpenAI-compatible endpoint (user-configured)
- Stack: Tauri (Rust) + Solid.js (TypeScript)

## Quick Start

```bash
pnpm install --frozen-lockfile
pnpm verify:fast
```

Then configure runtime settings in app UI:

- Deepgram API key
- LLM base URL
- LLM model
- optional LLM API key

For release candidate validation:

```bash
pnpm verify:full
```

## Validation Profiles

- `pnpm verify:fast` - default local/PR profile (`smoke` + security lane + public-footprint guard)
- `pnpm verify:full` - release profile (`verify:fast` + strict freeze gate + dependency/security checks)
- `pnpm verify:extended` - full profile + extra coverage/fixtures/say-now lanes

Release-freeze command semantics:
- advisory: `pnpm release:freeze:check` (captures attention-required findings for handoff text)
- blocking: `pnpm release:freeze:check:strict` (non-zero exit when findings exist)

## Privacy Baseline

- API keys are stored in OS keyring (Windows Credential Manager), not in plain-text settings.
- Logging pipeline applies layered sanitization and secret redaction.
- Full transcript / full prompt are not logged by default (`redact_transcript_like` + `safe_preview`).
- Settings includes a local diagnostics surface via `debugTraceMode` and `debugTraceRetentionDays` (`off` / `redacted` / `full_local`).
- STT/LLM providers can receive audio/text when configured by user.
- Runtime/evidence artifacts may contain sensitive content when explicitly generated under `reports/`.

See:

- [docs/privacy-and-trust.md](docs/privacy-and-trust.md)
- [docs/public-vs-local-artifacts.md](docs/public-vs-local-artifacts.md)

## Documentation Map

- [docs/beta-readiness.md](docs/beta-readiness.md)
- [docs/interview-mode.md](docs/interview-mode.md)
- [docs/candidate-pack.md](docs/candidate-pack.md)
- [docs/model-ladder.md](docs/model-ladder.md)
- [docs/interview-quality.md](docs/interview-quality.md)
- [docs/runtime-bringup.md](docs/runtime-bringup.md)
- [docs/runtime-evidence.md](docs/runtime-evidence.md)
- [docs/runtime-quality-harness.md](docs/runtime-quality-harness.md)
- [docs/docker-stack.md](docs/docker-stack.md)
- [docs/known-limitations.md](docs/known-limitations.md)
- [docs/README.md](docs/README.md)

### Manual beta closure

For manual beta seal and local QA, use:

- [docs/manual-closure-pack.html](docs/manual-closure-pack.html)
- [docs/manual-closure-pack.md](docs/manual-closure-pack.md)

## Security and Support

- Security reporting: [.github/SECURITY.md](.github/SECURITY.md)
- Support and issue routing: [.github/SUPPORT.md](.github/SUPPORT.md)

## License

[MIT](LICENSE)

## Releases

- Tag format: `vX.Y.Z` (for example: `v0.2.0`)
- On push of a `v*` tag, GitHub Action `Release On Tag` creates a release with auto-generated notes and uploads a Windows artifact package.
- Notes are grouped by labels via `.github/release.yml`.
- Artifact naming is signing-aware:
  - `Replyline-vX.Y.Z-windows-internal-unsigned.zip` for internal trusted beta only.
  - `Replyline-vX.Y.Z-windows-signed.zip` only when signing secrets are configured and Authenticode signature validation succeeds.
- Do not treat unsigned artifacts as public beta installers.
