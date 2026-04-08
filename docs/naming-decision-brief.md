# Replyline Naming Decision Brief (Alpha)

Короткая записка для решения: оставлять ли имя `Replyline` до beta/binary stage.

## Context

- Product now: Windows-first tray app для сложных рабочих разговоров.
- Core flow: hotkey -> short snippet -> `gist / say_now / next_move`.
- Stage: внутренняя русскоязычная alpha, source-only.
- Priority: trust + usability + readiness, без маркетингового шума.

## Current name evaluation

Оценка по шкале 1-10:

| Criterion | Score | Note |
| --- | ---: | --- |
| Clarity | 7 | Слово `Reply` помогает быстро понять назначение. |
| Trust | 8 | Нейтрально-профессиональное, без hype/stealth-коннотаций. |
| Memorability | 6 | Нормально, но не «липкое» имя. |
| Distinctiveness | 6 | Умеренно уникально, может теряться среди generic SaaS-нейминга. |
| Product fit | 8 | Поддерживает идею «помочь ответить сейчас». |

Вывод: имя достаточно хорошее для alpha, не идеально «финальное».

## Shortlist alternatives (max 7)

Не для немедленного rename, а как резерв при пересмотре:

1. `HoldCard`
2. `SayNext`
3. `Replycard`
4. `Tact`
5. `Cuecard`
6. `Riposte`
7. `NextMove`

## Recommendation

- **Keep through alpha:** оставить `Replyline` на текущем этапе.
- **Revisit window:** пересмотреть после первых **15-20 релевантных тестеров** (дошедших до реальных use-cases), но до решения о binary/beta rollout.
- **Rename only if trigger hits:** переименование делать только при подтверждённом сигнале, а не «по вкусу».

## Revisit triggers (pragmatic)

Пересмотр имени обязателен, если наблюдается хотя бы один устойчивый сигнал:

- тестеры не понимают продукт по имени без объяснения (повторяемо);
- название системно путают с notetaker/meeting assistant категорией;
- в фидбеке стабильно возникает более точный self-descriptor (например, вокруг card/hold/move);
- имя мешает trust в первых 10 секундах (не про функцию, а про ощущение «не то»).

Если этих сигналов нет, лучше не тратить фокус команды на rename до beta.
