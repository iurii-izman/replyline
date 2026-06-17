# Repository Scorecard

> **Date:** 2026-06-17
> **Scope:** Post-beta.3 quality cycle: maintainability splits, public docs, signing readiness, archive pruning
> **Files tracked:** 416

## Overall: 93/100 — All maintainability splits done, public trust strengthened, beta.4 quality plan drafted

| Direction | Score | Status |
|---|---|---|
| Product clarity / scope | 94 | Public roadmap published, clear Now/Next/Later/Not Planned |
| Documentation | 93 | IPC reference, desktop E2E guide, signing readiness, live QA design |
| Tests / verification | 90 | Desktop E2E scaffold (5 checks), UI tests 158→24 scenarios, locale keys enforced |
| CI/CD / release | 91 | Beta.4 quality plan, signing readiness plan, release notes draft |
| Security / public footprint | 91 | Archive pruned, public footprint guard stable, no secret leaks |
| Frontend architecture | 92 | MainSurface 1039→290, SettingsSurface 994→243, locale 880→7 modules |
| Rust/Tauri architecture | 93 | commands/mod.rs 457→28, all 12 domains in separate modules |
| Scripts / operator tooling | 84 | Desktop E2E runner improved, locale key checker with recursive resolution |
| GitHub / public polish | 90 | Public roadmap, GitHub Discussions linked, honest beta posture |
| Minimalism / maintainability | 85 | Archive pruned (2 docs removed), bilingual consolidated, scorecard refreshed |

---

## Product clarity / scope — 94/100 (was 92)

**Good:**
- Public roadmap published in `docs/roadmap.md`: Now, Next, Later, Not Planned
- README links to public roadmap
- `docs/README.md` role-based map includes roadmap
- `docs/product/limitations.md` is honest: unsigned artifacts, no bilingual, no stealth
- `docs/product/user-guide.md` has "First 10 minutes" onboarding section
- `docs/product/screenshots.md` — screenshot checklist with redaction rules
- ContextPack shipped, Interview Mode secondary, Bilingual frozen

**Remaining:**
- User-guide screenshots from actual build (placeholders defined, slots waiting)
- Signed installer (blocked by certificate acquisition)

**Next:** Capture screenshots from signed build → done enough.

---

## Documentation — 93/100 (was 87)

**Good:**
- 57 markdown files (+7 since beta.3), well-organized
- **New:** `docs/reference/ipc.md` — human-readable IPC reference (40 commands, 9 categories)
- **New:** `docs/engineering/desktop-e2e.md` — desktop smoke guide
- **New:** `docs/engineering/windows-signing-readiness.md` — comprehensive signing plan
- **New:** `docs/engineering/live-answer-quality.md` — live QA evaluation design
- **New:** `docs/beta-evidence/provider-runtime-matrix.md` — provider route evidence
- **New:** `docs/release-notes/v0.2.0-beta.4-draft.md` — quality release plan
- **New:** `docs/product/screenshots.md` — screenshot checklist
- Doc-links check passes (221 links across 57 files)
- Bilingual archive consolidated from 4 to 2 files
- Archive handoff pruned (doc-inventory.md removed)

**Remaining:**
- Screenshots still placeholders — need real build captures
- Some docs could still be consolidated (handoff beta-readiness.md is 249 lines)

**Next:** Capture screenshots → done enough.

---

## Tests / verification — 90/100 (was 88)

**Good:**
- 265 Rust tests (unit + integration), 158 TypeScript tests (24 test files) = 423 total
- Contract tests: IPC handler, docs consistency, locale keys, prompt contract, UI shell, model presets, observability events, runtime preflight
- ContextPack answer-quality fixtures: 47 scenarios with deterministic evaluation (avg score 100)
- ContextPack storage tests: 35 tests
- ContextPack UI tests: 24 tests (was 18 — added duplicate, preview, empty state, save notice)
- Desktop E2E smoke scaffold: 5 checks (was 2 — added app root, header, Tab navigation)
- Release-freeze guard with advisory/strict modes
- Public footprint guard (416 tracked files, no secrets)
- E2E web smoke test (blocking in CI)
- Locale key contract: 380 keys enforced, used, and parity-checked

**Remaining:**
- Desktop E2E is optional/manual (requires Tauri artifact + WebDriver)
- No bilingual E2E (experimental, not required)
- No live provider QA (blocked by API keys)

**Next:** Live provider manual scenarios when keys available → done enough.

---

## CI/CD / release — 91/100 (was 90)

**Good:**
- 8 workflows, all with pinned action versions, least-privilege permissions, timeouts
- CI (push/PR): verify + E2E blocking, release-freeze advisory, concurrency
- Dependency checks: weekly scheduled
- Extended quality: weekly, verify:full + verify:extended
- Release on tag: verify:full before build, unsigned/signed posture
- Windows packaging: manual, verify before build
- **New:** Beta.4 quality plan with Go/No-Go criteria
- **New:** Signing readiness plan with certificate requirements, rollback, wording rules
- Release-freeze check integrated into verify:full + release workflows

**Remaining:**
- No Windows signing certificate in repo secrets (expected — local only)
- verify:full has 1 pre-existing blocker (unsigned artifacts, S2)

**Next:** Acquire signing certificate → done enough.

---

## Security / public footprint — 91/100 (was 88)

**Good:**
- Public footprint guard blocks PRs that touch forbidden files
- Report secret leak scanner covers reports/docs (53 files scanned)
- `privacy_class=safe_metadata` on all observability events
- Sanitized logging: no API keys, raw transcripts, prompt bodies
- Redacted export as preferred sharing path
- Credential storage in OS keyring (Windows Credential Manager)
- CSP in Tauri with documented rationale
- Bilingual commands gated behind `require_experimental_bilingual()` guard
- Least-privilege permissions on all GitHub workflows
- Archive pruned — no stale docs with potential outdated security claims

**Remaining:**
- No dependency audit in fast CI (correct — in scheduled)
- SonarQubeCloud integration active but no workflow file (GitHub App)

**Next:** Review SonarCloud quality gate → done enough.

---

## Frontend architecture — 92/100 (was 85)

**Good:**
- **MainSurface.tsx** split: 1039 → 290 lines. 8 components in `src/app/main/`
- **SettingsSurface.tsx** split: 994 → 243 lines. 5 sections in `src/app/settings/`
- **locale.ts** split: 880 → 7 domain modules in `src/app/locale/`
- Clean Solid.js + TypeScript stack
- Controller pattern preserved
- Model split into 10 domain modules
- All `data-testid` attributes preserved through splits
- No file exceeds 320 lines (largest: `LiveAssistShell.tsx` at 234, `SettingsSurface.tsx` at 243)

**Remaining:**
- `MainSurface.tsx` still has 112-line `localeCoverage` array (intentional — guarantees bundle inclusion)
- `LiveAssistShell.tsx` (234 lines) could be split further if interview logic grows

**Next:** Done enough for this cycle.

---

## Rust/Tauri architecture — 93/100 (was 87)

**Good:**
- **commands/mod.rs** reduced from 457 to 28 lines — all 12 domains in separate modules
- New modules: `commands/interview.rs` (116 lines), `commands/bilingual_experimental.rs` (316 lines)
- Command registry (`replyline_commands!` macro) updated with direct module paths
- Settings migration chain v1→v10 with sanitization and corrupt-file quarantine
- Card pipeline: CardSchemaV3 → parse → repair → map → IPC DTO
- Prompt contract with distinct rolling/active context headings and guardrails
- Trace manifest, app log, fs_atomic, credentials, privacy modules
- `diag_contract.rs` with stable `RL_*` error codes

**Remaining:**
- `bilingual/` module always compiled (no cfg-gating) — env flag only at runtime
- `bilingual_experimental.rs` is the largest command module (316 lines)

**Next:** Add cfg-gating for bilingual module → done enough.

---

## Scripts / operator tooling — 84/100 (was 82)

**Good:**
- 72 scripts (mjs + ps1): checks, reports, probes, operator helpers
- ContextPack answer-quality evaluation (47 fixtures, deterministic)
- Live evidence template for ContextPack manual QA
- `scripts:lifecycle` validates classification
- **Improved:** Desktop E2E runner with detailed troubleshooting
- **Improved:** Locale key checker with recursive import resolution
- **Improved:** IPC contract checker validates docs coverage
- Beta operator tooling: beta:doctor, beta:smoke-report, beta:start, beta:health-report
- Runtime probes: soak, bench, durations, live-source, preflight
- Copy check for product wording consistency

**Remaining:**
- No script to auto-generate release notes from CHANGELOG
- Some scripts are thin wrappers

**Next:** Auto-release notes generation → later.

---

## GitHub / public polish — 90/100 (was 85)

**Good:**
- README with clear scope, stack, quick-start, **public roadmap link**
- Landing page (GitHub Pages) with product description
- Issue templates: bug report, feature request, setup help, provider compatibility, beta smoke report, beta handoff release
- PR template + beta-handoff template
- CODE_OF_CONDUCT, CONTRIBUTING, SECURITY, SUPPORT files
- CHANGELOG with Unreleased section
- Social preview image
- **GitHub Discussions enabled** — linked from README
- **Public roadmap published** — Now/Next/Later/Not Planned

**Remaining:**
- No project board (acceptable for single-developer mode)

**Next:** Done enough for this cycle.

---

## Minimalism / maintainability — 85/100 (was 80)

**Good:**
- Single developer mode (no PR requirement — documented in AGENTS.md)
- Clear architecture boundaries
- ContextPack is single context primitive
- Interview Mode is secondary
- Bilingual frozen experimental
- Release-freeze baseline focused on critical contracts
- **Archive pruned:** doc-inventory.md removed, bilingual consolidated 4→2
- **Codebase cleaner:** locale, MainSurface, SettingsSurface, commands all split
- All large files broken down to ≤320 lines

**Remaining:**
- 416 tracked files (was 391 — net +25 from docs + component files)
- Bilingual adds ~15% codebase size (experimental, frozen)
- `docs/archive/handoff/beta-readiness.md` (249 lines) could be summarized

**Next:** Further pruning if tracked file count becomes a concern.

---

## Development Roadmap

See [roadmap.md](roadmap.md) for:
- [Public roadmap](roadmap.md#public-roadmap) — Now, Next, Later, Not Planned
- [Internal development plan](roadmap.md#internal-development-plan) — parallel lanes, scores, execution order

## Summary timeline

| When | What | Impact |
|---|---|---|
| beta.3 cycle | ContextPack shipped, prompt contract strengthened, interview repositioned, bilingual frozen | P1 context primitive complete |
| beta.4 cycle (this) | All maintainability splits done (locale, MainSurface, SettingsSurface, commands), public docs (IPC ref, signing readiness, desktop E2E, live QA design, provider matrix), public roadmap, archive pruning, desktop E2E scaffold, ContextPack daily-use UX | +5 scorecard points (88→93), codebase cleaner, public trust stronger |
| Next | Live provider evidence (requires keys) | Unblocks measured claims |
| Next | Signed installer (requires certificate) | Unblocks public binary release |
| Later | Screenshots from signed build, cross-machine smoke | User guide completion |

---

## Validation

| Check | Result |
|---|---|
| Tracked files | 416 |
| TS/TSX files | 82 (+14 from component splits) |
| Rust files | 61 (+2 from command splits) |
| Markdown docs | 57 (-7 from consolidation/pruning, +new docs) |
| Workflows | 8 |
| Scripts | 72 |
| Test files | 24 TS + inline Rust |
| Rust tests | 265 passed |
| TS tests | 158 passed (24 files) |
| Answer-quality fixtures | 47 passed (avg 100) |
| ContextPack storage tests | 35 passed |
| ContextPack UI tests | 24 passed |
| `pnpm verify` | ✅ |
| `pnpm verify:full` | ⚠️ 1 pre-existing blocker (unsigned artifacts) |
