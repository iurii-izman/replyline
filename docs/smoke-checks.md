# Replyline Manual Smoke Checks

Lean stable-beta manual matrix для критичных runtime путей.

## Scope

Критичные ручные проверки:
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
| --- | --- | --- | --- | --- |
| App starts | Launch `pnpm tauri dev` (or packaged build) | Manual | Tauri shell boots on this workstation | Provider/runtime quality |
| Tray works | Verify tray icon/menu (`Open`, `Settings`, `Clear context`, `Quit`) | Manual | Tray wiring is alive | End-to-end provider quality |
| Hotkey works | Press default `Ctrl+Alt+Space` (or configured hotkey) | Manual | Shortcut registration + trigger path | Transcript/LLM quality |
| Capture starts/stops | Hold hotkey with system audio, then release | Manual | Capture flow transitions correctly | Repeatability across machines |
| Result card renders | Validate `gist / say_now / next_move` card | Manual | Card pipeline reaches UI | Real-call usefulness |
| Runtime probe/evidence lane | `pnpm probe:runtime` + `pnpm evidence:bundle` | Automated + review | Local capture->STT->LLM evidence exists | Cross-machine guarantees |

## Relationship to verification lanes

- Baseline automated gate: `pnpm verify:fast`.
- Strict local pre-handoff gate: `pnpm verify:release-local`.
- Manual smoke checks дополняют automated gates и не заменяются `release-on-tag` workflow.

`release-on-tag` публикует release notes; он не является packaging lane.
