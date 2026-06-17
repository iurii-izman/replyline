# ContextPack Live QA Evidence — 2026-06-17

> **Status:** Automated evidence collected; manual provider scenarios pending.
> **Generated:** 2026-06-17
> **Provider route:** OpenAI-compatible (`https://api.openai.com/v1`, `gpt-4o-mini`)
> **STT provider:** Deepgram (Credential Manager)
> **Workspace:** `C:\Dev\replyline`
> **Previous evidence:** `context-pack-live-qa.2026-06-16.md`

## Automated evidence (measured)

| Source | Status | Evidence |
|--------|--------|----------|
| `pnpm verify` | PASS | smoke + security-lanes + public-footprint all green |
| `cargo test` (265 tests) | PASS | 0 failed; 35 context_pack tests: storage, validation, compact, CRUD, corrupt recovery |
| `pnpm test:prompt-contract` | PASS | 24 fixtures (legacy + v3 + mapping) |
| `pnpm test:contracts` | PASS | consistency, doc-links (53/158), IPC (40/9), locale (375/375), copy-check (11) |
| `pnpm test:public-footprint` | PASS | 390 tracked files, 0 secret leaks |
| `pnpm test:report-secret-leaks` | PASS | 49 files in reports/docs scanned |
| `cargo fmt --check` | PASS | |
| `cargo clippy -- -D warnings` | PASS | |
| ContextPack storage hardening | PASS | corrupt JSON quarantine + safe recovery + diagnostics |
| Answer quality fixtures | PASS | 47 scenarios, deterministic evaluation |

## Delta from 2026-06-16

| Area | 06-16 | 06-17 | Notes |
|------|-------|-------|-------|
| Rust tests | 168 | 265 | Full suite (lib + bins) |
| ContextPack tests | ~30 | 35 | Added `corrupt_backups_are_listed_in_order` |
| Tracked files | 384 | 390 | post-refactor |
| Bilingual env gate | ✅ | ✅ | Differentiated error codes (ENV_DISABLED vs DISABLED) |
| Answer style IDs | `work_star`, `work_hr` | `work_structured`, `work_people` | Universal naming complete |
| ContextPack storage | hardened | hardened + cleanup | Stray text removed from context_pack.rs |

## Manual provider scenarios (pending)

> **Blocked by:** Requires live desktop app run with synthetic audio.
> These rows remain pending until a manual session can be performed.

| scenarioId | transcriptSummary | contextPackSummary | expectedBehavior | actualBehavior | pass | claimLabel | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ctx-live-01 | pending | pending | context used, no fabrication | pending | pending | pending manual run | Requires desktop app + synthetic audio |
| ctx-live-02 | pending | pending | transcript priority, uncertainty stated | pending | pending | pending manual run | Requires desktop app + synthetic audio |
| ctx-live-03 | pending | pending | constraint respected | pending | pending | pending manual run | Requires desktop app + synthetic audio |

## Scenario descriptions (operator reference)

### ctx-live-01 — Context helps answer
- **Transcript**: ambiguous or short fragment that benefits from background context
- **ContextPack**: contains relevant role/domain information
- **Expected**: answer references context, does not fabricate facts outside context

### ctx-live-02 — Transcript/context conflict
- **Transcript**: contains a fact (e.g., number, date, name)
- **ContextPack**: contains a conflicting fact
- **Expected**: answer prioritizes transcript, explicitly states uncertainty

### ctx-live-03 — Context with constraints
- **Transcript**: question that might violate a constraint
- **ContextPack**: contains explicit constraints (e.g., "do not share budget numbers")
- **Expected**: answer respects constraint, does not leak restricted info

## ContextPack automated tests coverage (2026-06-17 snapshot)

All 35 ContextPack tests pass (`src-tauri/src/context_pack.rs`):

- **Storage hardening (5):** corrupt JSON quarantine + recovery, valid JSON load, missing file → empty store, diagnostics privacy, multi-backup ordering
- **ID validation (6):** accepts valid, rejects empty/slashes/dots/backslash/invalid-chars
- **Content validation (2):** accepts valid, rejects too-large
- **Title validation (2):** accepts valid, rejects empty/too-long
- **compact_for_prompt (6):** empty, short, exact limit, oversized, multibyte UTF-8, newline break
- **CRUD operations (6):** save/load roundtrip, upsert, delete, set_active, clear_active, get_active
- **Status (2):** correct counts, get_active returns None
- **Edge cases (6):** at-limit content/id/title, empty store, chars_bucket labels

## Safety verification

- No raw transcripts in this file
- No ContextPack content values in this file
- No provider response bodies in this file
- No API keys or credentials in this file
- `pnpm test:report-secret-leaks` will be run before commit

## Next manual actions

1. Launch Replyline desktop app (`pnpm tauri dev`)
2. Create ContextPack matching scenario descriptions above
3. Run ctx-live-01, ctx-live-02, ctx-live-03 with synthetic audio
4. Fill evidence rows in the Manual provider scenarios table
5. Re-run `pnpm test:report-secret-leaks`
