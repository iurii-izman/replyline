# Replyline Runtime Evidence

Replyline keeps runtime evidence local. The goal is to avoid "it probably works" and replace it with a small set of reproducible files.

## Evidence sources

- `pnpm probe:runtime`
  writes one JSON latency report for a specific scenario and provider path.
- `pnpm probe:bench`
  writes multiple JSON reports plus one Markdown comparison table.
- `pnpm evidence:bundle`
  creates one timestamped folder containing copied runtime reports and a manifest.
- `pnpm alpha:handoff`
  creates one timestamped `reports/alpha-handoff-*` folder that composes runtime evidence, manual smoke template, and benchmark scaffold references for machine-local handoff.

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

These are engineering targets used for trend tracking, not universal guarantees:

- capture stop to transcript: target <= 3500 ms (batch STT lane)
- capture stop to transcript: target <= 2500 ms (streaming STT lane)
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
- `reports/runtime-evidence-*/manifest.json` (timestamped evidence bundles)
- `reports/alpha-handoff-*/manifest.json` (compact alpha handoff manifest)

## See also

- [verification-lanes.md](verification-lanes.md) — 4 lane модель (compile / mock / prompt / runtime).
- [benchmark-policy.md](benchmark-policy.md) — лейблы `target / measured / pending verification`.
- [`release-readiness.md`](release-readiness.md)

- [runtime-bringup.md](runtime-bringup.md) — как поднять runtime path первый раз.
- [copy-rules.md](copy-rules.md) — формулировки и баны.