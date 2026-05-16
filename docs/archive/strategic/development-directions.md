# Replyline — Карта направлений развития (канонический документ)

> Версия: 1.0
> Дата: 2026-04-09
> Статус: канон. Заменяет `docs/improvement-plan.md` и `docs/interviewforge-lessons.md` (поглощены при создании этого документа).
> Назначение: единая точка правды по направлениям развития, их теоретическому потолку, текущему состоянию и приоритетным следующим шагам.

---

## 1. Назначение и зона ответственности

Этот документ — единственный канонический источник правды по двум вопросам:

1. **Какие направления развития существуют у Replyline** в рамках выбранной философии (Windows-first, hotkey-gated, RAM-only, decision-not-documentation, no therapy/coach/recorder).
2. **Где каждое направление находится сейчас** относительно своего практического потолка.

Документ **не** заменяет:

- `docs/strategic-analysis.md` — стратегический анализ, позиционирование, бренд, конкурентное обрамление, distribution (это другая Библия).
- `docs/naming-decision-brief.md` — отдельное решение по неймингу с триггерами пересмотра.
- `docs/verification-lanes.md`, `docs/benchmark-policy.md`, `docs/copy-rules.md` — policy-документы по дисциплине доказательств и copy-discipline.
- `docs/internal-alpha-checklist.md` — операционный go/no-go чеклист для тест-прогонов.
- `docs/architecture.md` — техническая документация по архитектуре.

Эти документы дополняют канонический, но не дублируют его. Канонический отвечает на вопрос «куда двигаться и где мы сейчас», остальные — на вопросы «как это устроено», «как доказывать», «как говорить» и «как тестировать».

---

## 2. Метод оценки

### 2.1 Шкала

- **Теоретический максимум (макс)** — реалистичный потолок направления **в рамках философии Replyline**, не абстрактный 100. Например, для «Cross-platform & Audio Source Robustness» потолок не 100, а 70: проект сознательно Windows-first и не масштабируется на macOS/Linux. Для «Trust & Privacy Posture» потолок 95: продукт подразумевает cloud STT/LLM и не может честно претендовать на «100 = всё локально и зашифровано».
- **Текущая оценка** — фактическая реализация на основании аудита кода (`src-tauri/src/`, `src/app/`), документации, CI, runtime evidence и dev experience. Не аспирация, не план.

### 2.2 Источники данных

Оценки построены на:

- Полный аудит Rust backend (27 файлов, ~4400 строк): `audio.rs`, `deepgram.rs`, `llm.rs`, `context.rs`, `memory.rs`, `settings.rs`, `commands.rs`, `services/capture_pipeline.rs`, `providers/stt_provider.rs` и др.
- Полный аудит Solid.js frontend (~2500 строк): `app/model.ts`, `app/controller.ts`, `app/platform.ts`, `app/MainSurface.tsx`, `app/SettingsSurface.tsx`, `app/ChromeSurface.tsx`, `app/locale.ts`.
- Прочтение всех canonical policy docs: `AGENTS.md`, `CONTRIBUTING.md`, `docs/strategic-analysis.md`, `docs/improvement-plan.md` (поглощён), `docs/verification-lanes.md`, `docs/benchmark-policy.md`, `docs/copy-rules.md`, `docs/error-catalog.md`, `docs/extension-points.md`, `docs/known-limitations.md`, `docs/memory-layer.md`, `docs/internal-alpha-checklist.md`, `docs/internal-alpha-log.md`, `docs/settings-reference.md`, `docs/architecture.md`, `docs/dev-handoff-guide.md`.
- Прочтение CI workflow (`.github/workflows/ci.yml`), `package.json`, `tauri.conf.json`, `lib.rs`.
- Прочтение runtime evidence: `internal-alpha-log.md` Day 1 (probe 2026-04-06): `release→card = 5217ms`, `stt = 3070ms`, `llm = 2127ms`.

### 2.3 Дисциплина обновления

- При существенных изменениях в коде или процессах оценки пересматриваются и журнал изменений в конце документа дополняется.
- Оценки **не выдаются авансом** под планы — они отражают реальное состояние на момент ревизии.
- При расхождении между планом и кодом доверяем коду (см. правило `docs/copy-rules.md`: «не поднимать claim с target до measured только по результату pnpm smoke»).

---

## 3. Сводная таблица направлений

> Шкала: оценка от 1 до 100. Дельта = текущее − максимум. Звёздочкой ⭐ помечены направления, которые я добавил поверх изначальных 15 в `improvement-plan.md` как самостоятельные dimension.

| #   | Направление                                                  | Макс | Текущее | Дельта | Краткий комментарий |
| --- | ------------------------------------------------------------ | ---: | ------: | -----: | --- |
| 1   | Audio Capture (WASAPI loopback)                              |   85 |      65 |    −20 | Pragmatic Windows-only. Cross-machine + cross-call-app — `pending verification`. |
| 2   | STT Layer (Deepgram batch + streaming)                       |   88 |      60 |    −28 | Batch wired, streaming реализован но `useStreamingStt=false` по умолчанию и не покрыт CI. |
| 3   | LLM Layer & Prompt Engineering                               |   92 |      80 |    −12 | Самый сильный слой: `PROMPT_VERSION="v2"`, 3-уровневый JSON parsing, validators, RU/EN prompts. |
| 4   | End-to-End Latency & Performance                             |   90 |      50 |    −40 | **#1 продуктовый риск**: `release→card = 5217ms` на local probe. Borderline-useful для pressure moment. |
| 5   | Context Layer (RAM ring buffer)                              |   90 |      82 |     −8 | 3 entries, 1500 chars, 20-min TTL, FIFO eviction, без panic. Чисто и дисциплинированно. |
| 6   | Result Card UX (gist/say_now/next_move)                      |   92 |      78 |    −14 | Visual hierarchy на `say_now`, per-section copy, retry, save-to-memory action. |
| 7   | Hotkey System & Capture Ergonomics                           |   92 |      65 |    −27 | Сердце продукта, но самая слабая по доказательствам область. Cross-app не верифицирован. |
| 8   | Memory Layer (separate track)                                |   75 |      45 |    −30 | Backend production-ready, UI частично, **не подключён к LLM context injection** — половина ценности на полу. |
| 9   | Settings & Configuration UX                                  |   85 |      68 |    −17 | Schema migration v1→v2, scroll-anchor routing на error type. **Нет language dropdown в UI.** |
| 10  | Tray & Window Integration                                    |   88 |      75 |    −13 | i18n menu, click-to-open, intro acknowledge, status tooltip. Иконка нуждается в 16x16 simplification. |
| 11  | Onboarding & First-Run Experience                            |   82 |      50 |    −32 | Settings открывается автоматически, intro banner. Текущий — слишком developer-oriented. |
| 12  | i18n / Localization                                          |   78 |      50 |    −28 | Структурно готово (RU+EN strings, prompts, settings). **Нет UI селектора, нет dynamic switch.** |
| 13  | Accessibility (a11y) ⭐                                       |   85 |      45 |    −40 | Семантичный HTML, `title` на icon buttons. Не было ARIA-аудита, контрастных проверок, screen reader. |
| 14  | Backend Architecture & Reliability (Rust)                    |   95 |      80 |    −15 | **0 `unwrap()` в shipped коде**, atomic writes, retry/backoff, mutex poisoning mapped to CommandError. |
| 15  | Frontend Architecture & Reactivity (Solid.js)                |   92 |      80 |    −12 | Чистые границы model/controller/platform. Strict TS без `any`. `controller_runtime.ts` удалён (2025-07 — dead code, ghost imports). |
| 16  | Extensibility (Provider abstraction, plugins, hooks)         |   80 |      48 |    −32 | Schema migration, custom system prompt в settings. **Нет formal LLM provider trait.** |
| 17  | Error Handling & Recovery                                    |   90 |      78 |    −12 | `CommandError` tagged union, settings-anchor routing, user-safe RU mappers, settings corruption quarantine. |
| 18  | Trust & Privacy Posture                                      |   95 |      84 |    −11 | RAM-only, Credential Manager, copy-rules с банами `stealth/therapy/emotion`, third-party-providers doc. |
| 19  | Security Hardening                                           |   92 |      74 |    −18 | CSP scoped, atomic writes, password fields, settings URL валидация. Нет nonce-based CSP, нет cert pinning. |
| 20  | Supply Chain Security                                        |   90 |      76 |    −14 | `cargo-deny`, `cargo-audit`, `pnpm audit`, Dependabot, CI gates. Нет SHA-pinned actions, SBOM, SLSA. |
| 21  | Testing & Quality Gates (Mock + Unit + Lanes)                |   90 |      76 |    −14 | 4 verification lane, ~33 vitest + 9+ Rust test files, prompt-contract gates, fixture-gate. |
| 22  | Verification Discipline & Evidence Honesty ⭐                 |   95 |      88 |     −7 | **Тихий superpower проекта**: label vocabulary `target/measured/pending`, lane separation, evidence:bundle. |
| 23  | Real-World Usefulness Validation ⭐                           |   90 |      25 |    −65 | **Здесь действительно слабо**: 1 internal probe на TTS, 0 documented live-call sessions. |
| 24  | Observability & Diagnostics                                  |   85 |      70 |    −15 | `app_log` 5MB rotation, `runtime_probe`, `evidence_bundle`, `capture_debug`. Нет log viewer в UI. |
| 25  | DevOps / CI / Build Pipeline                                 |   90 |      74 |    −16 | GitHub Actions windows-latest, full smoke gate, cache layers. Нет signed installer на tag push. |
| 26  | Distribution & Release Engineering                           |   85 |      25 |    −60 | **Самый низкий current — но это сознательный выбор**: нет binary release пока нет live-call evidence. |
| 27  | Documentation Quality                                        |   92 |      86 |     −6 | 36+ markdown файлов, специализированные docs по каждому аспекту. Один из топ-сильнейших слоёв. |
| 28  | Branding & Strategic Positioning                             |   90 |      76 |    −14 | Strategic-analysis 705 строк, banned terms, палитра, positioning options. Имя оценено 25/34. |
| 29  | AI Tooling Governance & Repo Discipline ⭐                    |   90 |      80 |    −10 | **Уникальное направление**: `AGENTS.md` + `CLAUDE.md` адаптер + policy precedence + scriptable copy guards. |
| 30  | Cross-platform & Audio Source Robustness ⭐                   |   70 |      40 |    −30 | **Капится философией Windows-first.** Только WASAPI loopback, нет mic-fallback, нет device picker. |
| **Σ** | **Итоговая средняя оценка**                                |  **88** |  **66** | **−22** | **Replyline = "engineering-mature, validation-light alpha"**. ~75% от теоретического потолка. |

---

## 4. Дисциплина оценки (анкеры из InterviewForge)

При построении оценок я опираюсь на 10 практик, которые исторически использовались в проекте InterviewForge как методология качества и в значительной части уже впитаны в Replyline. Этот раздел заменяет удалённый файл `docs/interviewforge-lessons.md` и сохраняет только применимые анкеры.

### 4.1 Анкеры, которые мы УЖЕ усвоили (формируют верхний потолок направлений)

| Анкер | Score / 100 | Где живёт в Replyline | Какие направления вытягивает |
| --- | ---: | --- | --- |
| Separate verification lanes | 98 | `docs/verification-lanes.md`, 4 lane (compile, mock/UI, prompt/contract, runtime proof) | #21, #22 |
| Settings separate from secrets | 97 | `settings.rs` (JSON) vs. `credentials.rs` (Windows Credential Manager) | #18, #19 |
| Runtime evidence bundles | 95 | `pnpm evidence:bundle`, `pnpm alpha:handoff`, `reports/runtime/` | #22, #24 |
| Readiness before feature claims | 93 | `docs/benchmark-policy.md`, label `target / measured / pending verification` | #22, #28 |
| Copy and trust discipline | 91 | `docs/copy-rules.md`, `pnpm copy:check`, `scripts/check-consistency.mjs` | #18, #28, #29 |
| Benchmark label honesty | 89 | `pnpm probe:bench`, `pnpm probe:durations`, repeated runs requirement | #22, #24 |
| Explicit runtime bring-up runbook | 86 | `docs/runtime-bringup.md`, `pnpm runtime:preflight`, `pnpm probe:runtime` | #22, #25 |
| Prompt-contract corpus | 84 | `pnpm test:prompt-contract`, `pnpm test:say-now-scenarios`, `fixtures/ru-work-snippets.json` | #3, #21 |

**Принцип**: каждое направление, которое опирается хотя бы на один из этих анкеров, получает более высокий «потолок», потому что инфраструктура уже на месте.

### 4.2 Анкер, который мы усваиваем (adopt soon)

| Анкер | Score / 100 | Статус в Replyline |
| --- | ---: | --- |
| Lightweight release readiness checklist | 78 | `docs/release-readiness.md` существует, `docs/internal-alpha-checklist.md` работает. Признан lean — не разрастаться в полную release-bureaucracy. |

### 4.3 Анкеры, от которых мы СОЗНАТЕЛЬНО отказываемся

| Анкер | Score / 100 | Почему отвергаем |
| --- | ---: | --- |
| In-app inspect / exported diagnostics panel | 72 | Полезно с внешними тестерами, не для текущего tight MVP loop. Карточка должна оставаться compact. |
| Multi-shell product architecture | — | Replyline — однооконный tray-app по дизайну. |
| Interview domain models | — | Совершенно другой product scope. |
| Full review / export flows | — | Противоречит «no transcript, no history». |
| Transcript-heavy UI | — | Противоречит «one card, three fields». |
| Saved session sprawl as default | — | Противоречит RAM-only философии. |

**Принцип**: отказы от практик так же важны, как принятия — они формируют негативное пространство продукта и удерживают scope.

---

## 5. Детализация направлений

> Для каждого направления ниже: краткий scope, что покрыто, что не покрыто/риски, следующий приоритетный шаг (одно-два конкретных действия). Расширенный backlog по каждому направлению (5+ items на 3 итерации) был ранее в `docs/improvement-plan.md` и поглощён сюда в сжатом виде.

### 5.1 Audio Capture (WASAPI loopback) — 65 / 85

- **Scope**: захват system audio через WASAPI loopback, downmix на 16kHz mono, выдача в STT.
- **Покрыто**: реализация в `src-tauri/src/audio.rs` (~280 строк), поддержка f32/i16, COM lifecycle, error handling без `unwrap`.
- **Не покрыто / риски**: cross-machine поведение `pending verification` (нет matrix-тестирования), нет device picker, нет mic-fallback (намеренно), нет тестов downmix логики.
- **Следующий шаг**: запустить и задокументировать ≥3 cross-call-app сессии (Zoom/Teams/Meet/Telemost) на одной машине. Без этого направление физически не двигается.

### 5.2 STT Layer (Deepgram batch + streaming) — 60 / 88

- **Scope**: преобразование PCM в текст. Сейчас Deepgram, batch + streaming.
- **Покрыто**: `deepgram.rs` обе функции (`transcribe_wav`, `transcribe_pcm_streaming`), retry/backoff на batch, debug WAV save при empty transcript, routing через `providers/stt_provider.rs`.
- **Не покрыто / риски**: streaming `useStreamingStt=false` по умолчанию, не покрыт CI; один провайдер; нет formal trait для альтернативного STT.
- **Следующий шаг**: включить streaming по умолчанию, прогнать `pnpm probe:bench` на ≥3 повторах, зафиксировать `measured` latency. Это **самый быстрый** способ снизить #4.

### 5.3 LLM Layer & Prompt Engineering — 80 / 92

- **Scope**: преобразование транскрипта в карточку `gist/say_now/next_move` через OpenAI-compatible API.
- **Покрыто**: `llm.rs` (~470 строк), `PROMPT_VERSION="v2"`, RU+EN system prompts, 3-уровневый JSON parsing fallback (direct → brace extraction → field regex), validators (`validate_say_now`, `validate_next_move`), char clamps в Rust (110/220/110), retry на 5xx/timeout, custom system prompt override.
- **Не покрыто / риски**: нет streaming response (incremental rendering), нет confidence indicator, нет A/B framework, нет domain packs (engineering / sales / 1:1).
- **Следующий шаг**: подключить streaming response (на основе уже существующего kernel). Карточка может появляться по секциям — `gist` сразу, `say_now` через секунду, `next_move` чуть позже. Это снижает воспринимаемую латенси без снижения реальной.

### 5.4 End-to-End Latency & Performance — 50 / 90

- **Scope**: суммарное время от отпускания hotkey до показа карточки.
- **Покрыто**: измерение per-stage в `runtime_probe`, label discipline, baseline Day 1 зафиксирован.
- **Не покрыто / риски**: **`release→card = 5217ms` на local probe** — это `pending verification` для useful-в-pressure-moment, по своим же критериям из `internal-alpha-checklist.md`. Нет per-stage budget, нет regression-теста латенси в CI, нет dashboard в Settings.
- **Следующий шаг**: установить latency budget per stage (например: capture stop→pcm <30ms, STT <2000ms, LLM <1500ms, render <200ms; total <4000ms target) и измерить расхождение.

### 5.5 Context Layer (RAM ring buffer) — 82 / 90

- **Scope**: краткосрочная память между захватами в одной сессии.
- **Покрыто**: `context.rs`, 3 entries, 1500 chars total, 20-min TTL, FIFO eviction, exposed `context_active` в UI.
- **Не покрыто / риски**: TTL не настраивается из UI, нет background summarization (только eviction), нет visual badge с количеством entries в MainSurface (есть в settings).
- **Следующий шаг**: добавить badge «N/3 entries» в MainSurface, чтобы пользователь видел state контекста до hotkey press.

### 5.6 Result Card UX — 78 / 92

- **Scope**: визуальное представление карточки с тремя полями.
- **Покрыто**: visual hierarchy на `say_now`, per-section copy buttons, retry, save-to-memory, `result-section--primary` modifier, palette tokens.
- **Не покрыто / риски**: нет incremental rendering при streaming (см. #3), нет responsive font scaling при overflow, нет confidence indicator, нет card history в текущей сессии (можно увидеть только последнюю).
- **Следующий шаг**: добавить responsive font scaling для длинного `say_now` (auto-shrink при overflow). Сейчас длинная фраза выходит за пределы card.

### 5.7 Hotkey System & Capture Ergonomics — 65 / 92

- **Scope**: один global hotkey для start/stop захвата (по дизайну — hold-to-capture).
- **Покрыто**: Tauri global-shortcut plugin, fallback nudge при registration failure, hotkey input в settings с live capture.
- **Не покрыто / риски**: cross-machine не верифицирован, cross-call-app не верифицирован, нет conflict detection с системой, нет per-action mapping, нет visual capture-state overlay.
- **Следующий шаг**: автоматизированный тест hotkey registration на чистом профиле + руководство по debugging hotkey conflicts в `docs/troubleshooting.md`.

### 5.8 Memory Layer (separate track) — 45 / 75

- **Scope**: долгосрочная память по командам/тредам/контактам с явным user-confirmed сохранением.
- **Покрыто**: backend полностью production-ready (`memory.rs`, ~290 строк): типизированные модели Space/Fact/Commitment/Term, JSON store с atomic writes, валидаторы, unit tests. Команды wired в `commands.rs`. UI в SettingsSurface показывает spaces, allows save card to space.
- **Не покрыто / риски**: **memory facts не инжектируются в LLM context при analysis** — это самая большая упущенная связка. Backend готов, frontend готов, integration — нет. Также: capится своей же философией (memory не должен затмевать live card per `docs/memory-layer.md`).
- **Следующий шаг**: добавить опциональную memory injection в `services/capture_pipeline.rs` — top 3 facts из active space перед system prompt. Гейтить feature flag `useMemoryContext` (default false) и измерить delta качества карточки на fixture-наборе.

### 5.9 Settings & Configuration UX — 68 / 85

- **Scope**: панель настроек: провайдеры, секреты, hotkey, language, capture range, advanced.
- **Покрыто**: schema migration v1→v2, scroll-anchor routing на error type, password fields, validation feedback, runtime readiness snapshot, support bundle button.
- **Не покрыто / риски**: **нет language dropdown в UI** несмотря на полную поддержку RU/EN в коде; нет auto health-check на save; custom prompt input feels developer-only без preview.
- **Следующий шаг**: добавить language dropdown в SettingsSurface (1-дневное изменение). Это согласовывает frontend с уже существующим backend support.

### 5.10 Tray & Window Integration — 75 / 88

- **Scope**: tray icon, menu, tooltip, click behavior, window show/hide.
- **Покрыто**: tray menu с i18n переключением (`refresh_tray_menu`), click-to-open, intro acknowledge, phase-mapped tooltip (`tray_status.rs`), 6 menu items.
- **Не покрыто / риски**: иконка не имеет 16x16 monochrome variant (давно в `docs/strategic-analysis.md` как highest-value deliverable #9); нет tray popover mode (карточка inline near tray).
- **Следующий шаг**: создать 16x16 silhouette tray icon. Часовая задача, разблокирует запись «иконка читаема при tray resolution» в release readiness.

### 5.11 Onboarding & First-Run Experience — 50 / 82

- **Scope**: первое впечатление + setup до первого useful capture.
- **Покрыто**: settings открывается автоматически если runtime path не сконфигурирован, intro banner, hotkey-fallback nudge, readiness checklist.
- **Не покрыто / риски**: текущий experience слишком developer-oriented (требует provider keys, понимания llm_base_url, понимания hotkey capture). Не-технический тестер увязнет в первые 5 минут.
- **Следующий шаг**: добавить «default test mode» — кнопку «Использовать встроенный demo provider» которая позволяет нажать hotkey без настройки ключей и увидеть как работает workflow на mock-данных. Сразу за этим — реальный setup.

### 5.12 i18n / Localization — 50 / 78

- **Scope**: поддержка нескольких языков в UI и LLM prompts.
- **Покрыто**: `locale.ts` с `ui_ru`/`ui_en`, `ui_strings.rs` для backend (tray), RU+EN system prompts в `llm.rs`, `primary_language` field в settings.
- **Не покрыто / риски**: **нет UI селектора**, нет dynamic switch без рестарта, нет locale-aware date/number formatting, EN strings — «технический hook» а не готовый UX. Капится alpha-философией (RU-only product-facing UX).
- **Следующий шаг**: см. #5.9 — добавить language dropdown в SettingsSurface. После этого можно оценивать насколько EN strings нуждаются в polish.

### 5.13 Accessibility (a11y) ⭐ — 45 / 85

- **Scope**: ARIA, контрасты WCAG AA, keyboard navigation, screen reader, focus management.
- **Покрыто**: семантичный HTML, `title` атрибуты на icon buttons, native form labels.
- **Не покрыто / риски**: не было ARIA-аудита, контрастных проверок (WCAG AA), screen reader тестирования, focus rings проверки, keyboard navigation полноты по settings panel.
- **Следующий шаг**: запустить базовый axe-core audit, исправить High-severity findings. Обычно это 2-4 часа работы и поднимает score на 20+ пунктов.

### 5.14 Backend Architecture & Reliability (Rust) — 80 / 95

- **Scope**: надёжность, error handling, persistence, lifecycle.
- **Покрыто**: **0 `unwrap()` в shipped коде**, `thiserror` для типизированных ошибок, atomic file writes (`fs_atomic` + Windows `MoveFileExW`), retry/backoff, mutex poisoning mapped to `CommandError::Internal`, settings file quarantine при corruption, no `unsafe` outside `audio.rs` (WASAPI pointers, scoped CoInitialize).
- **Не покрыто / риски**: нет formal LLM provider trait, нет full pipeline e2e теста, нет graceful shutdown sequence (flush log, close capture, release credentials).
- **Следующий шаг**: добавить integration test для full capture→STT→LLM pipeline с mocked providers. Один тест разблокирует regression-detection в самом рискованном участке.

### 5.15 Frontend Architecture & Reactivity (Solid.js) — 78 / 92

- **Scope**: реактивность, type safety, чистые границы, тесты.
- **Покрыто**: чистые границы model/controller/platform, Solid-идиомы (нет React-измов), strict TypeScript без `any`, ~33 vitest test, controller_memory + controller_status покрыты юнит-тестами.
- **Не покрыто / риски**: ~~`controller_runtime.ts`~~ (удалён 2025-07: dead code, ghost imports, не вызывался ни из одного production/test файла, backend-хендлеры diagnostic команд не зарегистрированы); fixture path захардкожен в SettingsSurface; нет language selector в UI.
- **Следующий шаг**: ~~написать unit tests для `controller_runtime.ts`~~ (мoot — файл удалён). Актуальный ближайший шаг: вынести fixture path в конфиг или env.

### 5.16 Extensibility (Provider abstraction, plugins, hooks) — 48 / 80

- **Scope**: возможность расширения без правки core кода.
- **Покрыто**: schema migration framework v1→v2, STT routing layer, custom system prompt option в settings, документация в `docs/extension-points.md`.
- **Не покрыто / риски**: нет formal LLM provider trait (locked to OpenAI-compatible), нет event hook system, нет plugin SDK, нет hotkey-action mapping, нет card renderer plugins.
- **Следующий шаг**: оформить trait-based STT provider abstraction (выделить trait `SttProvider` из существующего routing функции). Это разблокирует Whisper-local как drop-in alternative.

### 5.17 Error Handling & Recovery — 78 / 90

- **Scope**: что видит пользователь когда что-то ломается, и как восстановиться.
- **Покрыто**: `CommandError` tagged union (Settings/Credential/Capture/Pipeline/Memory/Internal), settings-anchor routing на error kind, user-safe RU error mappers (`userSafePipelineError`, `userSafeBootstrapLoadError`, `userSafeCaptureStartError`), settings corruption quarantine, credential failure recovery, error catalog в `docs/error-catalog.md`.
- **Не покрыто / риски**: нет error code catalog с docs links на каждый код, нет retry-exhaustion notification (после max retries), нет auto-recovery suggestions ("Try this fix").
- **Следующий шаг**: добавить error code (e.g. `RPL-PIPE-001`) к каждому user-safe error message. Каждый код ссылается на anchor в `docs/troubleshooting.md`. Это превращает error UX в guided recovery flow.

### 5.18 Trust & Privacy Posture — 84 / 95

- **Scope**: что происходит с данными пользователя, как мы про это говорим, как доказываем.
- **Покрыто**: RAM-only по умолчанию, нет stored audio, Credential Manager для секретов, copy-rules с банами `stealth/invisible/therapy/emotion/autonomous`, `docs/third-party-providers.md`, `docs/privacy-policy.md`, explicit user-responsibility framing для recording laws и employer policies.
- **Не покрыто / риски**: нет visual data flow diagram (есть Mermaid в architecture, но не privacy-focused), нет clear-all-data button в Settings, нет transparency report шаблона, нет explicit пометки «your LLM provider may log requests per their policy».
- **Следующий шаг**: добавить «Очистить все данные» кнопку в Settings (стирает settings, memory, logs, debug WAVs). Это конкретный trust gesture, виден в UI, не требует объяснений.

### 5.19 Security Hardening — 74 / 92

- **Scope**: защита от типовых атак и misconfiguration.
- **Покрыто**: CSP scoped в `tauri.conf.json` (хоть `unsafe-inline` для styles остаётся), atomic writes, no `unwrap()`, password fields в UI, settings file URL-валидация (HTTPS + private IP only).
- **Не покрыто / риски**: nonce-based CSP не реализован, нет memory zeroization для секретов после use, нет certificate pinning к Deepgram/LLM endpoints, нет settings tamper detection (hash verification), нет audit всех `unwrap` в bin targets.
- **Следующий шаг**: nonce-based inline-style CSP вместо `unsafe-inline`. Tauri 2 поддерживает это через CSP nonce injection. Поднимает security posture без functional regression.

### 5.20 Supply Chain Security — 76 / 90

- **Scope**: гарантии что зависимости не приносят CVE и license issues.
- **Покрыто**: `cargo-deny`, `cargo-audit`, `pnpm audit`, Dependabot для npm + Cargo + GH Actions, CI gates `pnpm rust:deps`.
- **Не покрыто / риски**: некоторые GitHub Actions на mutable tags (`@v6`) вместо SHA-pinned, нет SBOM generation, нет license compliance report per build, нет deterministic builds, нет SLSA attestation.
- **Следующий шаг**: SHA-pin все GitHub Actions в `.github/workflows/ci.yml`. Это занимает 30 минут и закрывает supply chain attack vector.

### 5.21 Testing & Quality Gates — 76 / 90

- **Scope**: автоматическая верификация через mock + unit + lane дисциплину.
- **Покрыто**: 4 verification lane, ~33 vitest теста, 9+ Rust test files, prompt-contract checks, say-now scenario gates, fixture-gate (опциональный с реальным API), IPC-contract gate, consistency gate, copy-discipline check.
- **Не покрыто / риски**: capture pipeline e2e не покрыт, audio downmix логика, memory validators не покрыты direct unit tests.
- **Следующий шаг**: integration test на full pipeline (см. #5.14) — этот один тест поднимает несколько направлений сразу.

### 5.22 Verification Discipline & Evidence Honesty ⭐ — 88 / 95

- **Scope**: дисциплина того, что считается доказательством, и как мы про это говорим в docs/release notes/UI.
- **Покрыто**: label vocabulary `target / measured / pending verification` в `docs/benchmark-policy.md`, explicit lane separation `smoke ≠ runtime proof`, `runtime_probe` binary с per-stage timing, `evidence:bundle`, `alpha:handoff` bundle, claim-discipline rules в `docs/copy-rules.md`. **Это редкость для alpha** и тихий superpower проекта.
- **Не покрыто / риски**: всё ещё нет live-call evidence (всё `pending verification` для useful-in-pressure-moment); нет cross-machine matrix, нет multi-call-app matrix.
- **Следующий шаг**: пересечение с #23 — каждая live-call сессия даёт runtime artifact + поднимает direction #22 на 1-2 пункта. Без live-evidence #22 не двигается с 88.

### 5.23 Real-World Usefulness Validation ⭐ — 25 / 90

- **Scope**: доказательство что продукт **useful в реальном моменте**, не только что «технически работает».
- **Покрыто**: 1 internal probe на TTS scenario (Day 1 log от 2026-04-06), template для daily test runs в `internal-alpha-log.md`, explicit definition of usefulness blocker в `internal-alpha-checklist.md`.
- **Не покрыто / риски**: **0 documented live-call sessions, 0 trusted-tester runs, 0 cross-machine прогонов**. Strategic-analysis сама ставит это #1 риском. Без этого вся остальная инженерная дисциплина — теоретическая.
- **Следующий шаг**: founder проводит ≥3 live-call сессии (Zoom/Teams/Meet) на собственных рабочих звонках с заполненным template из `internal-alpha-log.md`. Это **самый разблокирующий шаг во всём проекте**: поднимает направления #1, #4, #7, #22, #23, #28 одновременно.

### 5.24 Observability & Diagnostics — 70 / 85

- **Scope**: что можно увидеть когда продукт ведёт себя странно.
- **Покрыто**: `app_log` с 5MB rotation, `runtime_probe` с per-stage timing, `evidence:bundle` для local artifacts, `diagnostic_bundle` Tauri command, `capture_debug` для failed STT WAVs, latency reporting в probe binary.
- **Не покрыто / риски**: нет structured event log format (плоский text), нет log viewer в Settings UI, нет latency dashboard в Settings, нет structured error patterns aggregation. Telemetry pipeline отсутствует — намеренно (privacy posture).
- **Следующий шаг**: добавить простой log viewer в Settings (last 50 events from `app.log` с фильтрацией по event type). Не требует backend изменений — log path уже exposed через `get_log_status`.

### 5.25 DevOps / CI / Build Pipeline — 74 / 90

- **Scope**: CI/CD, build artifacts, release tooling.
- **Покрыто**: GitHub Actions на windows-latest, full smoke gate runs, cache layers (Cargo + pnpm store), format/clippy/test/fixture/prompt-contract/IPC-contract/consistency/copy-check gates, optional fixture-gate с реальным API key через secrets.
- **Не покрыто / риски**: нет signed installer artifact на tag push, нет version bump script (синхронизация package.json + Cargo.toml + tauri.conf.json), нет nightly schedule, нет cross-OS matrix (намеренно Win-only).
- **Следующий шаг**: version bump script (синхронизация трёх version fields). Маленькая утилита, экономит ошибки на каждом релизе.

### 5.26 Distribution & Release Engineering — 25 / 85

- **Scope**: signed installer, auto-update, staged rollout.
- **Покрыто**: source-only model явно зафиксирован в README и `strategic-analysis.md`. Нет ничего другого.
- **Не покрыто / риски**: нет signed installer, нет GitHub Releases binaries, нет Tauri auto-updater, нет staged rollout, нет SmartScreen reputation. **Это сознательный выбор**, не баг: strategic-analysis явно говорит «no binary release пока 3+ machines verified + 10+ live calls». Score 25 честно отражает реальность.
- **Следующий шаг**: НЕТ. Это направление **сознательно заморожено** до выполнения #23. Любая работа здесь сейчас — преждевременная оптимизация. После того как #23 поднимется до ≥55, **тогда** браться за signed installer + Tauri auto-updater как первый шаг.

### 5.27 Documentation Quality — 86 / 92

- **Scope**: docs в репозитории — для контрибуторов, операторов, тестеров.
- **Покрыто**: 36+ markdown файлов, специализированные docs по каждому аспекту, единый стиль, актуальность синхронизирована с кодом, prompt-contract документация. **Один из топ-сильнейших слоёв проекта.**
- **Не покрыто / риски**: нет user manual для не-технических тестеров (со скриншотами), нет architecture decision records (ADRs) для ключевых решений, нет threat model document.
- **Следующий шаг**: записать ADR-001 по решению «hotkey-gated, RAM-only, no transcript» с обоснованием и trade-offs. Это ловит самое важное архитектурное решение в формате, который выживает смены людей.

### 5.28 Branding & Strategic Positioning — 76 / 90

- **Scope**: позиционирование, бренд, copy, distribution narrative.
- **Покрыто**: `docs/strategic-analysis.md` 705 строк зрелого анализа, banned terms list в `docs/copy-rules.md`, палитра (#173F38 / #F5EDE0 / #C49A5B), 3 positioning options analyzed, name analysis с shortlist в `docs/naming-decision-brief.md`. Founder сделал необычно зрелую strategic работу для alpha-стадии.
- **Не покрыто / риски**: имя «Replyline» самим же strategic doc оценено в 25/34 (HoldCard и SayNext получают 34/34); tray icon needs 16x16 simplification; landing минимальный (один HTML файл).
- **Следующий шаг**: НЕ переименовывать (это distraction without validated learning per `naming-decision-brief.md`). Вместо этого — улучшить landing до уровня «технической бизнес-карточки»: hero, trust block, what-it-is/isn't, GitHub CTA. Сейчас landing есть, но достоинство положения — в рамках следующего documentation pass.

### 5.29 AI Tooling Governance & Repo Discipline ⭐ — 80 / 90

- **Scope**: как несколько AI-инструментов (Claude, Cursor, Windsurf, Cody, etc.) сосуществуют под одной policy.
- **Покрыто**: `AGENTS.md` (root, repository-wide), `CLAUDE.md` (адаптер на canonical policy), `.windsurf/rules/`, `docs/ai-tooling-policy-matrix.md` с явной precedence (repo policy → tool adapter → machine global → personal). Copy-rules скриптуются через `check-consistency.mjs` + `check-prompt-contract.mjs` + `check-say-now-scenarios.mjs`. **Это редкость даже в зрелых проектах.**
- **Не покрыто / риски**: некоторые AI-tool adapters могут расходиться с canonical, нет автоматической проверки sync между adapters; нет matrix-теста «работает ли один и тот же taskpath под Claude и Cursor».
- **Следующий шаг**: добавить linter `scripts/check-ai-adapter-consistency.mjs` который проверяет что все AI adapter файлы (CLAUDE.md, .cursorrules, .windsurf/rules/) ссылаются на ту же canonical policy и не вводят противоречивые правила.

### 5.30 Cross-platform & Audio Source Robustness ⭐ — 40 / 70

- **Scope**: насколько надёжно audio capture работает на разных Windows-машинах и call-апах.
- **Покрыто**: WASAPI loopback на Windows, downmix на 16kHz mono, no-mic-by-default discipline.
- **Не покрыто / риски**: только Windows (намеренно), только WASAPI loopback (нет mic-fallback, нет device picker), cross-machine ещё `pending verification`. **Theoretical max ограничен 70** потому что macOS/Linux explicit out-of-scope per philosophy. Реальный gain тут — стабилизация на разных Windows-стеках, не кросс-OS.
- **Следующий шаг**: см. #5.1 и #5.23 — это направление поднимается только через live-evidence на ≥3 разных Windows-машинах с разными audio drivers (USB headset, Bluetooth, virtual audio cable от Zoom/Teams).

---

## 6. Highest-leverage следующие шаги (топ-6)

> Если нужно поднять aggregate score быстро без расширения scope. Шесть шагов в порядке impact-per-effort:

| #   | Шаг | Что движется | Effort | Impact на aggregate |
| --- | --- | --- | --- | --- |
| 1   | **Founder проводит ≥3 live-call сессии** на Zoom/Teams/Meet с заполненным template из `internal-alpha-log.md` | #1 (65→75), #4 (50→60), #7 (65→78), #22 (88→90), #23 (25→55), #28 (76→78) | 1-2 недели | **+2.0** к aggregate |
| 2   | **Включить streaming STT по умолчанию** + измерить latency через `pnpm probe:bench -Repeats 3` | #2 (60→78), #4 (50→65) | 1 день | **+0.7** к aggregate |
| 3   | **Подключить Memory facts к LLM context injection** в `services/capture_pipeline.rs` за feature flag | #3 (80→84), #8 (45→62) | 2-3 дня | **+0.7** к aggregate |
| 4   | **Добавить language dropdown в SettingsSurface** | #9 (68→75), #12 (50→62) | 1 день | **+0.6** к aggregate |
| 5   | ~~**Покрыть `controller_runtime.ts` юнит-тестами**~~ — файл удалён (2025-07), gap закрыт удалением dead code | #15 (78→80), #21 (76→78) | выполнено | **+0.2** к aggregate |
| 6   | **16x16 monochrome tray icon variant** | #10 (75→80), #28 (76→80) | 1-2 часа | **+0.3** к aggregate |

**Суммарно**: ~ 4.6 пункта к aggregate score (с 66 до ~71). Это эквивалент Iteration 2 territory без расширения scope.

---

## 7. Что НЕ делать (философские границы)

Эти отказы так же важны, как принятия. Они защищают core scope от расползания.

| Не делать | Почему |
| --- | --- |
| Не расширять Memory layer в полноценную CRM | Должен оставаться lightweight per `docs/memory-layer.md` — иначе затмевает live card. |
| Не публиковать binary release до live-call evidence (#23 → ≥55) | Один crash на чужой машине + один HN comment = «это spyware» навсегда. |
| Не добавлять meeting transcript / history / speaker detection | Category collapse в зону Granola/Otter/Fireflies. |
| Не делать macOS port пока Windows не доказан cross-machine | "Coming soon" хуже молчания. |
| Не переименовывать «Replyline» до binary release | Renaming = distraction without validated learning per `docs/naming-decision-brief.md`. |
| Не использовать слова `stealth / invisible / therapy / emotion / autonomous` | Trust destruction. См. `docs/copy-rules.md`. |
| Не добавлять gamification, mascots, streaks, эмодзи в UI | Wrong audience signal per `docs/strategic-analysis.md`. |
| Не делать automatic recording / background monitoring | Уничтожает core positioning. |
| Не идти на Product Hunt преждевременно | Wrong audience expectations + premature crash test. |
| Не претендовать на «private by design» без объяснения cloud STT/LLM routing | Ложное обещание уничтожает trust сильнее, чем честное ограничение. |
| Не treating `pnpm smoke` или `pnpm test:ui` as runtime proof | Только `reports/runtime/<artifact>.json` поднимает claim до `measured`. |
| Не добавлять in-app inspect panel / weekly metrics ritual / observability dashboards | InterviewForge-уровень overhead — не для tight MVP loop. |

---

## 8. Прогрессия счёта (вехи)

| Веха | Aggregate score | Ключевые драйверы |
| --- | ---: | --- |
| Baseline (v0.1.0, 2026-04-06) | ~61 | Initial alpha, core pipeline, basic CI, manual smoke checks |
| **Текущее (2026-04-09)** | **~66** | i18n hooks, schema migration v2, error catalog, prompt versioning, fixture gate, AI tool governance, expanded test coverage |
| Post-shortcut-list (топ-6 из §6) | ~71 | Live evidence, streaming STT default, memory injection, language dropdown, runtime tests, tray icon |
| Post-Iteration 2 (из старого improvement-plan) | ~77 | Polished UI, full i18n, integration tests, memory UI, structured errors |
| Post-Iteration 3 (из старого improvement-plan) | ~83 | Signed installer, security audit, prompt framework, health dashboard |
| **Practical ceiling для small-team alpha** | **~85** | Выше требует dedicated QA infra, formal compliance program, multi-platform support — out of scope |

Score выше 85 теоретически возможен только при выходе за рамки текущей философии (например — multi-platform, enterprise compliance certs, dedicated SRE team). В рамках Replyline-as-defined ceiling около 85.

---

## 9. Связанные документы

| Документ | Зачем существует | Не дублирует канонический |
| --- | --- | --- |
| `docs/strategic-analysis.md` | Стратегическая Библия: позиционирование, бренд, copy, конкурентное обрамление, distribution, pricing | Канонический отвечает на «куда идти», strategic — на «как себя называть и кому продавать» |
| `docs/naming-decision-brief.md` | Решение по имени с триггерами пересмотра | Узкий focus, не требует консолидации |
| `docs/architecture.md` | Техническая архитектура: data flow, IPC commands, state, file storage | Канонический не дублирует код-структуру |
| `docs/verification-lanes.md` | Что доказывает каждая verification lane | Канонический ссылается, не пересказывает |
| `docs/benchmark-policy.md` | Label discipline `target / measured / pending verification` | Канонический применяет, не определяет |
| `docs/copy-rules.md` | Banned terms, trust language, runtime claim language | Канонический использует, не дублирует |
| `docs/error-catalog.md` | Mapping CommandError kinds → user-safe messages | Канонический упоминает в #5.17, не пересказывает |
| `docs/extension-points.md` | Гайд по добавлению providers/surfaces/commands | Канонический упоминает в #5.16, не пересказывает |
| `docs/known-limitations.md` | Честные ограничения текущей alpha | Канонический использует как ground truth для current scores |
| `docs/memory-layer.md` | Дизайн memory layer + scope guardrail | Канонический использует как ceiling для #5.8 |
| `docs/internal-alpha-checklist.md` | Операционный go/no-go чеклист для тест-прогонов | Канонический ссылается в #5.23 |
| `docs/internal-alpha-log.md` | Журнал тестовых прогонов с baseline latency | Канонический использует Day 1 как ground truth для #5.4 |
| `docs/settings-reference.md` | Schema reference для settings.json | Канонический не дублирует field-level описания |
| `docs/dev-handoff-guide.md` | Onboarding для нового engineer | Канонический не дублирует setup steps |
| `AGENTS.md` / `CONTRIBUTING.md` / `CLAUDE.md` | Policy precedence + AI-tool governance | Канонический упоминает в #5.29 |

---

## 10. Журнал изменений документа

| Версия | Дата | Изменение |
| --- | --- | --- |
| 1.0 | 2026-04-09 | Создан как канонический документ. Поглотил `docs/improvement-plan.md` (15 направлений × 3 итерации) и `docs/interviewforge-lessons.md` (10 практик-анкеров). Расширен с 15 направлений до 30 (добавлены: Real-World Validation, Verification Discipline, Onboarding, Accessibility, Cross-platform, Branding, AI Tool Governance, Hotkey, Latency, Distribution как самостоятельные dimension). |
| 1.1 | 2026-04-09 | Сверка с остальными сравнительно-оценочными документами проекта (`docs/strategic-analysis.md`, `docs/naming-decision-brief.md`, `docs/archive/ultimate-ai-stack-2026-2027.md`, `docs/ai-stack/README.md`). Доп. содержания для абсорбции не найдено: strategic-analysis и naming-decision-brief остаются в роли стратегической Библии и узкого решения по неймингу соответственно; archive/ultimate-ai-stack — внешний research об AI-экосистеме, не про направления Replyline. Физически удалены `docs/improvement-plan.md` и `docs/interviewforge-lessons.md`, обновлён `docs/README.md`. |

---

## 11. Журнал консолидации (что было удалено)

При создании этого документа удалены:

- **`docs/improvement-plan.md`** — 15 направлений × 3 итерации × приоритетные items + score progression. Поглощено в §5 (детализация направлений как «следующий шаг») и §8 (прогрессия счёта). Расширенный backlog (5 items × 3 итерации × 15 направлений = 225 line items) сжат до одного приоритетного шага per направление. Если расширенный backlog нужен — он остаётся в git history файла до commit удаления.
- **`docs/interviewforge-lessons.md`** — 10 практик с scoring 72-98/100 + рекомендации adopt now / adopt soon / later / explicitly do not borrow. Поглощено в §4 (дисциплина оценки — анкеры). Все 10 практик сохранены как методологическая основа для scoring, а отказы от практик зафиксированы в §7 (что НЕ делать).

Сохранены без изменений (другая роль, не scoring-документы):

- `docs/strategic-analysis.md` — стратегическая Библия (позиционирование, бренд, distribution).
- `docs/naming-decision-brief.md` — узкое решение по неймингу.
- Все остальные `docs/*.md` файлы.

---

_Этот документ — единая точка правды по направлениям развития Replyline. При расхождении с другими документами доверять этому. При расхождении этого документа с кодом — доверять коду и обновлять документ._
