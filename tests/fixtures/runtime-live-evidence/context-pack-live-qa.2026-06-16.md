# ContextPack Live QA Evidence — 2026-06-16

> **Status:** Automated evidence collected; manual provider scenarios pending.
> **Generated:** 2026-06-16T22:17:30Z
> **Provider route:** OpenAI-compatible (`https://api.openai.com/v1`, `gpt-4o-mini`)
> **STT provider:** Deepgram (Credential Manager)
> **Workspace:** `C:\Dev\replyline`

## Automated evidence (measured)

| Source | Status | Evidence |
|--------|--------|----------|
| `pnpm beta:doctor` | PASS | 13/13 checks |
| `pnpm runtime:preflight` | PASS | settings.json valid, Credential Manager detected, schema v10 |
| `pnpm verify` | PASS | smoke + security-lanes + public-footprint all green |
| `pnpm report:live-evidence-pack` | pending_verification | structured JSON/MD generated, automated probes present |
| `pnpm evidence:bundle` | PASS | runtime-evidence-20260616-221730 bundled with latency summary |
| `pnpm probe:runtime` | SKIP | Requires DEEPGRAM_API_KEY in env (key is in Credential Manager) |
| `cargo test` (168 tests) | PASS | 0 failed, ContextPack tests: id validation, compact_for_prompt, upsert, set_active, etc. |
| `pnpm test:prompt-contract` | PASS | 24 fixtures (legacy + v3 + mapping) |

## Manual provider scenarios (pending)

> **Blocked by:** Requires live desktop app run with synthetic audio.
> These rows will be filled after a manual session.

| scenarioId | transcriptSummary | contextPackSummary | expectedBehavior | actualBehavior | pass | claimLabel | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ctx-live-01 | pending | pending | context used, no fabrication | pending | pending | pending manual run | Requires desktop app + synthetic audio |
| ctx-live-02 | pending | pending | transcript priority, uncertainty stated | pending | pending | pending manual run | Requires desktop app + synthetic audio |
| ctx-live-03 | pending | pending | constraint respected | pending | pending | pending manual run | Requires desktop app + synthetic audio |

## ContextPack automated tests coverage

All ContextPack Rust unit tests pass (`src-tauri/src/context_pack.rs`, 378+ lines of tests):

- ID validation: accepts valid, rejects empty/slashes/dots/traversal/long
- Content validation: accepts valid, rejects empty/too-large
- Title validation: accepts valid, rejects empty/too-long
- compact_for_prompt: empty, short, exact limit, oversized, multibyte UTF-8, newline break
- Store operations: save/load roundtrip, upsert, delete, clear, set_active
- Status: returns correct counts, get_active returns None when nothing active

## Safety verification

- No raw transcripts in this file
- No ContextPack content values in this file
- No provider response bodies in this file
- No API keys or credentials in this file
- `pnpm test:report-secret-leaks` will be run before commit

## Next manual actions

1. Launch Replyline desktop app (`pnpm tauri dev`)
2. Create ContextPack matching scenario descriptions
3. Run ctx-live-01, ctx-live-02, ctx-live-03 with synthetic audio
4. Fill evidence rows above
5. Re-run `pnpm report:live-evidence-pack`
6. Re-run `pnpm test:report-secret-leaks`
