# Replyline Maximum Upgrade Implementation Plan

Status: draft implementation plan  
Created from audit baseline: `2421d9b983c226dcb3700472e5dfe7bda7586368`  
Target repo mode: solo main workflow, Windows-first, direct-to-main after local verification  
Primary goal: maximize product truth, trust, release readiness, runtime evidence, maintainability, and beta confidence without expanding scope blindly

## 1. Executive Intent

This plan turns the audit findings into a staged implementation program. It is intentionally broad, but it preserves the current product direction:

- Keep Replyline focused on a Windows-first desktop tray assistant for allowed work conversations and explicit interview preparation/assistance contexts.
- Do not reposition Replyline as a meeting assistant, transcript tool, speaking coach, therapy/coaching tool, hidden cheating workflow, stealth overlay, automatic answer system, fully local product, or universally low-latency product.
- Upgrade quality by making shipped behavior, docs, tests, release gates, runtime evidence, and privacy boundaries match each other.
- Prefer minimal, test-backed changes over broad rewrites.
- Keep WorkConversation and Interview Mode clearly separated.
- Treat runtime/live-call readiness as unproven until evidence artifacts exist.

The plan is split into phases. Each phase can be completed as one or more small commits. Every block has acceptance criteria and verification commands.

## 2. North Star Outcomes

The target end state is not "more features". The target end state is a beta that can be trusted.

| Dimension | Current audit posture | Target posture |
| --- | --- | --- |
| Product truth | Mostly good, with several false/stale docs claims | Docs, UI, code, and package scripts agree |
| WorkConversation | Coherent but affected by Candidate Pack context leak | Candidate Pack cannot affect WorkConversation unless explicitly designed |
| Interview Mode | Useful but scope-sensitive | Explicit allowed-use boundary, no hidden cheating framing |
| Privacy/trust | Strong foundations, gaps in debug/candidate/report clarity | User can understand every local/cloud data path |
| Runtime evidence | Tooling exists, fresh evidence absent | Repeatable Windows evidence pack with measured timings |
| Release gates | Strong but one lifecycle check failed in audit | All default and release-local gates green |
| Dead/stale docs | Several stale operator docs | No docs mention removed flows as shipped |
| Maintainability | Good, with growing orchestration and stale references | Clear ownership boundaries and regression tests |
| Business validation | Low evidence | Small tester loop with structured feedback |

## 3. Program Principles

1. Truth first: do not improve marketing copy before behavior and evidence are correct.
2. Scope discipline: every new surface must state whether it belongs to WorkConversation, Interview Mode, Candidate Pack, Reports, Runtime Evidence, or Ops.
3. Privacy by default: sensitive artifacts must be explicit, local, redacted by default, and easy to clear.
4. Evidence over claims: latency, live-call readiness, cross-app support, and low-resource behavior require measured artifacts.
5. Small commits: one coherent change per commit, with validation recorded.
6. No test weakening: add tests for changed behavior; never delete tests to force green checks.
7. Windows-first realism: optimize for Windows 10/11 and low-RAM developer/tester machines before broader platform work.
8. Product safety: Interview Mode must not drift into hidden, stealth, or unauthorized interview automation.

## 4. Score Targets

These are implementation targets, not claims.

| Direction | Audit score | Target after plan |
| --- | ---: | ---: |
| Product focus | 78 | 88 |
| Product truth consistency | 70 | 92 |
| Scope discipline | 72 | 90 |
| WorkConversation UX | 78 | 88 |
| Interview Mode UX | 72 | 86 |
| Candidate Pack UX | 70 | 84 |
| Onboarding/setup UX | 78 | 88 |
| Settings UX | 68 | 84 |
| Runtime evidence maturity | 68 | 88 |
| Live-call readiness | 52 | 78 |
| Cross-machine readiness | 50 | 76 |
| Frontend architecture | 76 | 86 |
| Rust backend architecture | 80 | 88 |
| IPC contract hygiene | 86 | 92 |
| Privacy/trust posture | 76 | 92 |
| Security hardening | 78 | 88 |
| CI quality gates | 82 | 92 |
| Release readiness | 62 | 88 |
| Test coverage | 78 | 88 |
| Documentation quality | 70 | 92 |
| Legal/compliance posture | 65 | 84 |
| Business validation / PMF evidence | 48 | 72 |

## 5. Phase Map

| Phase | Name | Primary outcome | Suggested commit count |
| --- | --- | --- | ---: |
| 0 | Baseline and guardrails | Clean tree, clear checklist, no accidental scope | 0-1 |
| 1 | Truth cleanup | Remove false/stale claims | 3-6 |
| 2 | Privacy and trust boundaries | Candidate/debug/report/cloud paths explicit and tested | 4-8 |
| 3 | Mode separation | WorkConversation and Interview Mode cannot leak context unintentionally | 2-5 |
| 4 | Release gates and CI | All local/release gates explainable and green | 3-6 |
| 5 | Runtime evidence closure | Measured Windows artifacts exist | 2-6 |
| 6 | UX/onboarding upgrade | Settings, setup, Interview and Candidate Pack UX clearer | 4-8 |
| 7 | Architecture/test hardening | Maintainability and regression protection | 4-10 |
| 8 | Public beta readiness | Public footprint, support, legal, installer/release posture | 3-7 |
| 9 | Product validation loop | Tester evidence and PMF learning | 2-5 |
| 10 | Future tracks isolation | Memory/local STT/provider expansion stays future-only | 1-4 |

## 6. Phase 0 - Baseline And Guardrails

Goal: make sure the next work starts from a known clean state.

### Work Items

| ID | Task | Files | Acceptance criteria | Verification |
| --- | --- | --- | --- | --- |
| P0-0.1 | Record kickoff state for next implementation session | none | `git status` clean; `HEAD` recorded in work log | `git status --short --branch`, `git rev-parse HEAD` |
| P0-0.2 | Decide branch strategy per block | none | Routine docs/code blocks stay on `main`; risky runtime experiments can use temporary local branch | manual |
| P0-0.3 | Create implementation tracking checklist | `docs/` or issue tracker | Plan items can be marked done with evidence | docs check |

### Exit Criteria

- Working tree clean.
- Next block chosen.
- Required validation commands agreed before patch.

## 7. Phase 1 - Truth Cleanup

Goal: remove contradictions between docs, UI, package scripts, CI, and shipped code.

### Block 1.1 - Diagnostics Surface Truth

Problem: public docs say there is no diagnostic UI, but Settings exposes debug trace controls.

| Field | Plan |
| --- | --- |
| Affected files | `README.md`, `docs/release-readiness.md`, `docs/known-limitations.md`, `docs/privacy-and-trust.md`, `docs/settings-reference.md`, `src/app/SettingsSurface.tsx` if copy is adjusted |
| Implementation | Either document the current debug trace Settings surface honestly, or move it behind an explicit ops/debug-only surface. Prefer docs/copy cleanup first unless product wants UI removal. |
| Acceptance | No public doc says "no diagnostic UI" if Settings exposes debug traces. User-facing copy states redacted/default/full-local behavior. |
| Tests | `pnpm test:consistency`, `pnpm copy:check`, `pnpm test:locale-keys`, `pnpm verify:fast` if UI changes |
| Risk | Over-explaining diagnostics can scare users; under-explaining creates trust debt. |

### Block 1.2 - Remove Stale Diagnostic Bundle Flow

Problem: docs mention `collect_diagnostic_bundle`, but command is not registered.

| Field | Plan |
| --- | --- |
| Affected files | `docs/beta-ops-diagnostics.md`, `docs/troubleshooting.md`, `docs/release-freeze-matrix.md`, possibly `docs/runtime-evidence.md` |
| Implementation | Replace removed command with current `pnpm evidence:bundle`, runtime reports, and actual artifact paths. |
| Acceptance | `rg "collect_diagnostic_bundle|collect diagnostic bundle"` returns no shipped-flow claims. |
| Tests | `pnpm test:doc-links`, `pnpm test:consistency` |
| Risk | Operators may lose a known phrase; mitigate with migration wording. |

### Block 1.3 - Remove Stale Streaming STT Guidance

Problem: docs mention `useStreamingStt`, but settings schema has no such setting.

| Field | Plan |
| --- | --- |
| Affected files | `docs/troubleshooting.md`, `docs/runtime-decisions.md`, `docs/third-party-providers.md` |
| Implementation | Make current STT path explicit: Deepgram batch HTTP, no local STT, no streaming STT user setting. |
| Acceptance | `rg "useStreamingStt|Streaming STT"` only finds historical/future/unsupported context. |
| Tests | `pnpm test:doc-links`, `pnpm test:consistency` |
| Risk | None if wording is direct. |

### Block 1.4 - Script Lifecycle Matrix Cleanup

Problem: `pnpm scripts:lifecycle` failed in audit due unclassified scripts.

| Field | Plan |
| --- | --- |
| Affected files | `docs/script-lifecycle-matrix.md`, possibly `package.json` only if script names are truly wrong |
| Implementation | Classify `test:observability-contract`, `report:sonar-residual`, `report:live-evidence-pack`. |
| Acceptance | `pnpm scripts:lifecycle` passes. |
| Tests | `pnpm scripts:lifecycle`, `pnpm test:consistency` |
| Risk | Matrix can become noisy; keep high-signal. |

### Block 1.5 - Release Freeze Matrix Alignment

Problem: release-freeze matrix and baseline drift.

| Field | Plan |
| --- | --- |
| Affected files | `docs/release-freeze-matrix.md`, `docs/release-freeze-baseline.json` |
| Implementation | Make matrix generated-by-baseline in wording; remove stale scenarios or add real current scenarios only when implemented. |
| Acceptance | Matrix scenarios match baseline scenarios exactly. |
| Tests | `pnpm release:freeze:check:strict`, `pnpm test:consistency` |
| Risk | Adding too many guardrails can slow delivery; prefer deliberate baseline. |

## 8. Phase 2 - Privacy And Trust Boundaries

Goal: every sensitive data path is explicit, bounded, and tested.

### Block 2.1 - Candidate Pack Cloud Boundary

Problem: Candidate Pack raw resume/JD/company values can be sent to the LLM during preparation; docs mostly say this, but UI should make it impossible to miss.

| Field | Plan |
| --- | --- |
| Affected files | `src/app/CandidatePackStudio.tsx`, `src/app/locale.ts`, `docs/candidate-pack.md`, `docs/privacy-and-trust.md`, `docs/third-party-providers.md` |
| Implementation | Add concise RU-first disclosure before prepare/save: local storage, cloud LLM during preparation, compact context usage, clear/delete behavior. |
| Acceptance | User sees cloud/local boundary before Candidate Pack preparation. |
| Tests | `pnpm test:locale-keys`, `pnpm copy:check`, `pnpm test:ui` |
| Risk | More copy can add friction; keep short. |

### Block 2.2 - Interview Mode Allowed-Use Boundary

Problem: Interview Mode can be perceived as cheating/interview automation.

| Field | Plan |
| --- | --- |
| Affected files | `src/app/MainSurface.tsx`, `src/app/locale.ts`, `docs/interview-mode.md`, `docs/privacy-and-trust.md`, `docs/copy-rules.md` |
| Implementation | Add explicit allowed-use copy near session start: use only where allowed, no stealth, no hidden overlay, visible local assistant, cloud providers may process transcript/context. |
| Acceptance | Starting Interview Mode cannot happen without visible trust context in UI or nearby explanation. |
| Tests | `pnpm test:locale-keys`, `pnpm copy:check`, `pnpm test:ui`, `pnpm test:interview-quality` |
| Risk | Overly legalistic UX; keep pragmatic and product-safe. |

### Block 2.3 - Report Sensitivity And Retention

Problem: full reports can include raw transcript; redacted export is safer, but retention and user mental model need to be obvious.

| Field | Plan |
| --- | --- |
| Affected files | `docs/interview-mode.md`, `docs/privacy-and-trust.md`, `docs/settings-reference.md`, `src/app/MainSurface.tsx`, `src/app/SettingsSurface.tsx`, `src/app/locale.ts` |
| Implementation | Add UI/docs microcopy: full export includes raw transcript, redacted export does not, local store retention is configurable, clear reports behavior. |
| Acceptance | User can distinguish full vs redacted export before clicking. |
| Tests | `pnpm test:ui`, `pnpm test:locale-keys`, Rust report tests if behavior changes |
| Risk | Copy-only block may not cover all export paths; test the UI. |

### Block 2.4 - Debug Trace And Capture Debug Retention

Problem: debug traces have retention settings; failed STT WAV debug captures need clearer handling.

| Field | Plan |
| --- | --- |
| Affected files | `src-tauri/src/capture_debug.rs`, `src-tauri/src/trace_manifest.rs`, `docs/privacy-and-trust.md`, `docs/troubleshooting.md`, `docs/settings-reference.md` |
| Implementation | First document current behavior. Then decide whether to add clear/retention command for capture-debug WAVs. |
| Acceptance | No sensitive local debug artifact has undocumented retention/clear behavior. |
| Tests | Docs-only first: `pnpm test:doc-links`, `pnpm test:consistency`; code later: Rust tests and `pnpm verify:fast` |
| Risk | Adding cleanup code can delete needed diagnostics; make user action explicit. |

### Block 2.5 - Public Footprint Hardening

Problem: guardrails are strong, but sensitive artifacts can still be generated locally.

| Field | Plan |
| --- | --- |
| Affected files | `.gitignore`, `.rooignore`, `scripts/check-public-footprint.mjs`, `scripts/check-report-secret-leaks.mjs`, `docs/public-vs-local-artifacts.md` |
| Implementation | Ensure reports, traces, logs, debug WAVs, screenshots, exports, and evidence bundles are either ignored or explicitly allowlisted. |
| Acceptance | Public footprint scan explains all artifact classes. |
| Tests | `pnpm test:public-footprint`, `pnpm verify:fast` |
| Risk | Over-broad ignore can hide useful committed docs; keep allowlist explicit. |

## 9. Phase 3 - Mode Separation

Goal: WorkConversation and Interview Mode stay separate in behavior, prompts, docs, and UI.

### Block 3.1 - Candidate Pack Context Gating

Problem: capture pipeline appends Candidate Pack compact context before deciding `AnalysisMode`.

| Field | Plan |
| --- | --- |
| Affected files | `src-tauri/src/services/capture_pipeline.rs`, Rust tests, `docs/candidate-pack.md` |
| Implementation | Move candidate context assembly behind Interview Mode only, unless a future explicit WorkConversation setting is introduced. |
| Acceptance | WorkConversation prompt never includes Candidate Pack context by default. Interview Mode still does. |
| Tests | Add Rust test, `cargo test --manifest-path src-tauri/Cargo.toml services::capture_pipeline`, `pnpm test:prompt-contract`, `pnpm verify:fast` |
| Risk | If existing users relied on global candidate context, behavior changes. Current docs imply Interview-only, so change is correct. |

### Block 3.2 - Prompt Contract Mode Fixtures

Problem: prompt tests validate schemas, but should also lock mode-specific context rules.

| Field | Plan |
| --- | --- |
| Affected files | `scripts/check-prompt-contract.mjs`, `tests/fixtures`, Rust capture pipeline tests |
| Implementation | Add fixtures or unit tests that inspect generated request context labels for WorkConversation vs Interview. |
| Acceptance | A future accidental Candidate Pack leak into WorkConversation fails tests. |
| Tests | `pnpm test:prompt-contract`, `pnpm verify:fast` |
| Risk | Snapshot tests can become brittle; assert only critical boundaries. |

### Block 3.3 - UI State Clarity

Problem: user must always know which mode is active.

| Field | Plan |
| --- | --- |
| Affected files | `src/app/MainSurface.tsx`, `src/app/App.css`, `src/app/locale.ts`, UI tests |
| Implementation | Make active Interview session visually distinct. Show WorkConversation default state when no session active. |
| Acceptance | Screenshot/manual inspection can identify active mode in under 2 seconds. |
| Tests | `pnpm test:ui`, manual visual QA |
| Risk | UI clutter; keep subtle but clear. |

## 10. Phase 4 - Release Gates And CI

Goal: release readiness commands are understandable, green, and CI-aligned.

### Block 4.1 - Verification Lane Simplification

Problem: `verify:fast`, `verify:full`, `verify:extended`, and `verify:release-local` overlap and can be confusing.

| Field | Plan |
| --- | --- |
| Affected files | `package.json`, `docs/verification-lanes.md`, `docs/smoke-checks.md`, `docs/release-local-readiness.md` |
| Implementation | Decide if duplicate `rust:deps` and `audit:npm` in `verify:full` are intentional. Document or simplify. |
| Acceptance | Each lane has a distinct purpose and expected runtime. |
| Tests | `pnpm verify:fast`, `pnpm verify:full` if scripts changed |
| Risk | Simplification can accidentally weaken release gates; avoid unless clear. |

### Block 4.2 - Make Lifecycle Check Part Of Release-Local

Problem: `pnpm scripts:lifecycle` can fail without default gates catching it.

| Field | Plan |
| --- | --- |
| Affected files | `package.json`, `docs/verification-lanes.md` |
| Implementation | Add lifecycle check to `verify:release-local` after matrix cleanup, not necessarily to `verify:fast`. |
| Acceptance | Release-local catches package/docs lifecycle drift. |
| Tests | `pnpm scripts:lifecycle`, `pnpm verify:release-local` |
| Risk | Release-local becomes slower, acceptable for handoff. |

### Block 4.3 - CI Artifact Clarity

Problem: tag release workflow creates notes but not packaged binary artifacts.

| Field | Plan |
| --- | --- |
| Affected files | `.github/workflows/release-on-tag.yml`, docs release files |
| Implementation | Document current release-on-tag behavior. If installer release is required, design separate future packaging workflow. |
| Acceptance | No docs imply tag workflow builds installers unless it does. |
| Tests | `pnpm test:doc-links`, workflow review |
| Risk | Packaging workflow can be large; keep future if not required. |

### Block 4.4 - Release Readiness Report Closure

Problem: release readiness depends on artifacts that may not exist.

| Field | Plan |
| --- | --- |
| Affected files | `scripts/report-release-readiness.mjs`, `docs/release-readiness.md`, `reports/release/*` |
| Implementation | Report missing runtime artifacts as explicit blockers, not silent pass. |
| Acceptance | Readiness report separates static gates from runtime evidence. |
| Tests | `pnpm report:release-readiness:strict`, `pnpm verify:release-local` |
| Risk | Strict report may block more often; this is desirable. |

## 11. Phase 5 - Runtime Evidence Closure

Goal: prove or honestly limit live runtime readiness.

### Evidence Set

| Artifact | Purpose |
| --- | --- |
| Runtime preflight JSON | Confirms credentials/settings/source readiness |
| Pipeline timing JSON | Measures capture, STT, LLM, card generation |
| Live source matrix | Shows which call apps/sources were tested |
| Manual Windows UX QA | Captures tray/hotkey/window behavior |
| Evidence bundle | Portable package for release review |
| Runtime quality summary | Explains measured quality and limitations |

### Block 5.1 - Local Runtime Probe Pass

| Field | Plan |
| --- | --- |
| Affected files | reports only, maybe docs if commands stale |
| Implementation | Run runtime probe with real configured credentials on Windows. |
| Acceptance | Probe produces JSON artifact and no secrets are leaked. |
| Commands | `pnpm probe:runtime`, `pnpm report:runtime-quality`, `pnpm test:public-footprint` |
| Risk | Provider credentials/network can fail; document failure honestly. |

### Block 5.2 - Latency Benchmark Pass

| Field | Plan |
| --- | --- |
| Affected files | reports only, `docs/runtime-evidence.md` if thresholds need clarification |
| Implementation | Run benchmark on representative low-RAM Windows machine. |
| Acceptance | p50/p95 timing reported with hardware/network notes. |
| Commands | `pnpm probe:bench`, `pnpm test:slo-budget`, `pnpm report:runtime-quality` |
| Risk | Results may miss SLO; mark beta limitation, do not tune blindly. |

### Block 5.3 - Live Source Matrix Pass

| Field | Plan |
| --- | --- |
| Affected files | `docs/live-runtime-matrix.md`, reports |
| Implementation | Test Zoom/Teams/Meet/browser/local audio only if available. Record unsupported cases. |
| Acceptance | Cross-call-app readiness is evidence-backed, not assumed. |
| Commands | `pnpm probe:live-source`, `pnpm report:live-evidence-pack` |
| Risk | Environment-specific behavior; include machine notes. |

### Block 5.4 - Evidence Bundle And Release Readiness

| Field | Plan |
| --- | --- |
| Affected files | reports only unless docs need update |
| Implementation | Bundle runtime artifacts and run strict release readiness. |
| Acceptance | Release report lists static gates, runtime artifacts, missing evidence, and residual risks. |
| Commands | `pnpm evidence:bundle`, `pnpm verify:release-local`, `pnpm report:release-readiness:strict` |
| Risk | Sensitive artifact handling; run secret leak checks after bundle. |

## 12. Phase 6 - UX And Onboarding Upgrade

Goal: make setup and daily use clearer without adding product scope.

### Block 6.1 - First-Run Setup Clarity

| Field | Plan |
| --- | --- |
| Affected files | `src/app/MainSurface.tsx`, `src/app/SettingsSurface.tsx`, `src/app/locale.ts`, `docs/runtime-bringup.md` |
| Implementation | Make missing Deepgram/LLM/key/preflight state obvious and actionable. |
| Acceptance | New user can see exactly what is missing before capture. |
| Tests | `pnpm test:ui`, `pnpm test:runtime-preflight-contract`, `pnpm test:locale-keys` |
| Risk | Too many warnings; prioritize current blocker only. |

### Block 6.2 - Settings IA Cleanup

| Field | Plan |
| --- | --- |
| Affected files | `src/app/SettingsSurface.tsx`, `src/app/App.css`, `src/app/locale.ts`, settings docs |
| Implementation | Separate everyday settings, reports/privacy, and diagnostics/ops. |
| Acceptance | Debug trace controls are not confused with normal report features. |
| Tests | `pnpm test:ui`, `pnpm copy:check`, manual visual QA |
| Risk | Refactor can be noisy; split UI copy and layout into separate commits. |

### Block 6.3 - WorkConversation Card UX Tightening

| Field | Plan |
| --- | --- |
| Affected files | `src/app/MainSurface.tsx`, `src/App.css`, UI tests |
| Implementation | Improve hierarchy for gist/say_now/next_move while preserving legacy IPC fields. |
| Acceptance | Card remains compact; no new schema exposed to legacy UI. |
| Tests | `pnpm test:ui`, manual visual QA |
| Risk | Cosmetic churn; only change if UX test/manual review shows value. |

### Block 6.4 - Candidate Pack Studio UX

| Field | Plan |
| --- | --- |
| Affected files | `CandidatePackStudio.tsx`, `locale.ts`, docs |
| Implementation | Add clearer state: empty, draft prepared, saved, cloud processing, clear/delete. |
| Acceptance | User knows whether pack is saved and when it will be used. |
| Tests | `pnpm test:ui`, `pnpm test:locale-keys` |
| Risk | More UI states; keep model simple. |

## 13. Phase 7 - Architecture And Test Hardening

Goal: reduce future regression risk without broad rewrites.

### Block 7.1 - Frontend Controller Boundary

| Field | Plan |
| --- | --- |
| Affected files | `src/app/controller/*`, `docs/architecture.md`, tests |
| Implementation | Document controller submodules and ensure components do not absorb orchestration logic. |
| Acceptance | Architecture docs match current controller split. |
| Tests | `pnpm test:doc-links`, `pnpm test:ui` |
| Risk | Avoid refactor unless real issue is found. |

### Block 7.2 - IPC Contract Expansion

| Field | Plan |
| --- | --- |
| Affected files | `scripts/check-ipc-handler-contract.mjs`, Rust command registration, TS platform |
| Implementation | Ensure every production command is classified as user, ops, debug trace, report, candidate, interview, or runtime. |
| Acceptance | IPC contract reports categories and flags orphan commands. |
| Tests | `pnpm test:ipc-contract`, `pnpm verify:fast` |
| Risk | Script overreach; keep categories stable. |

### Block 7.3 - Settings Migration Fixture Coverage

| Field | Plan |
| --- | --- |
| Affected files | `tests/fixtures/runtime/*`, `src-tauri/src/settings.rs`, `src/app/model.test.ts` |
| Implementation | Add fixtures for v7/v8/v9 edge cases, missing diagnostics fields, invalid retention. |
| Acceptance | Settings schema changes cannot silently break old installs. |
| Tests | `pnpm test:runtime-preflight-contract`, Rust settings tests, `pnpm verify:fast` |
| Risk | Fixture maintenance; only cover stable schema behavior. |

### Block 7.4 - Error Catalog Mapping

| Field | Plan |
| --- | --- |
| Affected files | `docs/error-catalog.md`, Rust pipeline errors, frontend error mapping tests |
| Implementation | Ensure user-safe errors match documented catalog and no provider bodies leak. |
| Acceptance | Error messages are actionable and redacted. |
| Tests | Rust tests, `pnpm test:ui`, `pnpm verify:fast` |
| Risk | Changing copy can affect locale snapshots. |

### Block 7.5 - Dead Code And Ghost Reference Audit

| Field | Plan |
| --- | --- |
| Affected files | docs, scripts, Rust modules |
| Implementation | Run targeted `rg` for removed names: memory shipped claims, provider_health, diagnostic_bundle, streaming STT, old Alpha claims. Remove or mark future/historical. |
| Acceptance | Ghost references are either gone or explicitly historical/future. |
| Tests | mandatory grep checks, `pnpm test:consistency`, `pnpm test:doc-links` |
| Risk | Removing historical docs may lose context; keep internal alpha docs clearly historical. |

## 14. Phase 8 - Public Beta Readiness

Goal: make public-facing artifacts safe, accurate, and supportable.

### Block 8.1 - Public Copy Freeze

| Field | Plan |
| --- | --- |
| Affected files | `README.md`, landing if present, `docs/copy-rules.md`, support/security docs |
| Implementation | Freeze allowed claims and banned claims. Ensure no unsupported runtime/local/stealth claims. |
| Acceptance | Copy check and manual grep pass. |
| Tests | mandatory blocked-claims grep, `pnpm copy:check`, `pnpm test:consistency` |
| Risk | Copy becomes too conservative; that is acceptable before beta. |

### Block 8.2 - Support And Security Path

| Field | Plan |
| --- | --- |
| Affected files | `.github/SECURITY.md`, `.github/SUPPORT.md`, issue templates, `docs/privacy-policy.md` |
| Implementation | Ensure support path tells users what not to attach: keys, transcripts, reports, screenshots with sensitive info. |
| Acceptance | Public issue templates discourage sensitive data upload. |
| Tests | `pnpm test:public-footprint`, manual review |
| Risk | Too much friction for bug reports; provide redacted artifact path. |

### Block 8.3 - Release Packaging Decision

| Field | Plan |
| --- | --- |
| Affected files | release docs, workflows if implemented |
| Implementation | Decide whether public beta needs installer artifacts. If yes, design a separate packaging lane. If no, docs must say releases are source/notes only. |
| Acceptance | Release workflow and release docs match exactly. |
| Tests | workflow dry review, `pnpm test:doc-links` |
| Risk | Packaging can become a large project; keep separate from trust cleanup. |

### Block 8.4 - Legal/Compliance Minimal Posture

| Field | Plan |
| --- | --- |
| Affected files | `docs/privacy-policy.md`, `docs/privacy-and-trust.md`, Interview docs, README |
| Implementation | Add pragmatic disclaimers: user controls when to capture, provider processing, allowed-use responsibility, sensitive reports local. |
| Acceptance | Public docs do not imply compliance certifications or guaranteed legality. |
| Tests | `pnpm copy:check`, manual legal-risk review |
| Risk | Not legal advice; use conservative wording. |

## 15. Phase 9 - Product Validation Loop

Goal: collect learning without building new scope.

### Block 9.1 - Tester Protocol

| Field | Plan |
| --- | --- |
| Affected files | `docs/tester-brief.md`, `docs/test-feedback-template.md`, `docs/beta-feedback-loop.md` |
| Implementation | Define tester profiles, scenarios, timebox, data handling, and feedback questions. |
| Acceptance | Tester can run one WorkConversation and one Interview prep scenario safely. |
| Tests | docs checks |
| Risk | Tester data sensitivity; require redacted feedback. |

### Block 9.2 - PMF Evidence Ledger

| Field | Plan |
| --- | --- |
| Affected files | `docs/beta-feedback-loop.md` or local-only reports |
| Implementation | Track qualitative signals: setup friction, trust concerns, card usefulness, latency tolerance, mode confusion. |
| Acceptance | Product decisions reference evidence, not guesses. |
| Tests | manual |
| Risk | Do not commit raw tester transcripts. |

### Block 9.3 - Business Scope Decision

| Field | Plan |
| --- | --- |
| Affected files | product docs |
| Implementation | Decide whether Interview Mode is core beta, optional beta, or gated beta based on trust/tester evidence. |
| Acceptance | Roadmap states Interview Mode posture clearly. |
| Tests | docs review |
| Risk | Prematurely pushing Interview Mode public can create cheating perception. |

## 16. Phase 10 - Future Tracks Isolation

Goal: preserve extensibility without scope creep.

### Future Track Rules

| Track | Rule |
| --- | --- |
| Memory layer | Future-only until explicit storage, privacy, UX, and deletion model exists |
| Local STT | Future-only until provider, hardware profile, latency, and quality are measured |
| Advanced Mode | Ops-only unless product explicitly adds user-facing advanced sections |
| Additional providers | Must fit OpenAI-compatible/STT provider boundaries and security checks |
| Meeting assistant scope | Out of scope unless product direction changes explicitly |
| Stealth/click-through overlay | Not allowed |

### Acceptance Criteria

- Future docs do not read as shipped docs.
- No package script or UI toggle exposes future tracks as stable behavior.
- Copy-rules ban list stays enforced.

## 17. Recommended Sequencing

### First 7 Days

1. Fix diagnostics surface truth.
2. Fix Candidate Pack WorkConversation boundary.
3. Remove stale diagnostic bundle docs.
4. Remove stale streaming STT docs.
5. Fix `pnpm scripts:lifecycle`.
6. Run `pnpm verify:fast`.
7. Run `pnpm release:freeze:check:strict`.

### Days 8-14

1. Add Candidate Pack cloud boundary UI copy.
2. Add Interview Mode allowed-use UI copy.
3. Strengthen report export sensitivity copy.
4. Align verification lane docs and release-freeze matrix.
5. Run `pnpm verify:release-local`.

### Days 15-30

1. Run runtime probe and benchmark on target Windows machine.
2. Generate evidence bundle and runtime quality summary.
3. Fill live source matrix for available call apps.
4. Add regression tests discovered by runtime runs.
5. Decide whether public beta can include Interview Mode or should gate it.

### Days 31-60

1. Improve Settings IA and onboarding.
2. Add optional accessibility lane or manual a11y checklist.
3. Harden IPC command categorization.
4. Expand settings migration fixtures.
5. Finalize public copy and support/security templates.

### Days 61-90

1. Run tester cohort.
2. Analyze PMF evidence.
3. Decide packaging/release artifact path.
4. Re-score audit table.
5. Prepare release candidate checklist.

## 18. Validation Matrix By Change Type

| Change type | Required checks |
| --- | --- |
| Docs-only truth cleanup | `pnpm test:doc-links`, `pnpm test:consistency`, targeted `rg` |
| Product copy / UI copy | `pnpm copy:check`, `pnpm test:locale-keys`, `pnpm test:ui` |
| Frontend behavior | `pnpm verify:fast` |
| Rust behavior | `pnpm verify:fast` |
| Prompt/schema behavior | `pnpm test:prompt-contract`, relevant Rust tests, `pnpm verify:fast` |
| Privacy/report/export behavior | Rust tests, `pnpm test:security-lanes`, `pnpm test:public-footprint`, `pnpm verify:fast` |
| Package scripts | `pnpm scripts:lifecycle`, relevant target command, `pnpm verify:fast` |
| Release readiness | `pnpm verify:release-local`, `pnpm release:freeze:check:strict` |
| Runtime evidence | runtime probe/bench/live-source/evidence commands plus secret leak checks |
| Dependency changes | `pnpm audit:npm`, `pnpm rust:deps`, `pnpm verify:fast` |

## 19. Decision Points

| Decision | Default recommendation | When to revisit |
| --- | --- | --- |
| Candidate Pack in WorkConversation | Disable by default | Only add with explicit user toggle and docs |
| Interview Mode beta posture | Keep but trust-gate heavily | After tester feedback |
| Debug trace UI | Keep, but document as diagnostics/ops and redacted by default | If users are confused or scared |
| `https://*` CSP | Keep with rationale for custom LLM endpoints | If provider list becomes fixed |
| Local STT | Future-only | After runtime evidence shows cloud STT is blocker |
| Installer workflow | Separate future block | Before public beta if binaries are needed |
| Memory layer | Future-only | After core trust/runtime beta is stable |

## 20. Implementation Block Template

Use this template for every next coding/doc block.

```markdown
## Block title

Goal:

Files:

Current evidence:

Proposed change:

Non-goals:

Acceptance criteria:

Verification commands:

Rollback plan:

Residual risks:
```

## 21. Definition Of Ready

A block is ready to implement when:

- The target files are listed.
- The behavior change is small enough for one coherent commit.
- Verification commands are known before editing.
- Privacy/trust impact is classified.
- Rollback is obvious.
- No unrelated cleanup is included.

## 22. Definition Of Done

A block is done when:

- Changed files match the intended scope.
- Required checks were actually executed and reported.
- No new unsupported product claims were introduced.
- Sensitive data paths are documented if touched.
- `git status` is clean after commit, unless intentionally left uncommitted.
- The final summary includes changed files, validation matrix, residual risks, and next recommended work block.

## 23. Highest-Leverage Next Blocks

If only five blocks can be done, do these:

1. Candidate Pack context gating for WorkConversation.
2. Diagnostics surface truth cleanup.
3. Stale diagnostic bundle and streaming STT docs cleanup.
4. Script lifecycle matrix cleanup and release-local alignment.
5. Runtime evidence closure on Windows.

These five blocks produce the largest trust and release-readiness upgrade without changing product direction.

## 24. Final Target State

Replyline can be considered stable beta only when:

- `pnpm verify:fast` is green.
- `pnpm verify:release-local` is green or every skipped runtime-only artifact is explicitly documented.
- Strict release-freeze is green.
- Runtime evidence exists for the target Windows machine.
- WorkConversation and Interview Mode are separated by code, UI, docs, and tests.
- Candidate Pack cloud/local behavior is explicit.
- Full/redacted reports and retention are obvious to the user.
- Public docs contain no shipped claims for memory, local STT, stealth overlay, universal low latency, full-local operation, or automatic answers.
- Support/security/public footprint paths discourage sensitive uploads.
- Interview Mode has a clear allowed-use boundary and is not marketed as hidden interview automation.

