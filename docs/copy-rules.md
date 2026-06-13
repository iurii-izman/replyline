# Replyline Copy Rules

Replyline должен звучать как спокойный рабочий инструмент: конкретно, честно, без магии.

## Current public-beta truth

- текущая стадия: публичный beta posture (Windows-first, Russian-first)
- два bounded пути: WorkConversation (`gist / say_now / next_move`) и Interview Mode (`InterviewCardSchemaV1`)
- multilingual expansion может готовиться архитектурно, но не продаётся как готовая сейчас

## Разрешённые формулировки

- windows-first tray app
- короткий фрагмент, а не запись всего звонка
- одна компактная карточка ответа для WorkConversation path
- Interview path с явным session/report flow
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
- Не формулировать Candidate Pack как глобальную память для всех режимов: по умолчанию это Interview Mode context.
- Для runtime/performance claims использовать метки из `docs/benchmark-policy.md`: `target`, `measured`, `pending verification`.
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

- [verification-lanes.md](verification-lanes.md) - 4 lane модель (compile / mock / prompt / runtime).
- [runtime-evidence.md](runtime-evidence.md) - где живут артефакты, минимальное качество.
- [`product/privacy.md`](product/privacy.md)
- [`product/limitations.md`](product/limitations.md)
- [benchmark-policy.md](benchmark-policy.md) - лейблы `target / measured / pending verification`.
- [runtime-bringup.md](runtime-bringup.md) - как поднять runtime path первый раз.
