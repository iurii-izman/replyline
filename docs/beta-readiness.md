# Beta Readiness Handoff

Single handoff doc for preparing a public-beta-ready build posture.

## Status and purpose

- Status: active beta handoff context doc for current cycle.
- Purpose: product scope, validation matrix, and packaging-truth boundaries for beta communication.
- Relationship:
  - release blockers and hard gates remain in [release-readiness.md](release-readiness.md);
  - strict local gate composition remains in [release-local-readiness.md](release-local-readiness.md).

## 1) Product scope

Replyline stable beta supports two bounded paths:

- WorkConversation: `capture -> stt -> llm -> card`
- Interview Mode: interview preparation path with Candidate Pack and session report
- Windows-first desktop tray workflow

Out of scope for current beta posture:

- no meeting assistant
- no transcript tool
- no speaking coach
- no stealth cheating features
- no transcript/history/team workflow UI
- no click-through/invisible overlay
- no Advanced Mode user surface

## 2) Supported runtime path

Supported provider/runtime path for stable beta:

- OS: Windows 10/11
- audio capture: WASAPI loopback while hotkey is held
- STT: Deepgram integration (configured by user)
- LLM: OpenAI-compatible endpoint (configured by user)
- app stack: Tauri (Rust backend) + Solid.js frontend
- main window shell: normal Windows desktop window (`decorations=true`, taskbar visible, Alt+Tab visible, native min/max/close)
- close semantics: native window close hides to tray; explicit tray `Quit` fully exits app

## 3) Runtime contracts to verify in docs/code review

- Settings schema: `schemaVersion = 9` (`src/app/model.ts`, `src-tauri/src/settings.rs`)
- Work card path: `CardSchemaV3` (`src-tauri/src/card_v3.rs`)
- Interview card path: `InterviewCardSchemaV1` (`src-tauri/src/interview_card_v1.rs`)
- Interview session/report commands:
  - `start_interview_session`
  - `end_interview_session`
  - `get_interview_report`
  - `export_interview_report_markdown`
  - `export_interview_report_redacted_markdown`
  - `clear_interview_reports`
- Model presets:
  - OpenRouter presets can send fallback `models` ladder
  - `custom_openai_compatible` sends only primary `model`
  - unknown preset id falls back to OpenAI-compatible route without fallback ladder

## 4) Setup checklist

1. Install prerequisites: Node.js + `pnpm`, Rust toolchain, Windows build prerequisites for Tauri.
2. Install dependencies: `pnpm install --frozen-lockfile`.
3. Configure providers in Settings:
   - Deepgram API key
   - LLM base URL
   - LLM model
   - optional LLM API key
4. Verify a valid playback device is set as default in Windows Sound settings.
5. For runtime probe credentials setup, use `docs/runtime-probe-credentials.md` (local env only, never committed).

## 5) Validation matrix

1. Dev loop: `pnpm test:quick`
2. Smoke gate: `pnpm smoke`
3. Fast verify: `pnpm verify:fast`
4. Full verify: `pnpm verify:full`
5. Extended verify: `pnpm verify:extended`
6. Beta preflight lane: `pnpm beta:preflight`
7. Interview quality report artifact: `pnpm report:interview-quality`
8. Runtime preflight contract drift check (fixture mode): `pnpm test:runtime-preflight-contract`
9. Manual visual QA pass: follow [manual-ui-qa.md](./manual-ui-qa.md) (compact/normal/wide states + core UI scenarios)
10. Manual Windows UX QA pass is required before beta handoff: follow [manual-windows-ux-qa.md](./manual-windows-ux-qa.md) including fullscreen geometry, sticky footer overlap, and Candidate Studio checks from [ui-layout-contract.md](./ui-layout-contract.md)

Additional conditional gates:

- `pnpm rust:deps` when Rust dependencies changed
- `pnpm audit:npm` when `package.json` or `pnpm-lock.yaml` changed
- `pnpm release:freeze:check` before merge/release handoff

Runtime preflight has two modes:

- real mode (`pnpm runtime:preflight`): reads `%APPDATA%\com.replyline.app\settings.json`
- fixture contract mode (`pnpm test:runtime-preflight-contract`): runs `scripts/runtime-preflight.ps1` against `tests/fixtures/runtime/*.json` via `-SettingsPath` and does not depend on local `%APPDATA%`

Runtime probe credentials note:

- `pnpm probe:runtime` requires local `DEEPGRAM_API_KEY` and `OPENROUTER_API_KEY` or `LLM_API_KEY`.
- Missing probe credentials is an expected local setup failure, not a product regression by itself.

## 6) Privacy checklist

1. Secrets are stored via OS keyring path; do not place provider keys in docs, examples, or committed artifacts.
2. Do not export/share raw `settings.json` if it contains sensitive runtime values.
3. Treat `reports/` as sensitive review material:
   - runtime/evidence artifacts may contain transcript/card content
   - interview report store and full markdown export may contain transcript content
   - for external sharing prefer redacted markdown export (`export_interview_report_redacted_markdown`)
   - verify `interviewReportRetentionDays` is explicitly set (`0`, `7`, `30`, or `90`) and `Clear reports` remains available
4. Keep trust language factual:
   - do not claim all processing is local-only when cloud providers are enabled
   - do not claim that nothing is ever stored anywhere
5. Use `docs/privacy-and-trust.md` as privacy source of truth for stable beta.

## 7) Handoff acceptance checklist

Release handoff is blocked unless all items are complete:

1. Baseline is green (`pnpm smoke`, `pnpm verify:fast`).
2. Interview quality report is attached (`pnpm report:interview-quality`).
3. Privacy checklist is passed.
4. Model presets and caveats are reviewed.
5. Known limitations are reviewed and updated.

## 7.1) Public beta packaging staging plan (truthful, non-shipped)

Current state:

- `.github/workflows/release-on-tag.yml` publishes GitHub release notes only.
- `.github/workflows/windows-packaging-manual.yml` builds Windows artifacts by manual run and uploads workflow artifacts for internal review only.
- No installer/binary artifacts are currently published to GitHub Releases from CI.

Future staged path (implementation-ready, not yet active):

1. Keep packaging manual-only (`workflow_dispatch`) until public release approval.
2. Keep workflow non-publishing by default: no automatic `gh release upload` and no tag-triggered artifact publication.
3. Add signing stage only after explicit approval and secret onboarding.
4. Add checksums (`SHA-256`) and verification notes alongside each reviewed artifact.
5. After evidence passes, explicitly approve transition to publish-capable release workflow.

Minimum measurements required before public beta installer claims:

- fresh install/uninstall pass on Windows 10 and Windows 11;
- first-launch success and tray lifecycle behavior (`open/hide/quit`);
- SmartScreen/Defender prompts documented for signed/unsigned states;
- runtime sanity after install (`capture -> stt -> llm -> card`) with same-day evidence.

## 8) Known limitations

Use `docs/known-limitations.md` as canonical list. Minimum truths to keep in every beta handoff:

- cross-machine and cross-call-app behavior is still `pending verification`
- no guarantee of stable low latency across all providers/conditions
- no transcript/history/team workflows in current stable-beta product scope
- no meeting assistant, no transcript tool, no speaking coach

## 9) Command naming standard (beta-first)

- Primary handoff/preflight commands:
  - `pnpm beta:preflight`
  - `pnpm beta:handoff`
- Legacy aliases:
  - `pnpm alpha:preflight`
  - `pnpm alpha:handoff`

Legacy `alpha:*` aliases are deprecated compatibility aliases and must not be used as the primary path in new documentation.

## 10) Interview Mode beta posture decision criteria

Decide posture per tester wave using `docs/beta-feedback-loop.md` ledger:

- `core beta`:
  - usefulness median >= 4/5 for Interview scenarios,
  - trust/legal concerns have no unresolved S0/S1,
  - mode confusion remains low and stable across waves,
  - candidate pack clarity and report usefulness are consistently actionable.
- `optional beta`:
  - usefulness is positive but mixed,
  - no critical trust blockers, but setup friction or confusion still visible,
  - kept available with explicit "optional preparation path" wording.
- `gated beta`:
  - repeated trust/misuse concerns, or
  - unresolved S0/S1 affecting Interview flow, or
  - high mode confusion that risks misleading product expectations.

Decision hygiene:

- Posture must be tied to evidence rows, not opinions.
- Re-evaluate after each tester wave.
- If evidence is incomplete, default to more conservative posture (`optional` or `gated`).
