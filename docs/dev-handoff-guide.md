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

1. ~~Runtime i18n~~ — UI через `controller().strings()` / `getUi(settings.primaryLanguage)`; тексты idle/хрома без жёсткого RU в разметке.
2. ~~Язык в Rust~~ — меню трея и тултипы с `pick_lang` + `primary_language`; после «Сохранить» вызывается `refresh_tray_menu`.
3. **Прогнать `docs/internal-alpha-checklist.md`** — вручную на машине; автоматический префлайт цепочки:

```powershell
pnpm alpha:preflight
```

(эквивалент раздела 2 чеклиста: `smoke` + `runtime:preflight` + `probe:runtime` + `evidence:bundle`).

### P1 (после P0)

1. ~~TypeScript 6~~ / ~~Vite 8~~ — в `package.json`; после обновлений гонять `pnpm smoke`.
2. ~~`src-tauri/rustfmt.toml`~~ — добавлен (edition 2021, `max_width = 100`).

### P2 (по возможности)

1. E2E-тесты (Playwright/WebdriverIO)
2. Подготовка установщика + code signing
3. Усиление fixture gate до блокирующего

---

## Быстрые команды для DEV

```powershell
# Полный quality gate
pnpm smoke

# Webhook code review (нужны n8n + LiteLLM на localhost)
pnpm code-review:webhook

# Отдельные ключевые проверки
pnpm test:ui:coverage
pnpm test:prompt-contract
pnpm test:ipc-contract
pnpm test:consistency
pnpm copy:check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

---

## AI stack ops (автопилот)

Replyline использует только тонкий мост к внешнему стеку.

- Внешний проект AI stack (source of truth): `C:\Dev\ai-vibe-engineering`
- Snapshot webhook workflow в этом репо: `docs/ai-stack/n8n_workflow_llm_review_webhook.json`
- Локальная проверка моста из Replyline: `pnpm code-review:webhook`

Операционные детали стека (n8n/LiteLLM/Langfuse/Ollama), runbooks и архитектура поддерживаются в отдельном проекте AI stack.

---

## Следующие логичные шаги (компактно, без раздувания)

1. **Internal alpha по чеклисту** — сценарии полезности (раздел 3 `internal-alpha-checklist.md`); префлайт уже в `pnpm alpha:preflight`.
2. **Держать JSON workflow синхронно** — правки в n8n → обновить `docs/ai-stack/...` и при необходимости `~/ai-stack/n8n_workflow_llm_review_webhook.json` + `PUT` в API.
3. **PR-гигиена** — при желании вызывать `pnpm code-review:webhook` или `git diff ... | node scripts/send-code-review-webhook.mjs --stdin <file>` перед merge критичных веток.
4. **P2 из секции ниже** — E2E / установщик / fixture gate по приоритету продукта.

---

## Если `rl-dev` не работает

Запустить вручную:

```powershell
cd C:\Dev\replyline
. ~/.dev-secrets/Load-ProjectSecrets.ps1
Load-ProjectSecrets
pnpm tauri dev
```
