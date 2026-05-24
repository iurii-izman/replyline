# Settings Reference

Slim Stable Beta settings:

- `hotkey` (`string`)
- `captureMaxSeconds` (`number`, 5..180, default `45`)
- `selectedModelPreset` (`string`, default `custom_openai_compatible`)
- `llmBaseUrl` (`string`)
- `llmModel` (`string`)
- `debugTraceMode` (`"off" | "redacted" | "full_local"`, default `"redacted"`)
- `debugTraceRetentionDays` (`0 | 1 | 3 | 7`, default `3`; `0` means manual cleanup only)
- `deepgramApiKey` (stored as secret)
- `llmApiKey` optional (stored as secret)

## Model presets

Replyline ships static model presets (no live provider catalog fetch in-app):

- `OpenRouter Free / Dev`
- `OpenRouter Fast / Budget`
- `OpenRouter Balanced Paid`
- `OpenRouter Quality Paid`
- `Custom OpenAI-compatible`

`llmApiKey` and `deepgramApiKey` are not written to `settings.json`; they stay in the OS credential store.

OpenRouter presets can attach a fallback model ladder in request payload (`models`) for safer routing. Custom/OpenAI-compatible routes continue using only `model` to preserve compatibility.

Recommendations are not fixed forever: model quality/cost/latency can change over time. Validate quality on your golden dataset before promoting a profile.

No Advanced Mode fields in user-facing settings contract.

## Mode boundary reminders

- Candidate Pack is prepared/saved locally but preparation can call the configured cloud LLM provider.
- Saved Candidate Pack compact context is used by default for Interview Mode (active session), not WorkConversation.

## Report/export sensitivity

- Full report markdown export includes transcript and must be treated as sensitive.
- Redacted report markdown export excludes raw/full transcript and is the safer sharing path.

## Settings IA (everyday vs diagnostics)

- `Reports` now separates two groups:
- Everyday reports/privacy: interview report retention and manual report clearing.
- Diagnostics/ops: `debugTraceMode`, trace retention, trace folder open/clear actions.
- `debugTraceMode=full_local` is explicitly high-sensitivity local diagnostics and should be enabled only for incident troubleshooting.

## Local diagnostics controls

- `debugTraceMode=off`: no local debug trace artifacts.
- `debugTraceMode=redacted` (default): diagnostics with sanitization/redaction for routine triage.
- `debugTraceMode=full_local`: stores sensitive local diagnostic content for deep local debugging.
- `debugTraceRetentionDays=0`: manual cleanup only.
- `debugTraceRetentionDays=1|3|7`: automatic cleanup window for trace artifacts.
