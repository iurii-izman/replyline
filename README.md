# Replyline

Slim Stable Beta: minimal path only.

## Product flow

`capture -> stt -> llm -> card`

Canonical hotkey: `Ctrl+Alt+Space`.
Card schema: `gist / say_now / next_move`.
If the LLM returns a vague `next_move`, Rust repairs it with bounded context heuristics before rendering.
Replyline is not a meeting assistant, not a transcript tool, and not a speaking coach.

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
