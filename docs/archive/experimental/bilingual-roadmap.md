# Bilingual Interview Mode — Experimental Roadmap

> **Last updated:** 2026-06-15
> **Decision:** Frozen experimental (P0). No active work.
> **Next review:** When live-provider QA becomes feasible (Deepgram key available) OR v0.3 planning.
> **Companion to:** `bilingual-implementation-status.md` (inventory of what exists)

## Decision record (2026-06-15)

**Decision: Keep frozen experimental — no active work.**

Rationale:
- Live-provider QA (hard blocker B1) requires Deepgram API key — unavailable
- P0 blockers (#3 env flag, partial #2 UI gating) need code changes → deferred
- No user demand signal from current beta testers
- Current public beta scope explicitly excludes bilingual (README, limitations, user-guide)
- P1 internal dogfood estimate: 3-5 days (QA + soak + docs) — not justified now

**Review criteria for re-activation:**
1. Deepgram API key available for live QA
2. At least 2 beta testers express interest in bilingual
3. v0.3 planning slot allocated
4. P0 code blockers resolved (env flag)

---

## Current readiness score: P0 (hidden experimental)

The implementation compiles, has unit tests, and runs locally with manual activation. It is **not ready** for any tester-facing exposure.

| Dimension | Score | Evidence |
|---|---|---|
| Backend modules | ✅ Complete | 6 Rust modules with 12+ unit tests |
| Frontend UI | ✅ Complete | BilingualInterviewSurface, MainSurface integration |
| Settings schema | ✅ Complete | 8 fields, all default-disabled, v7→v10 migration |
| IPC commands | ✅ Complete | 4 commands registered, callable when enabled |
| Backend guard | ❌ Missing | Commands callable even when flag is `false` |
| Settings UI gating | ⚠️ Partial | Toggles always visible; disclaimer text present |
| Live-provider QA | ❌ Not started | Zero manual QA on real calls |
| Sustained soak test | ❌ Not started | No ≥30min streaming test with disruption |
| Multi-machine validation | ❌ Not started | Only developer machine tested |
| Translation quality eval | ❌ Not started | No cross-app quality comparison |
| Feature flag (env/build) | ❌ Missing | No `REPLYLINE_EXPERIMENTAL_BILINGUAL` flag |
| Docs (user-facing) | ❌ Not shipped | Explicitly excluded from README, user-guide, limitations |
| Docs (engineering) | ✅ Complete | implementation-status.md, architecture.md |

---

## P0 — Hidden experimental build (current → target)

**Goal:** Feature compiles, passes all tests, runs locally when manually enabled. No tester-facing exposure.

### Required for P0 completion

| Area | Requirement | Status |
|---|---|---|
| Code compiles | `cargo build` + `vite build` green | ✅ |
| Unit tests | All bilingual Rust + TS tests pass | ✅ |
| Backend command guard | Commands return `EXPERIMENTAL_BILINGUAL_DISABLED` when `bilingual_interview_enabled == false` | ✅ |
| Settings UI gating | Hide bilingual toggles when `bilingualInterviewEnabled == false` | ✅ |
| Feature flag | `REPLYLINE_EXPERIMENTAL_BILINGUAL=1` env var gates activation; defaults to disabled | ❌ |
| Docs | `bilingual-implementation-status.md` kept current | ✅ |

### P0 acceptance criteria

- [ ] `pnpm verify:full` passes with `REPLYLINE_EXPERIMENTAL_BILINGUAL=1`
- [ ] `pnpm verify` passes with flag disabled (no bilingual regressions in default path)
- [ ] Bilingual UI not visible in default build
- [ ] Manual `start_bilingual_session` IPC returns clear error when disabled
- [ ] All 5 existing activation checklist blockers resolved

**Estimated effort:** 1–2 days (backend guard + UI gating + env flag)

---

## P1 — Internal dogfood

**Goal:** Developer and trusted internal tester can use bilingual on real calls with known limitations. Not distributed to external beta testers.

### Required UX

| Requirement | Detail |
|---|---|
| Activation path | `REPLYLINE_EXPERIMENTAL_BILINGUAL=1` env var OR explicit opt-in toggle in Settings (when flag enabled) |
| Streaming transcript | Live EN partial/final segments visible during session |
| Live translation | RU translations appear with configurable debounce (600ms default) |
| Hotkey answer | `capture_bilingual_answer` produces interview card from finalized EN context |
| Degraded mode | UI shows clear status when streaming is `degraded`; hotkey continues in batch mode |
| Session lifecycle | Start/stop via UI; session ID visible for diagnostics |
| No stealth | Status banner clearly indicates "Experimental Bilingual Mode" |
| No transcript history | Finalized segments RAM-only, cleared on session stop; no persistent transcript DB |

### Privacy requirements

| Requirement | Detail |
|---|---|
| Sanitized logging | All bilingual events use `privacy_class=safe_metadata` |
| No raw audio storage | WAV not written for bilingual streaming path |
| Redacted export only | `export_bilingual_interview_report` defaults to redacted; full export requires explicit `--full` flag |
| Provider separation | Translation provider = Deepgram (STT → EN text); LLM provider = user-configured (receives EN context only, not raw audio) |

### Latency / SLO targets (P1)

| Metric | Target | Measurement |
|---|---|---|
| STT partial latency | p95 < 3000ms | `partialEnMs` in latency metrics DTO |
| Translation latency | p95 < 2000ms | `translationMs` (per-batch) |
| Answer TTFT | p95 < 5000ms | `answerTtftMs` |
| Answer total | p95 < 15000ms | `answerTotalMs` |
| Session uptime | ≥30 min without crash/degrade | Soak test |

### Tests

| Type | Requirement |
|---|---|
| Unit (Rust) | Existing 12+ tests; add reconnect timeout edge cases |
| Unit (TS) | `bilingualInterviewController.test.ts` — add degraded→batch fallback test |
| UI test | `frontend.critical-states.ui.test.tsx` — verify bilingual surface renders with flag enabled |
| Contract test | IPC contract check — bilingual commands registered only when flag enabled |
| Soak script | `pnpm probe:soak` extended with bilingual streaming lane |

### Reports / evidence

| Artifact | Purpose |
|---|---|
| Soak summary | `reports/runtime/soak-summary.json` with bilingual lane metrics |
| Latency summary | `reports/runtime/pipeline-latency-summary.json` includes bilingual stages |
| Manual QA log | `docs/archive/experimental/bilingual-qa-log.md` with per-session results |

### Docs updates

- [ ] `docs/engineering/bilingual-roadmap.md` (this file) — mark P1 complete
- [ ] `docs/product/limitations.md` — update: "Bilingual available as internal dogfood only"
- [ ] `BETA_TESTING.md` — add internal dogfood section (not public beta)

### Release gate

- [ ] `pnpm verify:full` passes with `REPLYLINE_EXPERIMENTAL_BILINGUAL=1`
- [ ] All P1 soak tests green on ≥1 Windows 11 machine
- [ ] No regression in default (flag-disabled) `pnpm verify`

**Estimated effort:** 3–5 days (QA + soak + docs)

---

## P2 — Beta tester opt-in

**Goal:** External beta testers can optionally enable bilingual mode. Still not the default experience.

### Required UX

| Requirement | Detail |
|---|---|
| Opt-in toggle | Settings → Bilingual section visible; `Enable Bilingual Interview Mode` checkbox (disabled by default) |
| Disclaimer | Clear text: "Experimental — may degrade under network instability. Not recommended for critical interviews." |
| Fallback visibility | When `degraded`, show "Streaming unavailable. Hotkey works in batch mode." |
| Language config | Source: EN (fixed for P2). Target: RU (fixed for P2). |
| Session reset | Clear bilingual state on app restart |

### Privacy requirements (P2)

| Requirement | Detail |
|---|---|
| No default transcript storage | Same as P1 |
| Redacted export preference | UI defaults to redacted; full export behind "Advanced" disclosure |
| Privacy doc updated | `docs/product/privacy.md` — add bilingual-specific section |

### Latency / SLO targets (P2)

| Metric | Target |
|---|---|
| STT partial latency | p95 < 3000ms |
| Translation latency | p95 < 2000ms |
| Answer TTFT | p95 < 5000ms |
| Pipeline fail % | < 10% (per-session) |
| Translation fallback % | < 15% of segments |

### Tests

| Type | Requirement |
|---|---|
| Multi-machine | ≥2 distinct Windows 10/11 machines, different audio devices |
| Multi-app | ≥3 call apps: Zoom, Microsoft Teams, Google Meet |
| Network disruption | Simulated disconnect → reconnect → degraded → recover cycle |
| UI regression | `frontend.critical-states.ui.test.tsx` — bilingual opt-in flow |
| E2E smoke | `pnpm test:e2e:web:smoke` with bilingual enabled (no crash) |

### Reports / evidence

| Artifact | Purpose |
|---|---|
| Cross-machine evidence | `reports/manual/live-evidence-*.json` from ≥2 testers |
| Translation quality | Manual review of ≥50 translated segments for accuracy |
| Feedback collection | GitHub `type:feedback` + `area:bilingual` labels |

### Docs updates

- [ ] `docs/product/user-guide.md` — add "Bilingual Interview Mode (Experimental)" section
- [ ] `docs/product/limitations.md` — update: "Bilingual available as opt-in beta feature"
- [ ] `README.md` — update: "Bilingual/live-translation available as experimental opt-in"
- [ ] `docs/smoke-checks.md` — add bilingual smoke checklist

### Release gate

- [ ] P2 QA evidence bundle collected from ≥2 testers
- [ ] No `S0`/`S1` issues open with `area:bilingual` label
- [ ] All P2 SLO targets met in cross-machine evidence

**Estimated effort:** 1–2 weeks (multi-tester coordination + feedback iteration)

---

## P3 — Public beta shipped feature

**Goal:** Bilingual is a documented, supported feature in the public beta. Users expect it to work.

### Required UX

| Requirement | Detail |
|---|---|
| Default state | Disabled (no change). Users opt in explicitly. |
| Language expansion | EN→RU only for P3. EN↔RU bidirectional planned for post-P3. |
| Error recovery | Clear per-stage error messages; one-click retry for translation failures |
| Performance visibility | Latency metrics shown in UI (optional, behind "Show metrics" toggle) |

### Privacy requirements (P3)

| Requirement | Detail |
|---|---|
| Full privacy review | Independent review of bilingual data flow before P3 ship |
| CSP review | Ensure no new external domains introduced |
| Retention policy | Bilingual session data explicitly covered in retention settings |

### Latency / SLO targets (P3)

| Metric | Target |
|---|---|
| All P2 targets | Maintained |
| STT partial latency | p95 < 2500ms (tightened) |
| Answer TTFT | p95 < 4000ms (tightened) |
| Pipeline fail % | < 5% |
| Translation fallback % | < 10% |

### Tests

| Type | Requirement |
|---|---|
| Full regression | `pnpm verify:extended` includes bilingual lane |
| E2E bilingual | Dedicated `pnpm test:e2e:web:bilingual` lane (new) |
| Accessibility | Keyboard-only navigation through bilingual UI |
| Performance | `pnpm probe:bench` bilingual scenario added |

### Docs updates

- [ ] All P2 doc changes finalized
- [ ] `CHANGELOG.md` — bilingual feature entry
- [ ] Release notes for target version include bilingual section

### Release gate

- [ ] All P3 SLO targets met
- [ ] `pnpm verify:full` + `pnpm verify:extended` green
- [ ] No open `S0`/`S1` with `area:bilingual`
- [ ] Signed release build passes Authenticode verification
- [ ] Release notes reviewed and accurate

---

## MVP definition

| Parameter | Value |
|---|---|
| Source language | English (EN) |
| Target language | Russian (RU) |
| Mode | Streaming (continuous) + batch (hotkey fallback) |
| Activation | Explicit opt-in via Settings toggle (disabled by default) |
| UI visibility | Settings section visible; disclaimer present |
| Transcript storage | RAM-only, cleared on session stop |
| Export | Redacted by default; full export behind explicit action |
| Stealth | None — status banner always visible when active |

---

## Blockers (current → P1)

1. ~~No backend command guard~~ — ✅ implemented (`require_experimental_bilingual`)
2. ~~Settings UI always shows toggles~~ — ✅ implemented (`<Show when={bilingualInterviewEnabled}>`)
3. ~~No feature flag~~ — ✅ implemented (`REPLYLINE_EXPERIMENTAL_BILINGUAL=1` env var + setting gate)
4. **No live-provider QA** — zero real-call testing (P1)
5. **No soak test** — unknown stability under sustained load (P1)

---

## Readiness assessment (2026-06-16)

Decision: ❌ Remain experimental — NOT ready for beta opt-in (P2).

| # | Criterion | Status |
|---|----------|--------|
| 1 | UX clear and visible when enabled | ✅ |
| 2 | No stealth (status always visible) | ✅ |
| 3 | Privacy boundaries clear | ✅ |
| 4 | Local artifacts explicit | ✅ |
| 5 | Provider data flow documented | ✅ |
| 6 | Backend command guard | ✅ |
| 7 | Settings UI gated | ✅ |
| 8 | Feature flag mechanism | ✅ |
| 9 | Opt-in flag tested | ✅ |
| 10 | Fallback/degraded states implemented | ✅ |
| 11 | Unit tests (Rust) | ✅ |
| 12 | Unit tests (TS) | ✅ |
| 13 | Settings migration safe | ✅ |
| 14 | Latency measured (automated) | ⚠️ |
| 15 | **Live-provider QA** | ❌ |
| 16 | **Sustained soak test (≥30min)** | ❌ |
| 17 | **Multi-machine validation (≥2)** | ❌ |
| 18 | **Multi-app validation (≥3 call apps)** | ❌ |
| 19 | **Network disruption recovery validated** | ❌ |
| 20 | **Translation quality evaluated** | ❌ |
| 21 | Cross-tester feedback collected | ❌ |
| 22 | User-facing docs written | ❌ |

### Hard blockers (no beta opt-in without these)

| # | Blocker | Priority |
|---|---------|----------|
| B1 | No live-provider QA on real calls | P1 |
| B2 | No sustained soak test (≥30min streaming) | P1 |
| B3 | No multi-machine Windows validation | P2 |
| B4 | No network disruption recovery test | P2 |

### Soft blockers

| # | Blocker |
|---|---------|
| B5 | No cross-app validation (Zoom/Teams/Meet) |
| B6 | No translation quality baseline |
| B7 | No multi-tester feedback |
| B8 | No user-facing documentation |

---

## Blockers (P1 → P2)

1. **Single-machine only** — needs ≥2 distinct Windows machines for confidence
2. **No cross-app validation** — Zoom/Teams/Meet not tested
3. **No multi-tester feedback** — only developer perspective
4. **No user-facing docs** — user-guide, smoke-checks not written

---

## Related docs

- `docs/archive/experimental/bilingual-implementation-status.md` — code inventory and runtime behaviour
- `docs/engineering/architecture.md` — Experimental tracks section
- `docs/product/limitations.md` — Current limitations
- `docs/product/privacy.md` — Data flow and export boundaries
- `docs/core-pipeline-slo.json` — Latency targets for core pipeline
- `README.md` — Public beta scope
