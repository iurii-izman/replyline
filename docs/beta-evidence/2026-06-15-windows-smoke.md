# Windows 11 Source-Beta Smoke Evidence — 2026-06-15

> **Claim label**: `pending verification` (live provider path blocked by missing API key)
>
> This report follows the [BETA_TESTING.md](../../BETA_TESTING.md) format and the
> [runtime evidence guide](../engineering/runtime.md). No secrets, raw transcripts,
> absolute user paths, or provider response bodies are included.

## Machine Profile

| Field | Value |
| --- | --- |
| Windows edition | Professional |
| Windows build | 26200 (Insider Preview) |
| Architecture | x64 |
| CPU | AMD Ryzen 3 5300U (4C/8T, 2.6 GHz) |
| RAM | 16 GB |
| Node.js | v24.14.1 |
| pnpm | 9.15.9 |
| Rust | 1.94.1 |

## Build Under Test

| Field | Value |
| --- | --- |
| Release tag | v0.2.0-beta.1 (source) |
| Commit SHA | `2f1009e96e3e61e739b02970973d8d0e91ffcca7` |
| Branch | `main` (1 unpushed commit) |

## 15-Minute Smoke Path — Results

| Step | Command / Action | Result | Notes |
| --- | --- | --- | --- |
| 1. Clone & install | `pnpm install --frozen-lockfile` | ✅ PASS | Lockfile up to date |
| 2. Doctor | `pnpm beta:doctor` | ✅ PASS | 13/13 checks |
| 3. Verify | `pnpm verify` | ✅ PASS | typecheck, lint, build, 207 Rust tests, UI tests, security lanes, npm audit, rust deps |
| 4. Start | `pnpm beta:start` | ✅ PASS | Vite dev server + Tauri backend started, `replyline.exe` launched |
| 5. Runtime preflight | `pnpm runtime:preflight` | ✅ PASS | Settings v10 exist, credential manager detectable |
| 6. Provider readiness | `pnpm probe:runtime` | ❌ FAIL | `DEEPGRAM_API_KEY is missing` |
| 7. Configure providers | GUI Settings | ⚠️ BLOCKED | Deepgram API key not available on this machine |
| 8. Capture (synthetic) | `Ctrl+Alt+Space` | ⛔ NOT TESTED | Requires Deepgram key |
| 9. Card appearance | — | ⛔ NOT TESTED | Depends on capture→STT→LLM path |
| 10. Retry | — | ⛔ NOT TESTED | Depends on step 8–9 |
| 11. Tray open/restore/quit | Manual GUI | ⛔ NOT TESTED | Requires manual interaction |
| 12. Second launch | — | ⛔ NOT TESTED | Requires manual interaction |

## Sanitization Checks

| Check | Result |
| --- | --- |
| `pnpm test:report-secret-leaks` | ✅ OK (41 files) |
| `pnpm test:public-footprint` | ✅ OK (368 tracked files) |

## Latency Context (from prior fixture-based evidence, for reference)

Source: `reports/runtime/pipeline-latency-summary.json` (2026-06-13, fixture-based).

| Stage | p50 | p95 | Count |
| --- | --- | --- | --- |
| release_to_card | 6100ms | 9800ms | 6 |
| stt_request | 2100ms | 4200ms | 7 |
| llm_request | 1900ms | 3600ms | 5 |

> **Note**: These latency values are derived from test fixtures, not live provider
> runs. They are included as a baseline reference only and do not constitute a
> `measured` claim. See `docs/engineering/runtime.md` for claim labelling rules.

## Issues Found

1. **Blocked: `DEEPGRAM_API_KEY is missing`** — `pnpm probe:runtime` exits with error.
   The full capture→STT→LLM→card path cannot be verified without a valid Deepgram API key
   configured via Windows Credential Manager or environment variable.

   - **Workaround**: Obtain a Deepgram API key, store it via the app Settings UI or
     `DEEPGRAM_API_KEY` env var, then re-run `pnpm probe:runtime`.
   - **Related**: LLM endpoint (`https://api.openai.com/v1`, model `gpt-4o-mini`) is
     configured in settings but also requires a valid API key.

2. **activeAnswerProfile = `interview_default`** — The runtime preflight shows the
   active profile is `interview_default`, not `default` (WorkConversation). For a
   standard WorkConversation smoke test, this should be changed in Settings before
   capture.

## What This Evidence Proves

- The source-beta build compiles and launches on Windows 11 build 26200.
- All 13 `beta:doctor` checks pass on this machine.
- The full `pnpm verify` suite (typecheck, lint, build, 207 Rust tests, UI tests,
  security lanes, npm audit, rust deps) is green at commit `2f1009e`.
- App settings (v10 schema) exist and are parseable.
- Windows Credential Manager service is available for key storage.

## What This Evidence Does NOT Prove

- Live Deepgram STT path works on this machine.
- Live LLM card generation works on this machine.
- Full hotkey→capture→card UX flow works on this machine.
- Cross-machine stability or release readiness.
- Behavior on Windows 10 or other Windows 11 builds.

## Next Steps

1. Obtain a Deepgram API key and configure it in the app.
2. Obtain an OpenAI-compatible API key for the configured LLM endpoint.
3. Re-run `pnpm probe:runtime` to confirm provider readiness.
4. Execute the full 15-minute smoke test from `BETA_TESTING.md`.
5. Update this report with `measured` claims when live evidence is available.