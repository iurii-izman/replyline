# Вклад в ai-vibe-engineering

Этот документ описывает практический workflow для внесения изменений в `ai-vibe-engineering` на внутренней alpha-стадии.
Проект находится в alpha-стадии и поддерживается небольшой командой, поэтому особенно важны конструктивное взаимодействие и прозрачная коммуникация.

## Предварительные требования

| Инструмент  | Минимальная версия | Примечания                  |
| ----------- | ------------------ | --------------------------- |
| Node.js     | 20+                | Рекомендуется LTS           |
| pnpm        | 9+                 | Менеджер пакетов            |
| Rust        | stable (latest)    | `rustup update stable`      |
| Windows     | 10 или 11          | Основная целевая платформа  |
| cargo-deny  | latest             | `cargo install cargo-deny`  |
| cargo-audit | latest             | `cargo install cargo-audit` |

Опционально, но рекомендуется:

- PowerShell 7+ (для runtime/evidence-скриптов)
- Deepgram API key + LLM endpoint (для end-to-end runtime-проверок)

## Настройка

```bash
git clone <repo-url>
cd ai-vibe-engineering
pnpm install
pnpm tauri dev
```

Приложение запускается как иконка в системном трее. Если ключи провайдеров не настроены, при первом открытии будет показан setup-flow.

## Workflow в Windsurf

Windsurf поддерживается как IDE для этого репозитория.

- Установите Windsurf на Windows и при необходимости импортируйте настройку из Cursor/VS Code во время onboarding.
- Храните проектные инструкции для агентов в version control:
  - корневой `AGENTS.md` для репозиторных правил;
  - `.windsurf/rules/*.md` для целевых Cascade-правил с триггерами.
- Личные дефолты держите в глобальных Windsurf-правилах (`~/.codeium/windsurf/memories/global_rules.md`) и не переносите machine-specific поведение в репозиторные правила.
- После добавления или изменения проектных правил переоткройте workspace в Windsurf и убедитесь, что правила видны в Cascade Customizations.

## Governance AI-инструментов

Проект поддерживает несколько AI IDE/CLI-инструментов в единой модели governance.

- Каноничная матрица и приоритеты: `docs/ai-tooling-policy-matrix.md`.
- Репозиторная политика обязательна для всех инструментов (`AGENTS.md`, этот документ, docs и policy-скрипты).
- Tool-specific adapter-файлы могут уточнять поведение, но не могут переопределять репозиторную политику.
- Глобальные machine-профили допустимы для дефолтов, но не должны противоречить репозиторной политике.

## Связанные governance-документы

- `SECURITY.md`: процесс security-репортов и responsible disclosure.
- `CODE_OF_CONDUCT.md`: стандарты поведения и подход к правоприменению.
- `CHANGELOG.md`: история релизов и alpha-изменений.

## Проверка перед PR

Перед отправкой запускайте полный smoke-gate:

```bash
pnpm smoke
```

Команда выполняет: Vite build, `cargo check`, `cargo test`, Vitest UI tests, fixture validation, prompt contract checks, say-now scenario checks, consistency gate и copy check.

Запустите Rust supply-chain gate:

```bash
pnpm rust:deps
```

Это запускает `cargo deny check` и `cargo audit` по lockfile.

Оба gate должны проходить перед тем, как PR можно будет мержить.

## Стратегия веток

- Feature-ветки от `main`, короткоживущие.
- Называйте ветки описательно: `feat/streaming-stt`, `fix/context-ttl-edge`, `docs/architecture`.
- Перед merge делайте rebase на `main`, чтобы сохранять линейную историю.
- После merge удаляйте ветку.

## Сообщения коммитов

Используйте стиль conventional commits:

```
feat: connect streaming STT path for Deepgram
fix: prevent context lock poisoning on rapid hotkey press
docs: add architecture overview
chore: update cargo-deny config
test: add fixture for empty transcript edge case
```

Держите subject-строку короче 72 символов. В body добавляйте контекст, если изменение неочевидно.

## Рекомендации по PR

Каждый PR должен включать:

- **Что**: краткое описание изменения.
- **Зачем**: мотивация — какую проблему решает изменение или какую цель продвигает.
- **Как проверить**: шаги для ревьюера, включая smoke/runtime-команды.
- **Scope**: какие части затронуты (backend/Rust, frontend/TS/Solid.js, scripts или docs).

Старайтесь держать PR сфокусированным. Один логический change-set проще ревьюить и откатывать при необходимости.

## Стиль кода

### Rust

- Форматируйте код через `cargo fmt` перед коммитом.
- Запускайте `cargo clippy` и устраняйте все предупреждения.
- Для типов ошибок используйте `thiserror`. Избегайте bare `String`-ошибок в новом коде.
- Логируйте значимые события через `app_log::append_event`.

### TypeScript

- Включён strict mode (`tsconfig.json` содержит `strict: true`).
- Для реактивности UI используйте Solid.js-подходы, без React-patterns.
- Типы размещайте в `model.ts`. Platform abstraction — в `platform.ts`.
- Controller-логику держите в `controller.ts`, а не в component-файлах.

### CSS

- Следуйте существующей токен-структуре в `App.css`.
- По возможности используйте существующие CSS custom properties.
- Без CSS-in-JS. Только plain CSS.

## Безопасность

- Никогда не коммитьте API keys, токены и секреты. Приложение хранит секреты в Windows Credential Manager, а не в config-файлах.
- Запускайте `pnpm rust:deps` перед отправкой PR, если трогали `Cargo.toml` или `Cargo.lock`.
- Запускайте `pnpm audit:npm`, если меняли `package.json` или `pnpm-lock.yaml`.
- CSP настраивается в `tauri.conf.json`. Не расширяйте её без явного ревью.
- Если добавляете новую Rust-зависимость, документируйте причину и проверяйте прохождение `cargo deny check`.
