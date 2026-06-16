# Architecture

Architecture reference for the current Replyline beta.

## Frontend boundaries

Source-of-truth split (must stay stable):

- `src/app/model/settings.ts` — Phase, Panel, AppSettings, DEFAULT_SETTINGS, MainUiState
- `src/app/model/errors.ts` — CommandError parsing, user-safe error mapping
- `src/app/model/cards.ts` — Analysis card DTOs, interview card schema V1, asAnalysisCard
- `src/app/model/interview.ts` — Interview report/session DTOs
- `src/app/model/diagnostics.ts` — Bootstrap, setup status, persistence diagnostics DTOs
- `src/app/model/hotkeys.ts` — Hotkey normalization and KeyboardEvent parsing
- `src/app/model/routeMode.ts` — LLM route mode detection (local/cloud)
- `src/app/model/bilingualExperimental.ts` — Bilingual interview DTOs, state, gated by default
- `src/app/model/index.ts` — Barrel re-export, canonical import surface (`from "./model"`)
- `src/app/platform.ts` — Tauri/browser bridge (`invoke`, listeners, shortcuts, clipboard, window)
- `src/app/controller.ts` — re-export entry for controller layer (`controller/index.ts`)
- `src/app/controller/index.ts` — orchestration composition and app-level state wiring
- `src/app/controller/hotkeys.ts` — capture hotkey lifecycle and capture start/stop orchestration
- `src/app/controller/pipelineActions.ts` — retry/clear/copy actions
- `src/app/controller/settingsActions.ts` — bootstrap/setup/settings persistence flow
- `src/app/controller/lifecycle.ts` — runtime status listeners and run-id event acceptance rules
- `src/app/controller/traySync.ts` — tray phase synchronization side effect
- `src/app/controller/selectors.ts` — derived UI state/selectors for main surface
- `src/app/controller/keyboardShortcuts.ts` — non-hotkey keyboard actions in UI
- `src/app/controller/notices.ts` — ephemeral notice lifecycle/timers

UI surfaces remain view-focused and do not own orchestration:

- `src/app/MainSurface.tsx`
- `src/app/SettingsSurface.tsx`
- `src/app/settings/settingsViewModel.ts` — Pure UI helpers (check item labels, status classes, runtime check messages)

## Backend ownership map

### Command layer (domain split in progress)

- `src-tauri/src/commands/mod.rs` — remaining IPC commands (17 of 40) + shared helpers
- `src-tauri/src/commands/registry.rs` — `replyline_commands!` macro (single-source command registration)
- `src-tauri/src/commands/shared.rs` — `CommandError` impl for `SettingsError`/`CredentialError`

Extracted domains (7 of 10, 23 of 40 commands):

- `src-tauri/src/commands/bootstrap.rs` — `load_bootstrap`, `log_client_event`, `quit_app`
- `src-tauri/src/commands/diagnostics.rs` — `get_trace_status`, `clear_debug_traces`, `open_trace_folder`
- `src-tauri/src/commands/tray_window.rs` — `sync_tray_ui_phase`, `refresh_tray_menu`, `tray_open_main`
- `src-tauri/src/commands/context.rs` — `clear_context`, `get_context_status`
- `src-tauri/src/commands/context_pack.rs` — `list_context_packs`, `save_context_pack`, `delete_context_pack`, `set_active_context_pack`, `clear_active_context_pack`, `get_active_context_pack`, `get_context_pack_status`
- `src-tauri/src/commands/runtime_checks.rs` — `check_stt_config`, `check_llm_config`, `check_runtime_config`
- `src-tauri/src/commands/secrets.rs` — `save_secret`, `delete_secret`

Remaining in `mod.rs` (4 domains, 17 commands):
- settings (4): `save_settings`, `get_setup_status`, `get_feedback_payload`, `get_persistence_diagnostics`
- capture (3): `capture_start`, `capture_stop_and_analyze`, `retry_last_analysis`
- interview (6): start/end/get/export_markdown/export_redacted/clear
- bilingual_experimental (4): start/stop/capture/export

### Other backend modules
- `src-tauri/src/settings.rs` — settings schema, migration chain, validation, corrupt-file quarantine
- `src-tauri/src/types.rs` — IPC DTOs and `CommandError` envelope
- `src-tauri/src/context_pack.rs` — active ContextPack storage, validation, and prompt compaction
- `src-tauri/src/services/capture_pipeline.rs` — capture→STT→LLM orchestration
- `src-tauri/src/services/pipeline_errors.rs` — sanitized pipeline error logging + `CommandError::Pipeline`
- `src-tauri/src/card_v3.rs` — CardSchemaV3 parse/repair/mapping to legacy DTO fields
- `src-tauri/src/interview_card_v1.rs` — deterministic InterviewCardSchemaV1 contract

## Analysis card pipeline

```mermaid
flowchart LR
  LLM[LLM JSON CardSchemaV3] --> Parse[card_v3 parse]
  Parse --> Map[map to gist/say_now/next_move]
  Map --> Repair[per-section repair + fallback]
  Repair --> DTO[AnalysisCardDto IPC]
  DTO --> UI[MainSurface legacy fields]
```

- V3 contract: `question_brief`, `answer_now`, `star_evidence`, `next_step`, optional `risk_or_clarifier`.
- Legacy IPC/UI unchanged: `gist`, `sayNow`, `nextMove`.
- Quality flags (logs only): `repair_used`, `fallback_used`, `chars_band`.
- Migration notes: see git history for schema v3 migration context.

## ContextPack system

ContextPack is the shipped conversation context primitive — the single mechanism for providing
background and role context to WorkConversation and Interview Mode prompts.

- **Status:** Shipped in the current public beta.
- **Scope:** One active ContextPack at a time, user-controlled, local storage, injected into LLM prompts.
- **IPC:** 7 commands — list, save, delete, set active, clear active, get active, get status (`context_pack` category).
- **Code:** `src-tauri/src/context_pack.rs` (storage, validation, prompt compaction), `src-tauri/src/commands/context_pack.rs` (command handlers), `src/app/ContextPackPanel.tsx` (UI panel), `src/app/model/contextPack.ts` (frontend DTOs).
- **Docs:** [ADR 0001](../adr/0001-context-pack-simplification.md), [User Guide — ContextPack](../product/user-guide.md#6-contextpack).

## IPC contract categories

Command grouping is enforced by `scripts/check-ipc-handler-contract.mjs`:

- `user`: bootstrap/context/core UI events
- `runtime`: capture + retry flow
- `settings`: save/settings/runtime preflight checks
- `secrets`: credential save/delete
- `context_pack`: ContextPack CRUD, activation, and status commands
- `report`: interview session/report/export commands
- `diagnostics`: persistence/trace diagnostics
- `trayWindow`: tray/menu/window sync commands
- `bilingual`: experimental bilingual interview commands (gated by `bilingualInterviewEnabled`, disabled by default)

## Experimental tracks

Features that exist in the codebase but are gated/disabled by default and not shipped in the current public beta.

### Bilingual Interview Mode

- **Status:** Experimental, disabled by default. Gated by **two-factor** check:
  1. Env flag `REPLYLINE_EXPERIMENTAL_BILINGUAL=1` (primary kill-switch).
  2. Setting `bilingualInterviewEnabled: true` (user-facing opt-in).
  Both must pass. Enforced in `bootstrap` and all 4 bilingual commands via `require_experimental_bilingual()`.
- **Future:** Frozen for v0.2.x per ADR 0002. Re-evaluate at v0.3 planning. If no demand,
  scheduled for removal with settings migration v10→v11.
- **Scope:** Split pipeline for interview help — passive EN transcript streaming + RU translation + hotkey-triggered answer card generation.
- **Code:** `src-tauri/src/bilingual/` (Rust backend, 5 modules), `src/app/BilingualInterviewSurface.tsx` (frontend).
- **Commands:** `start_bilingual_session`, `stop_bilingual_session`, `capture_bilingual_answer`, `export_bilingual_interview_report` — registered but callable only when both gates pass.
- **Footprint:** ~2500 LOC (Rust + TS), 8 settings fields, 4 doc files.
- **Docs:** `docs/adr/0002-bilingual-frozen-track.md`, `docs/archive/experimental/bilingual-implementation-status.md`.
- **Activation:** See activation checklist in the archive doc. Do not enable without completing manual QA on ≥2 Windows machines, sustained soak testing, and backend command guard.
