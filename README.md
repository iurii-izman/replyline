# Replyline

## Hero

Когда ответить трудно, Replyline даёт следующий ход.

Windows-first tray app для сложных рабочих разговоров: hotkey -> короткий system-audio snippet -> одна карточка `gist / say_now / next_move`.

## What it is

Удерживайте горячую клавишу в сложный момент разговора, отпустите — и получите компактную карточку ответа:

- `Суть`
- `Скажи сейчас`
- `Дальше`

Текущий фокус продукта намеренно узкий:

- сложные рабочие разговоры
- помощь в моменте, а не пост-разбор звонка
- короткий фрагмент, а не запись всего звонка

## What it is not

- не meeting assistant
- не transcript tool
- не speaking coach

## Trust block

- захват идёт только пока удерживается hotkey
- live-фрагменты обрабатываются в RAM и по умолчанию не сохраняются на диск
- после отпускания hotkey фрагмент отправляется во внешние STT / LLM провайдеры, которые вы настраиваете сами
- пользователь сам отвечает за правила платформ, политику работодателя и законы о записи

## Stage disclaimer

- текущая стадия: внутренняя русскоязычная stable beta
- source-only: без обещаний публичного binary availability на этом этапе
- cross-machine и cross-call-app поведение остаются `pending verification`

## CTA

- исходники и запуск: [README sections below](#getting-started)
- минимальная внешняя страница: [landing/index.html](landing/index.html)
- доступ для точечных тестеров: [docs/tester-brief.md](docs/tester-brief.md)

## Current state

Этот репозиторий — внутренняя инженерная stable beta-сборка.

Текущая модель публикации:

- только исходный код
- без закоммиченных бинарных артефактов
- без публичного installer-релиза, пока не укреплены упаковка, подпись и live-call валидация

Что уже есть:

- tray-first Tauri приложение
- компактное always-on-top окно
- один global hotkey, по умолчанию `Ctrl+Alt+Space`
- захват system-audio фрагмента через WASAPI loopback
- путь STT через Deepgram
- один OpenAI-compatible путь LLM
- компактная карточка `gist / say_now / next_move`
- только in-memory контекст
- локальные настройки + Windows Credential Manager для секретов
- runtime evidence, smoke артефакты и handoff bundle tooling

Что явно не входит в текущий MVP:

- transcript UI
- history UI
- speaker detection
- full-call recording
- microphone capture in the default MVP path
- coaching scores
- tone / emotion analysis
- automatic memory persistence from live snippets

## Trust model

- аудио захватывается только пока удерживается hotkey
- фрагменты обрабатываются в RAM и по умолчанию не сохраняются
- после отпускания клавиши фрагмент отправляется во внешние STT / LLM провайдеры, которые вы настроили
- приложение не позиционируется как скрытый софт, терапевтический продукт или автономная система ответов
- пользователь сам отвечает за соблюдение правил платформ, политики работодателя и законов о записи

Подробно:

- [docs/privacy-and-trust.md](docs/privacy-and-trust.md)
- [docs/third-party-providers.md](docs/third-party-providers.md)
- [docs/known-limitations.md](docs/known-limitations.md)

## Язык stable beta и честность запуска

- текущая stable beta — русскоязычная в product-facing UX
- в коде есть технический `primaryLanguage` hook (`ru`/`en`) для будущей multilingual expansion
- это не означает готовый English-ready UX на текущем этапе

## What is proven vs not yet proven

Что уже подтверждено локально:

- the app builds
- the Rust backend compiles and tests pass
- the prompt contract is guarded
- the runtime probe path can produce real machine-local evidence artifacts
- handoff bundles can be generated from local runtime artifacts

Что всё ещё pending verification:

- повторяемое поведение в живых звонках Zoom / Teams / Meet / Telemost
- консистентность между разными машинами
- реальная полезность за пределами локальных инженерных прогонов

Для честной модели верификации начните с [docs/verification-lanes.md](docs/verification-lanes.md).

## Getting started

### Requirements

- Windows
- Node / pnpm
- Rust toolchain
- WebView2 / Tauri runtime requirements
- ключи провайдеров для реального runtime пути

### Install

```bash
pnpm install
```

### Запуск приложения

```bash
pnpm tauri dev
```

### Быстрый инженерный gate

```bash
pnpm smoke
```

Эта команда запускает:

- TypeScript typecheck (`pnpm typecheck`)
- ESLint (`pnpm lint`)
- Vite production build
- `cargo check`
- `cargo clippy -- -D warnings`
- `cargo fmt --check`
- `cargo test`
- `vitest` lane (`pnpm test:ui`)
- deterministic consistency gate
- IPC contract gate
- prompt-contract gate
- copy gate

Обязательный локальный quality + security gate:

```bash
pnpm verify
```

`pnpm verify` = `pnpm smoke` + `pnpm test:security-lanes` (`pnpm rust:deps` + `pnpm audit:npm`).

Расширенный (opt-in/nightly) gate:

```bash
pnpm verify:extended
```

## Runtime commands (optional)

Базовые runtime / evidence команды:

```bash
pnpm probe:runtime
pnpm probe:bench
pnpm probe:durations
pnpm evidence:bundle
pnpm smoke:template
pnpm alpha:handoff
```

Полезные вспомогательные команды:

```bash
pnpm runtime:preflight
pnpm benchmark:evidence
pnpm rust:deps
```

## Repository map

- [src](src): Solid frontend
- [src-tauri](src-tauri): Rust backend and Tauri app
- [scripts](scripts): runtime, evidence, smoke, and release-support scripts
- [fixtures](fixtures): deterministic prompt-contract inputs
- [docs](docs): engineering docs for runtime proof, release readiness, memory, and verification

Start here:

- [docs/README.md](docs/README.md)

## Core docs

- [verification-lanes.md](docs/verification-lanes.md): что доказывает каждая verification lane
- [runtime-bringup.md](docs/runtime-bringup.md): реальный runtime path и probe workflow
- [runtime-evidence.md](docs/runtime-evidence.md): evidence артефакты и honesty rules
- [smoke-checks.md](docs/smoke-checks.md): ручные critical-path проверки
- [release-readiness.md](docs/release-readiness.md): lean stable-beta handoff gate
- [benchmark-policy.md](docs/benchmark-policy.md): `target / measured / pending verification`
- [privacy-and-trust.md](docs/privacy-and-trust.md): короткая trust-модель и storage truth
- [known-limitations.md](docs/known-limitations.md): честные ограничения текущей stable beta
- [third-party-providers.md](docs/third-party-providers.md): границы ответственности внешних STT/LLM
- [memory-layer.md](docs/memory-layer.md): future track (internal planning), отдельно от текущего live-card MVP

## Internal alpha ops

- [internal-alpha-checklist.md](docs/internal-alpha-checklist.md): порядок self-test и blocker gate
- [tester-brief.md](docs/tester-brief.md): короткий бриф для точечных ранних тестеров
- [test-feedback-template.md](docs/test-feedback-template.md): единый шаблон useful feedback

## License

[MIT](LICENSE)
