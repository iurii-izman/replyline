# Replyline Known Limitations (Pre-Alpha)

Короткий список ограничений для честной внутренней alpha.

## Stage and platform

- Стадия: внутренняя русскоязычная alpha.
- Фокус: Windows-first (Tauri + Rust + Solid).
- Публичный binary release не является целью текущего этапа.

## Runtime certainty

- Cross-machine поведение ещё не полностью подтверждено.
- Cross-call-app поведение (Zoom / Teams / Meet / Telemost) ещё не полностью подтверждено.
- Любые широкие claims уровня "works everywhere" недопустимы.

## Product scope boundaries

- Это не meeting assistant, не transcript tool и не speaking coach.
- Нет transcript UI, history UI, speaker detection, tone analysis или эмоциональной интерпретации.
- Нет полного фонового записи звонка как default path.
- Нельзя обещать стабильно низкую задержку для любых условий и любых провайдеров.

## Storage boundaries

- Live путь не сохраняет фрагменты по умолчанию.
- Но runtime/evidence команды могут писать диагностические отчёты в `reports/` при явном ручном запуске.
- "Nothing is ever stored anywhere" — неверно и не используется.

## Language boundaries

- Product-facing UX в текущей alpha ориентирован на русский язык.
- В коде есть технические hooks под будущую multilingual beta, но это не означает готовый multilingual UX сейчас.

## Memory boundary

- Memory backend существует отдельно от core live-card цикла.
- Memory layer не должен становиться hero story текущей MVP alpha.

## Advanced Mode: Local-First Operation

Replyline can run entirely on-device by replacing cloud providers with local alternatives. This path is hidden behind the **Advanced Mode** toggle in Settings.

| Role | Local Alternative                                                                                                                    | Setup                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| STT  | [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) via [faster-whisper-server](https://github.com/fedirz/faster-whisper-server) | Run the server, point Replyline's STT to `http://127.0.0.1:<port>`                                                        |
| LLM  | [Ollama](https://ollama.com) or [LM Studio](https://lmstudio.ai)                                                                     | Install, pull a model, set `llmBaseUrl` to `http://127.0.0.1:11434/v1` (Ollama) or `http://127.0.0.1:1234/v1` (LM Studio) |

**Steps:**

1. Enable **Advanced Mode** in settings.
2. Install and start a Deepgram-compatible local STT server (e.g. `faster-whisper-server --model large-v3 --port 8080`).
3. Install and start an OpenAI-compatible local LLM server (e.g. `ollama serve` then `ollama pull llama3`).
4. In Replyline settings, set `llmBaseUrl` to the local LLM endpoint.
5. API keys can be set to any non-empty value if the local server requires auth, or left as dummy tokens.

In this configuration, **no audio or text leaves the machine**. Latency depends on local hardware (GPU recommended for acceptable STT/LLM speed).

**Caveats:**

- Card quality depends heavily on the local LLM capability; smaller models may produce lower-quality analysis.
- Streaming STT (`useStreamingStt`) is not guaranteed to work with all Whisper.cpp wrappers.
- `check_provider_health` pings the configured endpoints regardless of whether they are local or cloud.
