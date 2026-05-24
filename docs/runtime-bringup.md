# Replyline Runtime Bring-up

This is the minimum real-runtime path for Replyline on Windows.

## 1. Provider readiness

The shell running Replyline should have:

- `DEEPGRAM_API_KEY`
- `OPENROUTER_API_KEY` or `LLM_API_KEY`

Credential setup examples and cleanup are documented in:

- [runtime-probe-credentials.md](runtime-probe-credentials.md)

## 2. Local app state

Replyline stores:

- settings: `%APPDATA%\com.replyline.app\settings.json`
- secrets: Windows Credential Manager service `com.replyline.app.credentials`

First-run UX expectation:

- when setup is incomplete, main surface should show actionable setup steps (`Speech`, `LLM`, `Hotkey`) and direct links into corresponding Settings sections.

## 3. Real provider proof

Run:

```powershell
pnpm probe:runtime
```

If env credentials are missing, this command is expected to fail.

This proves on this workstation:

- system-audio capture worked
- Deepgram STT worked
- the selected LLM route worked
- one result card was produced

This does not prove cross-machine stability or cross-app behavior.

## 4. Variant comparison

Run:

```powershell
pnpm probe:bench
pnpm probe:bench -- -Repeats 2
```

This compares several runtime variants and writes:

- `reports/runtime/latency-comparison.json`
- `reports/runtime/latency-comparison.md`

Use this lane to support `measured` vs `pending verification` labels for runtime claims.

Keep `batch` STT + one fast LLM route as the default decision path unless repeated evidence clearly says otherwise.

## 5. Duration comparison

Run:

```powershell
pnpm probe:durations
pnpm probe:durations:avg
pwsh -File scripts/runtime-duration-bench.ps1 -Include120 -Include180
```

This writes:

- `reports/runtime/duration-comparison.json`
- `reports/runtime/duration-comparison.md`

`pnpm probe:durations:avg` is the clean repeated-run path for `15s / 30s / 60s` and includes mean/min/max in the summary.

Use duration lane output to separate two product modes:

- interactive response mode: usually `5-60s`
- extended context capture: `120-180s`, but only as an experimental path

Longer fragments are supported, but they should not be marketed as the fast path until there is stable low-latency evidence on real calls.

## 6. Live-source comparison

Run:

```powershell
pnpm probe:live-source -- -SourceName teams -AudioMode manual-wait -Durations 15,30,60 -Repeats 2
```

If shell argument parsing collapses duration lists, use CSV form:

```powershell
pnpm probe:live-source -- -SourceName teams -AudioMode manual-wait -DurationsCsv 15,30,60 -Repeats 2
```

Use this when real call audio is already playing from Teams, Meet, Zoom, Telemost, or a browser tab. The script does not create the call for you; it measures Replyline against a real external audio source on this workstation.

Live-source summaries are intentionally labeled `pending verification`:

- they require an operator and a real live session
- they cannot prove cross-platform readiness on their own

See also:

- `docs/live-runtime-matrix.md`

## 7. Evidence bundle

Run:

```powershell
pnpm evidence:bundle
```

This creates one timestamped evidence folder with copied runtime files and `manifest.json`.

## Bring-up exit criteria

Treat runtime bring-up as complete only when all of the following are true:

- `pnpm probe:runtime` succeeds
- at least one runtime JSON report exists in `reports/runtime`
- `pnpm evidence:bundle` succeeds and writes `manifest.json`

If any item is missing, mark runtime readiness as `pending verification`.

## See also

- [verification-lanes.md](verification-lanes.md) — 4 lane модель (compile / mock / prompt / runtime).
- [runtime-evidence.md](runtime-evidence.md) — где живут артефакты, минимальное качество.
- [`release-readiness.md`](release-readiness.md)

- [benchmark-policy.md](benchmark-policy.md) — лейблы `target / measured / pending verification`.
- [copy-rules.md](copy-rules.md) — формулировки и баны.
