# Replyline

Slim Stable Beta: minimal path only.

## Product flow

`capture -> stt -> llm -> card`

Canonical hotkey: `Ctrl+Alt+Space`.
Card schema: `gist / say_now / next_move`.
If the LLM returns a vague `next_move`, Rust repairs it with bounded context heuristics before rendering.
Replyline is not a meeting assistant, not a transcript tool, and not a speaking coach.

## Privacy v1 (redaction baseline)

- API keys хранятся через OS keyring (Windows Credential Manager), никогда не попадают в логи.
- `app_log::sanitize` применяет многоуровневую редакцию: секреты, email, длинные числовые ID, URL query strings, ограничение 400 символов.
- `privacy::redact_secrets` — defence-in-depth слой для всех путей, где могут появиться токены/ключи.
- `privacy::redact_transcript_like` / `safe_preview` — предотвращают логирование полного transcript или LLM prompt (только chars_band + безопасный preview).
- Response body от Deepgram/LLM **намеренно отбрасывается** при HTTP ошибках, чтобы не логировать чувствительные payloads.
- CSP `connect-src` включает `https://*` — необходимо для поддержки user-configured LLM base URL (любой провайдер). `wss://*.deepgram.com` разрешён для STT. Локальные `http://127.0.0.1:*` сохранены для Ollama/LM Studio.
- См. `docs/privacy-and-trust.md` для полной privacy-модели.

## UI scope

- Main: fixed status top, scrollable card body (`gist/say_now/next_move`), fixed action row: `Скопировать ответ`, `Пересобрать`, `Очистить`.
- Settings: hotkey, capture max seconds, Deepgram API key, LLM base URL, LLM model, optional LLM API key, Save, Back.
- No Advanced Mode. No memory/diagnostics user surface.

## Run

```bash
pnpm install --frozen-lockfile
pnpm smoke
pnpm verify
pnpm rust:deps
pnpm audit:npm
```
