# Replyline Internal Alpha Log

Рабочий журнал внутренней alpha.
Используйте его для фиксации baseline, daily runs и go/no-go решений.

## Day 1 — Baseline and Runtime Proof

- Date: 2026-04-06
- Operator: iurii
- Workspace: `C:\Dev\replyline`
- Stage: internal Russian-first alpha

### Commands

- `pnpm install` -> pass
- `pnpm smoke` -> pass
- `pnpm runtime:preflight` -> pass
- `pnpm probe:runtime` -> pass
- `pnpm evidence:bundle` -> pass

### Measured on this workstation

- Local configuration is readable and valid.
- `primaryLanguage=ru`
- `llmBaseUrl=https://openrouter.ai/api/v1`
- `llmModel=openai/gpt-4o-mini`
- `captureMaxSeconds=30`
- Deepgram path available
- LLM credential path available
- End-to-end runtime path succeeds
- Card generation succeeds in `gist / say_now / next_move` format

### Probe result

- Scenario: `loopback-tts-ru`
- Audio mode: `tts`
- STT mode: `batch`
- Model: `openai/gpt-4o-mini`
- Capture cap: `30s`

Transcript:

> У нас есть риск сдвига на два дня. Если сегодня согласуем приоритеты, срок удержим.

Card:

- Gist: `Риск сдвига на два дня, если не согласуем приоритеты сегодня.`
- Say now: `Понял, давайте обсудим приоритеты. Какие пункты нужно рассмотреть в первую очередь, чтобы уложиться в срок?`
- Next move: `Собрать мнения по приоритетам и зафиксировать их.`

Latency:

- `stop->pcm=18ms`
- `stt=3070ms`
- `llm=2127ms`
- `release->card=5217ms`

### What this proves

- Machine-local runtime path works.
- STT + LLM route is alive.
- Replyline can produce a usable card on this workstation.

### What this does not prove

- Live usefulness in real pressure moments.
- Cross-machine stability.
- Cross-call-app stability.
- That `5217ms` is acceptable in real conversations.

### Decision

- `GO -> Day 2 usefulness testing`
- `NOT YET -> trusted testers`

## Day 2 — Compact Log Sheet

Скопируйте этот блок 9 раз и заполните по каждому прогону.

```text
Run:
Date/time:
Scenario type: (deadline / pushback / escalation / other)
Call context/source:

Was this a real "need reply now" moment? (yes/no):
Hotkey worked? (yes/no/unstable):
Capture start/stop predictable? (yes/no):
Card appeared? (yes/no):

Gist quality (0-5):
Say_now speakable without rewrite? (yes/no/partial):
Next_move useful? (yes/no/partial):
Overall usefulness (0-5):

Did it help reply faster? (yes/no):
Approx seconds saved:
Main problem, if any: (latency / weak say_now / weak gist / weak next_move / trust / other)

Would I use this in a similar real moment again? (yes/no):
Blocker? (yes/no):
Short note:
Artifact/report path, if any:
```
