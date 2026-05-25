# Replyline Deep Audit Scorecard - 2026-05-25

Status: current audit artifact
Repo: `iurii-izman/replyline`
Branch: `main`
Audited HEAD: `d4500824dc2edb9c4539a24a9c31e8c16551fae1`
Audit date: 2026-05-25
Scope: confirmation of completed max-upgrade and Postman-audit follow-up blocks, release readiness, truth consistency, privacy/trust, runtime evidence, test coverage, and score update.

## 1. Executive Summary

The implementation prompts from the previous planning cycle are confirmed as materially executed in the current `main` history. The repository moved from a strong but partially unproven internal beta posture to a much more defensible stable-beta posture.

Current weighted score: **86/100**.
Unweighted score-table average: **84.7/100**.
Confidence: **medium-high**.

Why not higher:

- Web E2E, desktop E2E, and Postman/Newman lanes are present but optional locally; this audit observed web/desktop/Postman lanes skipping because local tooling or local Postman assets were absent.
- `release-on-tag` still does not publish signed Windows binaries.
- Live GUI/provider readiness depends on structured manual evidence; this audit did not perform a fresh external live-provider call.
- CSP still allows `connect-src https://*`; it is documented and guarded, but still broader than ideal.
- Local `release:freeze:check` compares unstaged working-tree diff against `HEAD`; after staging, a separate staged-diff guardrail check is still needed until the script handles index/untracked files directly.
- Cross-machine and cross-call-app confidence still needs more real tester evidence.

Why not lower:

- `pnpm verify:release-local` passed in strict mode with `blockers=0`, `warnings=2`, `overallScore=97`.
- UI tests increased to 15 files / 136 tests and coverage passed with 81.92% statements.
- Rust tests passed: 153 lib tests plus fixture/runtime test binaries.
- Public-footprint and report-secret-leak guards passed.
- Candidate Pack mode boundary is now tested: WorkConversation excludes Candidate Pack context by default, Interview Mode can include it.
- Release-freeze, script lifecycle, docs links, IPC, locale, prompt, copy, security, dependency, product-scenario, runtime-evidence, and manual-closure checks all passed or produced controlled optional skips.

## 2. Evidence Basis

Kickoff snapshot:

- `git status --short --branch`: `## main...origin/main`
- `git rev-parse HEAD`: `d4500824dc2edb9c4539a24a9c31e8c16551fae1`
- Pre-existing changed files before this audit doc update: none.

Repository metrics observed during this audit:

| Metric | Current |
| --- | ---: |
| Frontend files | 42 |
| Frontend LOC | 8816 |
| Frontend production files | 27 |
| Frontend production LOC | 5970 |
| Rust files | 40 |
| Rust LOC | 10764 |
| Docs markdown files | 67 |
| Script files | 61 |
| TS test files | 15 |
| Rust test annotations | 153 |
| Reports files in working tree | 12 |

Validation commands executed:

| Command | Result | Evidence |
| --- | --- | --- |
| `pnpm verify:release-local` | PASS | strict release readiness generated `blockers=0`, `warnings=2`, `overallScore=97` |
| `pnpm test:ui:coverage` | PASS | 15 test files, 136 tests, 81.92% statements, 72.62% branches |
| `pnpm deps:review` | PASS with review signal | `vite` latest signal `8.0.13 -> 8.0.14`, non-blocking |
| `pnpm test:api:postman` | PASS/SKIP controlled optional lane | skipped because local Postman collection/environment are absent |
| `pnpm test:e2e:desktop` | PASS/SKIP controlled optional lane | skipped because `webdriverio` and `TAURI_APP_PATH` are absent |
| staged release-freeze guardrail check | PASS | 5 staged files, all in explicit guardrails or report regex |
| `rg` claim checks | PASS by interpretation | hits are banlists, historical docs, future-track docs, or explicit unsupported claims |

Important generated artifacts:

- `reports/release/release-readiness-2026-05-25.md`
- `reports/sonar/sonar-residual-readiness-2026-05-25.md`
- `reports/runtime-quality/runtime-quality-summary-2026-05-25.md`
- `reports/product-quality/product-scenario-benchmark-2026-05-25.md`

## 3. Prompt Execution Confirmation

| Block | Current confirmation | Evidence |
| --- | --- | --- |
| B1 Frontend test hardening | Confirmed | commit `32f3f65`, 15 TS test files, 136 UI tests, coverage pass |
| B2 Release/manual packaging posture | Confirmed | commit `428392c`, `authors = ["iurii-izman"]`, release/manual docs and manifest hygiene |
| B3 CSP/provider endpoint hardening | Confirmed | commit `dcbbc7a`, CSP rationale in privacy docs, security lane guard |
| B4 Docs rationalization | Confirmed | commit `21d2fb1`, `docs/README.md` separates shipped, historical, future-track, ops docs |
| B5 Dependency freshness lane | Confirmed | commit `7ce621f`, `pnpm deps:review` exists and passes with non-blocking review signal |
| B6 Deterministic web E2E lane | Confirmed as implemented, not run here | commit `81deaf5`, `tests/e2e/web/smoke.spec.ts`, lane skipped locally because Playwright package is absent |
| B7 Optional Postman/Newman lane | Confirmed as implemented, not run here | commit `d4500824`, lane skips safely when local collection/environment are absent |

Interpretation: the prompts were implemented in repo history and backed by scripts/tests/docs. Optional tool-dependent lanes are correctly wired but were not executed as real scenario runs in this local audit because the required local tools/assets were not installed or present.

## 4. Current Architecture And Product Map

Shipped lanes:

- WorkConversation: hotkey-gated capture -> Deepgram STT -> OpenAI-compatible LLM -> compact `gist / say_now / next_move` card generated from `CardSchemaV3`.
- Interview Mode: active interview session -> `InterviewCardSchemaV1` card -> local post-interview report -> full/redacted markdown exports.
- Candidate Pack: local preparation artifact for Interview Mode; WorkConversation excludes Candidate Pack context by default.
- Reports: local runtime/product/release/readiness artifacts plus explicit interview exports.
- Runtime Evidence: fixture/runtime quality reports and live-evidence pack tooling.
- AI tooling governance: AGENTS/CLAUDE/Copilot/Roo/Zed policy surfaces with script lifecycle checks.

Non-shipped or constrained lanes:

- Memory layer: future-only.
- Local STT/Whisper/custom STT endpoint: future-only.
- Advanced Mode: ops-only diagnostics governance, not user-facing Settings UI.
- Desktop E2E and Postman/Newman: optional operator lanes unless tool/assets are installed.
- Signed binary release: not shipped yet.

## 5. Truth Consistency Audit

No new P0 truth contradictions were found in the current `main`. The previous high-risk contradictions are now either fixed or explicitly labeled as future/historical/ops-only.

| Area | Current result | Evidence |
| --- | --- | --- |
| README vs docs | Aligned on stable beta, no Advanced Mode user surface, no hidden overlay | `README.md`, `docs/README.md`, `docs/known-limitations.md` |
| Docs vs code | Candidate Pack, reports, debug traces, schema paths match code behavior | `docs/candidate-pack.md`, `docs/privacy-and-trust.md`, `src-tauri/src/services/capture_pipeline.rs` |
| TS DTO vs Rust DTO | Covered by IPC/contract checks | `scripts/check-ipc-handler-contract.mjs`, `pnpm verify:release-local` |
| IPC commands | 34 registered commands, 8 categories | `pnpm test:ipc-contract` output |
| Package scripts vs docs | Lifecycle matrix passes | `scripts/check-script-lifecycle.mjs`, `docs/verification-lanes.md` |
| Copy rules vs public docs | Copy check passes; blocked claims appear as banlist/limitations, not positive claims | `docs/copy-rules.md`, `pnpm copy:check`, `rg` results |
| Privacy docs vs data flow | Cloud/local and report sensitivity are explicit | `docs/privacy-and-trust.md`, `docs/third-party-providers.md`, `docs/privacy-policy.md` |
| Stable beta scope vs new features | Interview Mode remains bounded, Candidate Pack is not global memory | `docs/interview-mode.md`, `docs/candidate-pack.md`, capture pipeline tests |
| Runtime claims | Release readiness recognizes manual/live evidence gaps instead of claiming universal readiness | `reports/release/release-readiness-2026-05-25.md` |

Residual truth risks:

- `docs/max-upgrade-implementation-plan.md` and `docs/max-upgrade-execution-prompts.md` intentionally preserve older audit prompts and problem statements. They are now planning/history artifacts, not current shipped truth.
- Internal alpha docs still exist for traceability. `docs/README.md` labels them historical, so this is acceptable.

## 6. Security, Privacy, And Trust Audit

Current posture: strong for internal stable beta, not yet enough for broad public beta without binary distribution and more external live evidence.

Strengths:

- Secrets are stored via OS keyring, not plaintext settings.
- Default debug trace mode is `redacted`.
- Redacted snapshots avoid raw transcript/prompt/provider response bodies by default.
- Full interview export is explicit and treated as sensitive; redacted export excludes transcript.
- Candidate Pack preparation discloses cloud LLM processing; saved compact context is Interview-only by default.
- Public-footprint and report-secret-leak guards passed.
- CSP wildcard is explicitly documented and checked by security lane.

Risks:

- `connect-src https://*` remains broad. Current justification is credible for user-configurable providers, but a runtime allowlist or stricter endpoint validation remains the better long-term posture.
- `full_local` debug traces and full interview reports can contain sensitive local content by design. UX and docs now warn about this, but user discipline remains necessary.
- Postman local assets are intentionally absent from public footprint. This is privacy-safe, but means API-lane execution needs local operator setup.

## 7. Runtime, Release, And Evidence Audit

Current gate split:

| Gate type | Current state |
| --- | --- |
| Blocking local/release gates | `verify:release-local` strict passed |
| Static/contract gates | consistency, IPC, locale, prompt, copy, script lifecycle, docs links passed |
| Security gates | npm audit, cargo deny, cargo audit, public-footprint, secret scan passed |
| Runtime evidence gates | same-day runtime-quality/product-scenario/release-readiness artifacts generated |
| Optional gates | web E2E, desktop E2E, Postman/Newman are wired but skipped locally without tooling/assets |
| External/manual gates | Docker strict, SonarCloud UI/token checks, real GUI/provider live validation remain external/manual |

Release readiness interpretation:

- Internal stable beta: defensible.
- Release candidate: close, but needs binary packaging/signing and at least one non-skipped E2E path in CI or release-local operator setup.
- Public beta: not yet; needs signed installer/portable artifact, stronger a11y/desktop E2E evidence, cross-machine/cross-call-app tester evidence, and clearer external support/legal posture.

## 8. Score Table 1-100

Baseline column uses the previous audit table from the planning conversation. It was not found as a prior numeric scorecard artifact in `docs/`.

| Direction | Было | Сейчас | Delta | Комментарий | Evidence |
| --- | ---: | ---: | ---: | --- | --- |
| Product focus | 78 | 86 | +8 | WorkConversation remains coherent; Interview Mode is bounded and no longer leaks Candidate Pack by default. | `README.md`, `docs/interview-mode.md`, `src-tauri/src/services/capture_pipeline.rs` |
| Product truth consistency | 70 | 91 | +21 | Stale claims are now labeled historical/future/ops-only; lifecycle checks pass. | `docs/README.md`, `scripts/check-script-lifecycle.mjs`, `pnpm verify:release-local` |
| Scope discipline | 72 | 89 | +17 | Memory/local STT/Advanced Mode are constrained; Interview Mode still requires policy discipline. | `docs/known-limitations.md`, `docs/copy-rules.md` |
| WorkConversation UX | 78 | 86 | +8 | Compact card path preserved and better protected from Interview context bleed. | `src/app/MainSurface.tsx`, `src-tauri/src/services/capture_pipeline.rs` |
| Interview Mode UX | 72 | 84 | +12 | Allowed-use and report sensitivity copy improved; needs more real tester UX evidence. | `docs/interview-mode.md`, `src/app/locale.ts`, UI tests |
| Candidate Pack UX | 70 | 84 | +14 | Cloud/local boundary and state machine are clearer; UI coverage added. | `docs/candidate-pack.md`, `src/app/CandidatePackStudio.tsx`, `src/app/frontend.critical-states.ui.test.tsx` |
| Onboarding/setup UX | 78 | 87 | +9 | Setup and testing stack docs are clearer; still Windows/operator-heavy. | `README.md`, `docs/testing-stack-setup.md`, `docs/runtime-bringup.md` |
| Settings UX | 68 | 83 | +15 | Diagnostics/report warnings are clearer; settings remain dense. | `src/app/SettingsSurface.tsx`, `docs/settings-reference.md` |
| Hotkey/capture ergonomics | 76 | 82 | +6 | Contract tests and capture flow remain solid; live ergonomics still need more tester data. | `src/app/controller/hotkeys.ts`, `docs/manual-windows-ux-qa.md` |
| CardSchemaV3 quality | 84 | 86 | +2 | Strong parse/repair/fallback remains; no major new gap. | `src-tauri/src/card_v3.rs`, `scripts/check-prompt-contract.mjs` |
| InterviewCardSchemaV1 quality | 82 | 85 | +3 | Interview quality lane passes 30/30 scenarios. | `src-tauri/src/interview_card_v1.rs`, `scripts/test-interview-quality.mjs` |
| Prompt/contract discipline | 86 | 91 | +5 | Prompt contract passes with 24 fixtures and schema checks. | `scripts/check-prompt-contract.mjs`, `src-tauri/src/llm.rs` |
| STT architecture | 78 | 82 | +4 | Deepgram-only shipped path is explicit; local STT is future-only. | `docs/third-party-providers.md`, `src-tauri/src/providers/deepgram.rs` |
| LLM provider architecture | 82 | 86 | +4 | OpenAI-compatible provider and endpoint policy are stronger. | `src-tauri/src/providers/openai_compatible.rs`, `docs/third-party-providers.md` |
| Model preset architecture | 80 | 85 | +5 | Model preset contract passes. | `scripts/check-model-preset-contract.mjs`, `src-tauri/src/model_presets.rs` |
| Runtime latency posture | 64 | 78 | +14 | SLO/reporting posture improved; measured live latency still limited. | `docs/runtime-evidence.md`, `scripts/parse-pipeline-latency.mjs` |
| Runtime evidence maturity | 68 | 86 | +18 | Same-day runtime/product/release artifacts generated and strict readiness passes. | `reports/runtime-quality/`, `reports/product-quality/`, `reports/release/` |
| Live-call readiness | 52 | 68 | +16 | Structured live evidence pack exists, but no fresh live provider call was run in this audit. | `docs/runtime-live-qa.md`, `reports/manual/` |
| Cross-machine readiness | 50 | 66 | +16 | Tester docs and feedback protocol exist; needs multi-machine execution. | `docs/tester-brief.md`, `docs/test-feedback-template.md` |
| Cross-call-app readiness | 48 | 64 | +16 | Live-source matrix exists; breadth is still not proven. | `docs/live-runtime-matrix.md`, `docs/manual-windows-ux-qa.md` |
| Frontend architecture | 76 | 86 | +10 | Controller test coverage improved; structure remains understandable. | `src/app/controller/`, UI tests |
| Rust backend architecture | 80 | 87 | +7 | Modular backend remains strong; tests passed. | `src-tauri/src/`, cargo test output |
| IPC contract hygiene | 86 | 92 | +6 | IPC contract check passes: 34 commands, 8 categories. | `scripts/check-ipc-handler-contract.mjs` |
| Settings schema/migration discipline | 84 | 90 | +6 | Schema v9 fixtures and migration tests pass. | `src-tauri/src/settings.rs`, `tests/fixtures/runtime/` |
| Error handling/recovery | 78 | 84 | +6 | User-safe errors and sanitized diagnostics are better covered. | `src-tauri/src/services/pipeline_errors.rs`, `src/app/observability.test.ts` |
| Observability/logging | 82 | 89 | +7 | Redacted traces and observability event contract are strong. | `docs/observability-v2.md`, `scripts/check-observability-events-contract.mjs` |
| Privacy/trust posture | 76 | 91 | +15 | Candidate Pack, reports, debug traces, cloud providers are much clearer. | `docs/privacy-and-trust.md`, `docs/privacy-policy.md`, `docs/candidate-pack.md` |
| Redaction/sensitive artifact handling | 80 | 90 | +10 | Secret scan and redacted export tests pass; sensitive full exports remain explicit. | `scripts/check-report-secret-leaks.mjs`, `src-tauri/src/interview_report.rs` |
| Security hardening | 78 | 87 | +9 | Security gates pass; CSP wildcard remains justified but broad. | `scripts/check-security-lanes.mjs`, `src-tauri/tauri.conf.json` |
| Supply chain security | 82 | 88 | +6 | npm/Rust gates pass; dependency review lane added. | `pnpm audit:npm`, `pnpm rust:deps`, `pnpm deps:review` |
| Public footprint hygiene | 86 | 92 | +6 | Public footprint and report secret scans pass over tracked files/reports. | `scripts/check-public-footprint.mjs`, `scripts/check-report-secret-leaks.mjs` |
| CI quality gates | 82 | 90 | +8 | CI/release/local gates are stronger; optional lanes still skip without local tooling. | `.github/workflows/ci.yml`, `package.json` |
| Release-freeze governance | 72 | 86 | +14 | CI/base-ref path is strong, but local mode ignores staged/untracked files unless checked separately. | `docs/release-freeze-baseline.json`, `scripts/check-release-freeze.mjs` |
| Release readiness | 62 | 88 | +26 | Strict readiness score is 97 with two warnings; no signed binary release yet. | `reports/release/release-readiness-2026-05-25.md` |
| Test coverage | 78 | 87 | +9 | TS tests doubled and coverage is acceptable; real E2E is still optional/skipped locally. | `pnpm test:ui:coverage`, `tests/e2e/` |
| Documentation quality | 70 | 89 | +19 | Docs portfolio is categorized; planning/history docs remain intentionally verbose. | `docs/README.md` |
| Copy/positioning safety | 82 | 91 | +9 | Blocked claims are controlled by copy rules and checks. | `docs/copy-rules.md`, `scripts/copy-check.mjs` |
| Accessibility | 64 | 72 | +8 | UI test coverage improved, but no fresh a11y/Lighthouse blocking evidence. | `src/app/*.ui.test.tsx`, optional Lighthouse lane docs |
| i18n / RU-first / multilingual readiness | 74 | 82 | +8 | Locale contract passes with 370 keys; future i18n still separate. | `src/app/locale.ts`, `scripts/check-locale-keys.mjs` |
| AI-agent governance | 76 | 89 | +13 | AGENTS/CLAUDE/tooling policy and lifecycle are aligned. | `AGENTS.md`, `CLAUDE.md`, `docs/ai-tooling-policy-matrix.md` |
| Developer workflow on low-RAM Windows | 72 | 82 | +10 | Optional lanes and script matrix reduce local burden; release-local is still heavy. | `docs/verification-lanes.md`, `scripts/run-optional-lane.mjs` |
| Maintainability / dead code hygiene | 68 | 84 | +16 | Stale docs mostly isolated; more tests protect controller/candidate/report paths. | `docs/README.md`, tests |
| Extensibility without scope creep | 68 | 86 | +18 | Providers/modes are extensible while memory/local STT/Advanced remain constrained. | `docs/extension-points.md`, `docs/memory-layer.md`, `docs/advanced-mode-governance.md` |
| Legal/compliance posture | 65 | 84 | +19 | Allowed-use and sensitive artifact rules are clearer; public legal terms still future work. | `docs/interview-mode.md`, `docs/privacy-policy.md`, `.github/SECURITY.md` |
| Business validation / PMF evidence | 48 | 72 | +24 | Tester loop and feedback protocol exist; PMF remains early until real tester data accumulates. | `docs/beta-feedback-loop.md`, `docs/tester-brief.md` |

## 9. What Improved Most

1. Release readiness: strict local readiness now reports `overallScore=97` with no blockers.
2. Frontend confidence: TS test files increased from 7 to 15, with coverage passing.
3. Trust boundaries: Candidate Pack no longer silently affects WorkConversation by default.
4. Documentation truth: shipped, ops, historical, and future-track docs are separated.
5. Optional lane maturity: Postman, web E2E, desktop E2E, dependency freshness, and release checks are wired as controlled lanes.

## 10. What Is Still Riskier Than It Looks

1. Optional E2E/Postman lanes passing with skip is not the same as scenario execution.
2. Internal stable beta readiness is much stronger than public beta readiness.
3. Live-call and cross-app claims still require more measured tester evidence.
4. Broad CSP remains a deliberate trade-off, not a solved security problem.
5. Full local reports and `full_local` traces are sensitive by design and require careful UX/user discipline.

## 11. Recommended Next Work Blocks

| Priority | Block | Goal | Verification |
| --- | --- | --- | --- |
| P0 | Non-skipped E2E setup | Install/enable Playwright in the intended release-local environment and make `pnpm test:e2e:web` execute, not skip. | `pnpm test:e2e:web` |
| P0 | Public beta binary posture | Add Windows artifact build/signing strategy or explicitly keep release notes-only for internal beta. | tag dry-run or release workflow review |
| P1 | Freeze local-mode hardening | Make `scripts/check-release-freeze.mjs` include staged and untracked files in local mode, or add a first-class `--cached` option. | staged diff + untracked fixture test |
| P1 | Desktop E2E operator setup | Document/install WebdriverIO path and `TAURI_APP_PATH` handoff so one desktop happy path can run. | `pnpm test:e2e:desktop` non-skipped |
| P1 | Live evidence refresh | Run a fresh real provider/manual GUI pass and update live evidence pack. | `pnpm report:live-evidence-pack`, manual attestation |
| P1 | Dependency freshness | Review `vite 8.0.14` and update if low-risk. | `pnpm deps:review`, `pnpm verify:fast` |
| P2 | Accessibility closure | Add a targeted a11y or Lighthouse local lane and at least one manual a11y checklist pass. | optional Lighthouse/a11y report |
| P2 | Public-support/legal readiness | Prepare public beta support, allowed-use, privacy, and sensitive artifact disclaimers. | docs checks, copy check |

## 12. Current Verdict

Replyline can be treated as a **credible internal stable beta** after the executed upgrade cycle.

It is **not yet a public beta** because signed/binary release, non-skipped E2E execution, more live provider/cross-machine evidence, and public legal/support posture are still incomplete.
