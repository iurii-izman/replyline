# DEV Handoff — Минимум действий

Этот документ сокращён до реально оставшихся задач. Всё, что уже автоматизировано/сделано, отмечено ниже.

## Что уже сделано (пользователю НЕ нужно)

- Репозиторий создан и синхронизирован: `iurii-izman/replyline`
- CI настроен и проходит
- Dependabot и базовые dependency PR обработаны
- Секреты вынесены из реестра в SecretStore
- Добавлен загрузчик сессии: `scripts/dev-session.ps1`
- Добавлена удобная команда PowerShell: `rl-dev` (в профиле)

## Что делать пользователю сейчас (3 шага)

### 1) Открыть PowerShell и запустить dev-сессию

```powershell
rl-dev
```

Команда автоматически:
- перейдёт в `C:\Dev\replyline`
- загрузит ключи из `DevVault` по списку из `.env.keys`
- выставит `GH_TOKEN` из `GITHUB_CLASSIC_API_KEY` (если доступен)

### 2) Запустить приложение

```powershell
pnpm tauri dev
```

### 3) Проверить рабочий сценарий в UI

1. Открыть настройки
2. Нажать «Сохранить на этой машине» (если что-то менялось)
3. Удержать `Ctrl+Alt+Space` во время разговора
4. Убедиться, что появляется карточка `gist / say_now / next_move`

---

## Что ещё остаётся именно DEV (ручная разработка)

### P0 (обязательно)

1. Подключить runtime i18n-переключение в UI:
   - заменить прямой `ui` на `getUi(settings().primaryLanguage)` в компонентах
2. Подключить backend language switch:
   - в `tray_status.rs` и `lib.rs` выбрать `ui_strings::en`/`ru` по `settings.primary_language`
3. Прогнать `docs/internal-alpha-checklist.md` в реальных сценариях

### P1 (после P0)

1. Миграция на TypeScript 6 (ручные правки типов)
2. Миграция на Vite 8 (manual config migration)
3. Добавить `src-tauri/rustfmt.toml`

### P2 (по возможности)

1. E2E-тесты (Playwright/WebdriverIO)
2. Подготовка установщика + code signing
3. Усиление fixture gate до блокирующего

---

## Быстрые команды для DEV

```powershell
# Полный quality gate
pnpm smoke

# Отдельные ключевые проверки
pnpm test:ui:coverage
pnpm test:prompt-contract
pnpm test:ipc-contract
pnpm test:consistency
pnpm copy:check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

---

## Если `rl-dev` не работает

Запустить вручную:

```powershell
cd C:\Dev\replyline
. ~/.dev-secrets/Load-ProjectSecrets.ps1
Load-ProjectSecrets
pnpm tauri dev
```
