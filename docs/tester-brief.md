# Replyline Tester Brief (Internal / Trusted Early)

Короткий бриф для тестера. Без маркетинга, только рабочие ожидания.

## Что это за продукт

Replyline — Windows-first tray app для сложных рабочих разговоров:

- hotkey -> короткий system-audio snippet -> карточка `gist / say_now / next_move`
- текущая стадия: внутренняя русскоязычная stable beta

Это не transcript tool, не meeting assistant и не speaking coach.

## Что тестируем в первую очередь

1. Надёжность core flow:
   - hotkey срабатывает;
   - захват старт/стоп предсказуем;
   - карточка появляется.
2. Практическая полезность:
   - `say_now` можно произнести в реальном рабочем диалоге;
   - ответ появляется вовремя, пока момент не прошёл.
3. Trust-понятность:
   - ясно, когда идёт захват;
   - ясно, что отправляется внешним провайдерам;
   - нет misleading ощущений "скрытого режима".

## Что НЕ тестируем как цель stable beta

- transcript/history/team workflows
- speaking-coach сценарии
- memory layer как core surface
- broad claims "works everywhere"

## Минимальный сценарий прогона

1. Прочитать `docs/privacy-and-trust.md` и `docs/known-limitations.md`.
2. Запустить 2-3 реальных стресс-сценария звонка.
3. Для каждого сценария дать оценку usefulness:
   - помогло ответить быстрее?
   - `say_now` было уместно и произносимо?
4. Отправить фидбек по шаблону: `docs/test-feedback-template.md`.
5. Для trusted beta triage пометить frequency/severity/reproducibility/action по `docs/beta-feedback-loop.md`.

## Что обязательно сообщать как отдельные классы проблем

- audio routing issues
- hotkey issues
- latency issues
- bad `say_now`
- trust/legal concerns

## Формат репорта

- Для багов: GitHub bug report template.
- Для запросов/идей: GitHub feature request template (с проверкой на stable-beta-scope fit).
