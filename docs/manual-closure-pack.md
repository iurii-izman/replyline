# Replyline Manual Closure Pack

`docs/manual-closure-pack.html` - интерактивный статический чеклист для финального beta-seal.

Перед отправкой tester instructions сначала выполните `pnpm beta:seal`.

## Что это

Manual Closure Pack нужен для финальной ручной валидации того, что не покрывается автопроверками: hotkey/runtime evidence, manual quality review, privacy audit и финальный Go/No-Go.

Это tooling/runbook артефакт для QA и release-handoff, а не часть runtime UI Replyline.

Tester-facing сквозной runbook находится в `docs/internal-beta-tester-kit.md`.

## Почему это не часть app runtime

- не меняет Tauri/Solid runtime и не внедряется в продуктовый UI;
- работает как локальный `file://` HTML;
- не делает network calls;
- не добавляет build/runtime dependencies.

## Как открыть

Откройте файл в браузере:

```powershell
start docs/manual-closure-pack.html
```

## Что хранится

Прогресс хранится локально в браузере через `localStorage` (`replyline-manual-closure-pack-v1`).

## Экспорт и импорт состояния

- `Экспорт JSON` скачивает текущее состояние чеклиста.
- `Импорт JSON` восстанавливает состояние из ранее экспортированного файла.

## Отчёт

- Кнопка `MD отчёт` генерирует Markdown-отчёт.
- Кнопка `Копировать MD` копирует отчёт в буфер.

## Что нельзя вставлять

Не вставлять:

- реальные API keys;
- raw transcript;
- raw Candidate Pack;
- реальные пароли;
- приватные данные пользователей.

## Разделы в чеклисте

- Live runtime + hotkey evidence / Доказательства live runtime и hotkey
- Audio robustness matrix / Матрица устойчивости аудио
- Human answer quality review / Ручной review качества ответов
- First-run onboarding / Проверка первого запуска
- Privacy, logs, exports, reports / Приватность, логи, экспорты, отчёты
- Installer / clean machine check / Проверка инсталлятора и чистой машины
- External Docker compose hardening / Усиление внешнего Docker compose
- SonarCloud final review / Финальный review SonarCloud
- Visual QA snapshot / Визуальный QA-снимок
- Release / handoff / Релиз и handoff
- Go / No-Go / Финальное решение

## P0/P1/P2 и Go/No-Go

- `P0`: блокирующие release критерии.
- `P1`: важные, но не hard-blocking критерии.
- `P2`: вспомогательные/manual UX критерии.

Правило решения:

- `NO-GO`: есть `Block` или блокирующий `P0 Block`.
- `PASS`: все `P0` имеют `Pass`.
- `WARN`: нет блокеров, но не все `P0` в `Pass`.

## Как сдать результат

1. Пройти `P0` checklist.
2. Нажать `MD отчёт`.
3. Сохранить отчёт в `reports/manual/`.
4. При необходимости приложить JSON state.

## Desktop E2E evidence rule

- Для PR/dev допустим optional lane: `pnpm test:e2e:desktop` (`SKIP` разрешён).
- Для internal beta seal `pnpm beta:seal` допускает `SKIP` в desktop E2E и помечает это как warning, а не block.
- Для RC/public beta closure обязателен non-skipped запуск:
  - `pnpm tauri build`
  - `set TAURI_APP_PATH=<path-to-built-app>`
  - `pnpm test:e2e:desktop:required`

## Release artifact truth rule

- `release-on-tag.yml` now builds and publishes Windows release artifacts.
- Unsigned artifacts are acceptable only for internal trusted beta when explicitly approved.
- RC/public beta requires signed installer evidence (valid Authenticode signature + release gates).
- `pnpm beta:seal` не требует signed binary для internal beta, но фиксирует это как warning в отчёте.

## Ссылка

- [Manual Closure Pack HTML](manual-closure-pack.html)
