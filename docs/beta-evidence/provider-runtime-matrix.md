# Provider Runtime Evidence Matrix

> **Date:** 2026-06-18
> **Build:** `main` commit `10ab76c` (v0.2.0-beta.3, post-Product Experience Hardening)
> **Claim label:** `blocked` (live capture path blocked — no provider keys configured)
> **Previous snapshot:** 2026-06-17 (commit `59fb18c`)

This matrix tracks the evidence status of every documented provider route.
Statuses follow the claim labels from [engineering/runtime.md](../engineering/runtime.md):
`documented` / `measured` / `failed` / `blocked`.

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
| OS keyring | Windows Credential Manager (available, empty) |
| Settings schema | v10 (valid, parseable) |

## Provider Routes

### STT Providers

| # | Route | Status | Notes |
|---|---|---|---|
| STT-1 | Deepgram (Nova-2) | **blocked** | `DEEPGRAM_API_KEY is missing` — `pnpm probe:runtime` exits with error. Key not in env, not in credential store. |
| STT-2 | Deepgram (custom model) | **blocked** | Same as STT-1 — key required for any Deepgram model. |

### LLM Providers

| # | Route | Provider | Model | Status | ContextPack tested | Notes |
|---|---|---|---|---|---|---|
| LLM-1 | OpenAI-compatible | OpenAI | `gpt-4o-mini` | **blocked** | no | `llmBaseUrl` configured (`https://api.openai.com/v1`), model set. LLM API key not present — blocked at auth. |
| LLM-2 | OpenRouter Free/Dev | OpenRouter | `google/gemini-2.0-flash-001` (primary) | **documented** | no | Preset available in Settings. Not configured on this machine — no API key. |
| LLM-3 | OpenRouter Fast/Budget | OpenRouter | `openai/gpt-4o-mini` (primary) | **documented** | no | Preset available. Not configured. |
| LLM-4 | OpenRouter Balanced Paid | OpenRouter | `anthropic/claude-3.5-haiku` (primary) | **documented** | no | Preset available. Not configured. |
| LLM-5 | OpenRouter Quality Paid | OpenRouter | `openai/gpt-4o` (primary) | **documented** | no | Preset available. Not configured. |
| LLM-6 | Groq | Groq | `llama-3.3-70b-versatile` (example) | **documented** | no | Setup documented in `provider-setup.md`. Not configured on this machine. |
| LLM-7 | Custom OpenAI-compatible | Any | User-configured | **documented** | no | Generic route — user provides URL + model + key. Works with Ollama, LM Studio, vLLM, Together AI, etc. |

### Combined Routes (STT + LLM)

| # | STT | LLM | Status | Notes |
|---|---|---|---|---|
| COMBO-1 | Deepgram | OpenAI `gpt-4o-mini` | **blocked** | Both keys missing. Settings partially configured. |
| COMBO-2 | Deepgram | OpenRouter (any preset) | **blocked** | Deepgram key missing. OpenRouter key not configured. |
| COMBO-3 | Deepgram | Groq | **blocked** | Deepgram key missing. Groq key not configured. |
| COMBO-4 | Deepgram | Custom/local | **blocked** | Deepgram key missing. Local LLM may not need key, but STT blocks the path. |

## ContextPack Live Evidence

| Check | Status | Notes |
|---|---|---|
| Automated QA fixtures (47 scenarios) | ✅ **measured** | All 47 pass with avg score 100. Deterministic evaluation, no live LLM. |
| ContextPack storage tests (35) | ✅ **measured** | CRUD, compact, corrupt recovery, multi-backup ordering. All pass. |
| ContextPack UI tests (29) | ✅ **measured** | Create, edit, delete (two-step confirm), activate, deactivate, duplicate, preview, empty state, a11y labels. All pass. |
| Product Experience Hardening UX | ✅ **measured** | UX score 85→88. 189 UI tests. See `docs/product/ux-audit.md`. |
| ContextPack + live STT + LLM | **blocked** | Requires Deepgram key + LLM key. |
| ContextPack + manual QA (ctx-live-01/02/03) | **blocked** | Desktop app + synthetic audio required. Pending provider keys. |

## What IS Verified (2026-06-18)

| Gate | Result | Evidence |
|---|---|---|
| `pnpm verify` | ✅ PASS | typecheck, lint, build, clippy, fmt, 265 Rust tests, 189 TS tests, contracts, security lanes |
| `pnpm verify:full` | ⚠️ 1 pre-existing blocker | Unsigned artifacts (S2, documented) |
| `pnpm beta:doctor` | ✅ 13/13 PASS | All toolchain checks |
| `pnpm runtime:preflight` | ✅ PASS | Settings v10 valid, credential manager available |
| `pnpm probe:runtime` | ❌ FAIL | `DEEPGRAM_API_KEY is missing` |
| `pnpm test:quality` | ✅ PASS | Deterministic quality bundle (ContextPack, interview, say_now, product scenarios) |
| `pnpm test:report-secret-leaks` | ✅ OK | 58 files scanned |
| `pnpm test:public-footprint` | ✅ OK | 433 tracked files |
| UX Score | ✅ 88/100 | Up from 85; see `docs/product/ux-audit.md` |

## Latency Reference (fixture-based, NOT live)

Source: `reports/runtime/pipeline-latency-summary.json` (2026-06-13, fixture-derived).

| Stage | p50 | p95 | Count | Claim |
|---|---|---|---|---|
| release_to_card | 6100ms | 9800ms | 6 | `target` |
| stt_request | 2100ms | 4200ms | 7 | `target` |
| llm_request | 1900ms | 3600ms | 5 | `target` |

> These values are from test fixtures, not live provider runs. They serve as
> design targets, not measured evidence. See claim label rules in
> [engineering/runtime.md](../engineering/runtime.md).

## Honesty Section

### What this matrix proves

- Replyline v0.2.0-beta.3 (commit `10ab76c`) compiles and passes all deterministic gates on Windows 11 build 26200.
- Settings v10 schema loads and validates.
- Windows Credential Manager service is available.
- All automated ContextPack tests pass (35 Rust storage, 29 UI, 47 quality fixtures).
- Product Experience Hardening pass improved UX score from 85→88, with 189 UI tests.
- Provider documentation exists for 4 LLM routes + 4 OpenRouter presets + generic custom route.
- No live provider path has been validated on this machine.

### What this matrix does NOT prove

- Any live `capture → STT → LLM → card` pipeline works.
- Deepgram STT functions with a real key.
- Any LLM provider generates useful cards.
- Cross-machine or cross-Windows-build behaviour.
- Production readiness for any provider route.
- ContextPack interaction with live STT+LLM pipeline.

### Hard blocker

**`DEEPGRAM_API_KEY is missing`** — blocks ALL combined routes (COMBO-1 through COMBO-4).
Even if an LLM key were available, the STT path cannot proceed without Deepgram.
This is the same blocker recorded in:
- `docs/beta-evidence/2026-06-15-windows-live-runtime.md`
- `docs/beta-evidence/2026-06-15-windows-smoke.md`
- `docs/engineering/release.md` (beta.3 checklist)

Until a Deepgram key is obtained and configured, no route can advance from
`blocked`/`documented` to `measured`.

## Next Steps to Unblock

1. Obtain a Deepgram API key (free tier: https://console.deepgram.com).
2. Obtain an OpenAI-compatible LLM API key (OpenAI, OpenRouter, or Groq).
3. Configure both keys via app Settings UI (or `DEEPGRAM_API_KEY` / `LLM_API_KEY` env vars).
4. Run `pnpm probe:runtime` — expect PASS.
5. Execute synthetic capture with ContextPack active.
6. Update this matrix: mark COMBO-1 as `measured`, add latency data.
7. Run `pnpm evidence:bundle` and attach sanitized artifacts.

## Related Docs

- [engineering/runtime.md](../engineering/runtime.md) — claim labels, evidence rules
- [engineering/release.md](../engineering/release.md) — beta.3 release checklist
- [../product/provider-setup.md](../product/provider-setup.md) — provider configuration guide
- [2026-06-15-windows-live-runtime.md](2026-06-15-windows-live-runtime.md) — previous runtime snapshot
- [2026-06-15-windows-smoke.md](2026-06-15-windows-smoke.md) — previous smoke evidence
- [../repo-scorecard.md](../repo-scorecard.md) — overall project scorecard (88/100)
- [../roadmap.md](../roadmap.md) — development roadmap
