# Runtime Live QA (Windows)

Step-by-step operator flow for real live evidence collection.

## Paths

- Settings file: `%APPDATA%\com.replyline.app\settings.json`
- App log: `%APPDATA%\com.replyline.app\logs\app.log`
- Matrix: `docs/live-runtime-matrix.md`
- Feedback template: `docs/test-feedback-template.md`

## 1) Prepare machine

1. Confirm Windows 10/11 build, CPU/RAM, and primary audio device.
2. Confirm call app and version/browser are recorded for this run.
3. Start a safe test conversation/media source (no sensitive content).

## 2) Configure providers

1. Open Replyline Settings.
2. Fill Deepgram key + LLM base URL/model (+ optional LLM key).
3. Save settings and keep credentials only in local/keyring storage.

## 3) Run runtime preflight

Run:

```powershell
pnpm runtime:preflight
```

If preflight fails, mark matrix row as `pending verification` with blocker reason.

## 4) Run WorkConversation short capture

1. Hold `Ctrl+Alt+Space` for ~5-10s.
2. Wait for card.
3. Record STT/LLM/card success + latency (if measured).

## 5) Run WorkConversation medium capture

1. Hold `Ctrl+Alt+Space` for ~20-30s.
2. Wait for card.
3. Record usefulness and any regressions.

## 6) Run retry

1. Trigger retry (`retry_last_analysis` / UI retry).
2. Record if retry succeeds and if card quality changed.

## 7) Run Interview Mode scenario

1. Start interview session.
2. Ask at least one question.
3. End session and verify interview card/report path.

## 8) Export redacted report

1. Export redacted markdown only for sharing.
2. Keep full transcript export internal-sensitive.

## 9) Generate evidence bundle

Run:

```powershell
pnpm evidence:bundle
powershell -ExecutionPolicy Bypass -File scripts/collect-live-runtime-evidence.ps1
```

Optional verification:

```bash
node scripts/verify-live-runtime-evidence.mjs reports/runtime-live-evidence-YYYYMMDD-HHMMSS
```

## 10) Fill feedback template

Fill `docs/test-feedback-template.md` and add artifact paths only (no secret values, no raw transcript dumps).

## 11) Mark evidence as measured/pending

Use strict status:

- `measured`: real run succeeded and measured fields are present.
- `partial`: run exists but dimensions are incomplete (apps/machines/scenarios).
- `pending verification`: no measured latency or provider path failed.

Then run:

```powershell
pnpm report:live-evidence-pack
```

Generated report:

- `reports/manual/live-evidence-pack-YYYY-MM-DD.md`

Security guardrails:

- Never put raw keys/tokens in notes or artifacts.
- Never include raw transcript in shared/public artifacts.
- Do not claim cross-machine/cross-call-app readiness from a single successful run.
