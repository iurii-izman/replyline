# Beta Readiness Handoff

Historical handoff document retained for traceability.

Active release source of truth moved to [docs/engineering/release.md](../../engineering/release.md).

Single handoff doc for preparing a public-beta-ready build posture.

## Status and purpose

- Status: archived beta handoff context doc from the previous cycle.
- Purpose: preserve product scope, validation matrix, and packaging-truth boundaries used during beta handoff.
- Relationship:
  - active release blockers and hard gates now live in [../../engineering/release.md](../../engineering/release.md);
  - this file remains history, not the active release gate.

## 1) Product scope

Replyline stable beta supports two bounded paths:

- WorkConversation: `capture -> stt -> llm -> card`
- Interview Mode: interview preparation path with Candidate Pack and session report
- Windows-first desktop tray workflow

Read alongside:

- [../../release-checklist.md](../../release-checklist.md)


Out of scope for current beta posture:

- no meeting assistant
- no transcript tool
- no speaking coach
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

- Settings schema: `schemaVersion = 10` (`src/app/model.ts`, `src-tauri/src/settings.rs`)
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
3. Run `pnpm beta:doctor` and follow any `WARN`/`FAIL` next actions before starting the app.
4. Start the guided beta flow with `pnpm beta:start`; it runs the doctor again, prints a readiness summary, and launches `pnpm tauri dev` when allowed.
5. If you need a sanitized issue bundle, run `pnpm beta:smoke-report` and attach the generated artifacts.
6. Configure providers in Settings:
   - Deepgram API key
   - LLM base URL
   - LLM model
   - optional LLM API key
7. Verify a valid playback device is set as default in Windows Sound settings.
8. For runtime probe credentials setup, use `docs/runtime-probe-credentials.md` (local env only, never committed).

`pnpm beta:start` flags:

- `-Strict`: treat doctor warnings as blocking.
- `-SkipDoctor`: skip the doctor and continue to launch preflight.
- `-ReportOnFail`: generate `pnpm beta:smoke-report` after a blocked gate or launch failure.
- `-NoLaunch`: print readiness without starting the app.
- `-Force`: continue past a blocked doctor verdict; missing launch tools still block.

Examples:

```bash
pnpm beta:start -- -NoLaunch
pnpm beta:start -- -NoLaunch -Strict
pnpm beta:start -- -ReportOnFail
```

Blocked starts never install prerequisites. Without `-Force`, they do not launch the app and point to the doctor next actions plus the sanitized smoke report command.

## 5) Validation matrix

1. Dev loop: `pnpm test:quick`
2. Smoke gate: `pnpm smoke`
3. Default verify: `pnpm verify`
4. Beta doctor: `pnpm beta:doctor`
5. Guided beta start/readiness: `pnpm beta:start -- -NoLaunch`
6. Sanitized smoke report: `pnpm beta:smoke-report`
7. Full verify: `pnpm verify:full`
8. Extended verify: `pnpm verify:extended`
9. Beta preflight lane: `pnpm beta:preflight`
10. Interview quality report artifact: `pnpm report:interview-quality:strict`
11. Runtime preflight contract drift check (fixture mode): `pnpm test:contracts:runtime`
12. Manual QA pass: follow [../../engineering/manual-qa.md](../../engineering/manual-qa.md) for compact/normal/wide states, Windows UX, Candidate Studio, and privacy/export checks
13. Keep [../../ui-layout-contract.md](../../ui-layout-contract.md) as the detailed layout contract when a manual QA finding points to geometry, sticky footer overlap, or scroll ownership regressions
14. Beta release readiness gate: `pnpm beta:release-check`
15. Internal tester cycle seal (operator one-command report): `pnpm report:internal-beta-seal`

Additional conditional gates:

- `pnpm rust:deps` when Rust dependencies changed
- `pnpm audit:npm` when `package.json` or `pnpm-lock.yaml` changed
- Release-freeze semantics:
  - `pnpm release:freeze:check` = advisory visibility report (always collect and summarize findings)
  - `pnpm release:freeze:check:strict` = blocking freeze gate for final handoff / release-quality decisions
- Desktop E2E gate split:
  - PR/dev baseline: `pnpm test:e2e:desktop` can `SKIP` when desktop artifact is unavailable
  - internal beta handoff: `pnpm report:internal-beta-seal` is required; `pnpm test:e2e:desktop:required` remains recommended when artifact exists
  - RC/public beta handoff: `pnpm test:e2e:desktop:required` is required (non-skipped)

Internal beta seal boundaries:

- `pnpm report:internal-beta-seal` confirms internal tester readiness only (ready / ready-with-warnings / blocked).
- `pnpm report:internal-beta-seal` does not prove RC/public beta readiness.
- missing signed binary is a warning for internal beta, blocker for RC/public.
- live evidence remains mandatory to collect during tester cycle; seal report marks pending dimensions explicitly.
- `pnpm beta:release-check` is the honesty gate for v0.2.0-beta.2 readiness:
  - it runs the automated checks listed in `docs/release-checklist.md`;
  - it always leaves manual checklist items as WARN until a human reviews them;
  - it does not imply a clean Windows profile install unless that is explicitly recorded outside the repo.

Runtime preflight has two modes:

- real mode (`pnpm runtime:preflight`): reads `%APPDATA%\com.replyline.app\settings.json`
- fixture contract mode (`pnpm test:contracts:runtime`): runs `scripts/runtime-preflight.ps1` against `tests/fixtures/runtime/*.json` via `-SettingsPath` and does not depend on local `%APPDATA%`

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
5. Use `docs/product/privacy.md` as privacy source of truth for stable beta.

## 7) Handoff acceptance checklist

Release handoff is blocked unless all items are complete:

1. Baseline is green (`pnpm smoke`, `pnpm verify`).
2. Interview quality report is attached (`pnpm report:interview-quality:strict`).
3. Privacy checklist is passed.
4. Model presets and caveats are reviewed.
5. Known limitations are reviewed and updated.
6. Freeze gate evidence is explicit:
   - include `Advisory findings: ...` from `pnpm release:freeze:check` artifact,
   - include `Blocking findings: none` only if `pnpm release:freeze:check:strict` exited `0`,
   - include `Deferred with reason: ...` for any unresolved advisory items.

## 7.1) Public beta packaging staging plan (truthful, non-shipped)

Current state:

- `.github/workflows/release-on-tag.yml` publishes source release notes and validates a Windows artifact package on `v*` tags.
- `.github/workflows/windows-packaging-manual.yml` builds Windows artifacts by manual run and uploads workflow artifacts for internal review only.
- `release-on-tag.yml` artifact naming is signing-aware:
  - `Replyline-vX.Y.Z-windows-internal-unsigned.zip` when signing is unavailable or signature validation fails.
  - `Replyline-vX.Y.Z-windows-signed.zip` only when Authenticode signature validation passes.
- Unsigned packages remain workflow artifacts. Only signed and verified packages are attached to a public GitHub Release.

Future staged path (implementation-ready, not yet active):

1. Keep public-beta messaging conservative: current public release is source/developer beta.
2. Treat unsigned tag artifacts as internal trusted beta artifacts only.
3. Keep signing path behind explicit secret onboarding and certificate ownership.
4. Add checksums (`SHA-256`) and verification notes alongside each reviewed artifact.
5. After evidence passes, explicitly approve public-beta installer claims.

Minimum measurements required before public beta installer claims:

- fresh install/uninstall pass on Windows 10 and Windows 11;
- first-launch success and tray lifecycle behavior (`open/hide/quit`);
- SmartScreen/Defender prompts documented for signed/unsigned states;
- runtime sanity after install (`capture -> stt -> llm -> card`) with same-day evidence.
- desktop E2E required lane executed on built artifact:
  - `pnpm tauri build`
  - `set TAURI_APP_PATH=<path-to-built-app>`
  - `pnpm test:e2e:desktop:required`

## 8) Known limitations

Use `docs/product/limitations.md` as canonical list. Minimum truths to keep in every beta handoff:

- cross-machine and cross-call-app behavior is still `pending verification`
- no guarantee of stable low latency across all providers/conditions
- no transcript/history/team workflows in current stable-beta product scope
- no meeting assistant, no transcript tool, no speaking coach
- keyboard-only coverage and current limitations are documented in [../../accessibility.md](../../accessibility.md)

## 9) Command naming standard

- `pnpm beta:preflight`
- `pnpm beta:handoff`
- `pnpm beta:start`
- `pnpm beta:release-check`

## 10) Interview Mode beta posture decision criteria

Decide posture per tester wave using the feedback triage section in [../../engineering/operations.md](../../engineering/operations.md):

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
