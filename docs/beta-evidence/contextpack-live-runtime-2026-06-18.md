# ContextPack Live Runtime Evidence — 2026-06-18

> **Claim label:** `blocked` (live capture path blocked — Deepgram API key unavailable)
>
> **Build:** `main` commit `10ab76c` (post-Product Experience Hardening pass, v0.2.0-beta.3)
>
> **Generated:** 2026-06-18
>
> **Previous evidence:** `context-pack-live-qa.2026-06-17.md`, `provider-runtime-matrix.md`

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

## Provider Configuration

| Field | Value |
|---|---|
| STT provider | Deepgram (API key: **not configured**) |
| LLM provider | OpenAI-compatible: `https://api.openai.com/v1` |
| LLM model | `gpt-4o-mini` |
| LLM API key | **not configured** |
| Credential store | Windows Credential Manager (detectable, empty) |

## Runtime Gates

| Gate | Result | Evidence |
|---|---|---|
| `pnpm beta:doctor` | ✅ 13/13 PASS | All toolchain checks green |
| `pnpm runtime:preflight` | ✅ PASS | Settings v10 valid, credential manager detectable |
| `pnpm probe:runtime` | ❌ FAIL | `DEEPGRAM_API_KEY is missing` |
| `pnpm verify` | ✅ PASS | typecheck, lint, build, 265 Rust tests, 189 TS tests, clippy, fmt, contracts, security lanes |
| `pnpm test:public-footprint` | ✅ OK | 433 tracked files checked |
| `pnpm test:report-secret-leaks` | ✅ OK | 58 files in reports/docs scanned |

## Live Provider Scenarios

> **Blocked by:** `DEEPGRAM_API_KEY is missing` + no LLM key configured.
> Both keys are required before any live capture scenario can proceed.

| scenarioId | Status | claimLabel | Notes |
|---|---|---|---|
| ctx-live-01 — Context helps answer | **blocked** | `blocked` | Requires Deepgram key + LLM key + synthetic audio |
| ctx-live-02 — Transcript/context conflict | **blocked** | `blocked` | Requires Deepgram key + LLM key + synthetic audio |
| ctx-live-03 — Context with constraints | **blocked** | `blocked` | Requires Deepgram key + LLM key + synthetic audio |
| ctx-live-04 — No context baseline | **blocked** | `blocked` | Requires Deepgram key + LLM key + synthetic audio |
| ctx-live-05 — Short/ambiguous fragment | **blocked** | `blocked` | Requires Deepgram key + LLM key + synthetic audio |
| ctx-live-06 — Provider error recovery | **blocked** | `blocked` | Requires keys + controlled error injection |

## Automated Evidence (measured)

| Source | Status | Evidence |
|---|---|---|
| `cargo test` | ✅ 265 passed | 0 failed; 35 context_pack tests: storage, validation, compact, CRUD, corrupt recovery |
| `pnpm test:ui` | ✅ 189 passed | 21 test files; includes context chip, error recovery, idle hint, a11y tests |
| `pnpm test:prompt-contract` | ✅ PASS | 24 fixtures (legacy + v3 + mapping) |
| `pnpm test:contracts` | ✅ PASS | consistency, doc-links (61/232), IPC (40/9), locale (396/396), copy-check (11) |
| `pnpm test:quality` | ✅ PASS | Deterministic quality bundle (ContextPack 47 fixtures, interview, say_now, product scenarios) |
| ContextPack UI tests | ✅ 29 tests | Create, edit, delete (two-step confirm), activate, deactivate, duplicate, preview, a11y labels |
| ContextPack answer quality | ✅ 47 fixtures | Deterministic evaluation; 10 ContextPack-specific scenarios all pass |

## Delta from 2026-06-17

| Area | 06-17 | 06-18 | Notes |
|---|---|---|---|
| Commit | `59fb18c` | `10ab76c` | Post-Product Experience Hardening pass |
| Rust tests | 265 | 265 | Stable |
| TS UI tests | 183 | 189 | +6 tests: idle hint, error recovery, context chip, a11y |
| Locale keys | 375 | 396 | +21 keys: errorRecoveryHint, idleValueHint, etc. |
| UX Score | 85/100 | 88/100 | See `docs/product/ux-audit.md` |
| Tracked files | 390 | 433 | post-refactor + new docs |
| Hard blocker | DEEPGRAM_API_KEY | DEEPGRAM_API_KEY | Unchanged |

## Honesty Section

### What this evidence proves

- Replyline v0.2.0-beta.3 (commit `10ab76c`) compiles and passes all deterministic gates on Windows 11 build 26200.
- All 13 `beta:doctor` checks pass.
- Settings v10 schema loads and validates.
- Windows Credential Manager service is available.
- All automated ContextPack tests pass (35 Rust storage, 29 UI, 47 quality fixtures).
- Product Experience Hardening pass improved UX score from 85→88, verified by 189 UI tests.
- No secret leaks in reports/docs.

### What this evidence does NOT prove

- Any live `capture → STT → LLM → card` pipeline works.
- Deepgram STT functions with a real key.
- Any LLM provider generates useful cards with real audio input.
- Cross-machine or cross-Windows-build behaviour.
- Production readiness for any provider route.
- ContextPack interaction with live STT+LLM pipeline.

### Hard blocker

**`DEEPGRAM_API_KEY is missing`** — blocks ALL combined routes.
Even if an LLM key were available, the STT path cannot proceed without Deepgram.
This is the same blocker recorded since 2026-06-15.

## Exact Checklist to Unblock

1. [ ] Obtain a Deepgram API key (free tier: https://console.deepgram.com)
2. [ ] Obtain an OpenAI-compatible LLM API key (OpenAI, OpenRouter, or Groq)
3. [ ] Configure Deepgram key via Settings UI → Speech → Deepgram API key
4. [ ] Configure LLM key via Settings UI → LLM → LLM API key
5. [ ] Verify: `pnpm probe:runtime` → expect PASS
6. [ ] Create ContextPack for ctx-live-01 (role/domain background)
7. [ ] Create ContextPack for ctx-live-02 (conflicting fact)
8. [ ] Create ContextPack for ctx-live-03 (explicit constraint)
9. [ ] Launch desktop app: `pnpm tauri dev`
10. [ ] For each scenario: play synthetic audio, hold hotkey, review card
11. [ ] Fill evidence rows in this file
12. [ ] Run `pnpm evidence:bundle`
13. [ ] Update claim label from `blocked` to `measured`
14. [ ] Run `pnpm test:report-secret-leaks` before committing

## Safety Verification

- No raw transcripts in this file
- No ContextPack content values in this file
- No provider response bodies in this file
- No API keys or credentials in this file
- `pnpm test:report-secret-leaks` will be run before commit

---

*Generated 2026-06-18. Honest snapshot — no fake claims. Hard blocker unchanged since beta.3.*
