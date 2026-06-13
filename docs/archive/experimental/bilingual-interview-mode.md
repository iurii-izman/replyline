# Bilingual Interview Mode

> Status: Experimental / not shipped in current public beta.

## Goal

Bilingual Interview Mode adds a split pipeline for interview help:

- Passive Listening Lane: system audio -> Deepgram streaming -> live EN transcript -> RU translation
- Active Answer Lane: hotkey snapshot of finalized EN context -> Interview answer card in English

This mode does not replace existing paths:

- WorkConversation Mode stays unchanged.
- Classic Interview Mode stays unchanged.
- Existing batch flow `capture_start` -> `capture_stop_and_analyze` stays available.

## Runtime states

Session status values:

- `active`
- `reconnecting`
- `degraded`
- `idle`

Reconnect policy:

- Recoverable streaming disconnect switches to `reconnecting`.
- Retry budget: 3 retries.
- Backoff: `2000ms`, `4000ms`, `8000ms`.
- If reconnect succeeds, status returns to `active`.
- If retries are exhausted, status becomes `degraded`.

Degraded fallback behavior:

- UI message: `Streaming недоступен. Hotkey работает в batch-режиме`.
- Hotkey continues to work via existing batch route (`capture_start` / `capture_stop_and_analyze`).

## Translation lane hardening

- Per translation attempt timeout: `2000ms`.
- Safe retry budget: 1 retry.
- On repeated timeout/failure, emit fallback translation segment with `isFallback=true`.
- Translation errors do not expose raw transcript/provider bodies in logs.

## Memory caps

- Frontend display cap: `finalizedSegments`/displayed lane data keep last 30 segments.
- Backend question context cap: 60 seconds or 20 finalized segments.
- Frontend translation maps are pruned when old finalized segments are pruned.

## Latency instrumentation (safe metadata only)

Emitted metrics include:

- `partialEnMs`
- `translationMs`
- `answerTtftMs`
- `answerTotalMs`

Plus existing stream metadata:

- `latencyMs`
- `sampleRate`
- `durationMs`

Only safe metadata is emitted/logged (counts, durations, status, rates). Raw transcript/prompt/provider payloads are excluded.

## Manual QA checklist (Google Meet)

1. Start Bilingual Interview Mode in a local test call.
2. Confirm live EN partial/final transcript appears.
3. Confirm RU translations appear and fallback warning appears on forced translation failure.
4. Force streaming disconnect (network toggle or API key revoke) and verify:
   - state becomes `reconnecting`
   - retries use 2s/4s/8s pacing
   - recovered stream returns to `active` or ends in `degraded`
5. In `degraded`, press/release hotkey and verify batch card generation still works.
6. Verify no raw transcript/key material is written to logs/diagnostics.

## Known limitations

- Streaming quality depends on system loopback device and call app routing.
- Translation lane can degrade under provider/network instability.
- `answerTtftMs` in current implementation is measured as time to first valid LLM response (request-level), not token-stream TTFT.
