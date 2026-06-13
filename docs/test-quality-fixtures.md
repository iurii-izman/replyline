# Test Quality Fixtures

Этот документ разделяет deterministic fixture lanes по роли, чтобы `prompt-contract`, `say-now`, `runtime-answer-quality` и `product-scenarios` не дрейфовали в одну и ту же проверку.

## Fixture map

| Corpus / lane | Files | Main role | Не должен доказывать |
| --- | --- | --- | --- |
| Prompt contract corpus | `fixtures/ru-work-snippets.json`, `scripts/check-prompt-contract.mjs`, `scripts/check-fixtures.mjs` | Shape/contract для prompt и deterministic card mapping | Product usefulness, benchmark score, runtime latency |
| Say-now scenarios | `fixtures/say-now-scenarios.json`, `scripts/check-say-now-scenarios.mjs` | Узкий heuristic lane для speakable/actionable `say_now` phrasing | Общий product benchmark или prompt schema drift |
| Runtime answer quality | `tests/fixtures/runtime-quality/runtime-answer-fixtures.json`, `tests/fixtures/runtime-quality/quality-thresholds.json`, `scripts/evaluate-runtime-answer-quality.mjs` | Runtime answer quality fixtures и aggregate score без live providers | Product-market usefulness across categories, GUI/live runtime proof |
| Product scenarios | `tests/fixtures/product-scenarios/*.json`, `tests/fixtures/product-scenarios/golden/*.json`, `tests/fixtures/product-scenarios/thresholds.json`, `scripts/evaluate-product-scenarios.mjs` | Product-level benchmark по сценарным категориям | Prompt schema contract или live provider behavior |
| Negative regression | `tests/fixtures/product-scenarios/negative-cases.json`, inline negative cases в `scripts/check-prompt-contract.mjs` | Явные bad outputs, которые обязаны падать | Positive usefulness baseline |

## Responsibility split

- Shape/contract:
  - `check-prompt-contract` проверяет schema, field names, deterministic mapping `CardSchemaV3 -> legacy`, prompt guardrails в source и negative shape/drift cases.
  - `check-fixtures` проверяет только corpus hygiene `ru-work-snippets`: минимальный размер, уникальность, длину, базовую реалистичность.
- Qualitative heuristic:
  - `check-say-now-scenarios` проверяет узкие эвристики для `say_now`/`next_move`: anchoring, owner, artifact, clarify/boundary language, anti-vague phrasing.
  - Это deliberately narrow lane. Он не должен становиться вторым `product-scenarios`.
- Product benchmark:
  - `evaluate-runtime-answer-quality` оценивает fixture-based runtime output quality и safety guards на synthetic runtime answers.
  - `evaluate-product-scenarios` оценивает product benchmark по категориям, golden concepts и privacy/hallucination dimensions.
- Negative regression:
  - prompt-contract negative cases ловят schema drift и banned wording.
  - product negative cases ловят privacy leak, markdown dump, no-next-step, hallucination и oversize regressions.

## Current overlap and resolution

- Exact duplicates removed:
  - shared `SECRET_PATTERNS`
  - shared raw prompt leak regex
  - shared apology spam regex
  - shared markdown table / markdown dump patterns
  - shared min corpus size helper
- Semantic overlap left intentionally:
  - `say-now` и `product-scenarios` оба проверяют actionable language, но на разном уровне.
  - `product-scenarios` concept map остаётся отдельным benchmark vocabulary; exact duplicate concept map в других lanes сейчас нет.

## Lane boundaries

- `pnpm test:prompt-contract`
  - schema/contract lane; не оценивает product usefulness.
- `pnpm test:fixtures`
  - corpus hygiene lane; не дублирует scoring.
- `pnpm test:say-now-scenarios`
  - узкий heuristic lane; входит в `pnpm test:runtime-quality`.
- `pnpm test:runtime-answer-quality`
  - runtime answer quality gate на synthetic runtime fixtures.
- `pnpm test:product-scenarios`
  - product-level benchmark gate.

## Profile policy

- `verify:full` и `verify:release-local` больше не вызывают `report:runtime-quality:strict`, потому что этот report lane повторно гонял `evaluate-runtime-answer-quality` и `check-say-now-scenarios` после `test:runtime-quality`.
- Summary/runtime report остаётся доступным отдельно, когда нужен артефакт, но не должен повторно увеличивать blocking profile time без новой проверки.
