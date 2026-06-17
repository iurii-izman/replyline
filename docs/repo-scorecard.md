# Repository Scorecard

> **Date:** 2026-06-17  
> **Scope:** Post-ContextPack pivot audit: prompt contract, bilingual freeze, interview reposition, QA fixtures, universal answer styles, storage hardening  
> **Files tracked:** 391  

## Overall: 88/100 — ContextPack shipped, Interview repositioned, quality harness hardened

| Direction | Score | Status |
|---|---|---|
| Product clarity / scope | 92 | Clear product direction: WorkConversation + ContextPack |
| Documentation | 87 | Comprehensive, runtime guide updated with ContextPack QA |
| Tests / verification | 88 | 417 tests (265 Rust + 152 TS), 35 ContextPack tests, 47 answer-quality fixtures |
| CI/CD / release | 90 | Well-structured, advisory freeze, pinning consistent |
| Security / public footprint | 90 | Bilingual fully gated behind env flag, experimental tracks invisible |
| Frontend architecture | 85 | ContextPack panel with back-navigation, idle state context-first |
| Rust/Tauri architecture | 87 | ContextPack commands extracted, prompt contract strengthened |
| Scripts / operator tooling | 82 | ContextPack QA fixtures (47), live evidence template |
| GitHub / public polish | 85 | Docs truth aligned, beta.3 readiness |
| Minimalism / maintainability | 80 | Bilingual frozen, interview secondary, context pack primary |

---

## Product clarity / scope — 92/100

**Good:**
- README clearly states public beta scope and what is NOT shipped
- `docs/product/limitations.md` is honest: unsigned artifacts, no bilingual, no stealth
- `docs/product/privacy.md` covers data flow, storage, exports, provider boundaries
- `docs/product/user-guide.md` structured by feature area
- MVP is well-defined: WorkConversation + ContextPack (Interview Mode as context usage example)
- ContextPack is shipped as the single conversation context primitive (7 IPC commands, UI panel, prompt injection)
- Interview Mode repositioned to secondary — idle state is context-first
- Bilingual experimental track frozen behind explicit env flag, invisible in default UX

**Remaining:**
- No public installer yet (unsigned only) — documented honestly
- User-guide could use screenshots from actual build

**Next:** Publish signed installer → user-guide screenshots → done enough.

---

## Documentation — 87/100

**Good:**
- 60 markdown files, well-organized into `docs/engineering/`, `docs/product/`, `docs/reference/`, `docs/archive/`
- Engineering docs: testing, release, runtime (with ContextPack QA section), architecture, operations, manual-qa
- ADR for ContextPack simplification (0001) and interview card engine
- Archive: handoff docs, experimental bilingual with roadmap + readiness assessment
- Doc-links check passes (158 links across 51 files)
- Live evidence template for ContextPack QA

**Remaining:**
- `docs/archive/experimental/` has 4 files with overlapping content — could consolidate
- No `docs/reference/api.md` or similar — IPC contract is enforced by script, not documented as reference

**Next:** Consolidate bilingual archive docs → done enough.

---

## Tests / verification — 88/100

**Good:**
- 265 Rust tests (unit + integration), 152 TypeScript tests (21 test files) = 417 total
- Contract tests: IPC handler, docs consistency, locale keys, prompt contract, UI shell, model presets, observability events, runtime preflight
- ContextPack answer-quality fixtures: 47 scenarios with deterministic evaluation (avg score 100)
- ContextPack storage tests: 35 tests (validation, CRUD, compact, corrupt recovery, multi-backup ordering)
- Release-freeze guard with advisory/strict modes, baseline with 62 critical paths + categories
- Public footprint guard (391 tracked files, no secrets in reports)
- E2E web smoke test (blocking in CI)

**Remaining:**
- No desktop E2E in default CI (workstation-dependent)
- No bilingual E2E (experimental, not required)
- No visual regression E2E in blocking gate (optional only)

**Next:** Add fixture gate to extended-quality → done enough.

---

## CI/CD / release — 90/100

**Good:**
- 8 workflows, all with pinned action versions, least-privilege permissions, timeouts
- CI (push/PR): verify + E2E blocking, release-freeze advisory, concurrency
- Dependency checks: weekly scheduled, owns rust:deps + audit:npm
- Extended quality: weekly scheduled, verify:full baseline + verify:extended addon, PASS_WITH_SKIP semantics
- Release on tag: verify:full before build, unsigned/signed artifact posture
- Windows packaging: manual, verify before build
- Pages: deploy on landing/ changes
- Auto-close superseded dep PRs
- PR labeler
- Release-freeze check integrated into verify:full + release workflows
- CI summary step (GITHUB_STEP_SUMMARY) for at-a-glance triage

**Remaining:**
- No auto-release notes generation from changelog
- No Windows signing certificate in repo secrets (expected — local only)
- verify:full has 1 pre-existing blocker (unsigned artifacts)

**Next:** Configure signing certificate for release → done enough.

---

## Security / public footprint — 88/100

**Good:**
- Public footprint guard blocks PRs that touch forbidden files
- Report secret leak scanner covers reports/docs
- `privacy_class=safe_metadata` on all observability events
- Sanitized logging: no API keys, raw transcripts, prompt bodies in logs
- Redacted export as preferred sharing path
- Credential storage in OS keyring (Windows Credential Manager)
- CSP in Tauri with documented rationale for `https://*`
- Bilingual commands gated behind `require_experimental_bilingual()` guard
- Least-privilege permissions on all GitHub workflows

**Remaining:**
- No dependency audit in fast CI (correct — in scheduled workflow)
- SonarQubeCloud integration active but no workflow file (GitHub App)
- No SAST beyond Clippy + eslint + SonarCloud

**Next:** Review SonarCloud quality gate settings → done enough.

---

## Frontend architecture — 85/100

**Good:**
- Clean Solid.js + TypeScript stack
- Controller pattern: `controller/index.ts` composes hotkeys, pipeline, settings, lifecycle, selectors, keyboard shortcuts, notices
- Model split into 10 domain modules
- UI surfaces: MainSurface (idle state context-first), SettingsSurface, ContextPackPanel (with back-navigation), BilingualInterviewSurface (gated)
- Mock platform for tests with deterministic invoke behavior, mutable ContextPack store
- 18 ContextPack panel UI tests covering create/edit/delete/activate/deactivate/navigation flows

**Remaining:**
- SettingsSurface is large (~1170 lines) — could split by section
- MainSurface is large (~990 lines) — could extract sub-components
- `locale.ts` is very large (~1000 lines) — could split

**Next:** Split locale.ts → done enough.

---

## Rust/Tauri architecture — 87/100

**Good:**
- Clean module map: commands (mod.rs + 7 extracted domain modules), settings, types, state, services, providers, bilingual
- Command registry centralized in `replyline_commands!` macro (40 commands, 9 categories)
- Settings migration chain v1→v10 with sanitization and corrupt-file quarantine
- Card pipeline: CardSchemaV3 → parse → repair → map → IPC DTO
- Prompt contract with distinct rolling/active context headings and guardrails
- Trace manifest, app log, fs_atomic, credentials, privacy modules
- `diag_contract.rs` with stable `RL_*` error codes

**Remaining:**
- `commands/mod.rs` partially split (457 lines, 9 of 11 domains extracted)
- `bilingual/` module always compiled (no cfg-gating) — env flag only at runtime

**Next:** Complete remaining domain extraction.

---

## Scripts / operator tooling — 82/100

**Good:**
- 71 scripts (mjs + ps1): checks, reports, probes, operator helpers
- ContextPack answer-quality evaluation (47 fixtures, deterministic)
- Live evidence template for ContextPack manual QA
- `scripts:lifecycle` validates classification
- Beta operator tooling: beta:doctor, beta:smoke-report, beta:start, beta:health-report
- Runtime probes: soak, bench, durations, live-source, preflight
- Copy check for product wording consistency

**Remaining:**
- Some scripts are thin wrappers or have overlapping concerns
- No script to auto-generate release notes from CHANGELOG

**Next:** Prune unused report scripts → done enough.

---

## GitHub / public polish — 85/100

**Good:**
- README with clear scope, stack, quick-start, beta testing flow
- Landing page (GitHub Pages) with product description
- Issue templates: bug report, feature request, setup help, provider compatibility, beta smoke report, beta handoff release
- PR template + beta-handoff template
- CODE_OF_CONDUCT, CONTRIBUTING, SECURITY, SUPPORT files
- CHANGELOG with Unreleased section tracking ContextPack pivot
- Social preview image

**Remaining:**
- No GitHub Discussions enabled (issue-only)
- No project board or roadmap visible publicly

**Next:** Add beta feedback form link → done enough.

---

## Minimalism / maintainability — 80/100

**Good:**
- Single developer mode (no PR requirement for routine work — documented in AGENTS.md)
- Clear architecture boundaries documented
- ContextPack is the single context primitive (no profile/persona/prep-pack system)
- Interview Mode is a context usage example, not a separate product centre
- Bilingual experimental track frozen — no new features, invisible by default
- Release-freeze baseline focused on 62 critical contracts
- Model split from 655-line monolith into 10 domain modules

**Remaining:**
- 391 tracked files is above average for a single-developer beta
- Some scripts exist only for historical/archival reasons
- `docs/archive/` has handoff artifacts that could be pruned
- Bilingual adds ~15% to codebase size for an experimental feature

**Next:** Prune archive handoff duplicates → done enough.

---

## Summary timeline

| When | What | Impact |
|---|---|---|
| This cycle | ContextPack shipped, prompt contract strengthened, interview repositioned, bilingual frozen, idle state context-first, 47 QA fixtures, universal answer styles, storage hardening (35 tests), bilingual error differentiation, docs truth aligned | P1 context primitive complete, beta.3 ready |
| This cycle | ~25 commits: ContextPack implementation, prompt contract guardrails, mock platform CRUD, UI tests (5→18), idle state refactor, bilingual freeze, answer-quality fixtures, scorecard refresh | +48 score points from baseline ~40 |
| Next cycle | Bilingual live-provider QA + soak test | Unblocks P2 beta opt-in |
| Next cycle | Signed installer setup | Unblocks public binary release |
| Later | Split locale.ts, large surfaces | Maintainability polish |

---

## Validation

| Check | Result |
|---|---|
| Tracked files | 391 |
| TS/TSX files | 68 |
| Rust files | 59 |
| Markdown docs | 64 |
| Workflows | 8 |
| Scripts | 74 |
| Test files | 21 TS + inline Rust |
| Rust tests | 265 passed |
| TS tests | 152 passed (21 files) |
| Answer-quality fixtures | 47 passed (avg 100) |
| ContextPack storage tests | 35 passed |
| `pnpm verify` | ✅ |
| `pnpm verify:full` | ⚠️ 1 pre-existing blocker (unsigned artifacts) |
