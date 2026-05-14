# Replyline Settings Reference

All settings are stored in `%APPDATA%\com.replyline.app\settings.json`.

## Schema Version

Current schema version: **2**. Settings from version 1 are automatically migrated on load.

## Fields

| Field                 | Type      | Default                          | Description                                       |
| --------------------- | --------- | -------------------------------- | ------------------------------------------------- |
| `schemaVersion`       | `u32`     | `2`                              | Settings schema version for migration             |
| `hotkey`              | `string`  | `Ctrl+Alt+Space`                 | Global hotkey for capture start/stop              |
| `llmBaseUrl`          | `string`  | ``                               | OpenAI-compatible API base URL                    |
| `llmModel`            | `string`  | `gpt-4o-mini`                    | Model identifier for LLM analysis                 |
| `llmTemperature`      | `f32`     | `0.25`                           | LLM temperature (0.0–2.0)                         |
| `primaryLanguage`     | `string`  | `ru`                             | UI and prompt language (`ru` or `en`)             |
| `deepgramModel`       | `string`  | `nova-3`                         | Deepgram STT model                                |
| `captureMaxSeconds`   | `u16`     | `30`                             | Maximum capture duration (5–180 seconds)          |
| `useStreamingStt`     | `bool`    | `false`                          | Use WebSocket streaming STT instead of batch HTTP |
| `customSystemPrompt`  | `string?` | `null`                           | Custom LLM system prompt (overrides built-in)     |
| `trayIntroSeen`       | `bool`    | `false`                          | Whether the tray intro has been acknowledged      |
| `showAdvanced`        | `bool`    | `false`                          | Controls visibility of Advanced Mode UI sections  |

## Validation Rules

- `hotkey` must be non-empty.
- `llmModel` must be non-empty.
- `llmBaseUrl` must be a valid URL.
  - `https://` is allowed for all hosts.
  - `http://` is allowed only for local/local-network endpoints:
    `localhost`, loopback IPs, private RFC1918 ranges, link-local addresses, and `.local` hostnames.
- `captureMaxSeconds` must be between 5 and 180.
- `llmTemperature` must be between 0.0 and 2.0.
- `primaryLanguage` must be `ru` or `en`.

## Corruption Recovery

If `settings.json` cannot be parsed or fails validation, Replyline:

1. Renames the corrupt file to `settings.json.corrupt.<timestamp>`.
2. Logs the event via `eprintln`.
3. Returns default settings.

## Secrets

API keys (`deepgramApiKey`, `llmApiKey`) are stored in Windows Credential Manager, not in `settings.json`.
