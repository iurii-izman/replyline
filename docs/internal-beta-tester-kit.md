# Internal Stable Beta Tester Kit

Единый runbook для внутреннего stable beta тестирования Replyline.

## 1) Purpose

Кому: semi-technical внутренним тестерам (Windows 10/11), которые проверяют реальную полезность и надёжность, а не придумывают новые фичи.

Статус:

- только `internal stable beta`
- это **не** public beta

Что ожидается от фидбека:

- воспроизводимость (что делали, где сломалось)
- полезность ответа (`gist / say_now / next_move` и Interview card)
- trust/privacy замечания
- evidence paths без утечки чувствительных данных

## 2) Product boundaries

Поддерживаемые продуктовые линии:

- WorkConversation: `capture -> stt -> llm -> card`
- Interview Mode: активная interview session с `InterviewCardSchemaV1`
- Candidate Pack: подготовка контекста только для Interview Mode
- Reports/exports: локальные post-interview отчёты + full/redacted markdown exports

Out of scope:

- memory
- local STT
- Advanced Mode UI
- hidden overlay
- transcript/history/team workflows
- cheating workflow
- claims уровня public beta readiness / works everywhere / always low latency / fully local-only

## 3) Setup prerequisites

Обязательно:

- Windows 10/11
- Deepgram API key (STT)
- LLM endpoint (`llm_base_url`)
- LLM model
- optional LLM API key (если endpoint требует)

Важно:

- local LLM допустим через local OpenAI-compatible endpoint
- local LLM **не** делает систему fully local-only, пока STT идёт через Deepgram
- local STT в текущем stable beta не поддерживается

## 4) Data flow (plain language)

1. Вы удерживаете hotkey (`Ctrl+Alt+Space`) для короткого захвата system audio.
2. После отпускания hotkey audio snippet отправляется в Deepgram (STT). Audio покидает машину.
3. Transcript/context отправляется в настроенный LLM provider.
4. Приложение показывает карточку ответа в UI.
5. Настройки хранятся локально в `%APPDATA%\com.replyline.app\settings.json`.
6. Секреты (API keys) хранятся в Windows Credential Manager (OS keyring).
7. Interview reports и markdown exports создаются локально по явному действию пользователя.

Чувствительность данных:

- `Export full markdown (includes transcript)` — sensitive
- `Export redacted markdown (no transcript)` — safer sharing path

## 5) WorkConversation test path

### Setup

1. Открыть Settings.
2. Заполнить Deepgram key, LLM base URL, LLM model, optional LLM key.
3. Нажать runtime readiness проверку в UI (`Проверить настройки`), убедиться что path готов.

### Scenario run

1. Короткий capture: удерживать hotkey до завершения полной реплики; минимальной длительности нет.
2. Средний capture: удерживать hotkey ~20-30 секунд.
3. Retry: выполнить `retry_last_analysis` / retry в UI после одного из capture.
4. Нажать copy для `say_now` и оценить, произносимо ли без переписывания.
5. Очистить контекст (`Clear context`/эквивалент в UI) и убедиться, что следующий ответ не опирается на предыдущий фрагмент.

### Feedback fields (минимум)

- hotkey/capture predictability
- STT success/failure
- LLM success/failure
- usefulness `gist` / `say_now` / `next_move` (1-5)
- latency impression
- blocker yes/no

## 6) Interview Mode test path

1. Запустить `start_interview_session` (через UI Interview Mode).
2. Задать 1-2 interview questions.
3. Убедиться, что приходят ответы Interview Mode (`InterviewCardSchemaV1` path).
4. Завершить сессию (`end_interview_session`).
5. Экспортировать `full markdown` (sensitive).
6. Экспортировать `redacted markdown` (no transcript).
7. Проверить retention expectation:
   - отчёты хранятся локально
   - `manual clear` означает, что отчёты удаляются только явно

Feedback fields:

- answer relevance for interview prep
- mode clarity (не перепутан ли с WorkConversation)
- report usefulness (1-5)
- redacted export пригоден для шаринга? (yes/no)

## 7) Candidate Pack test path

1. Подготовить Candidate Pack (resume/JD/company values) в безопасно-redacted виде.
2. Подтвердить, что Candidate Pack относится к Interview Mode.
3. Подтвердить, что WorkConversation по умолчанию не использует Candidate Pack context.
4. Проверить понятность step flow и ожидаемость результата.

Feedback fields:

- pack preparation clarity
- context quality for interview answers
- any confusion about WorkConversation boundary

## 8) Cross-call-app matrix

Заполняйте canonical matrix из `docs/live-runtime-matrix.md`.

Минимальный coverage для первой internal wave:

- Zoom
- Microsoft Teams
- Google Meet
- Yandex Telemost / Telemost (если доступно)
- Browser audio
- Local media playback/system audio fallback

Для агрегации в `pnpm report:live-evidence-pack` храните structured rows в:

- `reports/manual/live-evidence/*.json`

Правило честности: не переносите результат с одной app/машины на universal claim.

## 9) Evidence and logs

Что можно шарить:

- redacted bug notes
- issue reproduction steps
- paths к локальным артефактам (`reports/...`) без публикации чувствимого содержимого
- redacted export (предпочтительно)

Что нельзя шарить публично:

- API keys/tokens
- raw transcript
- full interview markdown export (без внутреннего need-to-know)
- raw Candidate Pack values
- provider response bodies
- local absolute machine paths that reveal user profile/workstation layout (sanitize before external sharing)

Где генерируются отчёты:

- runtime/evidence: локально в `reports/`
- interview store: `%LOCALAPPDATA%\com.replyline.app\reports\interview-reports.json`
- markdown exports: локально по явному действию пользователя

Safe sharing rule:

- Для баг-репорта по умолчанию используйте redacted export + redacted notes.
- Full transcript export и raw evidence разрешены только внутри внутреннего need-to-know канала.

## 10) Stop conditions

Остановить прогон и сразу репортить blocker, если есть:

- app crash
- capture не стартует/не останавливается корректно
- STT repeatedly fails
- LLM repeatedly fails
- подозрение на secret leakage
- misleading interview answer, который может повредить реальному использованию
- privacy concern, который нельзя безопасно обойти

## 11) Feedback template

Использовать: `docs/test-feedback-template.md`

Обязательные поля:

- scenario
- expected
- actual
- app/call tool
- machine profile
- provider setup
- evidence path
- severity
- privacy sensitivity
- reproduction steps
- usefulness score 1-5

## 12) Link map

Быстрый маршрут для тестера:

1. Этот документ: `docs/internal-beta-tester-kit.md`
2. Краткий entry: `docs/tester-brief.md`
3. Шаблон фидбека: `docs/test-feedback-template.md`
4. Privacy boundaries: `docs/privacy-and-trust.md`
5. Limitations: `docs/known-limitations.md`
6. Providers: `docs/third-party-providers.md`
7. Interview details: `docs/interview-mode.md`
8. Candidate Pack details: `docs/candidate-pack.md`
9. Manual closure checklist: `docs/manual-closure-pack.md` + `docs/manual-closure-pack.html`
10. Windows UX checklist: `docs/manual-windows-ux-qa.md`
11. Live runtime matrix: `docs/live-runtime-matrix.md`
12. Live runtime QA flow: `docs/runtime-live-qa.md`
