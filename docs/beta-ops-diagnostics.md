# Beta Ops Diagnostics Runbook

This runbook is the beta-ops source of truth for observability and diagnostics.

## 1) Stable runtime event schema

Replyline writes a user-safe diagnostic event line to `app.log` for runtime chain milestones.

Event name:

- `diag_runtime_event`

Detail fields:

- `stage`: `capture | stt | llm | card | retry`
- `outcome`: `start | ok | fail`
- `code`: stable code (for example `RL_STT_FAILED`)
- `detail`: sanitized short detail (no raw tokens, no raw PII)
- `repair_used=true|false`, `fallback_used=true|false`, and `chars_band=short|medium|long` appear in `detail` for successful `llm` and `retry` card generation events.
- failed `RL_CARD_INVALID` details include `invalid_reason=...` and `chars_band=...` on analyze.
- silent PCM is rejected before the provider request and logged as `code=RL_STT_NO_SPEECH`.
- `RL_STT_TOO_SHORT` is reserved as a legacy diagnostic code; short non-empty transcripts are analyzed.
- STT failures write available stage timings and a `stt_request_failed` timeline event.
- `full_local` runs include `capture.full.wav`; all trace modes include redacted audio signal metrics.
- Capture stop signals immediately and drains already-buffered WASAPI packets for a bounded 40 ms window.
- Early capture, credential, STT, and LLM failures finalize `timings.json` and append a failure timeline event.
- `Clear debug traces` also removes legacy `%LOCALAPPDATA%\com.replyline.app\capture-debug\*.wav` files.

Example line:

```text
2026-05-14T12:01:02 [diag_runtime_event] stage=stt outcome=fail code=RL_STT_NO_SPEECH detail=stt_failure_kind=no_speech
2026-05-14T12:01:05 [diag_runtime_event] stage=llm outcome=ok code=RL_LLM_OK detail=card generated repair_used=true fallback_used=true chars_band=medium
```

## 2) Stable error codes (current)

- `RL_CAPTURE_START`
- `RL_CAPTURE_NOT_ACTIVE`
- `RL_CAPTURE_JOIN_FAILED`
- `RL_CAPTURE_STOP_FAILED`
- `RL_STT_KEY_MISSING`
- `RL_STT_FAILED`
- `RL_STT_STREAMING_FAILED`
- `RL_STT_OK`
- `RL_LLM_FAILED`
- `RL_LLM_OK`
- `RL_CARD_INVALID`
- `RL_ANALYSIS_OK`
- `RL_RETRY_EMPTY`
- `RL_RETRY_OK`

Codes are for correlation and triage. User-facing messages still come from `userSafe*Error()` mapping in `src/app/model.ts`.

## 3) Log redaction guarantees

Before writing to `app.log`, Replyline sanitizes details and redacts:

- bearer/token/password/secret/api key markers
- JSON secret fields (`authorization`, `apiKey`, `api_key`, `token`, `password`, `secret`)
- probable emails
- long numeric identifiers (13-19 digits)
- URL query values (`?[redacted_query]`)

Constraint:

- diagnostics should be useful for debugging, but never rely on raw secrets or transcript dumps in logs.

## 4) Runtime evidence bundle structure

`pnpm evidence:bundle` creates:

- `runtime/` — runtime artifacts copied from local repo `reports/runtime` when available
- `logs/` — `app.log` copy when available
- `diagnostics/runtime-events.json` — extracted `diag_runtime_event` entries
- `manifest.json` — provenance, counts, honesty boundaries, section map

Bundle is valid even if some runtime reports are absent. App log + manifest are sufficient minimum for blocker triage.

## 5) How to collect diagnostics

From command:

1. `pnpm evidence:bundle`.
2. Attach generated `reports/runtime-evidence-*` folder.

There is no separate diagnostic bundle UI in Settings. Use `pnpm evidence:bundle` from command line.

## 6) How to read signals quickly

1. Open `diagnostics/runtime-events.json`.
2. Find last `outcome=fail`.
3. Read `stage` + `code`.
4. Cross-check with `logs/app.log` around the same timestamp.
5. Confirm if failure is reproducible in `pnpm probe:runtime`.

## 7) Blocker vs non-blocker

Blocker before release:

- repeated `fail` in same stage/code under normal setup
- `RL_STT_KEY_MISSING` or config errors in installer/default flow
- diagnostic redaction failure (secrets/PII visible)
- runtime chain cannot complete `capture -> stt -> llm -> card`

Non-blocker (can ship with note):

- isolated provider/network outage with clear user-safe guidance
- optional runtime reports missing but bundle still valid
- single flaky run not reproducible with repeated local checks

## 8) Manual beta fail-path spot checks (selective)

Run at least 2-3 scenarios before release discussion and validate `diagnostics/runtime-events.json`.

Scenario A: STT key missing

1. Remove/clear Deepgram key in Settings.
2. Hold/release hotkey once.
3. Run `pnpm evidence:bundle`.
4. Validate latest fail event:
   - `stage=stt`
   - `outcome=fail`
   - `code=RL_STT_KEY_MISSING`

Scenario B: Retry without prior transcript

1. Restart app (fresh session).
2. Click `Rebuild card` before any capture.
3. Run `pnpm evidence:bundle`.
4. Validate latest fail event:
   - `stage=retry`
   - `outcome=fail`
   - `code=RL_RETRY_EMPTY`

Scenario C: Invalid LLM route or unreachable gateway

1. Set non-working `llmBaseUrl` and save.
2. Run one capture cycle.
3. Run `pnpm evidence:bundle`.
4. Validate latest fail event:
   - `stage=llm`
   - `outcome=fail`
   - `code=RL_LLM_FAILED` or `RL_CARD_INVALID`

See also:

- `docs/release-readiness.md`
- `docs/privacy-and-trust.md`
- `docs/error-catalog.md`
