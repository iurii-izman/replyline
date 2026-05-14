# Replyline Third-Party Providers (Pre-Alpha)

Replyline не является полностью on-device системой при включённых провайдерах.

## Current provider roles

- **STT provider (Deepgram path):** получает released audio snippet для распознавания речи.
- **LLM provider (OpenAI-compatible route):** получает transcript/context для генерации `gist / say_now / next_move`.
- **External tool (NotebookLM launch path):** открывается отдельно в системном браузере и не участвует в runtime-пайплайне Replyline.

## What Replyline controls

- Когда начинается захват (только при удержании hotkey).
- Когда захват останавливается (при отпускании).
- Локальное хранение настроек и секретов.
- Базовый формат выходной карточки.
- Быстрый запуск внешнего URL NotebookLM, если пользователь включил его в настройках.

## What Replyline does not control

- Retention/logging политика внешнего STT/LLM провайдера.
- Доступность, latency и SLA внешнего провайдера.
- Ограничения API, квоты и региональные правила провайдера.
- Поведение, хранение данных и права доступа внутри NotebookLM / Google-аккаунта пользователя.

## Provider Data Retention (Known Policies)

| Provider                          | Data Sent                         | Retention Policy (as of 2026)                                                                                                                                      |
| --------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Deepgram                          | Audio snippet (WAV or PCM stream) | Not used for training by default. API data retained for 30 days for debugging, then deleted. See [Deepgram Privacy](https://deepgram.com/privacy).                 |
| OpenAI (via OpenRouter or direct) | Transcript text + context         | API data not used for training when accessed via API. 30-day retention for abuse monitoring. See [OpenAI API Data Usage](https://platform.openai.com/docs/models). |
| Other OpenAI-compatible providers | Transcript text + context         | Varies by provider. Check your provider's data handling policy.                                                                                                    |
| NotebookLM (Google)               | No data from Replyline            | Replyline only opens a URL in the system browser. All interaction happens within Google's ecosystem.                                                               |

**Important:** These policies may change. Always verify current terms before production use.

## Advanced Mode: Local-Only Operation

Replyline can operate without cloud providers by configuring local alternatives. This path is intended for advanced users and requires specific local hardware setup:

1. **Local STT:** Use [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) with a Deepgram-compatible HTTP wrapper (e.g., [faster-whisper-server](https://github.com/fedirz/faster-whisper-server)).
2. **Local LLM:** Use [Ollama](https://ollama.com), [LM Studio](https://lmstudio.ai), or any OpenAI-compatible local server.
3. **Settings:** Enable **Advanced Mode** in settings, then set `llmBaseUrl` to `http://127.0.0.1:<port>/v1` and the STT endpoint accordingly.

In local-only mode, no audio or text leaves the machine. API keys may still be required for local server auth (or use dummy tokens).

## Operator checklist before runtime tests

- Проверьте актуальность ключей и тарифных ограничений провайдеров.
- Проверьте policy провайдеров на тему retention/logging.
- Не заявляйте "всё остаётся на устройстве", если включены внешние провайдеры.

См. также:

- `docs/privacy-and-trust.md`
- `docs/known-limitations.md`
