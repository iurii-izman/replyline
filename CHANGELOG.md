# Changelog

All notable changes to Replyline are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_No unreleased changes yet._

## [0.1.0] - 2026-04-06

Initial alpha baseline.

### Added

- Windows tray app shell with Tauri v2 (tray icon, context menu, single-window overlay).
- Global hotkey capture (default `Ctrl+Alt+Space`): hold to record system audio, release to analyze.
- WASAPI loopback audio capture with configurable max duration.
- Deepgram Nova-3 STT integration (WAV-encoded upload, transcript extraction).
- OpenAI-compatible LLM integration for transcript analysis.
- Three-part result card: `gist`, `say_now`, `next_move`.
- In-memory conversation context (20-minute TTL, max 3 entries, 1500-char cap).
- Settings persistence (`%APPDATA%\com.replyline.app\settings.json`).
- API key storage via Windows Credential Manager (`com.replyline.app.credentials`).
- Settings UI surface with hotkey rebind, provider configuration, and language selection.
- Tray tooltip status updates reflecting capture/transcribe/analyze phases.
- Retry/backoff for external API calls (Deepgram STT, LLM).
- App event log with 5 MB rotation (`app_log.rs`).
- Debug WAV persistence on STT failure for diagnostics.
- Diagnostic bundle collection (tray menu action).
- Memory layer backend: spaces, facts, commitments, terms (`memory.rs`).
- Atomic file writes for settings and memory store (`fs_atomic.rs`).
- Runtime evidence artifacts: probe, bench, duration bench, live-source bench, evidence bundle.
- Four verification lanes: build/test (`pnpm smoke`), mock/UI (`pnpm test:ui`), runtime (`pnpm probe:*`), manual smoke matrix.
- Prompt contract checks, say-now scenario fixtures, consistency gate, copy-check gate.
- Rust supply-chain gate: `cargo deny` + `cargo audit`.
- GitHub Actions CI pipeline with Dependabot for npm, Cargo, and GH Actions.
