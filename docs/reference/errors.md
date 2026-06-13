# Error and Diagnostics Reference

This document is the canonical reference for structured errors, runtime diagnostic events, and local redaction boundaries in the Replyline application.

## 1. CommandError Kinds

All structured errors that flow through Replyline's IPC boundary, from the Rust backend to the Solid.js frontend, are categorized by kind:

| Kind         | Backend source                                            | User sees                | Settings anchor           |
| ------------ | --------------------------------------------------------- | ------------------------ | ------------------------- |
| `Settings`   | Config validation, file I/O, schema mismatch              | "Settings or file issue" | `#settings-anchor-llm`    |
| `Credential` | Missing/invalid API key in Windows Credential Manager     | "API key missing"        | `#settings-anchor-stt`    |
| `Capture`    | Audio device error, hotkey conflict, empty recording      | "Recording failed"       | `#settings-anchor-hotkey` |
| `Pipeline`   | STT/LLM provider error, network timeout, invalid response | "Pipeline error"         | `#settings-anchor-llm`    |
| `Internal`   | Lock poisoned, unexpected state, code bug                 | "Internal error"         | `#settings-anchor-hotkey` |

## 2. User-facing Routing

When a `CommandError` is received in the frontend:

1. `parseCommandInvokeError()` extracts `{kind, message}` from the JSON envelope.
2. `settingsAnchorForCommandErrorKind()` maps `kind` to a DOM anchor.
3. The main UI error bar shows a context-specific action button.
4. Clicking the button scrolls `SettingsSurface` to the relevant section.

## 3. Settings Validation Errors

Errors that occur during settings validation or loading (`mapSettingsSaveError`):

| Backend code            | User message                                  |
| ----------------------- | --------------------------------------------- |
| `HOTKEY_REQUIRED`       | Клавиша: задайте сочетание ниже               |
| `MODEL_REQUIRED`        | Модель ответа: заполните поле                 |
| `INVALID_URL`           | Адрес шлюза: http:// или https://, полный URL |
| `CAPTURE_RANGE_INVALID` | Лимит фрагмента: 5–180 секунд                 |
| `INVALID_LANGUAGE`      | Файл настроек повреждён (язык)                |
| `INVALID_SCHEMA`        | Версия settings.json не подходит              |
| `IO:`                   | Не записался файл настроек                    |
| `JSON`                  | Сбой записи настроек                          |

## 4. Pipeline Error Heuristics

User-safe messages mapped from underlying pipeline errors (`userSafePipelineError`):

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

## 5. Diagnostic Runtime Event Schema

Runtime observability uses one stable event name in `app.log`: `diag_runtime_event`

Every v2 typed event emits a compact key/value detail envelope via `app_log::append_event` with:
- `schema=1`, `level`, `source`, `phase`, `privacy_class`, `run_id` (when available)

Field contract inside the detail for `diag_runtime_event`:
- `stage`: `capture | stt | llm | card | retry`
- `outcome`: `start | ok | fail`
- `code`: stable `RL_*` diagnostic code (see section 6)
- `detail`: sanitized short explanation
- successful `llm` and `retry` details include `repair_used=true|false`, `fallback_used=true|false`, and `chars_band=short|medium|long`
- failed `RL_CARD_INVALID` details include `invalid_reason=...` and `chars_band=...` on the analyze path

This contract is exported into the bundle file `diagnostics/runtime-events.json`.

## 6. Stable RL_* Codes

Diagnostic codes used in `diag_runtime_event` (`code` field):
- `RL_STT_KEY_MISSING`: Deepgram key missing
- `RL_CARD_INVALID`: Output card validation failed
*(Note: additional codes mapped to specific stages/outcomes in Rust types).*

## 7. Redaction and Safety Guarantees

Observability defaults strictly to safe metadata:
- **Provider HTTP response bodies** are not surfaced in user-facing messages or default logs.
- **Pipeline logging** uses sanitized summaries (`safe_preview`, error class/code, bounded detail).
- **Secrets, credentials, API keys, and raw provider payloads** must never be emitted into UI strings or normal `app.log` events.
- **Trace Bundle Files**: Default mode (`debugTraceMode=redacted`) writes redacted snapshots only (e.g., `llm-request.redacted.json`, `audio-signal.redacted.json`). Hashes (`sha256_hex`) are used to track content equality across stages without revealing original text.
- Full-content traces (`debugTraceMode=full_local`) are strictly explicit local opt-in only.

## 8. Adding/Changing Errors Checklist

When introducing a new error type or diagnostic event:
- [ ] Add variant to `CommandError` in `src-tauri/src/types.rs`.
- [ ] Add mapping in `settingsAnchorForCommandErrorKind()` in `src/app/model.ts`.
- [ ] Add user-facing pattern match in the relevant `userSafe*Error()` function.
- [ ] Ensure IPC command categorization/registration checks stay green in `scripts/check-ipc-handler-contract.mjs`.
- [ ] Update this reference catalog if stable codes or heuristics change.

## 9. Related Links

For more details on operations, data flow, and runtime proofs, refer to:
- [Privacy, Trust, and Data Flow](../product/privacy.md)
- [Engineering Runtime Guide](../engineering/runtime.md)
- [Beta Operations Guide](../engineering/operations.md)
