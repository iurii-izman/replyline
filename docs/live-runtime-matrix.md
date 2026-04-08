# Replyline Live Runtime Matrix

This file keeps the live-source testing story honest.

## Current workstation state

This section is intentionally machine-specific and must be updated by the operator.

Use this quick template per workstation/session:

- Microsoft Teams: `<detected | not detected | unknown>`
- Zoom: `<detected | not detected | unknown>`
- Yandex Telemost: `<detected | not detected | unknown>`
- browser clients (Chrome/Edge): `<available | not available | unknown>`

If current signals are unknown, keep app-level claims as `pending verification`.

## What can be tested automatically today

- TTS-driven loopback runtime proof
- repeated duration comparisons with mean/min/max (`15s / 30s / 60s`)
- external-command audio sources

## What still needs an operator

- real Teams call audio
- real Google Meet audio in a signed-in browser session
- real Zoom / Telemost audio if those clients or sessions are available

## Recommended command

Manual live-source capture:

```powershell
pnpm probe:live-source -- -SourceName teams -AudioMode manual-wait -DurationsCsv 15,30,60 -Repeats 2
```

How to use it:

1. Start the real call audio first.
2. Run the command.
3. Press Enter when prompted.
4. Let the other side speak for the selected window.
5. Repeat for each duration and run index.
6. Review summary stats (`mean / min / max`) in the generated Markdown report.

Generated artifacts:

- `reports/runtime/<source>-live-comparison.json`
- `reports/runtime/<source>-live-comparison.md`

Honesty rule:

- treat live-source outputs as `pending verification` until there are repeated successful runs on the specific app/session you want to claim.
- do not claim cross-platform proof from a single app or single session.

## Why this is separate from the default bench

The default runtime bench proves the pipeline.
The live-source bench proves the pipeline against real call audio on this workstation.
Both are needed, and neither replaces the other.
