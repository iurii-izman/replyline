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
pnpm beta:start
```

`pnpm beta:start` prints a readiness summary and launches `pnpm tauri dev` when
the local environment is ready. It does not install prerequisites automatically.

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

- `pnpm test:quick` - fastest local loop (`typecheck` + `lint` + `test:ui`)
- `pnpm test:unit` - deterministic unit/component/script-unit suite
- `pnpm test:contracts` - docs/copy/prompt/ipc/locale/consistency contracts
- `pnpm verify:fast` - default local/PR profile (`smoke` + security lane + public-footprint guard)
- `pnpm verify:standard` - local pre-handoff profile (`verify:fast` + lifecycle + advisory freeze report)
- `pnpm verify:full` - release-quality profile (`verify:standard` + strict freeze/dependency/runtime/report gates)
- `pnpm verify:extended` - addon-only nightly/operator lane (coverage + fixtures + optional E2E/experimental), runs separately from `verify:full`

Release-freeze command semantics:

- advisory: `pnpm release:freeze:check` (captures attention-required findings for handoff text)
- blocking: `pnpm release:freeze:check:strict` (non-zero exit when findings exist)

Strict report gates:

- `pnpm report:runtime-quality:strict`
- `pnpm report:interview-quality:strict`
- `pnpm report:release-readiness:strict`

Engineering release source of truth:

- [docs/engineering/release.md](docs/engineering/release.md)

## Privacy Baseline

- API keys are stored in OS keyring (Windows Credential Manager), not in plain-text settings.
- Logging pipeline applies layered sanitization and secret redaction.
- Full transcript / full prompt are not logged by default (`redact_transcript_like` + `safe_preview`).
- Settings includes a local diagnostics surface via `debugTraceMode` and `debugTraceRetentionDays` (`off` / `redacted` / `full_local`).
- STT/LLM providers can receive audio/text when configured by user.
- Runtime/evidence artifacts may contain sensitive content when explicitly generated under `reports/`.

See:

- [docs/product/privacy.md](docs/product/privacy.md)
- [docs/public-vs-local-artifacts.md](docs/public-vs-local-artifacts.md)

## Documentation Map

- [BETA_TESTING.md](BETA_TESTING.md) - short beta smoke test for Windows testers.
- [docs/README.md](docs/README.md) - role-based documentation map for beta users, testers, contributors, and operators.
- [docs/engineering/release.md](docs/engineering/release.md) - canonical engineering release guide and packaging truth.
- [docs/product/privacy.md](docs/product/privacy.md) - canonical privacy, trust, storage, and provider data-flow policy.
- [docs/product/limitations.md](docs/product/limitations.md) - canonical beta scope, limitations, and non-shipped tracks.
- [CONTRIBUTING.md](CONTRIBUTING.md) - contributor workflow and verification expectations.
- [.github/SECURITY.md](.github/SECURITY.md) - private vulnerability reporting.
- [.github/SUPPORT.md](.github/SUPPORT.md) - issue routing and support paths.

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
