# Replyline Tester Brief (Internal Stable Beta)

Короткий вход для тестера. Основной runbook: `docs/internal-beta-tester-kit.md`.

## Что это

Replyline в текущем цикле — `internal stable beta` для двух продуктовых линий:

- WorkConversation: `capture -> stt -> llm -> card`
- Interview Mode: interview session + local reports/exports

Это не public beta и не универсальная кросс-платформенная гарантия.

## Что сделать тестеру

1. Пройти setup и сценарии из `docs/internal-beta-tester-kit.md`.
2. Раздельно прогнать WorkConversation и Interview Mode.
3. Отдельно проверить Candidate Pack boundary (Interview-only).
4. Заполнить `docs/test-feedback-template.md`.
5. При stop condition сразу остановиться и отправить blocker report.

## Ключевые ограничения, которые нельзя пропускать

- STT path: только Deepgram (audio leaves machine).
- Local LLM не означает fully local-only operation.
- Local STT не поддерживается в текущем stable beta.
- Full interview markdown export содержит transcript и считается sensitive.
- Для внешнего шаринга prefer redacted export.

## Перед стартом

- Прочитать `docs/privacy-and-trust.md`.
- Прочитать `docs/known-limitations.md`.
- Проверить `docs/third-party-providers.md`.
