# Product Scenario Benchmark

## Что проверяет

`test:product-scenarios` запускает автоматический product benchmark поверх synthetic fixtures без live providers и без GUI:

- реалистичные рабочие и интервью-сценарии;
- качество `say_now`/`next_move`;
- тон и краткость;
- наличие next action;
- отсутствие hallucinations;
- privacy и secret-leak защиту;
- golden concept snapshots для ключевых сценариев;
- negative regression cases, которые обязаны падать.

## Что не доказывает

- live поведение Deepgram/OpenAI/OpenRouter;
- UX при реальном hotkey/capture;
- перформанс на конкретном железе.

Benchmark — это deterministic regression gate, не замена live runtime QA.

## Где находятся данные

- Scenarios: `tests/fixtures/product-scenarios/*.json`
- Golden snapshots: `tests/fixtures/product-scenarios/golden/*.json`
- Negative cases: `tests/fixtures/product-scenarios/negative-cases.json`
- Thresholds: `tests/fixtures/product-scenarios/thresholds.json`

## Scoring dimensions

- Card shape: 15
- Say-now usefulness: 25
- Brevity: 10
- Tone: 15
- Next step: 15
- No hallucination: 10
- Privacy/no secret leak: 10

Total: 100.

Gate thresholds:

- `minOverallScore`
- `minCategoryScore`
- `minScenarioScore`
- `maxSayNowChars`

## Как добавить сценарий

1. Добавить JSON-сценарий в `tests/fixtures/product-scenarios/*.json`.
2. Заполнить `expected` (tone, concepts, next-step/clarify flags, caps).
3. При необходимости добавить `mockCard` (deterministic synthetic output).
4. Для ключевого кейса добавить snapshot в `golden/*.json` (shape + expected concepts).
5. Прогнать `pnpm test:product-scenarios`.

Правила:

- только synthetic данные;
- без PII;
- без реальных секретов/ключей;
- без подгонки rules под один текстовый шаблон.

## Как читать отчёт

Генерируется:

- `reports/product-quality/product-scenario-benchmark-YYYY-MM-DD.json`
- `reports/product-quality/product-scenario-benchmark-YYYY-MM-DD.md`

Секции отчёта:

- overall pass/fail и overall score;
- category и mode averages;
- weakest 5 scenarios;
- recurring failure reasons;
- privacy leak scan;
- рекомендация по следующему блоку исправлений.
