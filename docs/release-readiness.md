# Release Readiness

Release gate for Slim Stable Beta.

## Must pass

- `pnpm verify:fast`
- `pnpm verify:full`
- `pnpm rust:deps`
- `pnpm audit:npm` (no high/critical)

## Product scope check

- only `capture -> stt -> llm -> card`
- Settings only: hotkey, capture max seconds, Deepgram key, LLM base URL/model/key(optional)
- no Advanced Mode / memory UI / diagnostic UI in user path
