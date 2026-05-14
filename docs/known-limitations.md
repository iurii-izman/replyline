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

## Advanced Mode

Advanced Mode is for controlled diagnostics only, not for regular beta user flow.

| Role | Local Alternative                                                                                                                    | Setup                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| STT  | [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) via [faster-whisper-server](https://github.com/fedirz/faster-whisper-server) | Run the server, point Replyline's STT to `http://127.0.0.1:<port>`                                                        |
| LLM  | [Ollama](https://ollama.com) or [LM Studio](https://lmstudio.ai)                                                                     | Install, pull a model, set `llmBaseUrl` to `http://127.0.0.1:11434/v1` (Ollama) or `http://127.0.0.1:1234/v1` (LM Studio) |

This mode can increase instability, latency, and card drift. Keep it off by default for stable beta usage.
