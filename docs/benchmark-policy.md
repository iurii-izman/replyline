# Replyline Benchmark Policy

Replyline uses three labels for performance and runtime claims.

| Label                  | Meaning                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `target`               | Intended design goal, not yet measured on a real machine     |
| `measured`             | Captured on a real workstation with a saved runtime artifact |
| `pending verification` | The path exists, but the proof is incomplete or noisy        |

## Rules

- Do not call latency `measured` without a saved JSON or Markdown artifact under `reports/runtime`.
- Do not treat `pnpm smoke` as runtime proof.
- Do not treat `pnpm test:ui` as runtime proof.
- Do not treat one lucky run as product truth when repeated runs are noisy.
- Prefer repeated runs (`pnpm probe:bench -- -Repeats 2`, `pnpm probe:durations:avg`) before changing the user-facing default.
- If artifacts are missing for the current build family, downgrade claims to `pending verification`.
- Scope all `measured` wording to the workstation(s) that produced evidence.
- `measured` never means cross-machine or cross-call-app readiness by itself.

## Reporting format

When writing docs or release notes, use this format:

- `target`: intended number or behavior
- `measured`: include evidence source path (example: `reports/runtime/<file>.json`)
- `pending verification`: explain what evidence is missing (example: repeated live-call runs)

Runtime helpers:

- `pnpm runtime:preflight` for machine-local readiness signal snapshot
- `pnpm benchmark:evidence` to scaffold a compact evidence note from runtime reports

## Current posture

- Runtime route is designed for short captures first.
- `120-180s` remains available but should be labeled `pending verification` for fast-path messaging unless repeated evidence says otherwise.

## See also

- [verification-lanes.md](verification-lanes.md) — 4 lane модель (compile / mock / prompt / runtime).
- [runtime-evidence.md](runtime-evidence.md) — где живут артефакты, минимальное качество.
- [runtime-bringup.md](runtime-bringup.md) — как поднять runtime path первый раз.

- [copy-rules.md](copy-rules.md) — формулировки и баны.