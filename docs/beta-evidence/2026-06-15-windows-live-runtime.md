# Windows 11 Live Runtime Evidence — 2026-06-15

> **Claim label**: `pending verification` (live capture path blocked — Deepgram API key unavailable)
>
> **Build**: `main` commit `a2084ca` (post v0.2.0-beta.2)
>
> This report is a runtime preflight + build verification snapshot. It does **not**
> prove `capture → STT → LLM → card` works end-to-end.

## Machine Profile

| Field | Value |
| --- | --- |
| Windows edition | Professional |
| Windows build | 26200 (Insider Preview) |
| CPU | AMD Ryzen 3 5300U (4C/8T, 2.6 GHz) |
| RAM | 16 GB |
| Node.js | v24.14.1 |
| pnpm | 9.15.9 |
| Rust | 1.94.1 |

## Build Under Test

| Field | Value |
| --- | --- |
| Commit SHA | `a2084ca` |
| Release tag | v0.2.0-beta.2 (source, post-release) |
| Branch | `main` |

## Provider Configuration

| Field | Value |
| --- | --- |
| STT provider | Deepgram (API key: **not configured**) |
| LLM provider | OpenAI-compatible: `https://api.openai.com/v1` |
| LLM model | `gpt-4o-mini` |
| LLM API key | **not configured** |
| Credential store | Windows Credential Manager (available, empty) |

## Runtime Preflight

```
pnpm runtime:preflight → settings v10 OK, credential manager detectable
pnpm probe:runtime → FAIL: DEEPGRAM_API_KEY is missing
```

## Verification Matrix

### Build & Quality Gates

| Check | Result | Notes |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | ✅ PASS | Lockfile up to date |
| `pnpm beta:doctor` | ✅ 13/13 PASS | All toolchain checks green |
| `pnpm verify` (smoke + security lanes) | ✅ PASS | typecheck, lint, build, 146 Rust tests, UI tests, cargo deny/audit |
| `pnpm verify` (npm audit) | ⚠️ WARN | 3 pre-existing vulns (`ws`, `tmp` via `@lhci/cli`) |

### Runtime Path

| Check | Result | Notes |
| --- | --- | --- |
| `pnpm runtime:preflight` | ✅ PASS | Settings v10, credential manager available |
| `pnpm probe:runtime` | ❌ FAIL | `DEEPGRAM_API_KEY is missing` |
| `pnpm probe:durations` | ⛔ SKIPPED | Requires STT + LLM keys |
| `pnpm parse:latency` | ⛔ SKIPPED | No live capture data |
| `pnpm check:slo` | ⛔ SKIPPED | Requires soak summary |
| `pnpm evidence:bundle` | ⛔ SKIPPED | Requires probe:runtime |
| `pnpm beta:start` (GUI launch) | ✅ PASS | Vite + Tauri backend start |
| Synthetic capture (`Ctrl+Alt+Space`) | ⛔ SKIPPED | Requires Deepgram key |
| Card appearance | ⛔ SKIPPED | Depends on capture |
| Retry | ⛔ SKIPPED | Depends on card |
| Tray open/restore/quit | ⛔ SKIPPED | Manual GUI test |

## Sanitization Checks

| Check | Result |
| --- | --- |
| `pnpm test:report-secret-leaks` | ✅ OK |
| `pnpm test:public-footprint` | ✅ OK |

## What This Proves

- Replyline v0.2.0-beta.2 compiles and passes all deterministic gates on Windows 11 build 26200
- All 13 `beta:doctor` checks pass
- Settings v10 schema loads and validates
- Windows Credential Manager service is available
- No secret leaks in reports/docs

## What This Does NOT Prove

- Live capture → STT → LLM → card pipeline works
- Deepgram STT integration functions with a real key
- LLM card generation produces useful output
- Hotkey capture UX works end-to-end
- Cross-machine or cross-Windows-build behaviour

## Known Limitations

- **Deepgram API key unavailable** — the single hard blocker for live runtime evidence
- **LLM API key not configured** — even if Deepgram worked, LLM path would fail
- This report is a **preflight snapshot**, not a live runtime proof
- Previous fixture-based latency data (`pipeline-latency-summary.json`) is not live evidence

## Next Steps

1. Obtain a Deepgram API key (free tier available at https://console.deepgram.com)
2. Obtain an OpenAI-compatible API key
3. Configure both keys via app Settings UI
4. Re-run `pnpm probe:runtime` — expect PASS
5. Run `pnpm probe:durations -- -DurationsCsv 15,30,60 -Repeats 2`
6. Run `pnpm evidence:bundle` and `pnpm parse:latency`
7. Execute synthetic capture via `Ctrl+Alt+Space`
8. Update this report with claim label `measured`

---
*Generated 2026-06-15. Honest snapshot — no fake claims.*
