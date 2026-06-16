# Repository Scorecard

> **Date:** 2026-06-16  
> **Scope:** Full repo audit after ContextPack shipment, command domain split, and beta.2 release  
> **Files tracked:** 383  

## Overall: 85/100 — ContextPack shipped, intentional gaps remain

| Direction | Score | Status |
|---|---|---|
| Product clarity / scope | 90 | Clear, honest, well-bounded |
| Documentation | 86 | Comprehensive, some archive debt |
| Tests / verification | 85 | Strong unit/contract coverage, limited E2E |
| CI/CD / release | 90 | Well-structured, advisory freeze, pinning consistent |
| Security / public footprint | 88 | Good gates, experimental tracks gated |
| Frontend architecture | 84 | Domain split done, ContextPack panel added |
| Rust/Tauri architecture | 87 | Clean module map, ContextPack commands extracted |
| Scripts / operator tooling | 80 | Good coverage, some script-only noise |
| GitHub / public polish | 84 | Good README, landing, issue templates, ContextPack truth aligned |
| Minimalism / maintainability | 79 | ContextPack added, still ~383 files |

---

## Product clarity / scope — 88/100

**Good:**
- README clearly states public beta scope and what is NOT shipped
- `docs/product/limitations.md` is honest: unsigned artifacts, no bilingual, no stealth
- `docs/product/privacy.md` covers data flow, storage, exports, provider boundaries
- `docs/product/user-guide.md` structured by feature area
- MVP is well-defined: WorkConversation + ContextPack (Interview Mode as context usage example)
- ContextPack is shipped as the single conversation context primitive (7 IPC commands, UI panel, prompt injection)

**Remaining:**
- Bilingual experimental track is well-documented but adds complexity to settings schema
- No public installer yet (unsigned only) — documented honestly
- User-guide could use screenshots from actual build

**Next:** Publish signed installer → user-guide screenshots → done enough.

---

## Documentation — 85/100

**Good:**
- 51 markdown files, well-organized into `docs/engineering/`, `docs/product/`, `docs/reference/`, `docs/archive/`
- Engineering docs: testing, release, runtime, architecture, operations, manual-qa
- ADR for interview card engine
- Archive: handoff docs, experimental bilingual with roadmap + readiness assessment
- Doc-links check passes (121 links across 42 files)

**Remaining:**
- `docs/archive/experimental/` has 4 files with overlapping content (interview-mode, implementation-status, roadmap, beta-readiness) — could consolidate
- Some archive docs reference old file names (cleaned up in this cycle)
- No `docs/reference/api.md` or similar — IPC contract is enforced by script, not documented as reference

**Next:** Consolidate bilingual archive docs → done enough.

---

## Tests / verification — 85/100

**Good:**
- 146 Rust tests (unit + integration), 139 TypeScript tests (21 test files)
- Contract tests: IPC handler, docs consistency, locale keys, prompt contract, UI shell, model presets, observability events, runtime preflight
- Release-freeze guard with advisory/strict modes, baseline with 62 critical paths + categories
- Public footprint guard (383 tracked files, no secrets in reports)
- E2E web smoke test (blocking in CI)

**Remaining:**
- No desktop E2E in default CI (workstation-dependent)
- No bilingual E2E (experimental, not required)
- No visual regression E2E in blocking gate (optional only)
- Fixture gate exists but not run in default verify profile

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

## Frontend architecture — 84/100

**Good:**
- Clean Solid.js + TypeScript stack
- Controller pattern: `controller/index.ts` composes hotkeys, pipeline, settings, lifecycle, selectors, keyboard shortcuts, notices
- Model just split into 10 domain modules (settings, errors, cards, interview, contextPack, diagnostics, hotkeys, routeMode, bilingualExperimental, index)
- UI surfaces: MainSurface, SettingsSurface, ContextPackPanel, BilingualInterviewSurface
- Mock platform for tests with deterministic invoke behavior

**Remaining:**
- SettingsSurface is large (~1170 lines) — could split by section
- MainSurface is large (~990 lines) — could extract sub-components
- `locale.ts` is very large (~1000 lines) with full EN/RU dictionaries — could split
- Some component files mix view and logic (tolerable for current scale)

**Next:** Split locale.ts → done enough. Split large surfaces optional.

---

## Rust/Tauri architecture — 87/100

**Good:**
- Clean module map: commands (mod.rs + 6 extracted domain modules: bootstrap, diagnostics, tray_window, context, runtime_checks, secrets), settings, types, state, services, providers, bilingual
- Command registry centralized in `replyline_commands!` macro
- Settings migration chain v1→v10 with sanitization and corrupt-file quarantine
- Interview card pipeline: CardSchemaV3 → parse → repair → map → IPC DTO
- Trace manifest, app log, fs_atomic, credentials, privacy modules
- `diag_contract.rs` with stable `RL_*` error codes

**Remaining:**
- `commands/mod.rs` partially split (~1020 lines, 6 of 11 domains extracted)
- `bilingual/` module always compiled (no cfg-gating) — env flag only at runtime

**Next:** Complete remaining domain extraction (settings, capture, context_pack, interview, bilingual_experimental).

---

## Scripts / operator tooling — 80/100

**Good:**
- 71 scripts (mjs + ps1): checks, reports, probes, operator helpers
- `scripts:lifecycle` validates classification (required/advisory/optional/experimental)
- Beta operator tooling: beta:doctor, beta:smoke-report, beta:start, beta:health-report
- Runtime probes: soak, bench, durations, live-source, preflight
- Copy check for product wording consistency

**Remaining:**
- Some scripts are thin wrappers or have overlapping concerns
- `report:sonar-residual` and `report:internal-beta-seal` are rarely used
- No script to auto-generate release notes from CHANGELOG

**Next:** Prune unused report scripts → done enough.

---

## GitHub / public polish — 84/100

**Good:**
- README with clear scope, stack, quick-start, beta testing flow
- Landing page (GitHub Pages) with product description
- Issue templates: bug report, feature request, setup help, provider compatibility, beta smoke report, beta handoff release
- PR template + beta-handoff template
- CODE_OF_CONDUCT, CONTRIBUTING, SECURITY, SUPPORT files
- CHANGELOG
- Social preview image

**Remaining:**
- No GitHub Discussions enabled (issue-only)
- No project board or roadmap visible publicly
- Beta testing survey/form link not present

**Next:** Add beta feedback form link → done enough.

---

## Minimalism / maintainability — 79/100

**Good:**
- Single developer mode (no PR requirement for routine work — documented in AGENTS.md)
- Clear architecture boundaries documented
- Recent cleanup removed: duplicate CI blocks, bloated baseline (181→62 paths), stale doc references, tracked runtime artifact
- Release-freeze baseline focused on 62 critical contracts
- Model split from 655-line monolith into 10 domain modules

**Remaining:**
- 364 tracked files is above average for a single-developer beta
- Some scripts exist only for historical/archival reasons
- `docs/archive/` has handoff artifacts that could be pruned
- Bilingual adds ~15% to codebase size for an experimental feature

**Next:** Prune archive handoff duplicates → done enough.

---

## Summary timeline

| When | What | Impact |
|---|---|---|
| This cycle | ContextPack shipped as core primitive, docs truth aligned, scorecard refreshed | P1 context primitive complete |
| This cycle | 15 commits: CI fix, baseline redesign, model split, command registry, bilingual quarantine, workflow hardening, scorecard, command domain split (6/11 domains), **ContextPack implementation** | +45 score points from baseline ~40 |
| Next cycle | Bilingual live-provider QA + soak test | Unblocks P2 beta opt-in |
| Next cycle | Signed installer setup | Unblocks public binary release |
| Later | ~~Split commands.rs~~, locale.ts, large surfaces | Maintainability polish |

---

## Validation

| Check | Result |
|---|---|
| Tracked files | 383 |
| TS/TSX files | 68 |
| Rust files | 57 |
| Markdown docs | 51 |
| Workflows | 8 |
| Scripts | 71 |
| Test files | 21+ TS, inline Rust |
| Rust tests | 146 passed |
| TS tests | 139 passed (21 files) |
| `pnpm verify` | ✅ |
| `pnpm verify:full` | ⚠️ 1 pre-existing blocker (unsigned artifacts) |
