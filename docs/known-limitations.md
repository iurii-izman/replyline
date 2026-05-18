# Replyline Known Limitations (Internal Stable Beta)

Короткий список ограничений для честной внутренней stable beta.

## Stage and platform

- Стадия: внутренняя русскоязычная stable beta.
- Фокус: Windows-first (Tauri + Rust + Solid).
- Публичный binary release не является целью текущего этапа.

## Product scope boundaries

- Это не meeting assistant, не transcript tool и не speaking coach.
- Нет transcript UI, history UI, team workflows, speaker detection, tone analysis или эмоциональной интерпретации.
- Нет скрытых cheating сценариев.
- Нет click-through скрытого overlay режима.

## Runtime certainty

- Cross-machine поведение ещё не полностью подтверждено.
- Cross-call-app поведение (Zoom / Teams / Meet / Telemost) ещё не полностью подтверждено.
- Любые широкие claims уровня "works everywhere" недопустимы.

## Storage and privacy boundaries

- Live путь не сохраняет capture-фрагменты по умолчанию.
- Но runtime/evidence команды могут писать диагностические отчёты в `reports/` при явном ручном запуске.
- Interview session reports хранятся локально и включают transcript content.
- "Nothing is ever stored anywhere" - неверно и не используется.
- "Everything is fully local" - неверно для cloud STT/LLM конфигураций.

## Performance and model boundaries

- Нельзя обещать стабильно низкую задержку для любых условий и любых провайдеров.
- Нельзя обещать "лучшую модель навсегда".
- Preset ladder это operational snapshot; цены/лимиты/доступность у провайдеров меняются.

## Language boundaries

- Product-facing UX в текущей stable beta ориентирован на русский язык.
- В коде есть технические hooks под будущую multilingual beta, но это не означает готовый multilingual UX сейчас.

## Memory boundary

- Memory backend существует отдельно от core live-card цикла.
- Memory layer не должен становиться hero story текущей MVP stable beta.

## Advanced Mode

Advanced Mode is an ops-only diagnostics track, not part of the normal stable-beta user flow. There is no Advanced Mode toggle in the current Settings UI. The stable-beta Settings surface is: hotkey, capture max seconds, model preset, Deepgram API key, LLM base URL, LLM model, optional LLM API key, and interview compact mode.
