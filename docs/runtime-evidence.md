# Replyline Runtime Evidence

Replyline keeps runtime evidence local. The goal is to avoid "it probably works" and replace it with a small set of reproducible files.

## Evidence sources

- `pnpm probe:runtime`
  writes one JSON latency report for a specific scenario and provider path.
- `pnpm probe:bench`
  writes multiple JSON reports plus one Markdown comparison table.
- `pnpm evidence:bundle`
  creates one timestamped folder containing copied runtime reports, a manifest,
  and auto-generated `pipeline-latency-summary.json` (when app log is available).
- `pnpm parse:latency`
  parses `pipeline_timing` events from app log into
  `reports/runtime/pipeline-latency-summary.json`.
- `pnpm check:slo`
  validates global probe metrics plus per-stage latency targets from
  `docs/core-pipeline-slo.json` when stage data is available.
- `pnpm beta:handoff`
  creates one timestamped `reports/beta-handoff-*` folder that composes runtime evidence, manual smoke template, and benchmark scaffold references for machine-local handoff.
  `pnpm alpha:handoff` remains a deprecated compatibility alias.

Note:

- Runtime evidence artifacts are operator-triggered diagnostics.
- These artifacts may include transcript/card content and are written to local disk under `reports/`.

## Minimum evidence quality

At least one runtime JSON report should contain:

- scenario name
- STT mode
- LLM model
- capture limit
- captured audio duration
- STT time
- LLM time
- release-to-card latency
- transcript
- final card with `gist / say_now / next_move`

## Latency budgets (stable-beta operating targets)

### Pipeline stage targets

Per-stage targets are defined in `docs/core-pipeline-slo.json` under `corePipeline.stages`.
Timing data is extracted from app log (`pipeline_timing` events) via `pnpm parse:latency`.

| Stage              | p50 target |  p95 target |
| ------------------ | ---------: | ----------: |
| capture_stop       |  <= 500 ms |  <= 1500 ms |
| wav_encoding       |   <= 10 ms |    <= 50 ms |
| stt_request        | <= 2000 ms |  <= 5000 ms |
| llm_request        | <= 1500 ms |  <= 4000 ms |
| card_normalization |   <= 50 ms |   <= 200 ms |
| release_to_card    | <= 5000 ms | <= 12000 ms |

Fixture/probe gate policy:

- `maxAllowedFailures` lives in `corePipeline.fixture_probe.maxAllowedFailures`.
- `check:slo` applies this to `probe:soak` failure count when `soak-summary.json` exists.
- If `soak-summary.json` or parsed stage summary is absent, `check:slo` enters documented fallback mode and prints required follow-up commands.

These are engineering targets used for trend tracking, not universal guarantees:

- capture stop to transcript: target <= 3500 ms (batch STT lane)
- transcript to card: target <= 2500 ms
- release-to-card total: target <= 6000 ms

Labeling policy:

- `measured`: budget check has fresh runtime artifact on the same build family.
- `target`: intended budget exists but no fresh artifact yet.
- `pending verification`: artifact exists but is stale/noisy/not comparable.

Bundle acceptance:

- include at least one runtime JSON report
- include `manifest.json`
- include honesty section (`proves`, `does_not_prove`)

## What evidence does not prove

- that the same numbers hold on another machine
- that the same numbers hold in Zoom / Teams / Meet without a real call test
- that product quality is good enough for real users
- that a path is production-ready everywhere

## Claim labels

- Use `measured` only when evidence files exist and are recent enough for the current release decision.
- Use `target` for intended numbers without evidence artifacts.
- Use `pending verification` when artifacts are incomplete, noisy, or from a different build family.

## Paths

- `reports/runtime/*.json` (runtime probe reports)
- `reports/runtime/*.md` (runtime comparison tables)
- `reports/runtime/pipeline-latency-summary.json` (per-stage latency summary from `app.log`)
- `reports/runtime-evidence-*/manifest.json` (timestamped evidence bundles)
- `reports/beta-handoff-*/manifest.json` (compact beta handoff manifest)

## Latest measured session (machine-local)

Session date: 2026-05-24 (Windows workstation, `C:\Dev\replyline`).

- Preflight signal: `pnpm runtime:preflight` passed; settings file detected and parsed.
- Credential signal: env-based `DEEPGRAM_API_KEY` and `OPENAI_API_KEY` were not present in this session.
- Runtime probe status: `pnpm probe:runtime` failed with `DEEPGRAM_API_KEY is missing.`
- Bench status: `pnpm probe:bench` completed and produced artifacts, but all scenarios ended as errors because runtime probe could not start provider path.
- Live-source status: `pnpm probe:live-source` produced matrix artifacts, but all runs failed for the same missing-key reason.
- Bundle status: `pnpm evidence:bundle` created `reports/runtime-evidence-20260524-190354`.

Artifacts from this session:

- `reports/runtime/latency-comparison.json`
- `reports/runtime/latency-comparison.md`
- `reports/runtime/manual-live-source-live-comparison.json`
- `reports/runtime/manual-live-source-live-comparison.md`
- `reports/runtime-evidence-20260524-190354/manifest.json`

Claim label for this session: `pending verification` for live/provider latency claims.

## See also

- [verification-lanes.md](verification-lanes.md) — 4 lane модель (compile / mock / prompt / runtime).
- [benchmark-policy.md](benchmark-policy.md) — лейблы `target / measured / pending verification`.
- [`release-readiness.md`](release-readiness.md)

- [runtime-bringup.md](runtime-bringup.md) — как поднять runtime path первый раз.
- [copy-rules.md](copy-rules.md) — формулировки и баны.
