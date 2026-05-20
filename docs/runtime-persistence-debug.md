# Runtime Persistence Debug (Windows)

## Goal

Validate that Replyline persists non-secret settings in `settings.json` and secret presence in keyring across save, reopen, and hotkey preflight.

## Steps

1. Start app:

```powershell
pnpm tauri dev
```

2. In Settings, fill:

- Deepgram key
- LLM Base URL (real endpoint, not `api.example.com`)
- LLM model
- LLM API key (if provider requires)

3. Click `Save`.

4. Click `Проверить настройки`.

5. Close app window and open it again.

6. Press `Ctrl+Alt+Space`.

## Forensics checklist

1. Open app log and find safe events:

- `settings_save_attempt`
- `settings_save_ok`
- `settings_load_attempt`
- `settings_load_ok` or `settings_load_default`
- `settings_quarantine` (if any)
- `secret_save_ok`
- `secret_present`
- `bootstrap_loaded`

2. Run IPC diagnostics command `get_persistence_diagnostics` and check:

- `settingsPath`
- `settingsFileExists`
- `settingsParseOk`
- `settingsValidationOk`
- `corruptBackups`
- `deepgramKeyPresent`
- `llmKeyPresent`
- `runtimePathReady`

3. If `settingsLoadDefault` happened, inspect reason in logs and confirm whether backup file was created:

- `settings.json.corrupt.*`

## Security notes

- Never copy raw API keys into logs, screenshots, or bug reports.
- `get_persistence_diagnostics` returns only presence flags for secrets.
