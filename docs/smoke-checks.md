# Replyline Manual Smoke Checks

Lean pre-alpha checks for Replyline's current tray-first MVP. This matrix is intentionally manual-first for critical runtime paths.

## Scope

Critical paths only:

- app starts
- tray works
- hotkey works
- capture starts/stops
- result card renders
- settings save
- secrets persist separately from settings
- clear context works
- runtime probe / evidence still works
- optional live-source measurement path

## Matrix

| Path | How to run | Manual or automated | Proves | Does not prove |
|---|---|---|---|---|
| App starts | Launch `pnpm tauri dev` (or packaged build) | Manual | Main window can open and Tauri shell boots on this workstation | Runtime providers, latency quality, cross-machine behavior |
| Tray works | Confirm tray icon + tray menu (`Open`, `Settings`, `Clear context`, `Quit`) | Manual | Tray integration and menu wiring are alive | End-to-end capture/analysis quality |
| Hotkey works | Press default `Ctrl+Alt+Space` (or configured hotkey) | Manual | Global shortcut is registered and capture flow can be triggered | Provider correctness or transcript quality |
| Capture starts/stops | Hold hotkey while system audio plays, then release | Manual | Capture controller starts/stops and transitions to analysis path | STT/LLM quality and repeatability |
| Result card renders | After release, check `gist / say_now / next_move` card appears | Manual | One compact response card is produced and UI renders result | Response usefulness in real calls |
| Settings save | Change settings in app, restart app, verify persisted values | Manual | Settings file persists and reloads correctly | Secret storage integrity |
| Secrets separate from settings | Save/update provider keys, verify `settings.json` does not contain key values | Manual | Key storage path is separate from plain settings file | Credential validity or expiration |
| Clear context works | Populate context by running snippets, click clear-context action in UI or tray, verify context resets | Manual | Context clear wiring works and reset signal is emitted | Long-session memory quality |
| Runtime probe/evidence lane | Run `pnpm probe:runtime` and `pnpm evidence:bundle` | Automated command + manual review | Real local capture->STT->LLM->card path produced artifact(s) | Cross-platform stability |
| Optional live-source path | Run `pnpm probe:live-source -- -SourceName teams -AudioMode manual-wait -DurationsCsv 15,30,60 -Repeats 2` | Operator-assisted (manual + script) | Replyline can be measured against a real live audio source on this workstation/session | Universal behavior across all call apps |

## Manual vs automated boundary

- Manual checks validate operator-visible UX/control flow for this specific machine.
- Automated checks (`pnpm smoke`) validate build + compile + tests, including the mock/UI lane and consistency gate.
- Runtime scripts (`probe:*`, `evidence:*`) generate artifacts for claims, but still require honest interpretation.

## Relationship to existing lanes

- Build/test lane: `pnpm smoke` (fast default gate).
- Mock/UI lane inside that fast gate: `pnpm test:ui`.
- Runtime lane: `pnpm probe:runtime`, `pnpm probe:bench`, `pnpm probe:durations`, `pnpm probe:live-source`, `pnpm evidence:bundle`.
- Manual artifact helper: `pnpm smoke:template` (creates one editable Markdown stub under `reports/` with references to latest runtime evidence when present).
- Alpha handoff helper: `pnpm alpha:handoff` (creates one compact handoff folder under `reports/` and places a smoke template in that same folder).

Use label discipline from `docs/benchmark-policy.md`: `target`, `measured`, `pending verification`.
