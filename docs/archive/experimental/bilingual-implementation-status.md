# Bilingual Interview Mode (Experimental)

> **Status:** Experimental / not shipped in current public beta.
> **Default:** Disabled (`bilingualInterviewEnabled: false`, `liveTranslationEnabled: false`).
> **Last updated:** 2026-06-16.

## What exists now

### Backend (Rust — `src-tauri/src/bilingual/`)

| Module | State | Notes |
|---|---|---|
| `mod.rs` | Complete | Module declarations |
| `session.rs` | Complete | `ActiveBilingualSession`, `BilingualSessionState`, start/stop lifecycle, reconnect with 2s/4s/8s backoff, degraded fallback |
| `report.rs` | Complete | Full + redacted bilingual interview export, JSON/Markdown |
| `translation.rs` | Complete | `TranslationBatcher`, debounce, min-word-count, timeout (2000ms), fallback segments |
| `context_buffer.rs` | Complete | Question context buffer (60s / 20 segments cap) |
| `segment_manager.rs` | Complete | Partial/final segment lifecycle, throttling |

### Commands (registered in `lib.rs`, implemented in `commands.rs`)

| Command | State |
|---|---|
| `start_bilingual_session` | Implemented, registered in both debug and release builds |
| `stop_bilingual_session` | Implemented |
| `capture_bilingual_answer` | Implemented |
| `export_bilingual_interview_report` | Implemented |

### Frontend (TypeScript/Solid.js — `src/app/`)

| File | State |
|---|---|
| `BilingualInterviewSurface.tsx` | UI component for bilingual interview display |
| `MainSurface.tsx` | Shows bilingual surface when `bilingualInterviewEnabled` |
| `SettingsSurface.tsx` | Bilingual toggles (always visible, with disclaimer) |
| `controller/index.ts` | Bilingual state, hotkey mode, session orchestration |
| `platform.ts` | IPC wrappers for bilingual commands |
| `model.ts` | Types: `BilingualSessionSettings`, `BilingualInterviewState`, `LiveTranscriptSegmentDto`, `LiveTranslationSegmentDto`, etc. |

### Settings schema

| Key | TS type | Default | Rust field |
|---|---|---|---|
| `bilingualInterviewEnabled` | `false` | `false` | `bilingual_interview_enabled: false` |
| `liveTranslationEnabled` | `false` | `false` | `live_translation_enabled: false` |
| `translationDebounceMs` | `600` | `600` | `translation_debounce_ms: 600` |
| `translationMinWordCount` | `3` | `3` | `translation_min_word_count: 3` |
| `translationLanguage` | `"ru"` | `"ru"` | `translation_language: "ru"` |
| `interviewInputLanguage` | `"en"` | `"en"` | `interview_input_language: "en"` |
| `bilingualRetentionBehavior` | `"session_only"` | `"session_only"` | `bilingual_retention_behavior: "session_only"` |
| `bilingualAnswerStyle` | `"b2_conversational"` | `"b2_conversational"` | `bilingual_answer_style: "b2_conversational"` |

### Tests

- `src/app/frontend.critical-states.ui.test.tsx` — bilingual toggle rendering and wiring
- `src-tauri/src/bilingual/report.rs` — unit tests for export formats
- `src-tauri/src/bilingual/session.rs` — session state transitions
- `src-tauri/src/bilingual/context_buffer.rs` — pruning behavior
- `src-tauri/src/bilingual/segment_manager.rs` — final/partial emission
- `src-tauri/src/bilingual/translation.rs` — batch contract, timeout, short-input skip
- `src-tauri/src/settings.rs` — migration tests include bilingual fields

## Gating mechanism

Bilingual is gated by a **two-factor** check (`experimental_bilingual_allowed()`):

1. **Env flag** `REPLYLINE_EXPERIMENTAL_BILINGUAL=1` — primary kill-switch. Absent or any other value → feature completely off.
2. **Setting** `bilingual_interview_enabled: true` — user-facing opt-in.

Both must be true. This gate is enforced:
- In `bootstrap` (`experimental_bilingual_allowed` field exposed to frontend).
- In all 4 bilingual commands via `require_experimental_bilingual()`.
- Tested with 6 Rust unit tests (`commands::shared::tests`).

## What is incomplete

1. **No live-provider QA.** The manual QA checklist (Google Meet testing) has not been completed with real STT/LLM providers. Deepgram API key required and unavailable on current test machine.

2. **Translation lane not prod-hardened.** Timeouts, retry budgets, and fallback behavior are implemented but not validated under sustained load or diverse network conditions.

## Runtime behaviour

### Session states

- `active` — streaming live, transcripts and translations flowing.
- `reconnecting` — streaming disconnect detected, retry in progress.
- `degraded` — retries exhausted, hotkey still works via batch route.
- `idle` — session not started or stopped.

### Reconnect policy

- Recoverable streaming disconnect switches to `reconnecting`.
- Retry budget: 3 retries.
- Backoff: 2000ms, 4000ms, 8000ms.
- If reconnect succeeds, status returns to `active`.
- If retries are exhausted, status becomes `degraded`.

### Degraded fallback

- UI message: "Streaming unavailable. Hotkey works in batch mode."
- Hotkey continues via existing batch route (`capture_start` / `capture_stop_and_analyze`).

### Translation lane hardening

- Per translation attempt timeout: 2000ms.
- Safe retry budget: 1 retry.
- On repeated timeout/failure, emit fallback translation segment with `isFallback=true`.
- Translation errors do not expose raw transcript/provider bodies in logs.

### Memory caps

- Frontend display cap: last 30 segments.
- Backend question context cap: 60 seconds or 20 finalized segments.
- Translation maps pruned when old finalized segments are pruned.

### Latency instrumentation (safe metadata only)

- `partialEnMs`, `translationMs`, `answerTtftMs`, `answerTotalMs`
- Plus existing stream metadata: `latencyMs`, `sampleRate`, `durationMs`
- Only safe metadata emitted/logged (counts, durations, status, rates).

### Manual QA checklist (Google Meet)

1. Start Bilingual Interview Mode in a local test call.
2. Confirm live EN partial/final transcript appears.
3. Confirm RU translations appear and fallback warning appears on forced translation failure.
4. Force streaming disconnect and verify: `reconnecting` → backoff → `active` or `degraded`.
5. In `degraded`, verify hotkey batch card generation still works.
6. Verify no raw transcript/key material in logs/diagnostics.

## Why it is not shipped

- Streaming quality depends on system loopback device and call app routing — not validated across diverse Windows audio setups.
- Translation lane can degrade under provider/network instability — needs sustained soak testing.
- No independent tester confirmation outside the developer's machine.
- The feature adds complexity to setup, settings UI, and error surface without proven demand from current beta testers.
- Current public beta scope explicitly excludes bilingual/live-translation (see `README.md`, `docs/product/limitations.md`, `docs/product/user-guide.md`).

## Privacy / runtime / testing risks

| Risk | Mitigation |
|---|---|
| Raw transcript in logs | Backend uses sanitized logging; `privacy_class=safe_metadata` |
| Translation provider sees raw transcript | Deepgram receives audio; LLM receives translated context — both over user-configured provider keys |
| Bilingual export leaks raw data | Full export requires explicit user action; redacted export strips raw transcript/translation content |
| Settings migration breaks | Bilingual fields preserved through v7→v8→v9→v10 migrations; defaults are harmless |
| UI tests assume bilingual visible | Test explicitly sets `settingsActiveSection: "hotkey"` and provides setter fns — passes even with defaults disabled |

## Future activation checklist

Before enabling bilingual in a public beta or release:

1. [x] Add backend guard to `start_bilingual_session` / `stop_bilingual_session` / `capture_bilingual_answer` / `export_bilingual_interview_report` — return `EXPERIMENTAL_BILINGUAL_DISABLED` error when `bilingual_interview_enabled` is `false` or env flag is absent.
2. [x] Hide bilingual settings UI when `bilingualInterviewEnabled` is `false` (or gate behind explicit experimental opt-in).
3. [x] Add env gate: `REPLYLINE_EXPERIMENTAL_BILINGUAL=1` enforced in backend guard and bootstrap. Both env AND setting must pass.
4. [ ] Complete manual QA on at least 2 distinct Windows machines with different audio setups.
5. [ ] Run sustained soak test (≥30 min streaming) with network disruption simulation.
6. [ ] Validate translation quality across ≥3 call apps (Zoom, Teams, Meet).
7. [ ] Update `docs/product/limitations.md` — remove "not shipped" for bilingual.
8. [ ] Update `docs/product/user-guide.md` — add bilingual interview section.
9. [ ] Update `README.md` — remove "no bilingual/live-translation interview surface".
10. [ ] Verify `pnpm verify:full` passes with bilingual enabled.
11. [ ] Tag and smoke-test a release candidate build.

## Related docs

- `docs/engineering/architecture.md` — Experimental tracks section
- `docs/product/limitations.md` — Current limitations (bilingual not shipped)
- `docs/product/privacy.md` — Bilingual export privacy notes
- `README.md` — Public beta scope
