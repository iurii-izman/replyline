# Replyline IPC Command Reference

> **Date:** 2026-06-17
> **Commands:** 40 (9 categories)
> **Enforced by:** `scripts/check-ipc-handler-contract.mjs`

This document describes every IPC command registered in the Replyline Tauri backend.
Commands are called from the frontend via `platform.invoke("command_name", { args })`.
All commands use `camelCase` names and return JSON-serializable DTOs.

## Stability classification

| Label | Meaning |
|---|---|
| `public` | Stable, documented, used by normal user flows. Backward-compatible. |
| `stable` | Internal but stable. May change between minor versions with migration. |
| `internal` | Implementation detail. May change without notice. Tests may rely on shape. |
| `experimental` | Gated behind `REPLYLINE_EXPERIMENTAL_BILINGUAL=1`. Not in default UX. |

## 1. User Commands

Commands for app bootstrap, context management, client logging, and lifecycle.

### `load_bootstrap`

- **Category:** user
- **Stability:** `public`
- **Purpose:** Loads all initial state when the app starts. Returns settings, credential
  status, context state, and readiness flags.
- **Input:** None (reads Windows Credential Manager + settings file).
- **Output:** `BootstrapDto` — settings object, `deepgramKeyPresent`, `llmKeyPresent`,
  `contextActive`, `contextEntryCount`, `runtimeReady`, `lastTranscriptPreview`,
  `canRetryLastTranscript`, `experimentalBilingualAllowed`.
- **Privacy:** `privacy_class=safe_metadata`. Logs presence/absence of keys, never
  key values. Sanitized log paths (no usernames in paths).

### `clear_context`

- **Category:** user
- **Stability:** `public`
- **Purpose:** Clears the rolling conversation context. Used when the user wants a
  fresh conversation state without restarting the app.
- **Input:** None.
- **Output:** `ContextStatusDto` — `contextActive`, `entryCount`, `lastTranscriptPreview`,
  `canRetryLastTranscript`.
- **Privacy:** No transcript content in response. Only metadata (counts, flags).

### `get_context_status`

- **Category:** user
- **Stability:** `public`
- **Purpose:** Returns current rolling context state without modifying it.
- **Input:** None.
- **Output:** `ContextStatusDto` — same shape as `clear_context`.
- **Privacy:** Metadata only.

### `log_client_event`

- **Category:** user
- **Stability:** `internal`
- **Purpose:** Records a frontend-originated event in the app log for diagnostics.
- **Input:** `event: string`, `detail?: string`.
- **Output:** None (`Ok(())` or error).
- **Privacy:** Logged with `privacy_class=safe_metadata`. Event name and detail
  presence flag only.

### `quit_app`

- **Category:** user
- **Stability:** `public`
- **Purpose:** Gracefully exits the application. Logs the quit action.
- **Input:** None.
- **Output:** None (process exits with code 0).
- **Privacy:** Logs `quit_app` event before exit.

---

## 2. Runtime Commands

Commands for the core capture → STT → LLM → card pipeline.

### `capture_start`

- **Category:** runtime
- **Stability:** `public`
- **Purpose:** Starts WASAPI loopback audio capture. Returns a run ID for tracking.
  Idempotent — if already capturing, returns the existing run ID.
- **Input:** None (reads `captureMaxSeconds` from settings).
- **Output:** `run_id: string` — unique identifier for this capture session.
- **Privacy:** `privacy_class=safe_metadata`. No audio data in response. Run ID is
  a random opaque string. Debug traces (if enabled) record timeline events.

### `capture_stop_and_analyze`

- **Category:** runtime
- **Stability:** `public`
- **Purpose:** Stops the active capture, sends audio to Deepgram for STT, sends
  transcript + context to LLM, returns a card.
- **Input:** None.
- **Output:** `AnalysisCardDto` — `gist`, `sayNow`, `nextMove`, `mode`, metadata.
  May include `interview` fields if Interview Mode is active.
- **Privacy:** Raw audio and transcript processed in RAM, not written to disk by
  default. LLM call sends transcript + active ContextPack to configured provider.
  Card output does not include raw transcript. Debug traces (if `full_local` mode)
  may retain WAV/transcript/prompt locally.

### `retry_last_analysis`

- **Category:** runtime
- **Stability:** `public`
- **Purpose:** Re-runs the LLM analysis on the last captured transcript without
  re-capturing audio. Useful when the first card was vague or incomplete.
- **Input:** `run_id?: string` — optional, reuses last capture if omitted.
- **Output:** `AnalysisCardDto` — new card from the same transcript.
- **Privacy:** Same as `capture_stop_and_analyze`. Transcript is re-sent to LLM.

---

## 3. Bilingual Commands (Experimental)

Gated behind `REPLYLINE_EXPERIMENTAL_BILINGUAL=1` and `bilingualInterviewEnabled: true`.
All return `RL_ENV_DISABLED` or `RL_EXPERIMENTAL_BILINGUAL_DISABLED` when gated.

### `start_bilingual_session`

- **Category:** bilingual
- **Stability:** `experimental`
- **Purpose:** Starts a bilingual interview session with live EN streaming + RU
  translation via Deepgram streaming.
- **Input:** None.
- **Output:** Session state (streaming active). State transitions: `idle → starting → active`.
- **Privacy:** `privacy_class=safe_metadata`. Live audio streaming to Deepgram.
  No persistent transcript storage. Session cleared on stop.

### `stop_bilingual_session`

- **Category:** bilingual
- **Stability:** `experimental`
- **Purpose:** Stops the active bilingual session and cleans up streaming resources.
- **Input:** None.
- **Output:** None.
- **Privacy:** RAM-only transcripts cleared. No data written to disk.

### `capture_bilingual_answer`

- **Category:** bilingual
- **Stability:** `experimental`
- **Purpose:** Captures a hotkey snapshot during bilingual session for answer generation.
  Works in both `active` and `degraded` modes.
- **Input:** None (uses finalized EN context from the streaming session).
- **Output:** Interview answer card with EN text.
- **Privacy:** Sends EN context to LLM. Translation provider (Deepgram) sees audio only.

### `export_bilingual_interview_report`

- **Category:** bilingual
- **Stability:** `experimental`
- **Purpose:** Exports the bilingual interview report. Supports full (includes
  transcript-derived content) and redacted (metadata only) modes.
- **Input:** Export parameters (format, redaction level).
- **Output:** Report file path or report data.
- **Privacy:** Full export includes translated content. Redacted export strips
  raw transcript, translated text, full prompts, and raw ContextPack values.

---

## 4. Settings Commands

Commands for reading, writing, and validating application settings.

### `save_settings`

- **Category:** settings
- **Stability:** `public`
- **Purpose:** Saves the full settings object. Validates schema version, field
  ranges, and hotkey conflicts. Applies retention policies on save.
- **Input:** `input: AppSettings` — full settings object (schema v10, ~30 fields).
- **Output:** `AppSettings` — the validated and saved settings object.
- **Privacy:** `privacy_class=safe_metadata`. Hotkey value is the only
  user-identifiable field logged. API keys are NOT in settings — they're in
  Windows Credential Manager.

### `get_setup_status`

- **Category:** settings
- **Stability:** `public`
- **Purpose:** Returns a quick summary of setup readiness without loading full
  settings. Used by the setup wizard and idle state.
- **Input:** None.
- **Output:** `SetupStatusDto` — `deepgramKeyPresent`, `llmKeyPresent`,
  `llmRouteConfigured`, `runtimePathReady`.
- **Privacy:** `privacy_class=safe_metadata`. Only boolean presence flags, no values.

### `check_stt_config`

- **Category:** settings
- **Stability:** `internal`
- **Purpose:** Checks if the Deepgram API key is present in Windows Credential Manager.
- **Input:** None.
- **Output:** `CheckItemDto` — `ok`, `code` ("ok" / "missing_key" / "config_error"),
  `message`, `action` (user-facing suggestion).
- **Privacy:** Does NOT read the key value — only checks presence. Error messages
  are sanitized (no raw key data).

### `check_llm_config`

- **Category:** settings
- **Stability:** `internal`
- **Purpose:** Validates the LLM endpoint by making a real HTTP request to
  `{baseUrl}/models` or `{baseUrl}/`. Tests connectivity and authentication.
- **Input:** None (reads settings + LLM key from credential store).
- **Output:** `CheckItemDto` — `ok`, `code` ("ok" / "config_error" / "auth_error" /
  "endpoint_error" / "network_error"), `message`, `action`.
- **Privacy:** `privacy_class=safe_metadata`. Error messages sanitized. API key
  sent in `Authorization: Bearer` header, never logged.

### `check_runtime_config`

- **Category:** settings
- **Stability:** `internal`
- **Purpose:** Aggregates STT check + LLM check + settings validation into one
  result. Used by the "Check Settings" button in the UI.
- **Input:** None.
- **Output:** `RuntimeCheckDto` — `stt: CheckItemDto`, `llm: CheckItemDto`,
  `settings: CheckItemDto`, `runtimeReady: bool`.
- **Privacy:** Combines privacy properties of `check_stt_config`, `check_llm_config`,
  and local settings validation.

### `get_feedback_payload`

- **Category:** settings
- **Stability:** `internal`
- **Purpose:** Builds a sanitized diagnostic payload for issue reporting. Includes
  app version, commit SHA, mode, settings summary (no secrets), and optional
  last error info.
- **Input:** `mode?: string`, `errorCategory?: string`, `errorCode?: string`,
  `errorSummary?: string`.
- **Output:** `FeedbackPayloadDto` — `appVersion`, `commitSha`, `mode`,
  `settingsSummary` (LLM route kind, model preset, hotkey, trace mode — no keys),
  `lastError`.
- **Privacy:** Explicitly excludes API keys, raw transcripts, raw ContextPack
  values, and full settings content.

### `get_persistence_diagnostics`

- **Category:** settings
- **Stability:** `internal`
- **Purpose:** Returns detailed diagnostics about local persistence: settings file
  status, credential store, corrupt backups, ContextPack file health, app log status.
- **Input:** None.
- **Output:** `PersistenceDiagnosticsDto` — ~30 fields covering settings file
  metadata, parse/validation status, credential presence, ContextPack file health,
  app log path and status.
- **Privacy:** Settings path is hashed (`settingsPathHash`). Raw settings content
  NOT included. Credential values NOT included (only presence flags). App log
  path may contain machine-local paths.

---

## 5. Secrets Commands

Commands for storing and deleting API keys in Windows Credential Manager.

### `save_secret`

- **Category:** secrets
- **Stability:** `public`
- **Purpose:** Saves an API key to Windows Credential Manager. Currently supports
  `deepgram_api_key` and `llm_api_key` slots.
- **Input:** `slot: string` ("deepgram_api_key" | "llm_api_key"), `value: string`.
- **Output:** None (`Ok(())`) or error if value is empty or slot is unknown.
- **Privacy:** `privacy_class=safe_metadata`. Only the slot name is logged, never
  the key value. Empty values are rejected with `EMPTY_SECRET_NOT_SAVED`.

### `delete_secret`

- **Category:** secrets
- **Stability:** `public`
- **Purpose:** Deletes an API key from Windows Credential Manager.
- **Input:** `slot: string` ("deepgram_api_key" | "llm_api_key").
- **Output:** None (`Ok(())`) or error.
- **Privacy:** Only slot name logged. Credential Manager handles secure deletion.

---

## 6. Report Commands

Commands for Interview Mode session lifecycle and report export.

### `start_interview_session`

- **Category:** report
- **Stability:** `public`
- **Purpose:** Starts a new interview session. Creates an empty session with
  timestamp. Subsequent captures in Interview Mode append to this session.
- **Input:** None.
- **Output:** Session object (session ID, start time, empty question list).
- **Privacy:** Session metadata only. No transcript or card content at this stage.

### `end_interview_session`

- **Category:** report
- **Stability:** `public`
- **Purpose:** Ends the active interview session and generates a report. The
  session becomes read-only after this call.
- **Input:** None.
- **Output:** Interview report object — summary + per-question cards.
- **Privacy:** Report includes card content (gist, sayNow, nextMove, interview
  fields) but NOT raw transcripts unless explicitly exported later.

### `get_interview_report`

- **Category:** report
- **Stability:** `public`
- **Purpose:** Returns the current interview report without ending the session.
- **Input:** None.
- **Output:** Interview report or null if no session is active.
- **Privacy:** Same as `end_interview_session` but session remains active.

### `export_interview_report_markdown`

- **Category:** report
- **Stability:** `public`
- **Purpose:** Exports the interview report as **full Markdown** — includes
  raw transcript content. Explicit user action required.
- **Input:** None.
- **Output:** File path to the exported `.md` file.
- **Privacy:** ⚠️ **Sensitive** — includes raw transcript, interview card content,
  and session metadata. User must review before sharing.

### `export_interview_report_redacted_markdown`

- **Category:** report
- **Stability:** `public`
- **Purpose:** Exports the interview report as **redacted Markdown** — strips
  raw transcript and full transcript-derived content. Safer for sharing.
- **Input:** None.
- **Output:** File path to the exported `.md` file.
- **Privacy:** ✅ Recommended sharing path. Excludes raw/full transcript while
  keeping card summaries and session metadata.

### `clear_interview_reports`

- **Category:** report
- **Stability:** `public`
- **Purpose:** Deletes all locally stored interview reports. Irreversible.
- **Input:** None.
- **Output:** None.
- **Privacy:** Deletes `interview-reports.json` from local storage. No cloud sync.

---

## 7. ContextPack Commands

Commands for managing conversation context packs — the single context primitive
shipped in the current beta.

### `list_context_packs`

- **Category:** context_pack
- **Stability:** `public`
- **Purpose:** Returns all saved ContextPacks with their metadata and content.
- **Input:** None.
- **Output:** `ContextPackListDto` — `packs: ContextPackDto[]` (id, title, content,
  isActive, createdAt, updatedAt).
- **Privacy:** ContextPack content is local user data returned to the frontend
  for display. Never leaves the machine except when active ContextPack is
  included in LLM prompts.

### `save_context_pack`

- **Category:** context_pack
- **Stability:** `public`
- **Purpose:** Creates or updates a ContextPack. Validates title/content length
  and ID format. Enforces exactly-one-active constraint.
- **Input:** `input: ContextPackDto` — `id`, `title` (≤200 chars), `content`
  (≤5000 chars), `isActive`.
- **Output:** `ContextPackDto` — the saved pack with updated `updatedAt`.
- **Privacy:** Logs `title_len` and `content_len`, never raw content. Saves to
  local `context-packs.json`. Corrupt JSON files are quarantined and recovered.

### `delete_context_pack`

- **Category:** context_pack
- **Stability:** `public`
- **Purpose:** Deletes a ContextPack by ID. If the deleted pack was active, the
  active state is cleared.
- **Input:** `id: string`.
- **Output:** None.
- **Privacy:** Logs the deleted pack ID. No content logged.

### `set_active_context_pack`

- **Category:** context_pack
- **Stability:** `public`
- **Purpose:** Activates a ContextPack. Exactly one pack can be active at a time.
  The previously active pack (if any) is deactivated.
- **Input:** `id: string`.
- **Output:** `ContextPackDto` — the now-active pack.
- **Privacy:** Active pack content is included in subsequent LLM prompts.

### `clear_active_context_pack`

- **Category:** context_pack
- **Stability:** `public`
- **Purpose:** Deactivates the currently active ContextPack. No pack is active
  after this call. The pack is NOT deleted — only deactivated.
- **Input:** None.
- **Output:** None.
- **Privacy:** Stops including ContextPack content in LLM prompts.

### `get_active_context_pack`

- **Category:** context_pack
- **Stability:** `public`
- **Purpose:** Returns the currently active ContextPack, or null if none.
- **Input:** None.
- **Output:** `ContextPackDto | null`.
- **Privacy:** Content returned to frontend for display.

### `get_context_pack_status`

- **Category:** context_pack
- **Stability:** `internal`
- **Purpose:** Returns a compact status summary: total pack count and active pack ID.
- **Input:** None.
- **Output:** `ContextPackStatusDto` — `totalCount: number`, `activeId: string | null`.
- **Privacy:** Metadata only — no content.

---

## 8. Diagnostics Commands

Commands for trace inspection, cleanup, and persistence health checks.

### `get_trace_status`

- **Category:** diagnostics
- **Stability:** `internal`
- **Purpose:** Returns current debug trace configuration and the number of stored
  trace runs.
- **Input:** None.
- **Output:** `TraceStatusDto` — `mode` (off/redacted/full_local), `retentionDays`,
  `tracesDir`, `totalRuns`.
- **Privacy:** Traces directory path may be machine-local. No trace content returned.

### `clear_debug_traces`

- **Category:** diagnostics
- **Stability:** `internal`
- **Purpose:** Deletes all debug traces and legacy debug WAV files. Irreversible.
- **Input:** None.
- **Output:** None.
- **Privacy:** Deletes potentially sensitive local files (WAV, transcript, prompt
  captures if `full_local` mode was active). Logs counts only.

### `open_trace_folder`

- **Category:** diagnostics
- **Stability:** `internal`
- **Purpose:** Opens the traces directory in Windows Explorer (or equivalent on
  macOS/Linux).
- **Input:** None.
- **Output:** None.
- **Privacy:** Creates directory if missing. No trace content returned via IPC.

### `get_feedback_payload`

- **Category:** diagnostics (also listed under settings)
- **Stability:** `internal`
- **Purpose:** See Settings section above. Same command, listed in both categories
  for discoverability.
- **Input:** See Settings § `get_feedback_payload`.
- **Output:** See Settings § `get_feedback_payload`.
- **Privacy:** See Settings § `get_feedback_payload`.

### `get_persistence_diagnostics`

- **Category:** diagnostics (also listed under settings)
- **Stability:** `internal`
- **Purpose:** See Settings section above.
- **Input:** See Settings § `get_persistence_diagnostics`.
- **Output:** See Settings § `get_persistence_diagnostics`.
- **Privacy:** See Settings § `get_persistence_diagnostics`.

---

## 9. Tray & Window Commands

Commands for system tray integration and window management.

### `sync_tray_ui_phase`

- **Category:** trayWindow
- **Stability:** `internal`
- **Purpose:** Updates the tray tooltip to reflect the current app phase
  (capturing, transcribing, analyzing, etc.). Called by the frontend on state
  transitions.
- **Input:** `phase: string`, `detail?: string`.
- **Output:** None.
- **Privacy:** Phase names are safe metadata. No user data.

### `refresh_tray_menu`

- **Category:** trayWindow
- **Stability:** `internal`
- **Purpose:** Rebuilds the system tray context menu. Called after language
  changes or settings updates that affect tray menu labels.
- **Input:** None.
- **Output:** None.
- **Privacy:** Menu labels are localized using the app language profile.

### `tray_open_main`

- **Category:** trayWindow
- **Stability:** `internal`
- **Purpose:** Shows and focuses the main application window. Called when the
  user clicks the tray icon or selects "Show" from the tray menu.
- **Input:** None.
- **Output:** None.
- **Privacy:** Logged as `tray_open_main` audit event.

---

## Privacy Summary

| Privacy property | Commands that uphold it |
|---|---|
| Never returns API key values | All — keys only checked for presence, never read via IPC |
| Never logs API key values | All — `privacy_class=safe_metadata` on all observability events |
| Never returns raw transcripts by default | `capture_stop_and_analyze`, `retry_last_analysis` — only card fields |
| Sensitive export requires explicit action | `export_interview_report_markdown` — full mode gated |
| Safer export path available | `export_interview_report_redacted_markdown` — redacted by default |
| Bilingual commands gated | All 4 bilingual commands require env flag + setting |
| Corrupt data safely recovered | `save_context_pack`, `load_bootstrap` — quarantine + recovery |

## Error Codes

All commands return errors using the stable `RL_*` error code family defined in
`src-tauri/src/diag_contract.rs`. Common codes:

| Code | Meaning |
|---|---|
| `RL_ENV_DISABLED` | Bilingual feature blocked by env flag |
| `RL_EXPERIMENTAL_BILINGUAL_DISABLED` | Bilingual feature blocked by setting |
| `RL_EMPTY_SECRET_NOT_SAVED` | Attempted to save empty API key |
| `RL_SETTINGS_HOTKEY_REQUIRED` | Hotkey field is empty |
| `RL_SETTINGS_MODEL_REQUIRED` | LLM model field is empty |
| `RL_SETTINGS_INVALID_URL` | LLM base URL is malformed |
| `RL_SETTINGS_CAPTURE_RANGE` | Capture duration outside 5–180s range |
| `RL_CORRUPT_SETTINGS_RECOVERED` | Settings file was corrupted and recovered |

See `src-tauri/src/diag_contract.rs` for the full error code catalog.

## Related Docs

- [../engineering/testing.md](../engineering/testing.md) — test profiles and lane boundaries
- [../engineering/runtime.md](../engineering/runtime.md) — runtime evidence and claim labels
- [../product/privacy.md](../product/privacy.md) — data flow and storage boundaries
- [../product/user-guide.md](../product/user-guide.md) — user-facing setup and flows
- [../../src-tauri/src/commands/mod.rs](../../src-tauri/src/commands/mod.rs) — command implementation entry point
- [../../scripts/check-ipc-handler-contract.mjs](../../scripts/check-ipc-handler-contract.mjs) — contract enforcement script
