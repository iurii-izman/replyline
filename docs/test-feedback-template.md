# Replyline Test Feedback Template

Используйте шаблон как есть. Коротко и по делу.

## 1) Test context

- Tester:
- Date/time:
- Windows version:
- Call app/context:
- Scenario type (deadline / pushback / escalation / другое):

## 2) Core flow result

- Hotkey worked? (yes/no/unstable):
- Capture start/stop behaved predictably? (yes/no):
- Card appeared? (yes/no):

## 3) Usefulness score (главное)

- Was this a real "I need reply now" moment? (yes/no):
- Was `say_now` speakable without rewrite? (yes/no/partial):
- Did it reduce response time? (yes/no, approx seconds):
- Overall usefulness (0-5):

## 4) Problem classification (выберите всё релевантное)

- [ ] audio routing issue
- [ ] hotkey issue
- [ ] latency issue
- [ ] bad `say_now`
- [ ] trust/legal concern
- [ ] other

## 5) If problem happened

- Expected:
- Actual:
- How often (once / sometimes / always):
- Repro steps:
- Any runtime artifact/report file (if available):

## 5.1) Triage tags (trusted beta ops)

- Frequency (once / sometimes / always):
- Severity (S0/S1/S2/S3):
- Reproducibility (high / medium / low):
- Action (fix now / schedule / monitor):

## 6) Trust and scope check

- Did product behavior match trust docs? (yes/no + why):
- Any wording that sounded misleading? (quote):
- Any request that pushes to transcript/history/team workflow? (yes/no + short note):

## 7) Blocker decision

- Is this a blocker for wider testing? (yes/no):
- If yes, why exactly:
- Minimal fix expected before next tester wave:
