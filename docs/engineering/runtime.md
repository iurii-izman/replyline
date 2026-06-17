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
pnpm probe:durations -- -DurationsCsv 15,30,60 -Repeats 3
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

`pnpm test:quality` is the canonical deterministic quality harness.

It validates:

- answer-card contract and policy checks
- synthetic runtime-answer, product-scenario, `say_now`, and SLO checks
- ContextPack answer-quality fixtures (45 scenarios): evidence usage, fabrication guard,
  constraint respect, transcript-vs-context conflict resolution, oversized truncation safety
- regression drift across runtime/interview/say-now fixture lanes

It does not validate:

- live providers
- real machine latency
- manual desktop/call UX

### ContextPack answer quality fixtures

Located at `tests/fixtures/runtime-quality/runtime-answer-fixtures.json`.
Evaluated by `scripts/evaluate-runtime-answer-quality.mjs`.

Fixture categories (10 ContextPack-specific scenarios out of 45 total):

| Category | Fixture count | What it checks |
| --- | --- | --- |
| Same transcript + context | 1 | Context evidence appears in answer |
| Context constraints | 1 | Answer respects explicit constraints |
| Forbidden claim guard | 1 | No fabrication beyond context data |
| Transcript/context conflict | 1 | Transcript priority, uncertainty stated |
| Context disambiguation | 1 | Context helps interpret short fragments |
| Empty context safety | 1 | No context-pack hallucination tokens |
| Metrics from context | 1 | Context metrics used, no sensitive leak |
| No-fabrication guard | 1 | No invented metrics when data missing |
| Interview-style context | 1 | Context used in structured answer format |
| Oversized truncation safety | 1 | No leaked implementation details |

Each fixture uses `mockCardOverrides` for deterministic evaluation without
live LLM. For live-provider verification, use the template at
`tests/fixtures/runtime-live-evidence/context-pack-live-qa.template.md`.

**Current status (2026-06-17):** Automated ContextPack tests pass (265 Rust tests,
35 context_pack-specific, 47 QA fixtures). Automated evidence pack generated.
Manual provider scenarios pending — see
`tests/fixtures/runtime-live-evidence/context-pack-live-qa.2026-06-17.md`.

## Appendix: minimal live-runtime matrix template

Use this compact template when collecting operator evidence:

| testerId | machineProfile | callApp | scenarioType | captureDuration | sttProvider | llmProviderModel | sttSuccess | llmSuccess | cardGenerated | releaseToCardLatencyMs | blocker | artifactPath | claimLabel | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tester-01 | Lenovo T14 Gen2 | Teams | WorkConversation short capture | 5-10s | Deepgram | OpenAI-compatible:gpt-4o-mini | pending | pending | pending | n/a | none/S0-S3 | reports/... | pending verification | fill only with real runs |

## Beta runtime proof pack

A compact, shareable evidence pack that proves the core pipeline works without exposing secrets, raw transcripts, or private conversations.

### What the proof pack includes

| Artifact | Source | Safe to share |
| --- | --- | --- |
| `reports/runtime/runtime-probe-report-*.json` | `pnpm probe:runtime` | ✅ Sanitized: only `privacy_class=safe_metadata` fields |
| `reports/runtime/pipeline-latency-summary.json` | `pnpm parse:latency` | ✅ Aggregated p50/p95/min/max/count — no raw data |
| `reports/runtime/soak-summary.json` | `pnpm probe:soak` | ✅ Aggregated timing buckets — no raw data |
| `reports/runtime-quality/runtime-quality-summary-*.md` | `pnpm report:runtime-quality:strict` | ✅ Pass/fail verdict with stage-level metrics only |
| `reports/release/release-readiness-*.md` | `pnpm report:release-readiness` | ✅ Pass/fail verdict, risk snapshot, missing dimensions |
| `reports/manual/live-evidence-pack-*.json` | `pnpm report:live-evidence-pack` | ⚠️ Share only the JSON summary; never share raw segment data |

### What is safe to publish publicly

- Pipeline latency percentiles (p50, p95) — no raw transcript or prompt content
- Pass/fail verdicts from `verify:full` and `report:release-readiness`
- Honest claim labels: `measured`, `target`, `pending verification`
- Machine profile metadata (OS version, CPU/RAM) — without personal identifiers
- Call app and scenario type — without timestamps or participant names

### What remains local-only

- `reports/runtime/` — raw timing records, pipeline events with stage-level detail
- `reports/runtime-evidence-*/` — evidence bundles may contain app log excerpts
- `reports/beta-handoff-*/` — operator handoff bundles with diagnostic paths
- `exports/`, `interview-exports/` — full interview reports, ContextPack values
- `reports/manual/live-evidence-*.json` — raw evidence rows with machine paths
- Any file containing absolute paths (`C:\Users\...`), API keys, bearer tokens, raw transcripts, full prompt bodies, or provider response bodies

### How to generate a proof pack

```powershell
# 1. Verify the local build is green (no live providers needed)
pnpm verify

# 2. Run real-provider proof (requires configured STT + LLM)
pnpm probe:runtime
pnpm probe:durations -- -DurationsCsv 15,30,60 -Repeats 2
pnpm probe:soak

# 3. Collect evidence artifacts
pnpm evidence:bundle
pnpm parse:latency
pnpm check:slo

# 4. Generate summary reports (safe to share)
pnpm report:runtime-quality:strict
pnpm report:live-evidence-pack
pnpm report:release-readiness

# 5. Scan for accidental secret leaks before sharing
pnpm test:report-secret-leaks
```

### Sharing checklist

- [ ] `pnpm test:report-secret-leaks` — zero violations
- [ ] `pnpm test:public-footprint` — zero forbidden files
- [ ] No absolute machine paths in shared artifacts
- [ ] No API keys, bearer tokens, or credential values
- [ ] No raw transcripts, prompt bodies, or provider response bodies
- [ ] No ContextPack content, interview exports, or full report text
- [ ] Latency claims scoped to the specific machine and provider path
- [ ] Claims use correct labels: `measured` / `target` / `pending verification`

## See also

- [testing.md](testing.md)
- [manual-qa.md](manual-qa.md)
- [operations.md](operations.md)
- [../reference/errors.md](../reference/errors.md)
