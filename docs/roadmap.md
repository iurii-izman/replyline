# Replyline Development Roadmap

> **Date:** 2026-06-17
> **Phase:** Post-ContextPack pivot

## Public Roadmap

This section is public-safe: no scores, no internal estimates, no provider keys.
For the full internal development plan with parallel lanes and scorecard targets,
see [Internal Development Plan](#internal-development-plan) below.

### Now — Shipped in beta.3

| What | Status |
|---|---|
| **ContextPack** — single conversation context primitive | ✅ Shipped |
| **WorkConversation** — `gist / say_now / next_move` card | ✅ Shipped |
| **Interview Mode** — context usage example with session/report flow | ✅ Shipped |
| **Privacy-first local storage** — keys in credential manager, settings local | ✅ Shipped |
| **Source/developer beta** — `git clone` + `pnpm beta:start` | ✅ Shipped |
| **Bilingual experimental** — frozen, invisible in default UX | ✅ Shipped (gated) |

### Next — In Development

| What | Status |
|---|---|
| **Signed Windows installer** — Authenticode-verified `.msi`/`.exe` | ⚠️ Blocked by certificate acquisition |
| **Live provider evidence** — measured STT + LLM paths | ⚠️ Blocked by API key availability |
| **Frontend maintainability** — split large surfaces, locale by domain | 🏗️ In progress |
| **IPC command reference** — human-readable API docs for all 40 commands | ✅ Shipped |
| **Desktop E2E smoke** — reproducible artifact bring-up test | ✅ Shipped |
| **Public onboarding** — first-10-minutes guide, screenshot checklist | ✅ Shipped |

### Later — Planned

| What | Notes |
|---|---|
| **Live answer quality evaluation** — synthetic fixtures against real LLM | Requires provider keys |
| **Multi-provider evidence matrix** — measured status per route | Requires provider keys |
| **Screenshots from signed build** — user guide illustrations | After signed installer |
| **Expanded ContextPack QA** — adversarial prompt testing | Design complete |
| **Cross-machine smoke** — Windows 10 + 11 clean install | After signed installer |
| **SmartScreen reputation monitoring** — gradual trust building | After signed installer |

### Not Planned

Replyline stays intentionally narrow. These are **not** in the roadmap:

- ❌ Stealth / cheating / anti-proctoring workflows
- ❌ Meeting assistant or transcript tool
- ❌ Cloud accounts, authentication, billing
- ❌ External database or vector DB dependencies
- ❌ Bilingual live translation (frozen experimental, no active work)
- ❌ Mobile or web versions
- ❌ Speaking coach or emotion analysis
- ❌ Memory / history / team workspace UI

---

## Internal Development Plan

> **Companion to:** [repo-scorecard.md](repo-scorecard.md) (current scores), [engineering/release.md](engineering/release.md) (release decision model)

## Current State

ContextPack shipped as the single conversation context primitive. Interview Mode repositioned to secondary. Bilingual experimental track frozen behind env flag. Idle state is context-first with universal answer styles. Scorecard baseline: **88/100**.

| What | Status |
|---|---|
| ContextPack | Shipped — 7 IPC commands, UI panel with back-navigation, prompt injection, 47 QA fixtures (avg 100), 35 storage tests |
| WorkConversation + ContextPack | Core product centre |
| Interview Mode | Secondary — context usage example, not separate product centre |
| Bilingual | Frozen experimental — invisible in default UX, gated behind `REPLYLINE_EXPERIMENTAL_BILINGUAL` env flag |
| Overall score | 88/100 (up from ~40 before ContextPack) |
| Tracked files | 391 |
| Tests | 417 (265 Rust + 152 TS) |

## Directions

### 1. Product UX

| | |
|---|---|
| **Current score** | 92 (from Product clarity / scope in scorecard) |
| **Target score** | 95 |
| **Weakest points** | No public installer (documented honestly), user-guide missing screenshots from actual build, no keyboard-only release flow validation on clean profile |
| **Block 1** | Publish signed installer → user-guide screenshots from signed build → verify first-launch UX on clean Windows 10 + 11 |
| **Block 2** | Keyboard-only accessibility pass: Settings, Interview Mode, ContextPack panel — verify focus order and visible focus states |
| **Block 3** | Provider setup error recovery UX: clearer Deepgram key validation, OpenRouter model selection guidance, custom endpoint error messages |
| **Done criteria** | Signed installer published; user-guide has screenshots from actual build; keyboard-only flow verified on clean profile; provider setup paths tested with missing/invalid credentials |

### 2. Runtime Evidence

| | |
|---|---|
| **Current score** | 78 |
| **Target score** | 88 |
| **Weakest points** | No live-provider manual scenarios completed (ctx-live-01/02/03 pending), cross-machine smoke only on single Windows 11 machine, no sustained soak test for core pipeline, no bilingual live QA |
| **Block 1** | Complete live-provider manual scenarios: ctx-live-01 (single-turn), ctx-live-02 (multi-turn with context), ctx-live-03 (edge cases) on desktop app with real providers |
| **Block 2** | Cross-machine smoke: clean Windows 10 install + first launch + `capture → stt → llm → card` path |
| **Block 3** | Sustained soak test: ≥30 min continuous session with network disruption → recovery cycle; record latency metrics (STT partial p95, answer TTFT, pipeline fail %) |
| **Done criteria** | All 3 ctx-live scenarios passed on ≥1 machine; cross-machine smoke evidence collected on Windows 10 + 11; soak test summary in `reports/runtime/` with p95 metrics within SLO targets |

### 3. Packaging / Installer

| | |
|---|---|
| **Current score** | 70 |
| **Target score** | 92 |
| **Weakest points** | No signing certificate acquired, no signed binary exists, unsigned artifacts only, no cross-machine install smoke for packaged build |
| **Block 1** | Acquire Code Signing certificate (EV preferred), configure `WINDOWS_CERTIFICATE` + `WINDOWS_CERTIFICATE_PASSWORD` GitHub Secrets, dry-run signed build on pre-release tag |
| **Block 2** | Cross-machine install smoke: download signed artifact from GitHub Release → verify Authenticode → install on clean Windows 10 + 11 → verify first launch, tray lifecycle, `capture → card` path |
| **Block 3** | SmartScreen reputation monitoring: submit binary to Microsoft Defender portal, track warning disappearance over installs; document SmartScreen behaviour in release notes |
| **Done criteria** | Signed Authenticode-verified `.msi`/`.exe` attached to GitHub Release; clean install pass on Windows 10 + 11; `README.md` updated with download link; packaging truth section in release.md verified against actual signed build |

### 4. Prompt / Answer Quality

| | |
|---|---|
| **Current score** | 88 (from Tests / verification in scorecard) |
| **Target score** | 93 |
| **Weakest points** | Fixture gate not integrated into extended-quality profile, no adversarial prompt testing (injection, role-break, context confusion), answer-quality fixtures cover 47 scenarios — could expand edge cases |
| **Block 1** | Add ContextPack fixture gate to `pnpm verify:extended` — ensure 47 QA fixtures run in addon lane with PASS_WITH_SKIP semantics for optional coverage |
| **Block 2** | Expand answer-quality fixture coverage: add adversarial scenarios (prompt injection attempts, role-break, context confusion across packs), context-switch edge cases |
| **Block 3** | Add prompt-contract regression guard: detect unintended prompt wording drift when model presets or context injection change; integrate into `pnpm test:prompt-contract` |
| **Done criteria** | Fixture gate passing in extended-quality; ≥60 answer-quality fixtures with ≥95 average score; adversarial scenario coverage added; no prompt contract regressions undetected |

### 5. Privacy / Storage

| | |
|---|---|
| **Current score** | 88 (from Security / public footprint in scorecard) |
| **Target score** | 92 |
| **Weakest points** | No SAST beyond Clippy + eslint + SonarCloud (SonarCloud quality gate not reviewed), redacted export edge cases not fully exercised, local data cleanup documentation not exhaustive |
| **Block 1** | Review SonarCloud quality gate settings: confirm severity thresholds, scope, and blocking rules; document in `docs/engineering/operations.md` |
| **Block 2** | Redacted export hardening: test edge cases (ContextPack with embedded credentials, multi-pack export, empty context); add explicit redaction test for each export path |
| **Block 3** | Local data cleanup guide: document which files `%APPDATA%` contains, what uninstall removes vs leaves, how to manually purge; add to `docs/product/privacy.md` |
| **Done criteria** | SonarCloud gate reviewed and documented; redacted export tests cover credential, multi-pack, and empty scenarios; local data cleanup documented truthfully; no `S0`/`S1` privacy issues open |

### 6. Frontend Maintainability

| | |
|---|---|
| **Current score** | 85 (from Frontend architecture in scorecard) |
| **Target score** | 90 |
| **Weakest points** | `locale.ts` ~1000 lines, `MainSurface.tsx` ~990 lines, `SettingsSurface.tsx` ~1170 lines — all need splitting |
| **Block 1** | Split `locale.ts` by domain: extract `locale/ui.ts`, `locale/errors.ts`, `locale/settings.ts`, `locale/context-pack.ts` — keep `locale/index.ts` as re-export hub |
| **Block 2** | Extract sub-components from `MainSurface.tsx`: idle state, active state, ContextPack overlay, bilingual surface (gated) — each into own file under `src/components/` |
| **Block 3** | Split `SettingsSurface.tsx` by section: provider config, model selection, ContextPack management, interview settings, bilingual (gated) — each section into own component |
| **Done criteria** | No file in `src/` exceeds 400 lines (excluding type definitions); all existing UI tests pass without modification; component boundaries match existing test selectors; no regression in `pnpm test:ui` |

### 7. Rust / Tauri Maintainability

| | |
|---|---|
| **Current score** | 87 (from Rust/Tauri architecture in scorecard) |
| **Target score** | 92 |
| **Weakest points** | `commands/mod.rs` partially split (457 lines, 9 of 11 domains extracted — 2 remaining), `bilingual/` module always compiled (no cfg-gating), no `diag_contract.rs` test for error code stability |
| **Block 1** | Complete remaining domain extraction from `commands/mod.rs`: extract final 2 domain modules, reduce `mod.rs` to macro registration + re-exports only (target ≤150 lines) |
| **Block 2** | Add `#[cfg(feature = "experimental_bilingual")]` compilation gating for `bilingual/` module; add `cargo check --no-default-features` to verify bilingual-free compile path |
| **Block 3** | Add `diag_contract.rs` stability test: enumerate all `RL_*` error codes, verify no accidental renumbering or removal; integrate into `pnpm test:contracts` |
| **Done criteria** | `commands/mod.rs` ≤150 lines with all domains extracted; bilingual compiles only with feature flag; `RL_*` error code stability enforced by contract test; `cargo test` + `cargo clippy` green |

### 8. Docs / Public Trust

| | |
|---|---|
| **Current score** | 87 (from Documentation 87 + GitHub polish 85 in scorecard) |
| **Target score** | 92 |
| **Weakest points** | No `docs/reference/api.md` (IPC contract enforced by script, not documented), bilingual archive docs (4 files with overlapping content), no GitHub Discussions, no public roadmap (until this file) |
| **Block 1** | Consolidate bilingual archive: merge 4 `docs/archive/experimental/` files into 2 — implementation status + roadmap/readiness; remove duplicate content |
| **Block 2** | Add `docs/reference/api.md`: document IPC command surface (40 commands, 9 categories), ContextPack commands, prompt contract structure, error codes (`RL_*`), settings schema; auto-generated from `replyline_commands!` macro where possible |
| **Block 3** | Enable GitHub Discussions; add beta feedback template; link from README and issue templates |
| **Done criteria** | Bilingual archive consolidated to 2 files; API reference doc published and passing `pnpm test:doc-links`; GitHub Discussions enabled with feedback template; public roadmap visible |

### 9. Scripts / Tooling

| | |
|---|---|
| **Current score** | 82 (from Scripts / operator tooling in scorecard) |
| **Target score** | 88 |
| **Weakest points** | Some scripts are thin wrappers with overlapping concerns, no auto-release notes generation from CHANGELOG, `scripts/reports/` has historical artifacts |
| **Block 1** | Prune unused report scripts: audit `scripts/reports/`, remove duplicates and historical-only artifacts, update `scripts-inventory.md` |
| **Block 2** | Auto-generate release notes from `CHANGELOG.md`: extract Unreleased section, format as GitHub Release body, attach to release workflow |
| **Block 3** | Consolidate overlapping scripts: merge thin wrappers into canonical entrypoints, ensure every script has exactly one lifecycle classification (`pnpm scripts:lifecycle` green) |
| **Done criteria** | `scripts/reports/` pruned to active scripts only; release notes auto-generated on tag; `pnpm scripts:lifecycle` passes with no warnings; `scripts-inventory.md` current |

### 10. Minimalism / Pruning

| | |
|---|---|
| **Current score** | 80 (from Minimalism / maintainability in scorecard) |
| **Target score** | 86 |
| **Weakest points** | 391 tracked files above average for single-developer beta, bilingual adds ~15% codebase size for experimental feature, `docs/archive/handoff/` has artifacts that could be pruned |
| **Block 1** | Prune `docs/archive/handoff/` duplicates: remove historical handoff plans superseded by current docs; keep only decision-record artifacts |
| **Block 2** | Reduce bilingual footprint: cfg-gate compilation (Block 2 from Rust maintainability), remove unused bilingual UI code paths when feature flag is disabled |
| **Block 3** | File count audit: identify files with zero imports/references, remove dead code paths, verify with `pnpm test:public-footprint` |
| **Done criteria** | Tracked files ≤375; bilingual code compiles only with feature flag; `docs/archive/handoff/` pruned to decision records only; no dead code paths detected by public footprint guard |

---

## Parallelization Rules

Эти правила определяют, какие блоки можно вести одновременно, а какие требуют последовательного выполнения из-за конфликтов по файлам или зависимостям.

### Hot files — serial execution only

Одновременно нельзя запускать блоки, которые трогают один и тот же hot file:

| Hot file | Directions that touch it |
|---|---|
| `src/components/MainSurface.tsx` | Frontend maintainability (Block 2), Product UX (Block 2) |
| `src/components/SettingsSurface.tsx` | Frontend maintainability (Block 3), Product UX (Block 2) |
| `src-tauri/src/commands/mod.rs` | Rust maintainability (Block 1) |
| `src-tauri/src/bilingual/` | Rust maintainability (Block 2), Minimalism (Block 2) |
| `src/app/locale.ts` | Frontend maintainability (Block 1) |
| `docs/archive/experimental/` | Docs (Block 1), Minimalism (Block 1) |

### Independent lanes — can run in parallel

| Lane | Directions | Touch surface |
|---|---|---|
| **Lane A: Frontend** | Frontend maintainability (all blocks), Product UX (Block 2) | `src/components/`, `src/app/locale.ts` |
| **Lane B: Rust** | Rust maintainability (all blocks) | `src-tauri/src/commands/`, `src-tauri/src/bilingual/` |
| **Lane C: Docs** | Docs / public trust (all blocks), Minimalism (Block 1) | `docs/` only |
| **Lane D: Quality** | Prompt / answer quality (all blocks), Privacy / storage (Block 2) | `tests/`, `scripts/` |
| **Lane E: Evidence** | Runtime evidence (all blocks), Privacy / storage (Block 3) | Manual QA, `reports/`, `docs/beta-evidence/` |
| **Lane F: Release** | Packaging / installer (all blocks), Product UX (Block 1, 3), Scripts (Block 2) | Workflows, installer, `README.md` |

### Rules

1. **Docs-only blocks (Lane C) можно вести параллельно с любыми другими лейнами.** Они не трогают код и не конфликтуют ни с чем, кроме друг друга внутри `docs/archive/experimental/`.

2. **Lane A и Lane B не конфликтуют между собой** (разные языки, разные директории). Могут идти параллельно.

3. **Lane E (Evidence) требует работающего приложения** с актуальным кодом. Запускать после того, как Lane A и Lane B стабилизированы (хотя бы частично), либо на зафиксированном срезе.

4. **Lane F (Release) требует green `pnpm verify:full`** перед каждым release-блоком. Запускать после того, как остальные лейны дошли до стабильной точки.

5. **Блоки внутри одного лейна** — последовательно (они часто зависят друг от друга или трогают одни и те же файлы).

6. **Minimalism / pruning (Lane C + общие)** — финальный проход после остальных лейнов, так как pruning зависит от того, что осталось после рефакторинга.

### Suggested execution order

```
Phase 1 (parallel start):
  ├── Lane A: Frontend maintainability Block 1 (split locale.ts)
  ├── Lane B: Rust maintainability Block 1 (extract commands domains)
  ├── Lane C: Docs Block 1 (consolidate bilingual archive)
  └── Lane D: Quality Block 1 (fixture gate in extended-quality)

Phase 2 (after Phase 1):
  ├── Lane A: Frontend maintainability Block 2 (extract MainSurface sub-components)
  ├── Lane B: Rust maintainability Block 2 (cfg-gate bilingual)
  ├── Lane C: Docs Block 2 (add api.md reference)
  ├── Lane D: Quality Block 2 (expand adversarial fixtures)
  └── Lane E: Evidence Block 1 (live-provider manual scenarios)

Phase 3 (after Phase 2):
  ├── Lane A: Frontend maintainability Block 3 (split SettingsSurface)
  ├── Lane B: Rust maintainability Block 3 (diag_contract stability test)
  ├── Lane C: Docs Block 3 (GitHub Discussions)
  ├── Lane D: Quality Block 3 (prompt-contract regression guard)
  └── Lane E: Evidence Block 2 (cross-machine smoke)

Phase 4 (after Phase 3, requires green verify:full):
  ├── Lane E: Evidence Block 3 (soak test)
  ├── Lane F: Packaging Block 1 (acquire certificate, dry-run signed build)
  └── Scripts Block 1 (prune report scripts)

Phase 5 (final):
  ├── Lane F: Packaging Block 2 + 3 (cross-machine install smoke, SmartScreen)
  ├── Scripts Block 2 + 3 (release notes generation, script consolidation)
  ├── Product UX Block 1 + 3 (screenshots, provider setup UX)
  └── Minimalism Block 1 + 2 + 3 (pruning pass)
```

---

## Scorecard Projection

После завершения всех направлений:

| Direction | Current | Target |
|---|---|---|
| Product UX | 92 | 95 |
| Runtime evidence | 78 | 88 |
| Packaging / installer | 70 | 92 |
| Prompt / answer quality | 88 | 93 |
| Privacy / storage | 88 | 92 |
| Frontend maintainability | 85 | 90 |
| Rust/Tauri maintainability | 87 | 92 |
| Docs / public trust | 87 | 92 |
| Scripts / tooling | 82 | 88 |
| Minimalism / pruning | 80 | 86 |
| **Overall** | **88** | **≥93** |

---

## Related Docs

- [repo-scorecard.md](repo-scorecard.md) — current scores and detailed audit
- [engineering/release.md](engineering/release.md) — release decision model, packaging truth
- [engineering/testing.md](engineering/testing.md) — test profiles and lane boundaries
- [engineering/signed-installer-readiness.md](engineering/signed-installer-readiness.md) — certificate and signing plan
- [archive/experimental/bilingual-roadmap.md](archive/experimental/bilingual-roadmap.md) — bilingual frozen track (P0→P3)
- [AGENTS.md](../AGENTS.md) — agent instructions and architecture boundaries
- [CONTRIBUTING.md](../CONTRIBUTING.md) — contribution workflow
