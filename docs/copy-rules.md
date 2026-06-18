# Replyline Copy Rules

Replyline должен звучать как спокойный рабочий инструмент: конкретно, честно, без магии.

## Current public-beta truth

- текущая стадия: публичный beta posture (Windows-first, Russian-first)
- центральный bounded путь: WorkConversation (`gist / say_now / next_move`). Interview Mode — пример context usage с `InterviewCardSchemaV1`.
- ContextPack — текущий shipped universal context primitive (см. [ADR 0001](adr/0001-context-pack-simplification.md)).
- multilingual expansion может готовиться архитектурно, но не продаётся как готовая сейчас

## Разрешённые формулировки

- windows-first tray app
- короткий фрагмент, а не запись всего звонка
- одна компактная карточка ответа для WorkConversation path
- Interview Mode как пример context usage с явным session/report flow
- видимое состояние захвата
- внешние STT / LLM провайдеры, которые настраивает пользователь
- обработка в RAM и отсутствие хранения capture по умолчанию

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
- надёжно "понимает эмоции" или "оценивает тон"
- заменяет терапию, психологическую помощь или коучинг
- всегда обрабатывает всё только локально, если включены cloud-провайдеры
- ничего нигде не хранит (report/evidence artifacts существуют)
- уже готов как полноценный multilingual UX

## Trust/copy discipline

- Описывать только то, что подтверждено текущими артефактами.
- Для Interview Mode явно указывать allowed-use ответственность пользователя и видимый (non-stealth) UX.
- Не формулировать ContextPack как глобальную память или profile/persona system: это user-controlled bounded context, который попадает в prompts только когда активен.
- Для runtime/performance claims использовать метки из `docs/engineering/runtime.md`: `target`, `measured`, `pending verification`.
- Если для runtime-пути нет свежего локального evidence, ставить `pending verification`.
- Не поднимать claim с `target` до `measured` только по результату `pnpm smoke`.
- Не использовать фразы вроде "private by design" без конкретного объяснения data flow.
- Не использовать фразы вроде "nothing is ever stored anywhere".
- Не использовать "best model" / "guaranteed accuracy" / "always low latency" формулировки.

## Runtime claim language

- Хорошо: "Measured on this workstation with local runtime evidence."
- Хорошо: "Supported path, pending verification for fast-path promise."
- Избегать: "Production-ready everywhere", "always low latency", "works in every call app."

## See also

- [engineering/testing.md](engineering/testing.md) - verify lanes и их границы.
- [engineering/runtime.md](engineering/runtime.md) - где живут runtime claims, evidence и proof boundaries.
- [`product/privacy.md`](product/privacy.md)
- [`product/limitations.md`](product/limitations.md)
- [benchmark-policy.md](archive/handoff/benchmark-policy.md) - historical shorthand for the same claim labels.
