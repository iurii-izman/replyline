# Repository Scorecard

> **Date:** 2026-06-18 (post-epic refresh)
> **Scope:** After Product Experience Hardening, Public Trust Package, Architecture Debt, Non-Core Pruning
> **Files tracked:** 430

## Overall: 93/100 — Core product hardened, trust package complete, architecture clean, non-core pruned

| Direction | Score | Status |
|---|---|---|
| Product clarity / scope | 95 | Core product boundaries explicit, secondary/frozen marked, roadmap clear |
| UI / UX | 88 | UX score 88/100, answer hero enhanced, error recovery actionable, idle hint |
| Runtime evidence | 82 | Automated evidence measured (731 Rust + 189 TS + 47 QA), live paths blocked |
| Packaging trust | 84 | Artifact manifest, checksum plan, SmartScreen note, signing plan — no certificate |
| Accessibility | 91 | Landmark roles, explicit labels, focus management, 189 UI a11y tests |
| Frontend architecture | 93 | 20 components, 10 controller modules, 10 model modules, 7 locale modules |
| Rust / Tauri architecture | 93 | 12 command domains, 40 commands, mod.rs 29 loc, CardSchemaV3 pipeline |
| Tests / CI | 91 | 920+ automated tests, 21 UI test files, contracts, E2E smoke, visual baseline |
| Docs / public polish | 93 | 62 markdown files, 241 links, IPC reference, public roadmap, honest posture |
| Minimalism | 88 | 3 docs pruned, core boundaries explicit, bilingual frozen, Interview secondary |

---

## 1. Product clarity / scope — 95/100 (was 94)

**Good:**
- **Core product** explicitly documented in 3 places: roadmap, architecture, limitations
- WorkConversation + ContextPack + one card per capture = the only actively maintained surface
- Interview Mode marked secondary ("context usage example, not a separate product centre")
- Bilingual marked frozen ("gated, invisible in default UX, no active work")
- Public roadmap: Now, Next, Later, Not Planned — all clear
- README honest: source/developer beta, no signed installer claims
- `docs/product/limitations.md` is comprehensive: scope, packaging, provider caveats

**Remaining:**
- User-guide screenshots from actual build (placeholders defined, slots waiting)
- Signed installer (blocked by certificate acquisition)

**Next:** Capture screenshots after signed build.

---

## 2. UI / UX — 88/100 (new category)

**Good:**
- UX audit score 88/100 (up from 85 after Product Experience Hardening)
- Answer "Скажи сейчас" hero: enhanced visual treatment (gradient, padding, larger text)
- Error recovery: actionable 3-step guidance instead of generic message
- Idle screen: ContextPack value proposition explained
- Context chip: ghost styling (not danger) for disable — less noisy
- Copy button: icon feedback + class toggle for "copied" state
- Settings nav: visual separator between essential and advanced sections
- 189 UI tests covering all critical user paths
- Visual quality baseline: 34 automated snapshot tests across 11 states × 3 viewports

**Remaining:**
- Analyzing state has no progress indicator (P0 — highest UX pain)
- Bootstrap checking has no timeout UX (static text)
- No cancel action during pipeline processing

**Next:** Processing state progress indicator → analyzing state UX.

---

## 3. Runtime evidence — 82/100 (new category)

**Good:**
- Automated evidence: **measured** — 731 Rust tests, 189 TS tests, 47 ContextPack QA fixtures
- All deterministic quality gates pass: prompt contract (24 fixtures), answer quality, product scenarios
- Runtime preflight: PASS (settings v10 valid, credential manager available)
- Provider evidence matrix documents status of 9 routes (7 LLM + 2 STT)
- Live evidence snapshot: `docs/beta-evidence/contextpack-live-runtime-2026-06-18.md`
- Honest posture: all live paths marked `blocked`, no fake claims

**Remaining:**
- All live capture paths **blocked** — `DEEPGRAM_API_KEY is missing`
- No LLM API key configured
- All latency data is fixture-derived targets, not measured
- Cross-machine smoke: not tested (Windows 10)
- Live answer quality evaluation: design complete, blocked by keys

**Next:** Obtain Deepgram + LLM keys → unblock live measured claims.

---

## 4. Packaging trust — 84/100 (new category)

**Good:**
- **Release artifact manifest** — canonical format: naming, checksum plan, SmartScreen note, rollback
- **Windows signing readiness** — comprehensive plan: 7/12 gates green, certificate requirements, key storage
- **Checksum plan** — SHA256 for every artifact, user-side verification instructions
- **SmartScreen expectation note** — honest: warning expected on first installs, reputation timeline
- **Rollback plan** — compromised certificate, failed CI signing, fallback to unsigned
- **Public wording rules** — what to say / what NOT to say for signed vs unsigned posture
- Release-on-tag workflow: verify:full before build, signed/unsigned branching
- Manual packaging workflow: verify before build, unsigned only

**Remaining:**
- **No Authenticode certificate** — blocks ALL signed artifact paths (S2)
- No GitHub secrets configured (`WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`)
- Cross-machine install smoke not tested (requires signed build)
- SmartScreen reputation: not started (requires signed build + install volume)

**Next:** Acquire EV Code Signing certificate → unblock first signed build.

---

## 5. Accessibility — 91/100 (new category)

**Good:**
- Landmark roles: `<main>` on app root, `role="region"` on answer card, `role="status"` on context chip
- Explicit label associations: `<label for="...">` + `id` on ContextPack editor fields
- Error states: `role="alert"` on error recovery + startup error cards
- Notices: `aria-live` with `polite`/`assertive` tones and `aria-atomic="true"`
- Icon buttons: `aria-label` on settings, hide-to-tray, copy button
- Interview carousel: `role="tablist"` + `role="tab"` + `role="tabpanel"` with keyboard nav
- Focus management: ContextPack save → New button, back → main surface
- Keyboard navigation: all interactive elements focusable, logical tab order, Escape dismisses
- `:focus-visible` styles with tokenized `--focus-ring` + `--focus-shadow`
- `prefers-reduced-motion` fully respected
- 396 locale keys (RU primary, EN mirror) — all user-facing text localized

**Remaining:**
- No skip-to-content link (low — single-page app with few regions)
- Interview carousel uses text arrows (← →) not SVG chevrons (low)
- Settings nav separator only visible on desktop sidebar (mobile chips remain compact)

**Next:** Done enough. Address remaining gaps only if screen reader feedback warrants.

---

## 6. Frontend architecture — 93/100 (was 92)

**Good:**
- **UI surface**: 20 components across `main/` (9), `settings/` (7), context-pack, chrome, bilingual
- **Controller**: 10 domain modules, `index.ts` orchestrates all (726 loc — largest file)
- **Model**: 10 modules + `modelPresets.ts` + `answerProfiles.ts`
- **Locale**: 7 domain modules (396 keys, RU+EN parity)
- **CSS**: 6 modules (2449 loc), no cross-module duplicates, tokenized design system
- Split history: MainSurface 1039→347, SettingsSurface 994→390, locale 880→7 modules
- Clean Solid.js + TypeScript, controller pattern, no framework violations

**Remaining:**
- `controller/index.ts` (726 loc) — orchestration hub, hard to split further
- `ContextPackPanel.tsx` (362 loc) — could extract editor/list sub-components

**Next:** Only split if a clear seam emerges. Architecture is healthy.

---

## 7. Rust / Tauri architecture — 93/100 (unchanged)

**Good:**
- **Command domain split COMPLETE**: 12 modules, 40 commands, `mod.rs` = 29 loc
- Command registry (`replyline_commands!` macro) — single-source registration
- Settings migration chain v1→v10 with sanitization and corrupt-file quarantine
- Card pipeline: CardSchemaV3 → parse → repair → map → IPC DTO
- Prompt contract: distinct rolling/active context headings, guardrails, fabrication prevention
- Privacy: sanitized logging, RAM-only transcripts, OS keyring secrets, CSP
- `diag_contract.rs` with stable `RL_*` error codes
- 265 + 162 + 136 + 168 = 731 Rust tests across lib + 4 binaries

**Remaining:**
- `bilingual/` module always compiled (no cfg-gating) — env flag only at runtime
- `bilingual_experimental.rs` (316 lines) — largest command module

**Next:** Add cfg-gating for bilingual if footprint becomes a concern.

---

## 8. Tests / CI — 91/100 (was 90+91 merged)

**Good:**
- **920+ automated tests**: 731 Rust (lib + 4 binaries) + 189 TS (21 files)
- **Contract tests**: IPC (40/9), locale (396/396), prompt (24 fixtures), UI shell, model presets, observability (36 events), runtime preflight, consistency, docs (62/241)
- **Quality fixtures**: 47 ContextPack answer-quality scenarios (avg score 100), product scenarios, interview quality, say-now scenarios
- **E2E**: web smoke (blocking CI), visual baseline (34 tests, 11 states × 3 viewports), desktop smoke scaffold (5 checks)
- **CI**: 8 workflows, pinned actions, least-privilege permissions, timeouts, concurrency
- **Release-freeze**: advisory in CI, strict in verify:full + release workflows
- **Public footprint guard**: 430 tracked files, 0 secret leaks
- **Security lanes**: cargo deny (advisories/bans/sources), cargo audit, npm audit (scheduled)

**Remaining:**
- npm audit: 5 pre-existing vulns (webdriverio/undici — optional deps, S2 documented)
- Desktop E2E is optional/manual (requires Tauri artifact + WebDriver)
- No live provider QA (blocked by API keys)
- verify:full has 1 pre-existing blocker (unsigned artifacts, S2)

**Next:** Live provider manual scenarios when keys available.

---

## 9. Docs / public polish — 93/100 (was 94+91 merged)

**Good:**
- 62 markdown files, 241 links — all validated
- **New docs this cycle**: release-artifact-manifest, contextpack-live-runtime, visual baseline update
- **Architecture doc**: fully refreshed with accurate loc counts, core product boundary, 12-domain command table
- **IPC reference**: all 40 commands documented with purpose, I/O, privacy notes, stability
- **Public roadmap**: Now/Next/Later/Not Planned, core product section
- **Release notes**: v0.2.0-beta.1 through beta.4-draft
- **Provider evidence matrix**: 9 routes documented with status
- **Windows signing readiness**: comprehensive plan (7/12 gates green)
- README: honest source beta posture, simplified Quick Start, engineering highlights
- GitHub: issue templates (6 types), Discussions, SECURITY, SUPPORT, CODEOWNERS
- Copy rules enforced: `pnpm copy:check` scans 11 files
- Pruned: 3 thin/redirect docs removed or archived

**Remaining:**
- Screenshots still placeholders — need real build captures
- No project board (acceptable for single-developer mode)

**Next:** Capture screenshots from signed build.

---

## 10. Minimalism — 88/100 (was 86)

**Good:**
- **Core product** explicitly documented as WorkConversation + ContextPack + one card
- **Pruned this cycle**: 1 redirect doc deleted (`settings-reference.md`), 2 thin docs archived (`beta-doctor.md`, `benchmark-policy.md`)
- Interview Mode explicitly marked secondary — not a separate product centre
- Bilingual frozen experimental — gated, invisible in default UX, compiled but not active
- Single developer mode — no PR requirement, documented in AGENTS.md
- Architecture boundaries clear and enforced by contracts
- ContextPack is the single context primitive — no profiles, personas, prep-packs
- Release-freeze baseline focused on critical contracts only
- No cloud/auth/billing/DB dependencies

**Remaining:**
- 430 tracked files (stable)
- Bilingual adds ~15% codebase size (experimental, frozen — compiled but gated)
- `controller/index.ts` (726 loc) — orchestration hub, hard to split further

**Next:** Further pruning only if tracked file count or bilingual footprint becomes a concern.

---

## Top 5 Remaining Risks

| # | Risk | Severity | Impact |
|---|---|---|---|
| 1 | **No live provider evidence** — all capture paths blocked by missing API keys | S2 | Cannot prove `capture → STT → LLM → card` works on this machine. All latency claims are fixture-derived. |
| 2 | **No Authenticode certificate** — blocks signed installer, SmartScreen reputation, cross-machine smoke | S2 | Cannot ship public binary. Source beta only. |
| 3 | **Analyzing state has no progress feedback** — user stares at static text during longest wait | P0 UX | Highest UX pain. No cancel, no progress, no time estimate. |
| 4 | **npm audit: 5 pre-existing vulnerabilities** — webdriverio/undici via optional @wdio/cli | S2 | Documented, pre-existing, in optional deps. Not exploitable in shipped binary. |
| 5 | **Cross-machine smoke not tested** — Windows 10 clean install never verified | S3 | Cannot claim multi-Windows-version readiness. |

---

## Next 3 Recommended Epics

### Epic 1: Live Provider Proof (unblocks Runtime Evidence 82→88)

**Priority:** Highest. Unblocks all `measured` claims.

| Task | Effort |
|---|---|
| Obtain Deepgram API key (free tier) | 1 hour |
| Obtain OpenAI-compatible LLM API key | 1 hour |
| Configure keys via Settings UI | 15 min |
| Run `pnpm probe:runtime` → expect PASS | 5 min |
| Execute ctx-live-01 through ctx-live-06 with synthetic audio | 3 hours |
| Fill evidence rows, update provider matrix | 1 hour |
| Run `pnpm evidence:bundle` | 5 min |
| Update claim labels from `blocked` → `measured` | 30 min |

**Impact:** Runtime evidence 82→88, first live measured claims, unblocks latency data.

### Epic 2: Signed Installer (unblocks Packaging Trust 84→90)

**Priority:** High. Unblocks public binary release.

| Task | Effort |
|---|---|
| Acquire EV Code Signing certificate (DigiCert/Sectigo) | 1–2 weeks (CA validation) |
| Configure `WINDOWS_CERTIFICATE` + `WINDOWS_CERTIFICATE_PASSWORD` GitHub secrets | 30 min |
| Dry-run signed build on `v0.2.0-beta.4` tag | 1 hour |
| Verify Authenticode: `Get-AuthenticodeSignature → Valid` | 15 min |
| Download + install on clean Windows 11 | 2 hours |
| Repeat on clean Windows 10 | 2 hours |
| Document SmartScreen behaviour | 1 hour |
| Update README with download link | 30 min |

**Impact:** Packaging trust 84→90, first public binary, unblocks screenshots.

### Epic 3: Processing State UX (unblocks UI/UX 88→91)

**Priority:** Medium. Addresses highest UX pain point.

| Task | Effort |
|---|---|
| Add elapsed time display to analyzing state | 2 hours |
| Add stage progress indicator (STT done → LLM working → card building) | 3 hours |
| Add cancel action to pipeline (if technically feasible) | 4 hours |
| Add timeout UX for bootstrap ("Taking longer than expected…") | 2 hours |
| Update visual baseline with new processing states | 1 hour |
| UI tests for progress indicator + cancel flow | 2 hours |

**Impact:** UI/UX 88→91, closes the highest UX pain point from audit.

---

## Go / No-Go for beta.4

### Decision: **Conditional Go** for source/developer beta.

| Criterion | Status |
|---|---|
| All automated gates green | ✅ 920+ tests, all contracts |
| No S0/S1 blockers | ✅ Only S2 documented |
| Product Experience Hardening complete | ✅ UX 85→88 |
| Public trust package complete | ✅ artifact manifest, checksum, SmartScreen, rollback |
| Architecture debt paid | ✅ command split complete, docs accurate, non-core pruned |
| Live provider evidence | ⚠️ All blocked — documented S2 |
| Signed installer | ⚠️ No certificate — documented S2 |
| Cross-machine smoke | ⚠️ Not tested — documented S3 |

Tag suggestion (requires explicit approval):
```bash
git tag -a v0.2.0-beta.4 -m "v0.2.0-beta.4: quality, stability, and public trust"
git push origin v0.2.0-beta.4
```

---

## Validation Matrix (2026-06-18)

| Check | Result |
|---|---|
| `cargo test` | ✅ 731 passed (265 lib + 162 fixture_gate + 136 persistence + 168 main+runtime_probe) |
| `pnpm test:ui` | ✅ 189 passed (21 files) |
| `pnpm test:quality` | ✅ 47 ContextPack QA + product scenarios + interview + say-now |
| `pnpm test:e2e:web:smoke` | ✅ 1 passed |
| `pnpm test:e2e:web:visual` | 34 tests defined (requires --update-snapshots for initial baseline) |
| `pnpm test:doc-links` | ✅ 62 files, 241 links |
| `pnpm test:contracts` | ✅ consistency, UI shell, model, runtime, observability, beta, IPC, locale, prompt, copy |
| `pnpm test:public-footprint` | ✅ 430 files, 0 leaks |
| `pnpm test:report-secret-leaks` | ✅ 55 files scanned |
| `pnpm verify` | ✅ All deterministic gates green |
| `pnpm verify:full` | ⚠️ 1 pre-existing S2 (unsigned artifacts) + npm audit (5 pre-existing vulns) |
| `pnpm beta:doctor` | ✅ 13/13 PASS |
| `pnpm runtime:preflight` | ✅ PASS |
| `pnpm probe:runtime` | ❌ FAIL — `DEEPGRAM_API_KEY is missing` (documented) |
