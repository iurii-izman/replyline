# Replyline Project Consolidation Summary

## 1. Executive summary
- Readiness score: **91/100**.
- Current beta readiness: **High for internal stable-beta handoff** (all verification profiles green locally, release gates pass).
- Main achievements:
  - Full validation matrix green (`smoke`, `verify:fast`, `verify:full`, `verify:extended`).
  - Contracts aligned across TS/Rust for Settings schema v5, Interview DTOs, Candidate Pack, prompt/profile and model preset surfaces.
  - Privacy hardening active in code path (`redact_secrets`, `safe_preview`, explicit no-body logging on provider HTTP failures).
- Main remaining risk: interview reports intentionally persist raw transcript locally; this is documented and explicit, but still highest residual sensitivity area.

## 2. Validation matrix
| command | status | classification | notes |
|---|---|---|---|
| `pnpm install --frozen-lockfile` | PASS | N/A | lockfile-resolved install succeeded (~3.8s) |
| `pnpm typecheck` | PASS | N/A | TS compile checks passed (~3.9s) |
| `pnpm lint` | PASS | N/A | eslint passed (~4.1s) |
| `pnpm build` | PASS | N/A | vite build passed (~3.0s) |
| `pnpm test:ui` | PASS | N/A | vitest UI suite passed (~10.3s) |
| `pnpm test:consistency` | PASS | N/A | consistency + model preset contract passed (~1.5s) |
| `pnpm test:doc-links` | PASS | N/A | doc links check passed (~1.3s) |
| `pnpm test:ipc-contract` | PASS | N/A | IPC handler contract passed (~1.7s) |
| `pnpm test:locale-keys` | PASS | N/A | locale keys parity check passed (~1.4s) |
| `pnpm test:prompt-contract` | PASS | N/A | deterministic prompt contract passed (~1.5s) |
| `pnpm test:interview-quality` | PASS | N/A | interview quality gate passed (~1.3s) |
| `pnpm report:interview-quality` | PASS | N/A | report artifact generation passed (~1.3s) |
| `cargo check --manifest-path src-tauri/Cargo.toml` | PASS | N/A | Rust compile check passed (~0.8s) |
| `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` | PASS | N/A | no clippy warnings (~1.2s) |
| `cargo fmt --manifest-path src-tauri/Cargo.toml --check` | PASS | N/A | formatting clean (~0.5s) |
| `cargo test --manifest-path src-tauri/Cargo.toml` | PASS | N/A | Rust tests passed (~2.0s) |
| `pnpm smoke` | PASS | N/A | full smoke gate passed (~28.1s) |
| `pnpm verify:fast` | PASS | N/A | smoke + security lanes + footprint passed (~41.5s) |
| `pnpm release:freeze:check` | PASS | E (intentional gate) | freeze baseline check passed (~1.6s) |
| `pnpm verify:full` | PASS | N/A | fast + freeze + rust deps + npm audit + interview report passed (~58.0s) |
| `pnpm verify:extended` | PASS | N/A | full + coverage/fixtures/say-now scenarios passed (~73.2s) |

## 3. Contract status
- Settings:
  - Canonical source: `src/app/model.ts` (`DEFAULT_SETTINGS.schemaVersion=5`), `src-tauri/src/types.rs` (`AppSettings` default), `src-tauri/src/settings.rs` (`CURRENT_SCHEMA_VERSION=5`, migrations v1->v5).
  - Tested by: `src/app/model.test.ts`, `src-tauri/src/settings.rs` unit tests, `pnpm test:consistency`.
  - Residual risk: migration logic currently supports <=v5 only; future schema bump must update TS+Rust+docs in lockstep.
- AnalysisCardDto:
  - Canonical source: `src-tauri/src/types.rs` (`AnalysisCardDto`), mapped in `src/app/model.ts` (`asAnalysisCard`).
  - Tested by: `src/app/model.test.ts`, prompt/fixture gates (`test:prompt-contract`, fixture lane in extended verify).
  - Residual risk: optional `starEvidence` and dual alias (`interviewCard` / `interviewCardSchemaV1`) still compatibility-sensitive.
- InterviewCardDto:
  - Canonical source: `src-tauri/src/interview_card_v1.rs` schema + `src/app/model.ts` mirror types.
  - Tested by: Rust unit tests, `pnpm test:prompt-contract`, `pnpm test:interview-quality`.
  - Residual risk: heuristic normalization/repair complexity can drift on edge transcripts.
- CandidatePack:
  - Canonical source: `src-tauri/src/candidate_pack.rs` (`CandidatePackDto`, draft normalization), frontend draft in `src/app/model.ts` + `controller/index.ts`.
  - Tested by: Rust unit tests in candidate pack, UI tests around explicit prepare/save flow.
  - Residual risk: quality relies on provider behavior; guardrails are strong but still deterministic-heuristic.
- InterviewReport:
  - Canonical source: `src-tauri/src/types.rs` + `src-tauri/src/interview_report.rs`.
  - Tested by: interview report unit tests (store/export/clear/explicit export behavior), UI locale tests for report controls.
  - Residual risk: score function is heuristic and may be overinterpreted by users without framing.
- IPC:
  - Canonical source: `src-tauri/src/lib.rs` `generate_handler![...]`.
  - Tested by: `scripts/check-ipc-handler-contract.mjs` (`pnpm test:ipc-contract`).
  - Residual risk: command expansion in future can bypass frontend usage unless both contract + UI tests are updated.
- Model presets:
  - Canonical source: `src/app/modelPresets.ts` (full metadata), backend runtime behavior in `src-tauri/src/model_presets.rs`.
  - Tested by: `src/app/modelPresets.test.ts`, `scripts/check-model-preset-contract.mjs` via `pnpm test:consistency`.
  - Residual risk: provider-side model availability/pricing can invalidate preset assumptions between reviews.
- Prompt profiles:
  - Canonical source: `src-tauri/src/prompt_registry.rs`; frontend selects id only (`activeAnswerProfile`).
  - Tested by: `pnpm test:prompt-contract`, `pnpm test:interview-quality`.
  - Residual risk: strong dependence on fixture representativeness.

## 4. Runtime mode status
- WorkConversation:
  - Concept path confirmed: `capture -> stt -> llm -> card` with `CardSchemaV3`, UI surface `gist/sayNow/nextMove`.
  - `capture_pipeline.rs` keeps explicit Work fallback when interview mode not active.
- Interview:
  - Activation confirmed via explicit session commands (`start_interview_session` / `end_interview_session`).
  - DTO returned through `InterviewCardSchemaV1` attachment and report flow.
- Session/report:
  - Start/end/report/export/clear command surface present and covered in UI + Rust tests.
  - Markdown export is explicit action only.
- Copy/retry/clear:
  - `copyCurrentCard`, `retry_last_analysis`, `clear_context` are wired in controller + pipeline actions.
  - Retry mode inheritance covered (`mode_from_last_card`) with safe Work fallback.
- Compact/pin/carousel:
  - `interviewCompactMode`, pin/unpin and carousel key navigation implemented in controller state.
  - Locale labels for controls covered in UI locale tests.
- Setup/error states:
  - Setup gating and runtime checks exposed (`check_runtime_config`), errors mapped to settings anchors.
  - No evidence that setup/error surfaces are hidden in current build.

## 5. Privacy and logging status
- Secrets:
  - Closed by static check + code: keys in credential store, log sanitization in `app_log` + `privacy::redact_secrets`.
- Transcripts/prompts:
  - Closed by code + tests: `redact_transcript_like`, `safe_preview`, no provider response-body logging on HTTP errors.
- Candidate Pack:
  - Closed by convention + partial tests: explicit prepare/save actions, counter-only logging; pack files remain sensitive local artifacts.
- Reports:
  - Closed by code/tests: local store path, clear operation, export explicit action only.
- Export:
  - Closed by tests: markdown is generated only on explicit export command.
- Classification:
  - Closed by tests: report export/clear rules, interview quality anti-fabrication, locale/prompt/IPC contracts.
  - Closed by static checks: security lanes, consistency, prompt contract, release freeze.
  - Closed by convention: operator handling of local artifacts under `reports/`.
  - Needs strengthening: automated scan for accidental transcript-like leaks in newly added logs outside known call sites.

## 6. UX and locale status
- RU-first:
  - RU defaults and comprehensive RU copy present; EN mirror exists in `src/app/locale.ts`.
- Hardcoded text:
  - Most user-visible copy centralized in locale file; static checks (`test:locale-keys`) pass.
  - Minor mixed-language labels remain intentional in current beta (e.g., technical labels and `Candidate Pack`).
- Setup/error states:
  - Setup progress and check results labels localized and visible via UI tests.
- Report/session UX:
  - RU/EN session/report button symmetry explicitly tested (`MainSurface.locale.ui.test.tsx`).

## 7. Release gates status
- `smoke`: PASS.
- `verify:fast`: PASS (default mandatory local/PR gate).
- `verify:full`: PASS (release candidate gate).
- `verify:extended`: PASS (extended confidence lane).
- beta preflight: not executed in this audit run (outside requested command list).
- release freeze: PASS (`pnpm release:freeze:check`).

## 8. Remaining risks
- Risk 1:
  - severity: high
  - evidence: interview reports intentionally include `fullTranscript` and persist locally.
  - recommended next action: add optional redacted export mode and retention controls for report store.
- Risk 2:
  - severity: medium
  - evidence: preset metadata is snapshot-based (`lastReviewedAt`) and provider behavior may drift quickly.
  - recommended next action: add periodic preset verification automation with stale-snapshot warning in UI.
- Risk 3:
  - severity: medium
  - evidence: interview quality and prompt contracts are deterministic-fixture based.
  - recommended next action: expand fixture diversity (accent/noise/domain variants) and add drift dashboard.
- Risk 4:
  - severity: medium
  - evidence: complex heuristic repair paths in `card_v3.rs` and interview normalization.
  - recommended next action: add targeted regression corpus for repair/fallback branches and mutation-style tests.
- Risk 5:
  - severity: low
  - evidence: docs include both RU and EN sections with some operational caveats that can go stale.
  - recommended next action: enforce docs freshness check tied to contract version fields (schema/prompt/preset dates).

## 9. Recommended next cycle
1. Add privacy retention controls for interview reports (TTL/manual purge policy + UI hints).
2. Introduce automated stale-preset detector using `lastReviewedAt` thresholds and CI alerting.
3. Expand interview quality dataset with adversarial/noisy transcripts and provider-variance fixtures.
4. Add dedicated regression lane for `CardSchemaV3` repair/fallback determinism under edge cases.
5. Add contract version manifest (single source map for schema/prompt/preset versions) and validate in CI.
6. Implement report-safe export variants (full vs redacted) with explicit UX copy.
7. Add log-leak canary tests scanning newly added `append_event`/`log_diag` details for transcript-like payloads.

## 10. Appendix
- Git commit range audited:
  - latest commit: `83a1d2a`
  - baseline tail used in audit: `83a1d2a..c88ce50` (last 10 commits snapshot)
- Environment versions:
  - `node v24.14.1`
  - `pnpm 9.15.9`
  - `rustc 1.94.1 (e408947bf 2026-03-25)`
  - `cargo 1.94.1 (29ea6fb6a 2026-03-24)`
- Failed command excerpts:
  - None. All requested validation commands exited with code 0.
