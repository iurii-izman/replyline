# Replyline Third-Party Providers (Internal Stable Beta)

Replyline не является полностью on-device системой при включённых провайдерах.

## Current provider roles

- **STT provider (Deepgram path):** получает released audio snippet для распознавания речи.
- **LLM provider (OpenAI-compatible route):** получает transcript/context для генерации `gist / say_now / next_move`.
- **Candidate Pack prepare path (LLM provider):** может получать релевантные части raw resume/JD/company text при явном действии `prepare_candidate_pack`.

## OpenRouter preset notes

- Free models can have stricter limits and variable availability.
- Paid profiles require active credits/billing.
- Fallback routing (`models` ladder) is enabled only for known OpenRouter presets.
- Preset recommendations can change; do not treat one model as permanently best.
- Validate answer quality regularly on your golden dataset before changing defaults.

## What Replyline controls

- Когда начинается захват (только при удержании hotkey).
- Когда захват останавливается (при отпускании).
- Локальное хранение настроек и секретов.
- Базовый формат выходной карточки.
- Границу mode usage: Candidate Pack context применяется в Interview Mode (active session), не в WorkConversation по умолчанию.

## What Replyline does not control

- Retention/logging политика внешнего STT/LLM провайдера.
- Доступность, latency и SLA внешнего провайдера.
- Ограничения API, квоты и региональные правила провайдера.

## Provider Data Retention (Known Policies)

| Provider                          | Data Sent                         | Retention Policy (as of 2026)                                                                                                                                      |
| --------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Deepgram                          | Audio snippet (WAV or PCM stream) | Not used for training by default. API data retained for 30 days for debugging, then deleted. See [Deepgram Privacy](https://deepgram.com/privacy).                 |
| OpenAI (via OpenRouter or direct) | Transcript text + context         | API data not used for training when accessed via API. 30-day retention for abuse monitoring. See [OpenAI API Data Usage](https://platform.openai.com/docs/models). |
| Other OpenAI-compatible providers | Transcript text + context         | Varies by provider. Check your provider's data handling policy.                                                                                                    |

**Important:** These policies may change. Always verify current terms before production use.

## Local LLM via `llmBaseUrl` (ops path)

Replyline's LLM path can be pointed to a local server via `llmBaseUrl`. This is an operator setup path and requires specific local hardware setup:

1. **Local LLM:** Use [Ollama](https://ollama.com), [LM Studio](https://lmstudio.ai), or any OpenAI-compatible local server.
2. **Settings:** Set `llmBaseUrl` to `http://127.0.0.1:<port>/v1` (e.g. `http://127.0.0.1:11434/v1` for Ollama, `http://127.0.0.1:1234/v1` for LM Studio).

> **Note:** Local STT (e.g. Whisper.cpp / faster-whisper-server) is not available in the current stable beta. The only shipped STT path is Deepgram. There is no STT endpoint setting in the current AppSettings. Local STT is a future consideration.

With a local LLM and Deepgram STT, audio still leaves the machine via the Deepgram API. Full local-only operation (no audio leaving the machine) is not currently supported.

## Operator checklist before runtime tests

- Проверьте актуальность ключей и тарифных ограничений провайдеров.
- Проверьте policy провайдеров на тему retention/logging.
- Не заявляйте "всё остаётся на устройстве", если включены внешние провайдеры.

См. также:

- `docs/privacy-and-trust.md`
- `docs/known-limitations.md`
