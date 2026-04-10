# Replyline Copy Rules

Replyline должен звучать как спокойный рабочий инструмент: конкретно, честно, без магии.

## Current alpha truth

- текущая стадия: внутренняя русскоязычная alpha
- core flow: hotkey -> короткий system-audio snippet -> `gist / say_now / next_move`
- multilingual beta может готовиться архитектурно, но не продаётся как готовая сейчас

## Разрешённые формулировки

- windows-first tray app
- короткий фрагмент, а не запись всего звонка
- одна компактная карточка ответа
- видимое состояние захвата
- внешние STT / LLM провайдеры, которые настраивает пользователь
- обработка в RAM и отсутствие хранения по умолчанию

## Запрещённые формулировки

- stealth
- invisible overlay
- anti-proctoring
- undetectable
- therapy app
- diagnose anxiety
- emotion scoring
- reads emotions
- answers for you automatically

## Product copy rule

Не допускать формулировок, будто Replyline:

- работает как скрытый или незаметный софт
- надёжно «понимает эмоции» или «оценивает тон»
- заменяет терапию, психологическую помощь или коучинг
- всегда обрабатывает всё только локально, если включены cloud-провайдеры
- уже готов как полноценный multilingual UX

## Trust/copy discipline

- Описывать только то, что подтверждено текущими артефактами.
- Для runtime/performance claims использовать метки из `docs/benchmark-policy.md`: `target`, `measured`, `pending verification`.
- Если для runtime-пути нет свежего локального evidence, ставить `pending verification`.
- Не поднимать claim с `target` до `measured` только по результату `pnpm smoke`.
- Не использовать фразы вроде "private by design" без конкретного объяснения data flow.
- Не использовать фразы вроде "nothing is ever stored anywhere".

## Runtime claim language

- Хорошо: "Measured on this workstation with local runtime evidence."
- Хорошо: "Supported path, pending verification for fast-path promise."
- Избегать: "Production-ready everywhere", "always low latency", "works in every call app."

## See also

- [verification-lanes.md](verification-lanes.md) — 4 lane модель (compile / mock / prompt / runtime).
- [runtime-evidence.md](runtime-evidence.md) — где живут артефакты, минимальное качество.
- [`privacy-and-trust.md`](privacy-and-trust.md)
- [`known-limitations.md`](known-limitations.md)
- [`third-party-providers.md`](third-party-providers.md)

- [benchmark-policy.md](benchmark-policy.md) — лейблы `target / measured / pending verification`.
- [runtime-bringup.md](runtime-bringup.md) — как поднять runtime path первый раз.