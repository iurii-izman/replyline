# Replyline Test Feedback Template

Используйте шаблон как есть. Все поля ниже обязательны, кроме явно помеченных optional.

## 1) Scenario

- Scenario ID/title:
- Mode: `WorkConversation` / `Interview Mode` / `Candidate Pack`
- Date/time (local):
- Tester:

## 2) Expected vs Actual

- Expected:
- Actual:

## 3) Environment

- App / call tool: `Zoom` / `Microsoft Teams` / `Google Meet` / `Yandex Telemost` / `Browser-system-audio` / other
- Machine profile: device model, CPU, RAM
- OS: Windows 10/11 build
- Audio source path: loopback/system/call-device

## 4) Provider setup

- Deepgram configured: yes/no
- LLM base URL:
- LLM model:
- LLM API key configured (optional): yes/no
- Local LLM used: yes/no

## 5) Core result

- STT success: yes/no/partial
- LLM success: yes/no/partial
- Card/report received: yes/no
- Usefulness score (1-5):
- If WorkConversation: `gist` (1-5), `say_now` (1-5), `next_move` (1-5)
- If Interview Mode: interview answer usefulness (1-5), report usefulness (1-5)

## 6) Severity and privacy

- Severity: `S0` / `S1` / `S2` / `S3`
- Privacy sensitivity: `low` / `medium` / `high`
- Suspected secret leakage: yes/no
- Includes sensitive transcript data: yes/no

## 7) Reproduction

- Reproduction steps:
1.
2.
3.
- Reproducibility: once / sometimes / always

## 8) Evidence

- Evidence path(s) (local files only):
- Screenshots/log snippets redacted: yes/no
- Full interview export attached: yes/no (if yes, mark as sensitive internal only)
- Redacted export attached: yes/no

## 9) Blocker decision

- Blocker for next tester wave: yes/no
- If yes, stop condition triggered:
- Minimal fix expected before re-test:

## 10) Notes (optional)

- Latency impression (fast/ok/slow + note):
- Boundary confusion (WorkConversation vs Interview vs Candidate Pack):
- Additional trust concern:
