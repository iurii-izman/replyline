# Observability v2

## Scope

Observability v2 defines a unified safe event foundation for local Replyline runtime diagnostics.

Current block constraints:

- No raw transcript/prompt/LLM response in default logs.
- No secrets in logs.
- Safe metadata only by default.

## Event Taxonomy

Categories:

- `app`
- `window`
- `tray`
- `navigation`
- `settings`
- `credential`
- `hotkey`
- `capture`
- `stt`
- `llm`
- `card`
- `context`
- `interview`
- `candidate_pack`
- `export`
- `report`
- `error`
- `privacy`

## Levels

- `audit`: safe always-on events for production diagnostics.
- `debug`: safe detailed events for local troubleshooting.
- `trace`: opt-in, content-capable events (disabled in this block).

## Privacy Classes

- `safe_metadata`: operational metadata only; always allowed in `app.log`.
- `redacted_content`: content-derived values after strict redaction.
- `sensitive_content`: sensitive payloads requiring explicit local user action.
- `secret`: credentials/tokens/keys; never logged.

## Event Envelope

Every v2 typed event emits compact key/value detail via `app_log::append_event` with:

- `schema=1`
- `level`
- `source`
- `phase`
- `privacy_class`
- `run_id` (when available)

Example:

`2026-05-23T12:00:00 [llm_request_start] schema=1 level=audit source=llm phase=analyzing run_id=1716465600000-1 provider=custom model=gpt-5.4-mini endpoint_host=api.openai.com privacy_class=safe_metadata`

## Runtime Trace Manifest (No Content)

Per run:

- `%APPDATA%/com.replyline.app/traces/<run_id>/manifest.json`
- `%APPDATA%/com.replyline.app/traces/<run_id>/timeline.jsonl`
- `%APPDATA%/com.replyline.app/traces/<run_id>/timings.json`

`manifest.json` includes safe metadata and sets:

- `contentIncluded: false` by default
- `contentIncluded: true` only when `debugTraceMode=full_local` explicit opt-in is enabled
- `privacyMode: "safe_metadata"`

## Trace Bundle Files

Default mode writes redacted snapshots only:

- `llm-request.redacted.json`
- `llm-response.redacted.json`
- `llm-attempts.jsonl`
- `stt-request.redacted.json`
- `stt-response.redacted.json`
- `audio-signal.redacted.json`
- `card.redacted.json`

With explicit `debugTraceMode=full_local`, the run also stores `capture.full.wav` next to transcript/prompt content for local input/output comparison. This file is sensitive and follows trace retention.

Safe LLM fields:

- endpoint host/path
- selected/attempted model(s)
- temperature, max tokens
- retry/budget/timeout policy
- status code, duration
- prompt/response char counts
- usage token counters (if provider returns usage)

Safe STT fields:

- provider and model/options
- audio byte count and available signal metadata
- retry counters and error kind
- status code and duration
- transcript char count and hash

Safe card fields:

- `gist` / `say_now` / `next_move` char counts and hashes
- `repair_used`, `fallback_used`, `chars_band`
- schema validity flags
- interview schema presence

Hashes:

- `sha256_hex(value)` is used to compare content equality across pipeline stages.
- Hashes are stable for identical input and do not reveal original text.

## Full-Content Trace Opt-In

- Settings: `debugTraceMode` (`redacted` by default) + `debugTraceRetentionDays` (default `3`).
- When `false`, trace previews are redacted and manifest keeps `contentIncluded=false`.
- When `true`, content-capable snapshots may include full payload previews; this is explicit local opt-in only.

## Manual Smoke: debugTraceMode

1. In Settings -> Reports, enable `Enable full-content trace (opt-in)`.
2. Run one capture and open the latest `%APPDATA%/com.replyline.app/traces/<run_id>/manifest.json`.
3. Verify `contentIncluded=true`.
4. Disable the setting, run one more capture, verify `contentIncluded=false`.
5. In both runs, verify:

- no `Authorization` token values in snapshot headers
- no raw HTTP error body dump in LLM error snapshot
- redacted files still exist (`*.redacted.json`, `llm-attempts.jsonl`)

## Compatibility

- Legacy `app_log` events remain intact.
- New typed events are additive and do not break existing parsers.
