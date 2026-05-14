# Architecture

Replyline Slim Stable Beta architecture.

## Frontend

- `src/app/model.ts` — app state/types
- `src/app/platform.ts` — Tauri bridge
- `src/app/controller.ts` — runtime orchestration
- `src/app/MainSurface.tsx` — status + card + 3 actions
- `src/app/SettingsSurface.tsx` — minimal settings form

## Backend

- capture start/stop
- STT (Deepgram)
- LLM card build
- context clear + retry

## IPC contract (public path)

- `load_bootstrap`
- `save_settings`
- `save_secret`
- `delete_secret`
- `clear_context`
- `get_context_status`
- `capture_start`
- `capture_stop_and_analyze`
- `retry_last_analysis`
- `sync_tray_ui_phase`
- `refresh_tray_menu`
- `tray_open_main`
- `log_client_event`
- `quit_app`
