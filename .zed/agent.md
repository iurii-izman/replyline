# Zed Agent Panel — Replyline Adapter

Zed + Agent Panel + DeepSeek V4 Pro (API).

## Canonical Policy Sources

- `AGENTS.md`
- `CONTRIBUTING.md`
- `docs/ai-tooling-policy-matrix.md`
- `docs/copy-rules.md`
- `scripts/check-consistency.mjs`
- `scripts/check-prompt-contract.mjs`

## Model Profile: DeepSeek V4 Pro

DeepSeek V4 Pro — основная модель в Zed Agent Panel.

### Сильные стороны

- Маленькие правки (1–3 файла, <50 строк diff)
- Документация и Markdown
- Простые unit-тесты
- UI-твики (текст, стили, порядок элементов)
- Исправление конкретных воспроизводимых багов

### Ограничения

- Теряет контекст на больших diff'ах (>3 файлов)
- Может ошибаться в сложной Rust-логике (unsafe, lifetimes, async channels)
- Не всегда корректно связывает IPC-контракты (Tauri commands ↔ TypeScript)
- Может предлагать React-паттерны вместо Solid.js

### Когда остановиться и запросить ручное вмешательство

- Задача затрагивает >3 файлов или >30% модуля
- Требуется изменение архитектурных границ (model/platform/controller)
- Падает `pnpm smoke` и причина не очевидна за 2 попытки
- Требуется написание unsafe Rust, сложных lifetime-аннотаций, или асинхронных каналов
- Изменение IPC-контрактов между Rust и TypeScript

## Архитектурные границы (нерушимы)

| Файл | Ответственность | Нельзя |
|---|---|---|
| `src/app/model.ts` | Состояние и типы | Размазывать типы по компонентам |
| `src/app/platform.ts` | Platform bridge | Смешивать с UI-логикой |
| `src/app/controller.ts` | Оркестрация | Заносить логику контроллера в компоненты |
| `src-tauri/src/` | Rust backend | Ломать контракты Tauri-команд |

- UI reactivity — **только Solid.js** (`createSignal`, `createEffect`, `createMemo`, `<For>`, `<Show>`, `<Switch>`).
- Никакого импорта из `react` или `react-dom`.

## Команды проверки (Windows, слабый ноутбук)

| Команда | Когда | Тяжесть |
|---|---|---|
| `pnpm typecheck` | После любого .ts/.tsx изменения | Лёгкая |
| `pnpm lint` | После любого .ts/.tsx изменения | Лёгкая |
| `pnpm test:ui` | После изменений логики/компонентов | Средняя |
| `pnpm test:quick` | Быстрый гейт перед коммитом | Средняя |
| `pnpm smoke` | Перед завершением существенных изменений | Тяжёлая |
| `pnpm audit:npm` | Если менялся `package.json` / `pnpm-lock.yaml` | Тяжёлая |
| `pnpm rust:deps` | Если менялся `src-tauri/Cargo.toml` / `Cargo.lock` | Тяжёлая |

**Правило:** перед коммитом — `pnpm test:quick`. Перед PR/merge — `pnpm smoke`.

## Product Copy Constraints (из docs/copy-rules.md)

### Запрещённые формулировки

- stealth, invisible overlay, anti-proctoring, undetectable
- therapy app, diagnose anxiety, emotion scoring, reads emotions
- answers for you automatically
- nothing is ever stored anywhere
- works everywhere, always low latency, production-ready everywhere

### Разрешённые формулировки

- windows-first tray app
- короткий фрагмент, а не запись всего звонка
- одна компактная карточка ответа
- внешние STT / LLM провайдеры
- обработка в RAM и отсутствие хранения по умолчанию

### Runtime claims

- Только с метками: `target`, `measured`, `pending verification`
- Не поднимать claim с `target` до `measured` только по `pnpm smoke`
- Без свежего локального evidence → `pending verification`

## Workflow: READ → PLAN → DIFF → CHECK → REPORT

1. **READ** — прочитай нужные файлы, не читай лишнего.
2. **PLAN** — минимальный план на 3–5 пунктов; укажи затрагиваемые файлы.
3. **DIFF** — минимальный diff, без unrelated changes.
4. **CHECK** — запусти релевантную проверку (см. таблицу выше).
5. **REPORT** — «Изменил X в [file]. Проверил Y — passed.»

## Чек-лист перед завершением задачи

- [ ] Diff минимален и не затрагивает нерелевантные файлы
- [ ] Архитектурные границы соблюдены
- [ ] Solid.js-паттерны использованы (не React)
- [ ] Продуктовые формулировки соответствуют `docs/copy-rules.md`
- [ ] `pnpm test:quick` (или `pnpm smoke`) запущен и пройден
- [ ] Если менялись зависимости — запущены `pnpm audit:npm` и/или `pnpm rust:deps`
- [ ] Нет утверждений о прохождении проверок без реального исполнения

## Error Recovery — частые сбои и автопочинка

Если `pnpm test:quick` или `pnpm smoke` упали, не гадай — проверь по порядку:

| Симптом | Вероятная причина | Действие |
|---|---|---|
| `tsc` / typecheck fails | Несовпадение типов после правки | Проверь сигнатуры в `model.ts`, обнови usage sites |
| `eslint` fails | Код не по формату | `pnpm lint:fix` |
| Vitest fails — `st().setup.body` is undefined | Удалил используемый locale-ключ | Проверь grep по `st().` в `.tsx` файлах перед удалением ключа |
| Vitest fails — render mismatch | Solid.js паттерн нарушен | Проверь: `createSignal` а не `useState`, `<For>` а не `.map()`, `<Show>` а не `&&` |
| `cargo check` fails | Rust-типы не совпадают с `types.rs` | Проверь `src-tauri/src/types.rs` и usage sites |
| `cargo clippy` fails | Clippy warning | Прочитай warning, исправь как предлагает clippy |
| `cargo test` fails | Сломан контракт Tauri-команды | Проверь `commands.rs`, `lib.rs` — совпадают ли сигнатуры |
| `pnpm smoke` fails на consistency | Copy rules нарушены | Проверь `docs/copy-rules.md` — не использовал ли запрещённые формулировки |

**Правило 2 попыток:** если одна и та же ошибка повторилась после 2 попыток исправления — остановись и запроси ручное вмешательство, не продолжай гадать.
