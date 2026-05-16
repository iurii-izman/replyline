# Replyline Privacy and Trust (Internal Stable Beta)

Короткая truth-модель для текущей внутренней русскоязычной stable beta.

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
- Локальный `app.log` и диагностический bundle проходят санитизацию/редакцию (секреты, токены, потенциальные PII маскируются).

### Redaction v1 (Privacy)

Многоуровневая система редакции в `src-tauri/src/privacy.rs`:

| Tier | Helper | Что покрывает |
|------|--------|--------------|
| R1 | `redact_secrets` | API keys, bearer tokens, secret=, JSON secret fields, URL credentials |
| R2 | `redact_transcript_like` | Полный transcript/LLM prompt → chars_band + safe preview |
| R3 | `safe_preview` | Безопасное усечение любой строки с R1-редакцией |
| R4 | `redact_url_credentials` | URL userinfo (`user:pass@`), token query params |

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

**`https://*` — обоснование:**

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
- Политики хранения/логирования у этих провайдеров определяются их условиями, а не Replyline.

### Local vs Cloud URL policy

- Для удалённых LLM endpoint ожидается `https://`.
- `http://` поддерживается только для локального/local-network режима (loopback, private network ranges, `.local` hostnames), чтобы сохранить local-only сценарии (например Ollama / LM Studio) без TLS.

## Ответственность пользователя

- Пользователь сам отвечает за соблюдение:
  - правил платформы звонка,
  - политики работодателя,
  - локальных законов о записи и передаче данных.

Replyline не даёт юридических гарантий и не заменяет вашу правовую оценку.

## Границы текущей stable beta

- Текущая stable beta: Windows-first и Russian-first.
- Поведение на разных машинах и во всех call-приложениях ещё не полностью доказано.
- Memory layer существует как отдельный будущий слой и не является core MVP story текущей stable beta.
- Наличие memory backend в коде не означает включённую memory-функциональность в текущем user-facing stable-beta потоке.
