# Replyline

Replyline is a Windows-first tray app for difficult work conversations.

Hold one hotkey while a difficult reply is playing, release it, and get one compact response card:

- `Суть`
- `Скажи сейчас`
- `Дальше`

The current product focus is intentionally narrow:

- difficult work conversations
- live rescue, not post-call analysis
- short snippet capture, not full-call recording

## Current state

This repository is an early alpha engineering build.

Initial publication model for this repository:

- source code only
- no bundled binary artifacts committed to git
- no public installer release until packaging, signing, and live-call validation are stronger

What exists now:

- tray-first Tauri app
- compact always-on-top window
- one global hotkey, default `Ctrl+Shift+Space`
- system-audio snippet capture via WASAPI loopback
- Deepgram STT path
- one OpenAI-compatible LLM path
- compact card with `gist / say_now / next_move`
- in-memory context only
- local settings + Windows Credential Manager for secrets
- runtime evidence, smoke artifacts, and alpha handoff bundle tooling

What is explicitly not in the current MVP:

- transcript UI
- history UI
- speaker detection
- full-call recording
- microphone capture in the default MVP path
- coaching scores
- tone / emotion analysis
- automatic memory persistence from live snippets

## Trust model

- audio is captured only while the hotkey is held
- snippets are processed in RAM and not stored by default
- released snippets are sent to configured external STT / LLM providers
- the app does not present itself as covert-use software, a therapy product, or an autonomous answering system
- the user is responsible for complying with platform rules, employer policy, and recording laws

## What is proven vs not yet proven

What is already proven locally:

- the app builds
- the Rust backend compiles and tests pass
- the prompt contract is guarded
- the runtime probe path can produce real machine-local evidence artifacts
- alpha handoff bundles can be generated from local runtime artifacts

What is still pending verification:

- repeated live-call behavior on Zoom / Teams / Meet / Telemost
- cross-machine consistency
- real-user usefulness beyond local engineering runs

For the honest verification model, start with [docs/verification-lanes.md](C:/Dev/replyline/docs/verification-lanes.md).

## Getting started

### Requirements

- Windows
- Node / pnpm
- Rust toolchain
- WebView2 / Tauri runtime requirements
- provider keys for real runtime use

### Install

```bash
pnpm install
```

### Run the app

```bash
pnpm tauri dev
```

### Fast engineering gate

```bash
pnpm smoke
```

This runs:

- Vite production build
- `cargo check`
- `cargo test`
- fixture validation
- prompt-contract checks
- copy / claim guard

## Runtime commands

Core runtime / evidence commands:

```bash
pnpm probe:runtime
pnpm probe:bench
pnpm probe:durations
pnpm evidence:bundle
pnpm smoke:template
pnpm alpha:handoff
```

Useful support commands:

```bash
pnpm runtime:preflight
pnpm benchmark:evidence
pnpm rust:deps
```

## Repository map

- [src](C:/Dev/replyline/src): Solid frontend
- [src-tauri](C:/Dev/replyline/src-tauri): Rust backend and Tauri app
- [scripts](C:/Dev/replyline/scripts): runtime, evidence, smoke, and release-support scripts
- [fixtures](C:/Dev/replyline/fixtures): deterministic prompt-contract inputs
- [docs](C:/Dev/replyline/docs): engineering docs for runtime proof, release readiness, memory, and verification

Start here:

- [docs/README.md](C:/Dev/replyline/docs/README.md)

## Core docs

- [verification-lanes.md](C:/Dev/replyline/docs/verification-lanes.md): what each verification lane proves
- [runtime-bringup.md](C:/Dev/replyline/docs/runtime-bringup.md): real runtime path and probe workflow
- [runtime-evidence.md](C:/Dev/replyline/docs/runtime-evidence.md): evidence artifacts and honesty rules
- [smoke-checks.md](C:/Dev/replyline/docs/smoke-checks.md): manual critical-path checks
- [release-readiness.md](C:/Dev/replyline/docs/release-readiness.md): lean alpha handoff gate
- [benchmark-policy.md](C:/Dev/replyline/docs/benchmark-policy.md): `target / measured / pending verification`
- [memory-layer.md](C:/Dev/replyline/docs/memory-layer.md): future memory layer, separate from live card

## License

[MIT](C:/Dev/replyline/LICENSE)
