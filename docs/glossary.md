# Glossary — Replyline

> Словарь проектных терминов. Используется когда нужно быстро понять vocabulary без чтения full doc.
> Если термин здесь отсутствует — это сигнал для добавления, а не для игнорирования.

## A

- **AGENTS.md** — root-уровневый файл с repo-wide policy precedence для AI-инструментов. Имеет приоритет выше любых tool-specific adapters.

## C

- **capture** — короткое hotkey-gated окно записи системного аудио через WASAPI loopback. Hold-to-capture, без background recording.
- **CommandError** — typed Rust enum для IPC ошибок (`Settings/Credential/Capture/Pipeline/Internal`) с frontend routing на settings anchors.
- **context layer** — RAM ring buffer краткосрочной памяти между захватами. 3 entries, 1500 chars, 20-мин TTL, FIFO eviction. Подробнее в [architecture.md](architecture.md).
- **copy-rules** — дисциплина формулировок: банлист терминов (`stealth`, `therapy`, `emotion`), claim labeling, runtime claim language. См. [copy-rules.md](copy-rules.md).

## D

- **Deepgram** — текущий STT провайдер. Поддерживается batch и streaming, default = batch.
- **archive/strategic/** — локальный архив стратегических/roadmap-документов вне минимального публичного GitHub footprint.

## E

- **evidence bundle** — local artifact bundle (`pnpm evidence:bundle`) с runtime proof, durations и log snippets для beta handoff.
- **evidence discipline** — дисциплина: claim не поднимается до `measured` без runtime artifact в `reports/runtime/`.

## F

- **fixture gate** — optional CI gate с реальным API key через GitHub secrets. Запускает prompt-contract против реального LLM endpoint.

## G

- **gist / say_now / next_move** — три обязательных поля output card. `gist` = краткое summary, `say_now` = что сказать прямо сейчас, `next_move` = следующий шаг.

## H

- **hotkey-gated** — capture только во время удержания глобального hotkey. Никакого автоматического background monitoring.

## L

- **lane** — изолированная категория верификации. Replyline различает 4 lane: compile, mock/UI, prompt/contract, runtime proof. См. [verification-lanes.md](verification-lanes.md).
- **live-runtime matrix** — таблица проверок на реальных call-приложениях (Teams/Zoom/Meet/Telemost). Operator-mutable. См. [live-runtime-matrix.md](live-runtime-matrix.md).

## M

- **measured** — claim level: подтверждён runtime artifact, не теорией. Высший уровень доверия в [benchmark-policy.md](benchmark-policy.md).
- **mock lane** — UI-тесты с stubbed providers, без сети. Быстрый, deterministic, не доказывает runtime поведение.

## P

- **pending verification** — claim level: пока без artifact, ждёт runtime proof. Допустимо для альфы, но должно явно метиться.
- **prompt-contract** — deterministic check JSON shape LLM ответа против fixtures. Не вызывает реальный API. См. [prompt-contract-lane.md](prompt-contract-lane.md).
- **PROMPT_VERSION** — версия system prompt, фиксируется в LLM payload и runtime artifacts. Текущее значение: `v2`.

## R

- **RAM-only** — никакого долгосрочного хранения transcript/audio. Всё живёт в памяти процесса до закрытия окна или нового capture.
- **release lane** — runtime artifact в `reports/runtime/`, источник `measured` claims. Single source of truth для performance numbers.
- **Replyline** — Windows-first local desktop assistant for preparing the next response in difficult work conversations and interviews.
- **runtime probe** — отдельный binary с per-stage timing (capture → STT → LLM → render). Запускается через `pnpm probe:runtime`.

## S

- **schema migration v1→v2** — settings JSON migration framework. При load старого формата автоматически апгрейдит до v2.
- **smoke** — composite local gate: `pnpm smoke`. Build + Rust tests + mock/UI lane + product-policy gates. Не доказывает runtime.

## T

- **target** — claim level: проектное значение, ещё не измерено. Требует пометки `target` в любом user-facing тексте.
- **3-level JSON parsing** — fallback цепочка парсинга LLM ответа: direct → brace extraction → field regex. Защищает от LLM-форматных дефектов.

## V

- **verification lane** — см. **lane**.

## W

- **WASAPI loopback** — Windows audio API для захвата system audio output (то что слышит пользователь). Только Windows, mac/Linux out of scope.
