# Stable Beta Release Freeze + Regression Matrix

## Baseline required scenarios

Source of truth: `docs/release-freeze-baseline.json`.

| Scenario                               | Path                                          | Expected outcome                                                       |
| -------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- |
| bootstrap-load                         | launch -> `load_bootstrap`                    | UI reaches `idle` or `settings`, no crash                              |
| hotkey-capture-release                 | hold/release hotkey                           | transitions `capturing -> transcribing -> analyzing/ready`             |
| capture-stop-analyze                   | `capture_stop_and_analyze`                    | user gets valid `gist / say_now / next_move` card or user-safe error   |
| retry-last-analysis                    | `retry_last_analysis`                         | card regenerates from last transcript, or user-safe "nothing to retry" |
| settings-save-and-reload               | save settings + restart                       | persisted values survive restart                                       |
| secrets-persist-separate-from-settings | save keys                                     | secrets not written into `settings.json`                               |
| clear-context                          | clear from UI/tray                            | context flags reset to inactive/0                                      |
| collect-diagnostic-bundle              | collect diagnostic bundle                     | bundle path + manifest produced                                        |
| runtime-probe-and-evidence             | `pnpm probe:runtime` + `pnpm evidence:bundle` | runtime JSON artifact exists                                           |

## Freeze guardrails

- No stack expansion.
- No architecture boundary drift (`model.ts`, `platform.ts`, `controller.ts`).
- Runtime/security lanes must stay intact (`pnpm verify`, `pnpm rust:deps`, `pnpm audit:npm`).

## Change visibility check

Run:

```bash
pnpm release:freeze:check
```

The check emits:

- changed files in current worktree;
- files outside the freeze allowlist/guardrails;
- a machine-readable artifact at `reports/release-freeze-check.json`.

`pnpm release:freeze:check:strict` fails if out-of-freeze files are detected.
