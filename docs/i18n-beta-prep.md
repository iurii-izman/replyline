# Replyline i18n Beta Prep (Without Breaking Alpha Scope)

Этот документ фиксирует минимальную подготовку к будущей multilingual beta.
Текущая alpha остаётся Russian-first.

## Current state

- Frontend user-facing строки централизованы в `src/app/locale.ts` и используются в surface/components/controller.
- Бэкенд использует `src-tauri/src/ui_strings.rs` для tray/status/error строк.
- В settings уже есть technical hook `primaryLanguage` (`ru`/`en`) и language-aware prompt selection в backend.
- В продукте нет language selector и нет полноценного i18n runtime (alpha остаётся Russian-first).

## Почему alpha остаётся Russian-first

- Это честное состояние продукта на текущем этапе.
- Частично рабочий multilingual UX создаст misleading ожидания.
- Приоритет сейчас: reliability, trust и usefulness в live-моменте.

## Translation surface inventory (current)

### Frontend

`src/app/locale.ts` содержит основные группы строк:

- phase/status labels (`Подготовка…`, `Карточка готова`, и т.д.)
- header/tooltips (`Настройки`, `Скрыть`)
- settings labels/hints/placeholders
- empty-state copy
- card section labels (`Суть`, `Скажи сейчас`, `Дальше`)
- action buttons (`Копировать`, `Повторить`, `Сбросить контекст`)
- notices/errors-facing hints (`Контекст очищен.`, `Ответ скопирован.`)
- trust/footer copy

Дополнительно:

- `index.html`: noscript строка на русском.
- отдельные fallback/diagnostic строки могут жить вне runtime UI flow и не должны расходиться с copy-rules.

### Not in frontend scope yet

- Rust-side error messages и системные строки (отдельный слой, не часть текущего UI i18n prep).

## Recommended architecture for beta (minimal and safe)

1. Ввести `uiStrings` слой в frontend (plain TypeScript object, без библиотеки на старте):
   - `uiStrings.ru` (полный, текущий source of truth)
   - `uiStrings.en` (добавлять только когда покрытие станет полным)
2. Использовать один `locale` источник в UI (пока без selector, только controlled value):
   - default: `ru`
   - for beta: controlled switch only when both locales are production-complete
3. Разделить строки по доменам:
   - `status`, `settings`, `card`, `actions`, `trust`, `errors`
4. Добавить lightweight completeness check:
   - ключи `en` должны совпадать с `ru` по структуре.
5. Оставить Rust prompt policy отдельной задачей:
   - language-aware prompt switch только в beta phase.

## Migration steps (smallest-first)

1. Keep `src/app/locale.ts` as the single frontend source of truth for user-facing strings.
2. Add shape check script for dictionary key parity (`ru` vs future `en`).
3. Keep Rust backend strings grouped in `src-tauri/src/ui_strings.rs` and prepare structured locale modules there.
4. Add `en` dictionary only after full content pass and QA.
5. Add beta-only locale switch surface (not in alpha).

## Guardrails

- Не добавлять partial English mode в alpha.
- Не добавлять language selector до полного покрытия и QA.
- Не менять текущий UX ради абстракции.
- Любые public claims о multilingual readiness держать как `pending verification` до реального beta rollout.

## Decision for current stage

- Что делаем сейчас: только документация и архитектурный план.
- Что сознательно не делаем сейчас: i18n-библиотека, selector, partial English UX.
