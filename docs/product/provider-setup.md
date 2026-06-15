# Provider Setup

Инструкции по настройке OpenAI-совместимых LLM-провайдеров для Replyline.
Настройки вводятся в окне **Settings** приложения.

> **Важно**: все ключи хранятся локально в Windows Credential Manager и никогда
> не попадают в `settings.json`, логи, скриншоты или issues. Перед тестированием
> ознакомьтесь с [privacy.md](privacy.md).

## Где вводить значения

В Replyline Settings заполните поля:

| Поле | Что вводить |
| --- | --- |
| `LLM base URL` | Базовый URL OpenAI-совместимого endpoint (обычно заканчивается на `/v1`) |
| `LLM model` | Название модели в формате провайдера |
| `LLM API key` | API-ключ провайдера (если требуется) |
| `selectedModelPreset` | Выберите `Custom OpenAI-compatible` для ручной настройки |

Поля `LLM base URL`, `LLM model` и `LLM API key` появляются после выбора
пресета `Custom OpenAI-compatible`.

---

## OpenRouter

OpenRouter — агрегатор с OpenAI-совместимым API и встроенной поддержкой
в Replyline через пресеты.

**Быстрый старт через пресет**:

1. В Settings выберите один из OpenRouter-пресетов:
   - `OpenRouter Free / Dev` — бесплатные модели, возможны ограничения.
   - `OpenRouter Fast / Budget` — быстрые недорогие модели.
   - `OpenRouter Balanced Paid` — сбалансированные платные модели.
   - `OpenRouter Quality Paid` — наиболее производительные платные модели.
2. Введите `LLM API key` — ваш OpenRouter API key.
3. Сохраните настройки.

**Ручная настройка (Custom)**:

| Поле | Значение |
| --- | --- |
| `LLM base URL` | `https://openrouter.ai/api/v1` |
| `LLM model` | Например: `openai/gpt-4o-mini`, `anthropic/claude-3.5-haiku`, `google/gemini-2.0-flash-001` |
| `LLM API key` | OpenRouter API key |
| `selectedModelPreset` | `Custom OpenAI-compatible` |

**Где получить ключ**: [openrouter.ai/keys](https://openrouter.ai/keys)

**Особенности**:

- OpenRouter-пресеты используют fallback ladder — если основная модель недоступна,
  Replyline автоматически пробует следующую из списка.
- При ручной настройке (`Custom OpenAI-compatible`) fallback ladder не используется —
  запрос идёт только к указанной модели.
- Бесплатные модели имеют rate limits; доступность варьируется.

**Документация**: [openrouter.ai/docs](https://openrouter.ai/docs)

---

## Groq

Groq — облачный провайдер с OpenAI-совместимым API, использующий LPU (Language
Processing Unit) для быстрого инференса.

### Настройка

1. В Settings выберите `selectedModelPreset` = `Custom OpenAI-compatible`.
2. Заполните поля:

| Поле | Значение |
| --- | --- |
| `LLM base URL` | `https://api.groq.com/openai/v1` |
| `LLM model` | Название модели Groq (см. таблицу ниже) |
| `LLM API key` | Groq API key |

3. Сохраните настройки.

### Доступные модели (рекомендуемые)

Актуальный список на [console.groq.com/docs/models](https://console.groq.com/docs/models).

| Модель | Идентификатор для `LLM model` | Примечание |
| --- | --- | --- |
| Llama 4 Scout (быстрая, бесплатно) | `meta-llama/llama-4-scout-17b-16e-instruct` | Бесплатный тир, высокая скорость |
| Llama 3.3 70B (универсальная) | `llama-3.3-70b-versatile` | Платно, хороший баланс скорость/качество |
| Llama 3.1 8B (лёгкая) | `llama-3.1-8b-instant` | Платно, максимальная скорость |
| Qwen 2.5 32B | `qwen-2.5-32b` | Платно, хорошее качество на русском |
| DeepSeek R1 Distill Llama 70B | `deepseek-r1-distill-llama-70b` | Платно, reasoning-модель |

### Где получить ключ

1. Зарегистрируйтесь на [console.groq.com](https://console.groq.com).
2. Перейдите в [API Keys](https://console.groq.com/keys).
3. Создайте ключ и скопируйте его в Replyline Settings.

### Минимальный scope ключа

API-ключ Groq даёт доступ ко всем chat completion моделям вашего аккаунта.
Специальных разрешений не требуется — ключ работает сразу после создания.

### Особенности

- **Статус**: `documented setup` (не `measured compatibility`). Настройка описана
  по публичной документации Groq; live-проверка на текущей машине не проводилась.
- Бесплатный тир имеет ограничения по количеству запросов в минуту/день.
- Некоторые модели доступны только в платном тире.
- Поддерживаются chat completions (OpenAI-совместимый формат), streaming.
- Не все модели поддерживают system prompt — проверьте документацию модели.

**Документация**: [console.groq.com/docs](https://console.groq.com/docs)

---

## Другие OpenAI-совместимые провайдеры

Replyline работает с любым OpenAI-совместимым endpoint. Общий шаблон:

1. `selectedModelPreset` = `Custom OpenAI-compatible`.
2. `LLM base URL` = URL провайдера (обычно заканчивается на `/v1`).
3. `LLM model` = идентификатор модели в формате провайдера.
4. `LLM API key` = ключ, если endpoint требует авторизации.

Поддерживаемые категории:

- **Локальные**: Ollama (`http://localhost:11434/v1`), LM Studio (`http://localhost:1234/v1`),
  vLLM, LocalAI, text-generation-webui.
- **Облачные**: Groq, OpenRouter, Together AI, Fireworks AI, DeepInfra,
  OpenAI-совместимые прокси.

Для локальных endpoint убедитесь, что:

- URL использует `http://` (loopback или private network).
- Модель загружена и готова принимать запросы.
- Если endpoint без авторизации — оставьте `LLM API key` пустым.

> **Предупреждение**: эта секция — краткий справочник, а не measured compatibility
> list. Проверяйте конкретный endpoint на своей машине перед регулярным использованием.

---

## Общие caveats

- **Латентность** зависит от модели, провайдера, сети и длины capture.
- **Стоимость** определяется тарифами провайдера и не контролируется Replyline.
- **Rate limits** — уточняйте в документации провайдера.
- **Доступность моделей** может меняться; проверяйте актуальный список на сайте провайдера.
- **Локальный LLM-эндпоинт не делает продукт полностью local-only**,
  поскольку STT всё ещё идёт через Deepgram.
- **Конфиденциальность**: API-ключи хранятся локально в Windows Credential Manager.
  Никогда не публикуйте ключи, скриншоты с ключами или логи с ключами в issues,
  коммитах или публичных каналах.

## Связанные документы

- [user-guide.md](user-guide.md) — основной гайд по настройке и использованию
- [privacy.md](privacy.md) — политика конфиденциальности и хранения данных
- [limitations.md](limitations.md) — текущие ограничения beta
- [../model-ladder.md](../model-ladder.md) — поведение model ladder для пресетов
- [../BETA_TESTING.md](../../BETA_TESTING.md) — инструкция для бета-тестеров
