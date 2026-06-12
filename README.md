# Replyline

[![CI](https://github.com/iurii-izman/replyline/actions/workflows/ci.yml/badge.svg)](https://github.com/iurii-izman/replyline/actions/workflows/ci.yml)
[![Pages](https://github.com/iurii-izman/replyline/actions/workflows/pages.yml/badge.svg)](https://iurii-izman.github.io/replyline/)
[![Beta](https://img.shields.io/github/v/release/iurii-izman/replyline?include_prereleases&label=beta)](https://github.com/iurii-izman/replyline/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/platform-Windows%2010%2F11-blue)](docs/runtime-bringup.md)

Windows-first desktop tray app for difficult live work conversations and interview practice (public beta posture).

Core flow: `capture -> stt -> llm -> card`

![Replyline public beta](landing/social-preview.png)

## Public Beta

The current release is a **source/developer prerelease** for Windows testers and contributors:

- [Open the product page](https://iurii-izman.github.io/replyline/)
- [Read the beta release notes](https://github.com/iurii-izman/replyline/releases/tag/v0.2.0-beta.1)
- [Run the 15-minute beta test](BETA_TESTING.md)
- [Ask a question or share feedback](https://github.com/iurii-izman/replyline/discussions)

No unsigned artifact is presented as a public installer. Until an Authenticode-signed build
passes the release workflow, use the source setup below.

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
git clone https://github.com/iurii-izman/replyline.git
cd replyline
git checkout v0.2.0-beta.1
pnpm install --frozen-lockfile
pnpm beta:doctor
pnpm tauri dev
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
- [docs/beta-smoke-report.md](docs/beta-smoke-report.md)
- [docs/runtime-bringup.md](docs/runtime-bringup.md)
- [docs/runtime-evidence.md](docs/runtime-evidence.md)
- [docs/runtime-quality-harness.md](docs/runtime-quality-harness.md)
- [docs/known-limitations.md](docs/known-limitations.md)
- [docs/README.md](docs/README.md)

## Security and Support

- Security reporting: [.github/SECURITY.md](.github/SECURITY.md)
- Support and issue routing: [.github/SUPPORT.md](.github/SUPPORT.md)

## License

[MIT](LICENSE)

## Releases

- Stable tag format: `vX.Y.Z`; prerelease format: `vX.Y.Z-beta.N`.
- On push of a `v*` tag, GitHub Action `Release On Tag` creates release notes and validates a Windows artifact package.
- Notes are grouped by labels via `.github/release.yml`.
- Artifact naming is signing-aware:
  - unsigned packages remain internal workflow artifacts
  - `Replyline-vX.Y.Z-windows-signed.zip` is attached only after Authenticode validation succeeds
- Source archives remain available on every GitHub Release.
