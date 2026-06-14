# Changelog

All notable changes to Replyline are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `pnpm beta:release-check` for release readiness review.
- `docs/engineering/release.md` as the canonical release guide.
- Release-freeze guard (advisory in CI, strict in `verify:full` and release workflows).
- Repository scorecard (`docs/repo-scorecard.md`).
- Bilingual interview mode (experimental, disabled by default — see `docs/archive/experimental/`).

### Changed

- CI: release-freeze is advisory in normal CI, strict only in release-quality workflows.
- Release-freeze baseline reduced from 181 to 63 critical paths with categories.
- Frontend model split into 10 domain modules under `src/app/model/`.
- Tauri command registry centralized in `replyline_commands!` macro.
- Commands module converted to directory (`src-tauri/src/commands/`).
- Settings surface helpers extracted to `settings/settingsViewModel.ts`.
- Workflows hardened: concurrency, timeouts, least-privilege permissions, CI summary.
- Bilingual feature defaults to fully disabled (`bilingualInterviewEnabled: false`, `liveTranslationEnabled: false`).
- SonarQubeCloud findings triaged (6 issues fixed).

### Security

- Bilingual commands gated behind `require_experimental_bilingual()` — not callable when disabled.
- Experimental bilingual feature gated behind `REPLYLINE_EXPERIMENTAL_BILINGUAL=1` env flag.
- Release-on-tag workflow permissions moved to job level (least privilege).

## [0.2.0-beta.1] - 2026-06-12

Public source/developer beta. No signed public Windows installer is included.

### Added

- WorkConversation and Interview Mode paths with bounded card contracts.
- Candidate Pack preparation and local interview report flow.
- GitHub Pages launch surface and public beta release notes.
- CodeQL default setup for Actions, JavaScript/TypeScript, and Rust.
- Credential-free web E2E, runtime quality reports, and manual beta closure pack.

### Changed

- Settings schema advanced to v10 with model presets, trace controls, and migration coverage.
- Windows UI moved to a normal taskbar/Alt+Tab window while preserving tray lifecycle.
- Release workflow now treats prerelease tags correctly and only attaches signed, verified public binaries.
- npm, Rust, and GitHub Actions dependencies refreshed and security gates hardened.

### Security

- Secret scanning, push protection, Dependabot security updates, and private vulnerability reporting enabled.
- Dynamic HTML rendering and script-reference parsing hardened after CodeQL review.
- Workflow permissions reduced and third-party actions pinned where applicable.

### Known limitations

- Cross-machine and cross-call-app runtime behavior remains pending broader verification.
- Users must configure their own Deepgram and OpenAI-compatible provider access.
- This prerelease is intended for developers and testers who build from source.

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
- Atomic file writes for settings (`fs_atomic.rs`).
- Runtime evidence artifacts: probe, bench, duration bench, live-source bench, evidence bundle.
- Four verification lanes: build/test (`pnpm smoke`), mock/UI (`pnpm test:ui`), runtime (`pnpm probe:*`), manual smoke matrix.
- Prompt contract checks, say-now scenario fixtures, consistency gate, copy-check gate.
- Rust supply-chain gate: `cargo deny` + `cargo audit`.
- GitHub Actions CI pipeline with Dependabot for npm, Cargo, and GH Actions.
