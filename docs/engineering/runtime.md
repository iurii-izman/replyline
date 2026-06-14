# Engineering Runtime Guide

Canonical engineering guide for runtime readiness, live-provider proof, evidence labeling, and operator evidence collection.

Synthetic quality lanes and live runtime evidence serve different purposes. A passing fixture lane does not prove provider readiness, and one successful live run does not prove cross-machine or cross-app stability.

## Provider readiness

Expected local provider setup for real runtime proof:

- `DEEPGRAM_API_KEY`
- `OPENROUTER_API_KEY` or `LLM_API_KEY`
- valid app settings in `%APPDATA%\com.replyline.app\settings.json`
- secrets stored through the local keyring path, not in committed files

Use [../runtime-probe-credentials.md](../runtime-probe-credentials.md) for credential setup details.

## Runtime preflight

Run before live claims or operator QA:

```powershell
pnpm runtime:preflight
```

Preflight is a machine-local readiness signal. It helps confirm settings/provider wiring, but it does not prove that `capture -> stt -> llm -> card` completed successfully.

## Real provider proof

Minimum real-provider proof:

```powershell
pnpm probe:runtime
pnpm evidence:bundle
```

Recommended supporting commands:

```powershell
pnpm probe:bench -- -Repeats 2
pnpm probe:durations:avg
pnpm probe:live-source -- -SourceName teams -AudioMode manual-wait -DurationsCsv 15,30,60 -Repeats 2
```

Real-provider proof on one workstation demonstrates:

- system-audio capture worked
- selected STT provider worked
- selected LLM route worked
- one card was produced

It does not demonstrate:

- cross-machine stability
- behavior in every call app
- broad product quality
- production readiness everywhere

## Evidence bundle

Core evidence-producing commands:

- `pnpm probe:runtime`
- `pnpm probe:bench`
- `pnpm probe:durations`
- `pnpm probe:durations:avg`
- `pnpm probe:live-source`
- `pnpm parse:latency`
- `pnpm check:slo`
- `pnpm evidence:bundle`

Typical artifact paths:

- `reports/runtime/*.json`
- `reports/runtime/*.md`
- `reports/runtime/pipeline-latency-summary.json`
- `reports/runtime-evidence-*/manifest.json`
- `reports/beta-handoff-*/manifest.json`

Minimum useful evidence bundle content:

- at least one runtime JSON report
- provider/model/scenario metadata
- transcript/card fields required for the local diagnostic flow
- latency fields for STT/LLM/release-to-card when measured
- `manifest.json`
- an honesty section describing what the bundle proves and does not prove

## Claim labels

Use these labels exactly:

| Label | Meaning | Use when |
| --- | --- | --- |
| `target` | Intended goal | There is a design target but no fresh comparable evidence |
| `measured` | Backed by local runtime evidence | Fresh evidence exists for the current build family and machine context |
| `pending verification` | Evidence is incomplete, stale, noisy, or not comparable | The path may exist, but current proof is not strong enough |

Rules:

- Never upgrade a claim to `measured` from `pnpm smoke`, `pnpm verify:*`, or mocked E2E alone.
- Scope `measured` claims to the workstation and scenario family that produced the artifact.
- Downgrade to `pending verification` when evidence is stale, partial, or from a different build family.

## What runtime evidence proves

- one specific machine/provider path worked
- local latency and artifact outputs were captured
- the claim can be tied to a saved file under `reports/`

## What runtime evidence does not prove

- another machine will behave the same way
- Teams/Zoom/Meet/Telemost parity
- stable latency across networks or long sessions
- overall UX correctness without manual QA
- release readiness by itself

## Synthetic harness boundary

`pnpm test:quality` is the canonical deterministic quality harness. `pnpm test:runtime-quality` remains a compatibility alias to the same bundle.

It validates:

- answer-card contract and policy checks
- synthetic runtime-answer, product-scenario, `say_now`, and SLO checks
- regression drift across runtime/interview/say-now fixture lanes

It does not validate:

- live providers
- real machine latency
- manual desktop/call UX

## Appendix: minimal live-runtime matrix template

Use this compact template when collecting operator evidence:

| testerId | machineProfile | callApp | scenarioType | captureDuration | sttProvider | llmProviderModel | sttSuccess | llmSuccess | cardGenerated | releaseToCardLatencyMs | blocker | artifactPath | claimLabel | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tester-01 | Lenovo T14 Gen2 | Teams | WorkConversation short capture | 5-10s | Deepgram | OpenAI-compatible:gpt-4o-mini | pending | pending | pending | n/a | none/S0-S3 | reports/... | pending verification | fill only with real runs |

## See also

- [testing.md](testing.md)
- [manual-qa.md](manual-qa.md)
- [operations.md](operations.md)
- [../reference/errors.md](../reference/errors.md)
