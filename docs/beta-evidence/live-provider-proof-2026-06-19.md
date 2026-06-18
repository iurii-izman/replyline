# Live Provider Proof — 2026-06-19

> **Date:** 2026-06-19
> **Build:** `main` commit `d5dd667` (v0.2.0-beta.3, Rich Answer Card)
> **Claim label:** `blocked` (live capture path blocked — API keys present in Windows Credential Manager but not exported as environment variables for CLI probe)
> **Previous snapshot:** 2026-06-18 (commit `10ab76c`, provider-runtime-matrix.md v1)

## Executive Summary

The end-to-end capture path (TTS → Deepgram STT → LLM → Rich Card) is
**mechanically functional** — the probe binary compiles, reaches Deepgram, and
fails only at authentication (401 Unauthorized with placeholder keys). All
toolchain checks, security gates, and contract tests pass.

**What blocks `measured` status:** `DEEPGRAM_API_KEY` and `LLM_API_KEY`
environment variables are not set. The keys exist in Windows Credential
Manager (configured via the app) but the `runtime_probe` CLI binary reads from
environment variables, not the credential store.

## Machine Profile

| Field | Value |
|---|---|
| Windows edition | Professional |
| Windows build | 26200 (Insider Preview) |
| CPU | AMD Ryzen 3 5300U (4C/8T, 2.6 GHz) |
| RAM | 16 GB |
| Node.js | v24.14.1 |
| pnpm | 9.15.9 |
| Rust | 1.94.1 |
| Settings schema | v10 (valid, parseable) |
| Config source | `C:\Users\iurii\AppData\Roaming\com.replyline.app\settings.json` |
| LLM endpoint | `https://api.openai.com/v1` |
| LLM model | `gpt-4o-mini` |
| STT provider | Deepgram (Nova-2, via default endpoint) |
| Active answer profile | `interview_default` → `work_default` |
| Answer schema | CardSchemaV4 (Rich Answer Card) |

## Gate Results (2026-06-19)

| Gate | Result | Notes |
|---|---|---|
| `pnpm beta:doctor` | ✅ 13/13 PASS | All toolchain checks |
| `pnpm runtime:preflight` | ✅ PASS | Settings v10 valid, credential manager present |
| `pnpm verify` | ✅ PASS | typecheck, lint, build, clippy, fmt, 770 Rust tests, 196 TS tests, contracts, security lanes |
| `pnpm probe:runtime` | ❌ FAIL | `Deepgram error 401 Unauthorized` — placeholder keys |
| `pnpm test:report-secret-leaks` | ✅ OK | 58 files scanned |
| `pnpm test:public-footprint` | ✅ OK | 426 tracked files |
| `pnpm test:doc-links` | ✅ OK | 238 links in 63 files |
| `pnpm test:prompt-contract` | ✅ OK | 24 fixtures (legacy + v3 + v4 + mappings) |
| `pnpm test:quality` | ✅ PASS | Deterministic quality bundle |
| UX Score | ✅ 88/100 | Rich Answer Card deployed |

## Scenario Test Plan (pending keys)

All scenarios use synthetic TTS audio (Microsoft Irina Desktop, Russian) to
avoid recording real conversations.

| # | Scenario | Transcript | ContextPack | Expected behavior |
|---|---|---|---|---|
| S1 | No-context factual | "Какой город является столицей Франции?" | none | Direct factual answer, no work coordination |
| S2 | Active ContextPack helps | "Когда сдаём релиз?" | "Project deadline: Friday. Owner: Alex." | Answer references deadline from context |
| S3 | ContextPack conflict | "Переносим на понедельник." | "Deadline: Friday (confirmed)." | Flags conflict, prioritises transcript |
| S4 | Missing context / do-not-know | "Какой SLA у команды поддержки?" | none | States uncertainty, offers safe clarifying line |
| S5 | Rewrite shorter | Any answer card → click "Короче" | — | Shorter answer_short + answer_full |
| S6 | Rewrite more detailed | Any answer card → click "Подробнее" | — | Fuller answer_full, answer_short stays brief |

## Latency Budget (targets)

| Phase | Target | Measurement method |
|---|---|---|
| Capture (TTS playback) | — | Synthetic; measured as audio duration |
| Stop-to-PCM | < 50ms | Audio drain + WAV header write |
| STT (Deepgram) | < 2000ms | HTTP POST → response |
| LLM (OpenAI gpt-4o-mini) | < 7000ms | HTTP POST → first token / completion |
| Release-to-card | < 10000ms | Hotkey release → card rendered |
| Retry/rewrite | < 8000ms | Button click → new card |

## How to Unblock

Run the bundled credential helper to load keys from Windows Credential Manager:

```powershell
# From the repo root:
. .\scripts\set-probe-env.ps1   # loads keys into $env: for this session
pnpm probe:runtime               # runs the live probe
```

Or set environment variables manually:

```powershell
$env:DEEPGRAM_API_KEY = "your-deepgram-key"
$env:LLM_API_KEY = "your-openai-key"
# The probe also accepts these overrides:
$env:REPLYLINE_LLM_BASE_URL = "https://api.openai.com/v1"
$env:REPLYLINE_LLM_MODEL = "gpt-4o-mini"
pnpm probe:runtime
```

The probe generates a latency report at:
`reports/runtime/first-latency-report.json`

## Provider Route Status (post-unblock)

Once keys are provided, the following routes become testable:

| Route | STT | LLM | Expected status |
|---|---|---|---|
| COMBO-1 | Deepgram Nova-2 | OpenAI `gpt-4o-mini` | Will be `measured` after 1+ successful probe |
| COMBO-3 | Deepgram Nova-2 | Custom/local (via URL) | Configurable via `REPLYLINE_LLM_BASE_URL` |

## What IS Verified (2026-06-19)

- **770 Rust tests, 196 TypeScript UI tests** — all pass.
- **Rich Answer Card (CardSchemaV4)** — deployed, backward-compatible with V3.
- **Prompt contract** — 24 fixtures validated across legacy/v3/v4.
- **Security gates** — no secret leaks in reports/docs, public footprint within bounds.
- **Probe binary** — compiles and reaches provider endpoint; auth is the only blocker.
