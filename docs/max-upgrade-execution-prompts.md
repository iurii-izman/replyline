# Replyline Maximum Upgrade Execution Blocks And Prompts

Status: draft prompt pack  
Based on: `docs/max-upgrade-implementation-plan.md`  
Baseline commit: `2421d9b983c226dcb3700472e5dfe7bda7586368`  
Purpose: convert the maximum upgrade plan into large, high-quality implementation blocks with ready-to-use prompts

## 1. How To Use This File

Use this document as the execution layer above `docs/max-upgrade-implementation-plan.md`.

Each block is intentionally large enough to create meaningful progress, but not so large that quality gates become unmanageable. A block may contain multiple internal batches and multiple commits if the operator decides to commit during the session.

Default execution rules for every block:

- Work directly on `main` unless the operator explicitly asks for a branch.
- Start with `git status --short --branch` and `git rev-parse HEAD`.
- If the worktree is dirty, list changed files and avoid unrelated edits.
- Read `AGENTS.md`, `CLAUDE.md`, and relevant docs before edits.
- Keep changes task-scoped and evidence-backed.
- Do not weaken tests or guardrails.
- Do not introduce new product direction.
- Do not make runtime/live-call claims without artifacts.
- Do not push unless the operator explicitly asks.
- If package scripts or dependencies change, run the extra required gates.
- If a new docs file is committed, update `docs/release-freeze-baseline.json` or strict release-freeze will fail.

## 2. Block Sequencing

| Order | Block | Maximal scope | Primary outcome |
| ---: | --- | --- | --- |
| 0 | Plan Artifact Governance | Plan files and release-freeze metadata | The planning artifacts themselves can be committed safely |
| 1 | Truth And Ghost Cleanup | False/stale docs, lifecycle drift, release-freeze matrix | Docs, scripts, and shipped behavior agree |
| 2 | Mode Boundary And Trust Core | Candidate Pack gating, Interview boundary, privacy copy | WorkConversation and Interview Mode are separated and trust-safe |
| 3 | Release Gates And CI Hardening | verify lanes, lifecycle, readiness reports, CI artifact clarity | Release-local and CI behavior are explainable and stricter |
| 4 | Runtime Evidence Closure | Runtime probes, SLO, live source matrix, evidence bundle | Measured Windows evidence exists or blockers are explicit |
| 5 | UX And Onboarding Upgrade | Setup, Settings IA, cards, Candidate Pack UX | UX becomes clearer without widening scope |
| 6 | Architecture And Test Hardening | IPC categorization, settings fixtures, error catalog, dead code | Future regressions become harder |
| 7 | Public Beta Trust And Support | Public copy, support/security templates, legal posture | Public-facing footprint is accurate and safe |
| 8 | Product Validation And Scope Decisions | Tester loop, PMF ledger, future-track isolation | Product decisions are evidence-backed |

## 3. Cross-Block Quality Rules

### Required Kickoff Snapshot

Every prompt should begin with this:

```text
Before editing, run:
- git status --short --branch
- git rev-parse HEAD

If dirty, list changed files and classify them as pre-existing vs planned edits.
Do not touch unrelated dirty files.
```

### Required Delivery Summary

Every block should end with:

```text
Report:
- changed files
- validation matrix with command + real status
- residual risks / what was not validated
- next recommended work block
- whether release-freeze strict is clean
```

### Recommended Commit Policy

Use these defaults:

- Docs-only block: one commit if all docs checks pass.
- Code behavior block: one commit per coherent behavior change.
- Runtime evidence block: commit only sanitized reports/docs, never raw sensitive artifacts.
- UX block: split copy/layout from behavior if the diff becomes large.
- CI/package block: one commit per script or workflow behavior change.

### Baseline Verification Ladder

| Change type | Minimum commands |
| --- | --- |
| Docs-only | `pnpm test:doc-links`, `pnpm test:consistency` |
| Copy/docs public claims | `pnpm copy:check`, `pnpm test:consistency`, targeted `rg` |
| UI copy/layout | `pnpm test:ui`, `pnpm test:locale-keys`, `pnpm copy:check` |
| Rust/TS behavior | `pnpm verify:fast` |
| Release/package scripts | `pnpm scripts:lifecycle`, relevant target command, `pnpm verify:fast` |
| Release readiness | `pnpm verify:release-local`, `pnpm release:freeze:check:strict` |
| Runtime evidence | runtime probe commands plus `pnpm test:public-footprint` and secret leak scan |

## 4. Block 0 - Plan Artifact Governance

### Objective

Make the new planning artifacts committable without breaking release-freeze strict mode.

### Scope

This block only covers planning documents and release-freeze guardrail metadata. It does not implement product changes.

### Target Files

- `docs/max-upgrade-implementation-plan.md`
- `docs/max-upgrade-execution-prompts.md`
- `docs/release-freeze-baseline.json`
- optionally `docs/README.md` if the operator wants the new docs discoverable

### Non-Goals

- Do not change app behavior.
- Do not change package scripts.
- Do not fix audit findings yet.
- Do not add a roadmap promise to README unless explicitly requested.

### Acceptance Criteria

- Both planning docs exist and are referenced intentionally or clearly local to docs.
- Strict release-freeze passes for the planning docs if they are staged.
- Docs checks pass.
- The final commit, if made, is docs-only.

### Verification Commands

```bash
pnpm test:doc-links
pnpm test:consistency
pnpm release:freeze:check:strict
```

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Use Russian for explanations and English for code comments/commit messages.

Goal:
Make the maximum upgrade planning artifacts safe to commit without implementing product changes.

Before editing:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md, CLAUDE.md, docs/max-upgrade-implementation-plan.md, docs/max-upgrade-execution-prompts.md if it exists, and docs/release-freeze-baseline.json
- If the worktree is dirty, list the changed files and do not touch unrelated changes

Tasks:
1. Inspect the new planning docs and verify they are docs-only.
2. Add docs/max-upgrade-implementation-plan.md and docs/max-upgrade-execution-prompts.md to docs/release-freeze-baseline.json if they are intended to be committed.
3. Optionally add a concise pointer from docs/README.md only if it fits the existing docs index style.
4. Do not change app code, scripts, CI, package.json, lockfiles, or product behavior.

Acceptance criteria:
- Planning docs are tracked intentionally.
- release-freeze strict sees all changed files as guardrail-approved.
- No product claim is introduced by the plan docs.

Verification:
- pnpm test:doc-links
- pnpm test:consistency
- pnpm release:freeze:check:strict

Delivery:
- changed files
- validation matrix
- residual risks
- whether to commit
```

## 5. Block 1 - Truth And Ghost Cleanup

### Objective

Eliminate the highest-risk truth gaps: diagnostics UI claim, stale diagnostic bundle docs, stale streaming STT docs, lifecycle matrix failure, and release-freeze matrix drift.

### Maximal Scope

This block can combine all docs/script-truth cleanup if it stays mostly docs and governance. If it touches package scripts, split into a second commit.

### Target Files

- `README.md`
- `docs/release-readiness.md`
- `docs/known-limitations.md`
- `docs/privacy-and-trust.md`
- `docs/settings-reference.md`
- `docs/beta-ops-diagnostics.md`
- `docs/troubleshooting.md`
- `docs/runtime-evidence.md`
- `docs/runtime-decisions.md`
- `docs/third-party-providers.md`
- `docs/release-freeze-matrix.md`
- `docs/release-freeze-baseline.json`
- `docs/script-lifecycle-matrix.md`
- `package.json` only if required
- `scripts/check-script-lifecycle.mjs` only if the checker itself is wrong

### Non-Goals

- Do not change runtime behavior.
- Do not hide debug trace controls.
- Do not implement Candidate Pack boundary changes here.
- Do not create new runtime evidence.
- Do not expand product positioning.

### Sub-Batches

| Batch | Focus | Stop condition |
| --- | --- | --- |
| 1A | Diagnostics UI truth | No public doc falsely says there is no diagnostic UI while Settings exposes debug traces |
| 1B | Removed diagnostic bundle flow | No shipped docs instruct users to call missing `collect_diagnostic_bundle` |
| 1C | Streaming STT stale docs | No shipped docs instruct users to enable missing `useStreamingStt` |
| 1D | Lifecycle matrix | `pnpm scripts:lifecycle` passes |
| 1E | Release-freeze matrix | Baseline and matrix scenarios agree |

### Acceptance Criteria

- `rg "collect_diagnostic_bundle|collect diagnostic bundle"` returns no shipped-flow references.
- `rg "useStreamingStt|Streaming STT"` returns only removed/future/historical contexts or no hits.
- Docs describe debug traces as a real local diagnostics surface if the UI keeps exposing them.
- `pnpm scripts:lifecycle` passes.
- Release-freeze matrix scenarios match `docs/release-freeze-baseline.json`.
- Copy rules are not weakened.

### Verification Commands

```bash
rg -n "collect_diagnostic_bundle|collect diagnostic bundle" README.md docs scripts -g "*.md" -g "*.mjs"
rg -n "useStreamingStt|Streaming STT|streaming STT" README.md docs scripts src-tauri/src src/app -g "*.md" -g "*.mjs" -g "*.rs" -g "*.ts" -g "*.tsx"
pnpm scripts:lifecycle
pnpm test:doc-links
pnpm test:consistency
pnpm copy:check
pnpm release:freeze:check:strict
```

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Implement Block 1: Truth And Ghost Cleanup.

Role:
Act as a senior release engineer, product truth auditor, and documentation maintainer.

Goal:
Make docs, script lifecycle metadata, and release-freeze docs match the actually shipped Replyline behavior. This is a truth-cleanup block, not a feature block.

Before editing:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md and CLAUDE.md
- Read docs/max-upgrade-implementation-plan.md and docs/max-upgrade-execution-prompts.md
- Read README.md, docs/release-readiness.md, docs/known-limitations.md, docs/privacy-and-trust.md, docs/settings-reference.md
- Read docs/beta-ops-diagnostics.md, docs/troubleshooting.md, docs/runtime-evidence.md, docs/runtime-decisions.md, docs/third-party-providers.md
- Read docs/release-freeze-baseline.json, docs/release-freeze-matrix.md, docs/script-lifecycle-matrix.md, package.json
- If dirty, list changed files and avoid unrelated edits

Known audit findings to fix:
1. README/release docs imply no diagnostics UI, but Settings exposes debug trace controls and related commands are registered.
2. Docs mention collect_diagnostic_bundle / collect diagnostic bundle even though no such command is registered.
3. Troubleshooting docs mention useStreamingStt / Streaming STT even though current STT path is Deepgram batch HTTP and settings schema has no useStreamingStt.
4. pnpm scripts:lifecycle fails because scripts are unclassified: test:observability-contract, report:sonar-residual, report:live-evidence-pack.
5. docs/release-freeze-matrix.md has stale scenario drift relative to docs/release-freeze-baseline.json.

Implementation requirements:
- Prefer docs and matrix fixes; do not change product behavior.
- Keep wording RU/EN policy intact: docs in existing language style, code comments only if needed in English.
- Preserve current product boundaries: WorkConversation, Interview Mode, Candidate Pack, Reports, Runtime Evidence, AI tooling.
- Do not claim runtime/live-call readiness.
- Do not claim full local-only operation.
- Do not weaken copy-rules or security language.
- If package.json must change, justify why and run the package-script checks.

Specific tasks:
1. Update public and release docs so debug traces are described as an explicit local diagnostics/ops surface, redacted by default, with full_local storing sensitive local content only when selected.
2. Replace stale diagnostic bundle instructions with current runtime/evidence commands and artifact descriptions.
3. Remove or clearly mark streaming STT/useStreamingStt content as removed/future/unsupported, and state current Deepgram batch HTTP path.
4. Update docs/script-lifecycle-matrix.md so pnpm scripts:lifecycle passes.
5. Align docs/release-freeze-matrix.md scenarios with docs/release-freeze-baseline.json.
6. Run targeted rg checks and required validation commands.

Acceptance criteria:
- No shipped docs claim the diagnostics UI is absent if debug trace controls remain in Settings.
- No shipped docs instruct users to call collect_diagnostic_bundle.
- No shipped docs instruct users to enable useStreamingStt.
- pnpm scripts:lifecycle passes.
- release-freeze matrix and baseline no longer conflict.
- No new unsupported product claims are introduced.

Verification commands:
- rg -n "collect_diagnostic_bundle|collect diagnostic bundle" README.md docs scripts -g "*.md" -g "*.mjs"
- rg -n "useStreamingStt|Streaming STT|streaming STT" README.md docs scripts src-tauri/src src/app -g "*.md" -g "*.mjs" -g "*.rs" -g "*.ts" -g "*.tsx"
- pnpm scripts:lifecycle
- pnpm test:doc-links
- pnpm test:consistency
- pnpm copy:check
- pnpm release:freeze:check:strict

Delivery:
- changed files
- validation matrix with real pass/fail status
- remaining truth gaps, if any
- recommended next block
```

## 6. Block 2 - Mode Boundary And Trust Core

### Objective

Fix the core product/trust risk: Candidate Pack must not leak into WorkConversation by default, and Interview Mode must have explicit allowed-use and cloud/local boundaries.

### Maximal Scope

This block combines behavior, tests, UI copy, and docs because they describe one product boundary. It should be split into two commits if the diff becomes large:

- Commit A: Candidate Pack mode gating + tests.
- Commit B: trust boundary UI/docs copy.

### Target Files

- `src-tauri/src/services/capture_pipeline.rs`
- Rust tests in the same module or relevant test fixtures
- `src-tauri/src/candidate_pack.rs` if needed for test helpers
- `src/app/MainSurface.tsx`
- `src/app/CandidatePackStudio.tsx`
- `src/app/SettingsSurface.tsx` if report/privacy copy is touched
- `src/app/locale.ts`
- `src/app/*.test.tsx`
- `docs/candidate-pack.md`
- `docs/interview-mode.md`
- `docs/privacy-and-trust.md`
- `docs/third-party-providers.md`
- `docs/copy-rules.md`
- `docs/settings-reference.md`

### Non-Goals

- Do not add a new WorkConversation Candidate Pack toggle unless explicitly requested.
- Do not add stealth, click-through, hidden overlay, or automatic-answer behavior.
- Do not change provider architecture.
- Do not change report storage format unless tests require it.
- Do not add new dependencies.

### Sub-Batches

| Batch | Focus | Stop condition |
| --- | --- | --- |
| 2A | Candidate Pack mode gating | WorkConversation prompt excludes Candidate Pack by default, with regression test |
| 2B | Candidate Pack cloud/local disclosure | Candidate Pack preparation UI/docs disclose LLM processing and local storage |
| 2C | Interview allowed-use boundary | Interview start/session UI makes allowed-use and visible-assistant boundary clear |
| 2D | Report/export sensitivity | Full vs redacted export sensitivity and retention are obvious |
| 2E | Privacy docs alignment | Data flow tables match code and UI |

### Acceptance Criteria

- WorkConversation no longer includes Candidate Pack compact context by default.
- Interview Mode still includes Candidate Pack context when an active session exists and pack is saved.
- Tests fail if Candidate Pack context returns to WorkConversation unintentionally.
- Candidate Pack UI and docs state local storage and cloud LLM processing clearly.
- Interview Mode UI/docs avoid cheating/stealth framing and state allowed-use responsibility.
- Full report export warns that raw transcript can be included; redacted export remains safe.
- Locale check passes.

### Verification Commands

```bash
cargo test --manifest-path src-tauri/Cargo.toml services::capture_pipeline
pnpm test:prompt-contract
pnpm test:ui
pnpm test:locale-keys
pnpm copy:check
pnpm test:security-lanes
pnpm test:public-footprint
pnpm verify:fast
pnpm release:freeze:check:strict
```

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Implement Block 2: Mode Boundary And Trust Core.

Role:
Act as a Rust/Tauri technical lead, privacy reviewer, AI-product strategist, and QA engineer.

Goal:
Make WorkConversation and Interview Mode separation enforceable in code, tests, UI, and docs. Candidate Pack must not affect WorkConversation by default. Interview Mode and Candidate Pack must disclose allowed-use and cloud/local data boundaries clearly.

Before editing:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md and CLAUDE.md
- Read docs/max-upgrade-implementation-plan.md and docs/max-upgrade-execution-prompts.md
- Read src-tauri/src/services/capture_pipeline.rs, src-tauri/src/candidate_pack.rs, src-tauri/src/interview_card_v1.rs, src-tauri/src/interview_report.rs, src-tauri/src/privacy.rs
- Read src/app/model.ts, src/app/MainSurface.tsx, src/app/CandidatePackStudio.tsx, src/app/SettingsSurface.tsx, src/app/locale.ts
- Read docs/candidate-pack.md, docs/interview-mode.md, docs/privacy-and-trust.md, docs/third-party-providers.md, docs/copy-rules.md
- If dirty, list changed files and avoid unrelated edits

Known audit finding:
src-tauri/src/services/capture_pipeline.rs appends Candidate Pack compact context before deciding analysis mode. Docs imply Candidate Pack is Interview Mode context. This blurs WorkConversation privacy/scope boundaries.

Implementation requirements:
1. Change capture pipeline so Candidate Pack compact context is included only for Interview Mode by default.
2. Keep Interview Mode behavior intact: active interview session can use Candidate Pack context.
3. Add regression tests proving:
   - WorkConversation path does not include Candidate Pack context by default.
   - Interview path can include Candidate Pack context.
   - WorkConversation still maps to legacy gist/say_now/next_move card.
4. Add or update UI copy so Candidate Pack preparation clearly says:
   - raw resume/JD/company input is local before preparation;
   - preparation may send relevant content to the configured LLM provider;
   - saved compact context is local;
   - by default it is used for Interview Mode, not WorkConversation.
5. Add or update Interview Mode copy so the user sees:
   - use only where allowed;
   - Replyline is visible/local UI, not stealth;
   - no hidden/click-through workflow;
   - cloud STT/LLM providers can process transcript/context.
6. Add or update report/export copy so full export sensitivity and redacted export safety are clear.
7. Keep copy concise and consistent with RU-first UX.
8. Do not add new product directions or new provider types.

Acceptance criteria:
- A saved Candidate Pack cannot silently affect WorkConversation.
- Interview Mode still uses Candidate Pack when active.
- The user can understand Candidate Pack cloud/local behavior before preparation.
- The user can understand Interview Mode allowed-use boundary before or near starting a session.
- Full and redacted reports are distinguishable in UI/docs.
- No copy violates docs/copy-rules.md.

Verification commands:
- cargo test --manifest-path src-tauri/Cargo.toml services::capture_pipeline
- pnpm test:prompt-contract
- pnpm test:ui
- pnpm test:locale-keys
- pnpm copy:check
- pnpm test:security-lanes
- pnpm test:public-footprint
- pnpm verify:fast
- pnpm release:freeze:check:strict

Delivery:
- changed files grouped by code, UI, docs, tests
- validation matrix
- exact behavior before/after
- residual privacy/trust risks
- recommended next block
```

## 7. Block 3 - Release Gates And CI Hardening

### Objective

Make verification lanes, lifecycle checks, release readiness reports, and CI artifacts stricter and easier to reason about.

### Maximal Scope

This block may touch package scripts, CI workflows, release readiness scripts, and docs. If package scripts change, run the full relevant gates.

### Target Files

- `package.json`
- `docs/verification-lanes.md`
- `docs/smoke-checks.md`
- `docs/release-local-readiness.md`
- `docs/release-readiness.md`
- `docs/script-lifecycle-matrix.md`
- `scripts/check-script-lifecycle.mjs`
- `scripts/report-release-readiness.mjs`
- `scripts/report-release-readiness.test.mjs`
- `.github/workflows/ci.yml`
- `.github/workflows/extended-quality.yml`
- `.github/workflows/release-on-tag.yml`

### Non-Goals

- Do not add heavy packaging unless explicitly requested.
- Do not weaken `verify:fast`.
- Do not make optional runtime provider tests mandatory in normal local flow.
- Do not claim release readiness without artifacts.

### Sub-Batches

| Batch | Focus | Stop condition |
| --- | --- | --- |
| 3A | Lane semantics | Docs explain `verify`, `verify:fast`, `verify:full`, `verify:extended`, `verify:release-local` |
| 3B | Lifecycle enforcement | `scripts:lifecycle` is part of release-local or documented operator flow |
| 3C | Readiness report strictness | Missing runtime artifacts are explicit blockers or warnings |
| 3D | CI artifact clarity | Workflows and docs agree about what CI uploads/builds |
| 3E | Release-freeze strict path | Strict check remains green and documented |

### Acceptance Criteria

- Every package verification script has a documented role.
- `pnpm scripts:lifecycle` passes and is included in the correct release lane or intentionally excluded with rationale.
- Release readiness report distinguishes static gates, runtime evidence, and missing artifacts.
- `release-on-tag.yml` is documented as release notes only unless packaging is implemented.
- CI behavior matches docs.

### Verification Commands

```bash
pnpm scripts:lifecycle
pnpm test:doc-links
pnpm test:consistency
pnpm report:release-readiness
pnpm report:release-readiness:strict
pnpm verify:fast
pnpm verify:release-local
pnpm release:freeze:check:strict
```

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Implement Block 3: Release Gates And CI Hardening.

Role:
Act as a QA/release engineer and CI owner.

Goal:
Make package verification lanes, release-local behavior, lifecycle checks, release readiness reports, and GitHub workflows consistent, strict where appropriate, and clearly documented.

Before editing:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md and CLAUDE.md
- Read package.json
- Read docs/verification-lanes.md, docs/smoke-checks.md, docs/release-local-readiness.md, docs/release-readiness.md, docs/script-lifecycle-matrix.md
- Read scripts/check-script-lifecycle.mjs, scripts/report-release-readiness.mjs, scripts/report-release-readiness.test.mjs
- Read .github/workflows/ci.yml, .github/workflows/extended-quality.yml, .github/workflows/release-on-tag.yml
- If dirty, list changed files and avoid unrelated edits

Known audit findings:
- Verification lanes overlap and are hard to reason about.
- scripts:lifecycle failed before matrix cleanup and should be integrated into release readiness once green.
- release-on-tag creates release notes, not packaged binaries.
- Runtime evidence and static gates must be separated in readiness reports.

Implementation requirements:
1. Define each verification lane clearly:
   - verify / verify:fast
   - verify:full
   - verify:extended
   - verify:release-local
   - smoke
   - security lanes
   - public footprint
   - runtime/evidence lanes
2. Decide whether duplicate rust:deps/audit:npm in verify:full are intentional. Prefer documenting duplication unless simplification is obviously safe.
3. Add pnpm scripts:lifecycle to verify:release-local if it is stable and useful there.
4. Ensure release readiness report classifies:
   - static gates
   - dependency/security gates
   - runtime evidence artifacts
   - missing runtime artifacts
   - release-freeze status
5. Ensure docs and workflows do not imply release-on-tag builds installers unless it really does.
6. Keep CI practical for Windows and low-RAM local development.

Acceptance criteria:
- pnpm scripts:lifecycle passes.
- docs match package scripts and CI behavior.
- release readiness report behavior is explicit and tested.
- verify:fast remains the default PR/local profile.
- release-local is stronger and suitable before handoff.

Verification commands:
- pnpm scripts:lifecycle
- pnpm test:doc-links
- pnpm test:consistency
- pnpm report:release-readiness
- pnpm report:release-readiness:strict
- pnpm verify:fast
- pnpm verify:release-local
- pnpm release:freeze:check:strict

Delivery:
- changed files
- whether package scripts changed
- validation matrix
- any commands not run and why
- residual CI/release risks
```

## 8. Block 4 - Runtime Evidence Closure

### Objective

Produce or honestly fail to produce measured Windows runtime evidence. This block is evidence-first; it should not silently patch product behavior unless a small blocker fix is required and validated.

### Maximal Scope

Runtime probe, benchmark, live source matrix, evidence bundle, SLO report, release readiness report, and docs updates based on measured results.

### Target Files

- `reports/` generated artifacts, only sanitized allowlisted files if committed
- `docs/runtime-evidence.md`
- `docs/runtime-live-qa.md`
- `docs/live-runtime-matrix.md`
- `docs/runtime-quality-harness.md`
- `docs/benchmark-policy.md`
- `docs/core-pipeline-slo.json`
- `scripts/parse-pipeline-latency.mjs`
- `scripts/report-runtime-quality-summary.mjs`
- `scripts/report-live-evidence-pack.mjs`
- `scripts/report-release-readiness.mjs` if evidence classification needs adjustment

### Non-Goals

- Do not invent runtime results.
- Do not commit raw transcripts, API keys, provider responses, sensitive screenshots, or raw Candidate Pack content.
- Do not tune latency blindly before measuring.
- Do not turn optional live provider checks into default local checks.

### Sub-Batches

| Batch | Focus | Stop condition |
| --- | --- | --- |
| 4A | Runtime preflight | Credentials/settings/source readiness captured without secrets |
| 4B | Latency benchmark | p50/p95 timings and hardware/network notes captured |
| 4C | Live source matrix | Available call/audio sources tested or marked unavailable |
| 4D | Evidence bundle | Bundle generated and secret scans pass |
| 4E | Readiness update | Docs/report state measured results and remaining blockers |

### Acceptance Criteria

- Runtime artifacts exist or failures are explicitly documented.
- Secret/public footprint checks pass after artifact generation.
- SLO report does not upgrade claims beyond evidence.
- Release readiness report consumes the artifacts or flags missing ones.
- Docs state exact dates and machine context for measured evidence.

### Verification Commands

```bash
pnpm probe:runtime
pnpm probe:bench
pnpm probe:live-source
pnpm test:slo-budget
pnpm report:runtime-quality
pnpm report:live-evidence-pack
pnpm evidence:bundle
pnpm test:public-footprint
pnpm report:release-readiness:strict
```

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Implement Block 4: Runtime Evidence Closure.

Role:
Act as a runtime QA engineer, privacy reviewer, and release engineer.

Goal:
Generate measured Windows runtime evidence for Replyline or produce a truthful blocker report. Do not change product behavior unless a small, necessary blocker fix is identified and approved by the operator.

Before editing or running probes:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md and CLAUDE.md
- Read docs/runtime-evidence.md, docs/runtime-live-qa.md, docs/live-runtime-matrix.md, docs/runtime-quality-harness.md, docs/benchmark-policy.md, docs/core-pipeline-slo.json
- Read scripts/report-runtime-quality-summary.mjs, scripts/report-live-evidence-pack.mjs, scripts/parse-pipeline-latency.mjs, scripts/check-report-secret-leaks.mjs
- Confirm which provider credentials and audio sources are available locally
- If credentials or live sources are unavailable, report that explicitly before running what can run

Execution requirements:
1. Run runtime preflight/probe commands available in package.json.
2. Run benchmark commands and collect timing artifacts.
3. Run live-source matrix for available sources only; mark unavailable sources clearly.
4. Generate runtime quality summary and live evidence pack.
5. Generate evidence bundle if available.
6. Run secret/public footprint checks after artifacts are generated.
7. Update docs only to reflect measured evidence, missing evidence, and exact limitations. Use concrete dates.
8. Do not commit raw sensitive artifacts.
9. Do not claim universal low latency, works everywhere, live-call readiness, or cross-app support unless the artifact proves it.

Acceptance criteria:
- Evidence artifacts exist or blocker reasons are documented.
- Reports contain no API keys, raw transcripts, raw Candidate Pack values, provider response bodies, or secrets.
- SLO status is based on measured data.
- Release readiness report separates static gates from runtime evidence.
- Public docs remain conservative.

Verification commands:
- pnpm probe:runtime
- pnpm probe:bench
- pnpm probe:live-source
- pnpm test:slo-budget
- pnpm report:runtime-quality
- pnpm report:live-evidence-pack
- pnpm evidence:bundle
- pnpm test:public-footprint
- pnpm report:release-readiness:strict

If a command cannot run:
- Capture exact command, failure, and reason.
- Do not mark it passed.
- Add a blocker note if this affects beta readiness.

Delivery:
- generated artifacts and whether they are tracked or ignored
- validation matrix
- measured latency summary if available
- source matrix summary
- privacy/secret scan result
- residual runtime blockers
```

## 9. Block 5 - UX And Onboarding Upgrade

### Objective

Improve first-run clarity, Settings information architecture, WorkConversation card hierarchy, Interview Mode state clarity, and Candidate Pack UX without adding new product scope.

### Maximal Scope

This is the largest frontend UX block. Split into internal commits if needed:

- Commit A: copy and locale.
- Commit B: Settings IA.
- Commit C: Main card/mode UI.
- Commit D: Candidate Pack Studio states.

### Target Files

- `src/app/MainSurface.tsx`
- `src/app/SettingsSurface.tsx`
- `src/app/CandidatePackStudio.tsx`
- `src/app/App.ui.test.tsx`
- other `src/app/*.test.tsx`
- `src/app/locale.ts`
- `src/app/model.ts` only if state shape must change
- `src/App.css`
- `docs/runtime-bringup.md`
- `docs/settings-reference.md`
- `docs/manual-ui-qa.md`
- `docs/manual-visual-qa.md`
- `docs/manual-windows-ux-qa.md`

### Non-Goals

- Do not redesign the app from scratch.
- Do not introduce a new design system dependency.
- Do not add new provider flows.
- Do not expose CardSchemaV3 fields directly in legacy UI unless intentionally planned.
- Do not make Interview Mode the default path.

### Sub-Batches

| Batch | Focus | Stop condition |
| --- | --- | --- |
| 5A | First-run setup | Missing keys/provider/preflight state is actionable |
| 5B | Settings IA | Everyday settings, reports/privacy, diagnostics/ops are not conflated |
| 5C | Mode state clarity | Active Interview session is visually obvious |
| 5D | Work card hierarchy | `gist/say_now/next_move` remains compact and clear |
| 5E | Candidate Pack Studio states | Empty/draft/saved/cloud processing/clear states are clear |
| 5F | Manual QA docs | Manual UX checks match the new surfaces |

### Acceptance Criteria

- New user can identify missing setup steps without reading docs first.
- Debug trace settings are not confused with normal report settings.
- Active mode is obvious in UI.
- Candidate Pack saved/draft state is clear.
- UI remains RU-first with EN mirror.
- No hardcoded TSX locale violations.

### Verification Commands

```bash
pnpm test:ui
pnpm test:locale-keys
pnpm copy:check
pnpm test:consistency
pnpm smoke
```

### Browser Verification

If the local app has a known dev URL, use the in-app Browser plugin after significant frontend changes to inspect desktop and mobile-ish widths. If the app cannot be launched in browser mode, record that manual visual QA was not run.

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Implement Block 5: UX And Onboarding Upgrade.

Role:
Act as a senior frontend engineer, UX reviewer, and privacy-conscious product designer.

Goal:
Improve setup clarity, Settings IA, mode visibility, WorkConversation card readability, and Candidate Pack Studio state clarity without adding new product scope.

Before editing:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md and CLAUDE.md
- Read src/app/model.ts, src/app/MainSurface.tsx, src/app/SettingsSurface.tsx, src/app/CandidatePackStudio.tsx, src/app/locale.ts, src/App.css
- Read src/app/*.test.ts and src/app/*.test.tsx relevant to UI
- Read docs/runtime-bringup.md, docs/settings-reference.md, docs/manual-ui-qa.md, docs/manual-visual-qa.md, docs/manual-windows-ux-qa.md
- If dirty, list changed files and avoid unrelated edits

Design constraints:
- Preserve existing visual language unless there is a clear reason to improve it.
- Avoid generic AI-looking UI.
- Keep the app Windows-first and tray-app oriented.
- Keep WorkConversation compact.
- Keep Interview Mode explicit and not stealthy.
- Keep RU-first UX with EN mirror.

Implementation requirements:
1. First-run/setup:
   - Make missing Deepgram key, LLM key/base URL, or preflight blockers actionable.
   - Avoid overwhelming the user with all settings at once.
2. Settings IA:
   - Separate everyday settings from reports/privacy and diagnostics/ops.
   - Make debug trace retention and full_local warning clear.
3. Mode clarity:
   - Make active Interview session visibly distinct.
   - Make WorkConversation default state clear when no Interview session is active.
4. WorkConversation card:
   - Improve hierarchy of gist/say_now/next_move without changing IPC contract.
5. Candidate Pack Studio:
   - Clarify empty, draft prepared, saved, processing, clear/delete, and cloud/local states.
6. Docs/manual QA:
   - Update manual UI/visual/Windows UX QA docs if surfaces change.

Acceptance criteria:
- Locale check reports zero hardcoded TSX violations.
- UI tests pass.
- Copy check passes.
- No unsupported product claim appears.
- No new cloud/local ambiguity is introduced.

Verification commands:
- pnpm test:ui
- pnpm test:locale-keys
- pnpm copy:check
- pnpm test:consistency
- pnpm smoke

Optional visual verification:
- Use the Browser plugin if a local dev URL is available.
- Otherwise document that visual browser QA was not run.

Delivery:
- changed files grouped by surface
- validation matrix
- screenshots or visual QA notes if available
- residual UX risks
- recommended next block
```

## 10. Block 6 - Architecture And Test Hardening

### Objective

Improve maintainability and regression protection across frontend boundaries, Rust settings/IPC/error handling, prompt contracts, and ghost code references.

### Maximal Scope

This block is broad but should be split by test surface if needed:

- Commit A: architecture docs and dead-code/ghost cleanup.
- Commit B: IPC command categorization.
- Commit C: settings migration fixtures.
- Commit D: error catalog mapping.

### Target Files

- `docs/architecture.md`
- `docs/error-catalog.md`
- `docs/card-schema-v3-migration.md`
- `docs/interview-quality.md`
- `docs/prompt-contract-lane.md`
- `src/app/controller/*`
- `src/app/model.ts`
- `src/app/platform.ts`
- `src/app/*.test.ts`
- `src/app/*.test.tsx`
- `src-tauri/src/commands.rs`
- `src-tauri/src/types.rs`
- `src-tauri/src/settings.rs`
- `src-tauri/src/services/pipeline_errors.rs`
- `scripts/check-ipc-handler-contract.mjs`
- `scripts/check-prompt-contract.mjs`
- `tests/fixtures/runtime/*`

### Non-Goals

- Do not rewrite controller architecture unless a concrete test gap requires it.
- Do not change IPC names without migration.
- Do not change settings schema without migration and fixtures.
- Do not remove historical docs unless they are misleading as shipped docs.

### Sub-Batches

| Batch | Focus | Stop condition |
| --- | --- | --- |
| 6A | Architecture map | Docs match `src/app/controller/*`, platform bridge, model source of truth |
| 6B | IPC categories | Commands are classified and orphan command drift is caught |
| 6C | Settings fixtures | v7/v8/v9 migration and invalid retention edge cases are covered |
| 6D | Error catalog | User-safe errors map to docs and provider bodies remain hidden |
| 6E | Ghost references | Stale memory/local STT/provider_health/diagnostic_bundle references cleaned or marked future/historical |

### Acceptance Criteria

- Architecture docs match actual module boundaries.
- IPC contract check catches unregistered/missing commands and categories.
- Settings migration fixtures cover stable old installs.
- Error catalog reflects user-facing safe errors.
- Mandatory ghost-reference grep results are acceptable.

### Verification Commands

```bash
pnpm test:ipc-contract
pnpm test:runtime-preflight-contract
pnpm test:prompt-contract
pnpm test:doc-links
pnpm test:consistency
pnpm verify:fast
```

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Implement Block 6: Architecture And Test Hardening.

Role:
Act as a TypeScript/Solid frontend architect, Rust/Tauri backend lead, and regression-test owner.

Goal:
Strengthen architecture documentation and automated regression coverage without broad rewrites.

Before editing:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md and CLAUDE.md
- Read docs/architecture.md, docs/error-catalog.md, docs/card-schema-v3-migration.md, docs/interview-quality.md, docs/prompt-contract-lane.md
- Read src/app/model.ts, src/app/platform.ts, src/app/controller.ts, src/app/controller/*, src/app/*.test.ts, src/app/*.test.tsx
- Read src-tauri/src/commands.rs, src-tauri/src/types.rs, src-tauri/src/settings.rs, src-tauri/src/services/pipeline_errors.rs
- Read scripts/check-ipc-handler-contract.mjs, scripts/check-prompt-contract.mjs, tests/fixtures/runtime/*
- If dirty, list changed files and avoid unrelated edits

Implementation requirements:
1. Architecture docs:
   - Update frontend map to reflect controller submodules.
   - Preserve source-of-truth boundaries: model.ts, platform.ts, controller.
   - Document Rust module ownership accurately.
2. IPC contract:
   - Add command categories if useful: user, runtime, settings, secrets, report, candidate, interview, trace/diagnostics, tray/window.
   - Ensure the checker flags missing or orphan commands without false positives.
3. Settings migration:
   - Add fixture coverage for important v7/v8/v9 migration and invalid retention cases.
   - Do not change schema unless required.
4. Error catalog:
   - Align user-safe error messages and docs.
   - Confirm provider HTTP bodies and secrets are not surfaced.
5. Ghost reference audit:
   - Run targeted rg for memory shipped claims, provider_health, diagnostic_bundle, local STT, Advanced Mode, and alpha-only language.
   - Clean references or mark them future/historical.

Acceptance criteria:
- No architecture doc describes a non-existent shipped module as shipped.
- IPC contract remains green and stronger if categories are added.
- Settings fixtures protect migration behavior.
- Error catalog matches code behavior.
- Ghost references are intentional and classified.

Verification commands:
- pnpm test:ipc-contract
- pnpm test:runtime-preflight-contract
- pnpm test:prompt-contract
- pnpm test:doc-links
- pnpm test:consistency
- pnpm verify:fast

Delivery:
- changed files grouped by docs/scripts/tests/code
- validation matrix
- any architectural non-goals intentionally deferred
- residual maintainability risks
```

## 11. Block 7 - Public Beta Trust And Support

### Objective

Make public-facing copy, issue templates, support/security docs, privacy policy, and release posture safe for public beta.

### Maximal Scope

This block includes public copy freeze, support/security templates, legal/compliance posture, and release packaging decision docs. It should not implement packaging unless explicitly requested.

### Target Files

- `README.md`
- landing files if present
- `docs/copy-rules.md`
- `docs/privacy-policy.md`
- `docs/privacy-and-trust.md`
- `docs/known-limitations.md`
- `docs/beta-readiness.md`
- `docs/release-readiness.md`
- `.github/SECURITY.md`
- `.github/SUPPORT.md`
- `.github/ISSUE_TEMPLATE/*`
- `.github/release.yml`
- `.github/workflows/release-on-tag.yml`

### Non-Goals

- Do not introduce billing/account/auth/cloud database flows.
- Do not claim compliance certifications.
- Do not implement installer packaging unless the operator explicitly chooses that path.
- Do not market Interview Mode as hidden live help.

### Sub-Batches

| Batch | Focus | Stop condition |
| --- | --- | --- |
| 7A | Public copy freeze | Allowed and banned claims are enforced |
| 7B | Support templates | Users are told not to attach secrets/transcripts/reports |
| 7C | Privacy policy | Provider/cloud/local/report/retention boundaries are clear |
| 7D | Release posture | Source/notes vs installer artifact behavior is explicit |
| 7E | Legal posture | Allowed-use and no-certification wording is conservative |

### Acceptance Criteria

- Public docs avoid unsupported claims.
- Issue templates discourage sensitive uploads.
- Privacy policy matches shipped Deepgram/LLM/Candidate Pack/report behavior.
- Release docs do not imply binaries if workflow only creates notes.
- Interview Mode is framed as visible, allowed-use assistance, not stealth automation.

### Verification Commands

```bash
rg -n "stealth|invisible overlay|click-through|emotion scoring|therapy|answers for you automatically|works everywhere|always low latency|nothing is ever stored anywhere|fully local" README.md docs landing .github -g "*.md" -g "*.html" -g "*.yml"
pnpm copy:check
pnpm test:doc-links
pnpm test:consistency
pnpm test:public-footprint
pnpm release:freeze:check:strict
```

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Implement Block 7: Public Beta Trust And Support.

Role:
Act as a product truth reviewer, security/privacy reviewer, support lead, and release communications owner.

Goal:
Prepare public-facing docs and GitHub support/security surfaces for a conservative, accurate public beta posture.

Before editing:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md and CLAUDE.md
- Read README.md, docs/copy-rules.md, docs/privacy-policy.md, docs/privacy-and-trust.md, docs/known-limitations.md, docs/beta-readiness.md, docs/release-readiness.md
- Read .github/SECURITY.md, .github/SUPPORT.md, .github/ISSUE_TEMPLATE/*, .github/release.yml, .github/workflows/release-on-tag.yml
- Inspect landing files if present
- If dirty, list changed files and avoid unrelated edits

Implementation requirements:
1. Public copy:
   - Enforce banned claims: no stealth, no invisible/click-through overlay, no emotion scoring, no therapy/coaching, no automatic answers for you, no works-everywhere, no always-low-latency, no nothing-is-ever-stored-anywhere, no fully-local claim.
   - Keep WorkConversation and Interview Mode positioning conservative.
2. Support/security:
   - Issue templates and support docs must warn users not to attach API keys, bearer tokens, raw transcripts, full reports, raw Candidate Pack content, screenshots with sensitive info, provider responses, or logs with secrets.
   - Provide a safer redacted artifact path if available.
3. Privacy:
   - State Deepgram STT and configured LLM provider cloud processing.
   - State Candidate Pack preparation cloud/local behavior.
   - State full/redacted reports and retention.
   - State debug traces and local diagnostics behavior.
4. Release posture:
   - Make it clear whether release-on-tag creates notes only or actual binaries.
   - Do not imply installer artifacts unless implemented.
5. Legal posture:
   - Add pragmatic allowed-use responsibility for Interview Mode.
   - Avoid legal advice and compliance certification claims.

Acceptance criteria:
- Blocked-claims grep has no positive unsupported public claims.
- Support templates discourage sensitive uploads.
- Privacy docs match code and UI behavior.
- Release docs match workflows.
- Copy check passes.

Verification commands:
- rg -n "stealth|invisible overlay|click-through|emotion scoring|therapy|answers for you automatically|works everywhere|always low latency|nothing is ever stored anywhere|fully local" README.md docs landing .github -g "*.md" -g "*.html" -g "*.yml"
- pnpm copy:check
- pnpm test:doc-links
- pnpm test:consistency
- pnpm test:public-footprint
- pnpm release:freeze:check:strict

Delivery:
- changed files
- validation matrix
- any remaining public beta risks
- recommended next block
```

## 12. Block 8 - Product Validation And Scope Decisions

### Objective

Create an evidence loop for testers and product decisions without collecting or committing sensitive content.

### Maximal Scope

Tester protocol, feedback template, PMF evidence ledger, Interview Mode beta posture decision, future-track isolation.

### Target Files

- `docs/tester-brief.md`
- `docs/test-feedback-template.md`
- `docs/beta-feedback-loop.md`
- `docs/beta-readiness.md`
- `docs/known-limitations.md`
- `docs/extension-points.md`
- `docs/memory-layer.md`
- `docs/runtime-decisions.md`
- `docs/third-party-providers.md`
- `docs/local-roo-workflow.md`
- `docs/ai-tooling-policy-matrix.md`

### Non-Goals

- Do not commit raw tester transcripts.
- Do not add analytics/telemetry.
- Do not add accounts, billing, auth, cloud DB, or vector DB.
- Do not move future tracks into shipped scope.

### Sub-Batches

| Batch | Focus | Stop condition |
| --- | --- | --- |
| 8A | Tester protocol | Testers can safely run WorkConversation and Interview scenarios |
| 8B | Feedback template | Feedback captures usefulness, trust, latency, setup friction, mode confusion |
| 8C | PMF ledger | Product decisions can cite evidence without raw sensitive data |
| 8D | Interview posture | Interview Mode is core, optional, or gated beta based on criteria |
| 8E | Future-track isolation | Memory/local STT/Advanced/provider expansion remain future-only |

### Acceptance Criteria

- Tester docs instruct redacted feedback only.
- Feedback loop captures PMF-relevant signals.
- Interview Mode beta posture has explicit decision criteria.
- Future tracks cannot be mistaken for shipped features.
- AI-agent governance remains aligned with repo policy.

### Verification Commands

```bash
pnpm test:doc-links
pnpm test:consistency
pnpm copy:check
rg -n "Memory backend|memory backend|Memory layer|memory layer|memory\\.rs" README.md docs src-tauri/src scripts -g "*.md" -g "*.rs" -g "*.mjs"
rg -n "local STT|Whisper|faster-whisper|STT endpoint|point Replyline.*STT" README.md docs src-tauri/src scripts -g "*.md" -g "*.rs" -g "*.mjs"
pnpm release:freeze:check:strict
```

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Implement Block 8: Product Validation And Scope Decisions.

Role:
Act as a pragmatic product architect, privacy reviewer, and beta program owner.

Goal:
Create a safe tester feedback and product validation loop that improves PMF evidence without expanding product scope or committing sensitive data.

Before editing:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md and CLAUDE.md
- Read docs/tester-brief.md, docs/test-feedback-template.md, docs/beta-feedback-loop.md, docs/beta-readiness.md, docs/known-limitations.md
- Read docs/extension-points.md, docs/memory-layer.md, docs/runtime-decisions.md, docs/third-party-providers.md
- Read docs/local-roo-workflow.md and docs/ai-tooling-policy-matrix.md
- If dirty, list changed files and avoid unrelated edits

Implementation requirements:
1. Tester protocol:
   - Define a safe WorkConversation test scenario.
   - Define a safe Interview Mode scenario with allowed-use wording.
   - Define setup expectations and what to do when credentials/audio sources are unavailable.
2. Feedback template:
   - Capture setup friction, trust concerns, card usefulness, latency tolerance, mode confusion, report usefulness, Candidate Pack clarity.
   - Require redacted feedback only.
   - Forbid raw transcripts, full reports, keys, provider bodies, raw Candidate Pack values, and sensitive screenshots.
3. PMF evidence ledger:
   - Add a structure for summarized findings only.
   - Include decision criteria for whether Interview Mode is core beta, optional beta, or gated beta.
4. Future-track isolation:
   - Ensure memory, local STT, Advanced Mode, provider expansion, and packaging are marked future-only unless shipped.
   - Keep current product direction fixed: quality, safety, reliability, beta readiness, local UX, developer confidence.
5. AI-agent governance:
   - Ensure prompts and workflows do not instruct agents to expand scope or ignore privacy.

Acceptance criteria:
- Tester docs can be handed to a tester without exposing sensitive data.
- Product validation docs produce evidence, not raw sensitive artifacts.
- Interview Mode public posture has decision criteria.
- Future tracks remain clearly non-shipped.
- Copy checks pass.

Verification commands:
- pnpm test:doc-links
- pnpm test:consistency
- pnpm copy:check
- rg -n "Memory backend|memory backend|Memory layer|memory layer|memory\\.rs" README.md docs src-tauri/src scripts -g "*.md" -g "*.rs" -g "*.mjs"
- rg -n "local STT|Whisper|faster-whisper|STT endpoint|point Replyline.*STT" README.md docs src-tauri/src scripts -g "*.md" -g "*.rs" -g "*.mjs"
- pnpm release:freeze:check:strict

Delivery:
- changed files
- validation matrix
- remaining PMF unknowns
- recommended tester cohort size and next action
```

## 13. Recommended Execution Strategy

### If Optimizing For Fastest Trust Upgrade

Run blocks in this order:

1. Block 0 - Plan Artifact Governance
2. Block 1 - Truth And Ghost Cleanup
3. Block 2 - Mode Boundary And Trust Core
4. Block 3 - Release Gates And CI Hardening
5. Block 4 - Runtime Evidence Closure

### If Optimizing For Code Quality First

Run blocks in this order:

1. Block 0 - Plan Artifact Governance
2. Block 2 - Mode Boundary And Trust Core
3. Block 6 - Architecture And Test Hardening
4. Block 3 - Release Gates And CI Hardening
5. Block 1 - Truth And Ghost Cleanup

### If Optimizing For Public Beta Readiness

Run blocks in this order:

1. Block 0 - Plan Artifact Governance
2. Block 1 - Truth And Ghost Cleanup
3. Block 2 - Mode Boundary And Trust Core
4. Block 7 - Public Beta Trust And Support
5. Block 4 - Runtime Evidence Closure
6. Block 8 - Product Validation And Scope Decisions

## 14. Suggested First Implementation Prompt

Use this first unless the operator wants to commit planning docs first.

```text
Start with Block 1 - Truth And Ghost Cleanup from docs/max-upgrade-execution-prompts.md.

Keep the patch docs/governance-only unless package script lifecycle metadata requires a package/script adjustment. Do not change runtime behavior. Run the full verification set listed in Block 1 and report exact pass/fail outcomes.
```

## 15. Stop Conditions

Stop and ask the operator before continuing if:

- A block requires deleting user changes.
- A verification command fails for a reason unrelated to the block.
- A runtime command needs secrets or credentials not configured locally.
- A proposed fix would expand product scope.
- A new dependency appears necessary.
- A public claim would require evidence that does not exist.
- Strict release-freeze fails and the fix is not obviously in-scope.

