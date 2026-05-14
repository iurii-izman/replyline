# Replyline

Slim Stable Beta: minimal path only.

## Product flow

`capture -> stt -> llm -> card`

Canonical hotkey: `Ctrl+Alt+Space`.
Card schema: `gist / say_now / next_move`.
Replyline is not a meeting assistant, not a transcript tool, and not a speaking coach.

## UI scope

- Main: status, card (`gist/say_now/next_move`), actions: `copy say_now`, `retry card`, `clear context`.
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
