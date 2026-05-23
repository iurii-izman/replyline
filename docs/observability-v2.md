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

`manifest.json` includes safe metadata only and always sets:
- `contentIncluded: false`
- `privacyMode: "safe_metadata"`

## Compatibility

- Legacy `app_log` events remain intact.
- New typed events are additive and do not break existing parsers.
