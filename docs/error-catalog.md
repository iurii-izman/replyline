# Error Catalog

All structured errors that flow through Replyline's IPC boundary, from Rust backend
to Solid.js frontend, and their user-facing guidance.

## CommandError Kinds

| Kind         | Backend source                                            | User sees                | Settings anchor           |
| ------------ | --------------------------------------------------------- | ------------------------ | ------------------------- |
| `Settings`   | Config validation, file I/O, schema mismatch              | "Settings or file issue" | `#settings-anchor-llm`    |
| `Credential` | Missing/invalid API key in Windows Credential Manager     | "API key missing"        | `#settings-anchor-stt`    |
| `Capture`    | Audio device error, hotkey conflict, empty recording      | "Recording failed"       | `#settings-anchor-hotkey` |
| `Pipeline`   | STT/LLM provider error, network timeout, invalid response | "Pipeline error"         | `#settings-anchor-llm`    |
| `Memory`     | Memory space CRUD failure, persistence error              | "Memory error"           | `#settings-anchor-memory` |
| `Internal`   | Lock poisoned, unexpected state, code bug                 | "Internal error"         | `#settings-anchor-hotkey` |

## Frontend Error Routing

When a `CommandError` is received:

1. `parseCommandInvokeError()` extracts `{kind, message}` from the JSON envelope
2. `settingsAnchorForCommandErrorKind()` maps `kind` to a DOM anchor
3. ChromeSurface shows an error bar with a context-specific action button
4. Clicking the button scrolls SettingsSurface to the relevant section

## Settings Validation Errors (mapSettingsSaveError)

| Backend code             | User message                                  |
| ------------------------ | --------------------------------------------- |
| `HOTKEY_REQUIRED`        | Клавиша: задайте сочетание ниже               |
| `MODEL_REQUIRED`         | Модель ответа: заполните поле                 |
| `INVALID_URL`            | Адрес шлюза: http:// или https://, полный URL |
| `CAPTURE_RANGE_INVALID`  | Лимит фрагмента: 5–180 секунд                 |
| `INVALID_LANGUAGE`       | Файл настроек повреждён (язык)                |
| `INVALID_SCHEMA`         | Версия settings.json не подходит              |
| `IO:`                    | Не записался файл настроек                    |
| `JSON`                   | Сбой записи настроек                          |

## Pipeline Error Heuristics (userSafePipelineError)

| Pattern match           | User message                                      |
| ----------------------- | ------------------------------------------------- |
| `not active`            | Сначала удержите клавишу для записи               |
| `Nothing to retry`      | Сначала сделайте захват                           |
| `join failed`           | Сбой при остановке записи                         |
| `empty transcript`      | Текст из звука не получился                       |
| `Deepgram / API key`    | Нет текста из звука: ключ Deepgram → Настройки    |
| `Card output invalid`   | Карточка слишком расплывчатая                     |
| `gateway / 401 / fetch` | Нет ответа шлюза: адрес, модель, ключ → Настройки |
| _(fallback)_            | Цепочка оборвалась: настройки, ключи, сеть        |

## Diagnostic Runtime Event Contract

Runtime observability uses one stable event name in `app.log`:

- `diag_runtime_event`

Field contract inside detail:

- `stage`: `capture | stt | llm | card | retry`
- `outcome`: `start | ok | fail`
- `code`: stable `RL_*` diagnostic code
- `detail`: sanitized short explanation
- successful `llm` and `retry` details include `repair_used=true|false`, `fallback_used=true|false`, and `chars_band=short|medium|long`
- failed `RL_CARD_INVALID` details include `invalid_reason=...` and `chars_band=...` on the analyze path

This contract is exported into bundle file `diagnostics/runtime-events.json`.

## Adding New Error Types

1. Add variant to `CommandError` in `src-tauri/src/types.rs`
2. Add mapping in `settingsAnchorForCommandErrorKind()` in `src/app/model.ts`
3. Add user-facing pattern match in the relevant `userSafe*Error()` function
4. Update IPC handler count in `scripts/check-ipc-handler-contract.mjs`
5. Update this catalog
