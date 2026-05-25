# Replyline Live Runtime Matrix

Matrix for first internal tester cycle. Fill rows with real measured runs only.

Safety rules:

- Do not add fake measurements.
- Do not store raw transcript, raw provider payloads, or secrets in matrix artifacts.
- Keep cross-machine/cross-call-app claims as `pending verification` until evidence exists.

## Operator matrix (copy template)

| testerId | machineProfile | windowsVersion | cpuRam | audioDevice | callApp | appVersionOrBrowser | scenarioType | captureDuration | sttProvider | llmProviderModel | sttSuccess | llmSuccess | cardGenerated | releaseToCardLatencyMs | usefulnessScore(1-5) | privacyConcern | blocker | artifactPath | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tester-01 | Lenovo T14 Gen2 | Windows 11 23H2 | i7 / 32GB | Realtek + USB headset | Zoom | desktop 6.x | WorkConversation short capture | 5-10s | Deepgram | OpenAI-compatible:gpt-4o-mini | pending | pending | pending | n/a | n/a | low/medium/high | none/S0/S1/S2/S3 | reports/... | pending verification |
| tester-01 | Lenovo T14 Gen2 | Windows 11 23H2 | i7 / 32GB | Realtek + USB headset | Microsoft Teams | desktop 241xx | WorkConversation medium capture | 20-30s | Deepgram | OpenAI-compatible:gpt-4o-mini | pending | pending | pending | n/a | n/a | low/medium/high | none/S0/S1/S2/S3 | reports/... | pending verification |
| tester-01 | Lenovo T14 Gen2 | Windows 11 23H2 | i7 / 32GB | Realtek + USB headset | Google Meet | Chrome 136+ | Retry | 20-30s | Deepgram | OpenAI-compatible:gpt-4o-mini | pending | pending | pending | n/a | n/a | low/medium/high | none/S0/S1/S2/S3 | reports/... | pending verification |
| tester-01 | Lenovo T14 Gen2 | Windows 11 23H2 | i7 / 32GB | Realtek + USB headset | Yandex Telemost | desktop/web build | Interview Mode | 20-30s | Deepgram | OpenAI-compatible:gpt-4o-mini | pending | pending | pending | n/a | n/a | low/medium/high | none/S0/S1/S2/S3 | reports/... | use if Telemost is available |
| tester-01 | Lenovo T14 Gen2 | Windows 11 23H2 | i7 / 32GB | Realtek + USB headset | Browser audio | Edge 136+ | WorkConversation short capture | 5-10s | Deepgram | OpenAI-compatible:gpt-4o-mini | pending | pending | pending | n/a | n/a | low/medium/high | none/S0/S1/S2/S3 | reports/... | signed-in browser call or web player |
| tester-01 | Lenovo T14 Gen2 | Windows 11 23H2 | i7 / 32GB | Realtek + USB headset | Local media playback/system audio fallback | VLC/Windows Media Player | WorkConversation medium capture | 20-30s | Deepgram | OpenAI-compatible:gpt-4o-mini | pending | pending | pending | n/a | n/a | low/medium/high | none/S0/S1/S2/S3 | reports/... | fallback when live call app is blocked |

## Structured JSON row template

Store structured rows as JSON in `reports/manual/live-evidence/` (recommended for aggregation script):

```json
{
  "schemaVersion": "replyline.live-runtime-matrix.row.v1",
  "row": {
    "testerId": "tester-01",
    "machineProfile": "Lenovo T14 Gen2",
    "windowsVersion": "Windows 11 23H2",
    "cpuRam": "i7 / 32GB",
    "audioDevice": "Realtek + USB headset",
    "callApp": "Microsoft Teams",
    "appVersionOrBrowser": "desktop 241xx",
    "scenarioType": "WorkConversation medium capture",
    "captureDuration": "20-30s",
    "sttProvider": "Deepgram",
    "llmProviderModel": "OpenAI-compatible:gpt-4o-mini",
    "sttSuccess": false,
    "llmSuccess": false,
    "cardGenerated": false,
    "releaseToCardLatencyMs": null,
    "usefulnessScore": null,
    "privacyConcern": "low",
    "blocker": "DEEPGRAM_API_KEY is missing",
    "artifactPath": "reports/runtime/manual-live-source-live-comparison.json",
    "notes": "pending verification"
  }
}
```
