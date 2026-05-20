# Runtime Live QA (Windows)

## Purpose

Live QA closes the last persistence gap that cannot be proven only by unit/integration tests: real GUI runtime behavior with hotkey, restart, and local artifact checks.

## Paths

- Settings file: `%APPDATA%\com.replyline.app\settings.json`
- App log: `%APPDATA%\com.replyline.app\logs\app.log`

## Manual live scenario

1. Run `pnpm tauri dev`.
2. Open Settings and verify required runtime fields are saved.
3. Run `Проверить настройки` and confirm ready status.
4. In main screen, perform hotkey cycle (`Ctrl+Alt+Space` hold/release), wait for answer card.
5. Close app, launch again, ensure settings persist.
6. Repeat hotkey cycle after restart.

## Required app.log events

- `app_boot_start`
- `settings_load_attempt`
- `settings_parse_ok`
- `settings_validation_ok`
- `bootstrap_loaded`
- `hotkey_registered`
- `hotkey_pressed`
- `setup_preflight_check_start`
- `setup_preflight_check_result`
- `capture_start_requested`
- `capture_start_ok` or `capture_start_client_ok`
- `capture_stop_requested`
- `analysis_start`
- `analysis_stt_ok`
- `analysis_llm_ok`
- `analysis_ok` or `ui_answer_ready`

## Forbidden patterns

- Unexpected `settings_quarantine`
- `setup_missing_redirect` after ready runtime signal
- Raw secrets in logs/artifacts: `sk-`, `dg_`, `Bearer <token>`, `api_key=<value>`
- Raw full transcript dumps

## Collector and verifier

1. Collect runtime artifacts:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/collect-live-runtime-evidence.ps1
```

2. Verify evidence folder:

```bash
node scripts/verify-live-runtime-evidence.mjs reports/runtime-live-evidence-YYYYMMDD-HHMMSS
```

Collector output:

- `app.log` (redacted copy)
- `diagnostics.json` (when direct diagnostics snapshot is available)
- `runtime-live-qa.md` (checklist + leak-scan summary)

## Interpreting result

- `PASS` from verifier means evidence chain is complete and safe.
- Any `FAIL` from verifier is a blocking gap; fix root cause and rerun the live scenario.
