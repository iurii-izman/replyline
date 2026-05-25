# Replyline Privacy and Trust (Public Beta Posture)

Короткая truth-модель для текущего публичного beta posture (Windows-first, Russian-first).
Contract note: this document keeps `Internal Stable Beta` wording for compatibility checks and historical traceability.

## Что происходит в runtime

- Захват аудио начинается только при удержании hotkey.
- Захват останавливается при отпускании hotkey.
- Берётся короткий system-audio фрагмент, а не весь звонок.
- После отпускания фрагмент идёт по цепочке STT -> LLM -> карточка `gist / say_now / next_move`.

## Что хранится и где

- Live-фрагменты обрабатываются в RAM и по умолчанию не сохраняются на диск.
- Настройки сохраняются локально в `%APPDATA%\com.replyline.app\settings.json`.
- Секреты (API keys) хранятся в Windows Credential Manager (`com.replyline.app.credentials`).

Важно:

- Отдельные runtime/evidence команды могут сохранять локальные диагностические артефакты в `reports/` (включая transcript в отчётах), если вы запускаете эти команды вручную.
- Это часть верификации, а не фонового продуктового хранения.
- Локальный `app.log`, trace artifacts, и runtime evidence bundle проходят санитизацию/редакцию (секреты, токены, потенциальные PII маскируются).
- Interview reports хранятся только локально в профиле пользователя (`%LOCALAPPDATA%\com.replyline.app\reports\interview-reports.json`).
- Interview report может включать raw transcript content как часть explicit Interview Session flow.
- Retention policy для interview reports настраивается пользователем в Settings (`manual clear`, `7`, `30`, `90` дней).
- Значение по умолчанию: `manual clear` (авто-очистка выключена до явного выбора).
- Авто-очистка применяется только по явной retention policy; в режиме `manual clear` отчёты удаляются только через `Clear reports`.
- Markdown export отчёта создаётся только по явному действию пользователя, не автоматически.
- Есть два явных export-действия:
  - `Export full markdown (includes transcript)` — включает raw/full transcript и считается sensitive.
  - `Export redacted markdown (no transcript)` — safer share copy, исключает raw/full transcript.
  - Даже redacted export требует user review перед внешним шарингом (проверить отсутствие случайных PII/контекстных утечек).
- В WorkConversation Candidate Pack context по умолчанию не добавляется.
- Candidate Pack context включается только в Interview Mode при активной interview session.
- Settings diagnostics surface:
  - `debugTraceMode=redacted` (default) пишет только санитизированные traces.
  - `debugTraceMode=full_local` может сохранять более чувствительный локальный контент и должен использоваться только для локального triage.
  - `debugTraceRetentionDays=0` означает manual cleanup only.

### Redaction v1 (Privacy)

Многоуровневая система редакции в `src-tauri/src/privacy.rs`:

| Tier | Helper                   | Что покрывает                                                         |
| ---- | ------------------------ | --------------------------------------------------------------------- |
| R1   | `redact_secrets`         | API keys, bearer tokens, secret=, JSON secret fields, URL credentials |
| R2   | `redact_transcript_like` | Полный transcript/LLM prompt → chars_band + safe preview              |
| R3   | `safe_preview`           | Безопасное усечение любой строки с R1-редакцией                       |
| R4   | `redact_url_credentials` | URL userinfo (`user:pass@`), token query params                       |

- R1 применяется автоматически в `app_log::sanitize` (каждое log-сообщение).
- R2/R3 применяются явно в `pipeline_errors`, `stt_provider` и других call sites.
- Response body от Deepgram и LLM **намеренно отбрасывается** при HTTP ошибках.
- Статическая проверка в `scripts/check-security-lanes.mjs` ловит опасные log patterns.

### Content Security Policy (CSP)

CSP определён в `src-tauri/tauri.conf.json`:

```
connect-src 'self' ipc: http://ipc.localhost http://localhost:* ws://localhost:*
             http://127.0.0.1:* wss://*.deepgram.com https://*
```

https://* — обоснование:

Нельзя сузить до конкретных доменов, потому что:

1. Пользователь сам настраивает `llm_base_url` — любой LLM-провайдер (OpenAI, OpenRouter, Together, Groq, локальный прокси и т.д.).
2. Tauri CSP статичен на этапе сборки и не может динамически адаптироваться под настройки пользователя.
3. Альтернатива (предлагать пользователю редактировать CSP) создаёт неприемлемый UX surface.

Компенсирующие меры:

- `http://127.0.0.1:*` ограничен loopback-адресом (не `http://*`).
- `wss://*.deepgram.com` ограничен доменом Deepgram (единственный STT-провайдер).
- Проверка в `check-security-lanes.mjs` гарантирует, что `https://*` не удалён без осознанного решения.
- Если в будущем появится фиксированный список LLM-провайдеров, `https://*` можно будет сузить.

## Внешние провайдеры

- После отпускания hotkey фрагмент отправляется в Deepgram для распознавания речи (STT).
- Текстовый контекст/фрагмент отправляется во внешний LLM-провайдер, который вы настроили.
- Какие cloud STT/LLM провайдеры получают audio/text, определяется вашей конфигурацией в Settings.
- Для Candidate Pack: raw resume/JD/company значения локальны до явного запуска preparation; при preparation релевантный контент может уйти в LLM-провайдер; сохранённый compact context хранится локально.
- Политики хранения/логирования у этих провайдеров определяются их условиями, а не Replyline.
- Raw provider response body dumps, transcript exports и локальные debug traces считаются sensitive operational artifacts и должны оставаться local-only.

### Local vs Cloud URL policy

- Для удалённых LLM endpoint ожидается `https://`.
- `http://` поддерживается только для локального/local-network режима (loopback, private network ranges, `.local` hostnames), чтобы сохранить local-only сценарии (например Ollama / LM Studio) без TLS.

## Ответственность пользователя

- Пользователь сам отвечает за соблюдение:
  - правил платформы звонка,
  - политики работодателя,
  - локальных законов о записи и передаче данных.

Replyline не даёт юридических гарантий и не заменяет вашу правовую оценку.

Interview Mode — это видимая assistance-поверхность для подготовки и практики ответов. Пользователь сам отвечает за допустимое и прозрачное использование в своём контексте.

## Границы текущей stable beta

- Текущая stable beta: Windows-first и Russian-first.
- Поведение на разных машинах и во всех call-приложениях ещё не полностью доказано.
- Memory layer существует как отдельный будущий слой и не является core MVP story текущей stable beta.
- Memory is a future track and is not shipped or compiled into the current stable-beta runtime.
- There is no memory UI, memory command surface, or automatic memory persistence in the current stable beta.
