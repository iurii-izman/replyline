# Bilingual Beta Readiness Assessment

> **Date:** 2026-06-15
> **Decision:** ❌ Remain experimental — NOT ready for beta opt-in (P2)
> **Current level:** P0 (frozen experimental, no active work)
> **Next review:** When live-provider QA feasible OR v0.3 planning
>
> **Update (2026-06-15):** Backend guard (`require_experimental_bilingual`) and
> Settings UI gating (`<Show when={bilingualInterviewEnabled}>`) confirmed
> implemented. P0 blockers reduced from 5 to 1 (env flag). Decision to freeze
> upheld — live-provider QA impossible without Deepgram API key.

## Readiness checklist

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | UX clear and visible when enabled | ✅ | BilingualInterviewSurface + status banner |
| 2 | No stealth (status always visible) | ✅ | "Experimental Bilingual Mode" indicator |
| 3 | Privacy boundaries clear | ✅ | `privacy_class=safe_metadata`, redacted export default |
| 4 | Local artifacts explicit | ✅ | RAM-only transcripts, explicit export action |
| 5 | Provider data flow documented | ✅ | `docs/product/privacy.md` covers bilingual export |
| 6 | Backend command guard | ✅ | All 4 commands gated by `require_experimental_bilingual()` |
| 7 | Settings UI gated | ✅ | Hidden when `bilingualInterviewEnabled: false` (default) |
| 8 | Feature flag mechanism | ✅ | `REPLYLINE_EXPERIMENTAL_BILINGUAL=1` env var |
| 9 | Opt-in flag tested | ✅ | UI test: hidden by default + visible when enabled |
| 10 | Fallback/degraded states implemented | ✅ | Reconnect 2s/4s/8s backoff, degraded → batch fallback |
| 11 | Unit tests (Rust) | ✅ | 12+ tests across 6 bilingual modules |
| 12 | Unit tests (TS) | ✅ | 11 bilingual controller tests + UI toggle tests |
| 13 | Settings migration safe | ✅ | v7→v10 migration preserves all bilingual fields |
| 14 | Latency measured (automated) | ⚠️ | DTOs defined, metrics emitted, but no soak evidence |
| 15 | **Live-provider QA** | ❌ | Zero real-call testing |
| 16 | **Sustained soak test (≥30min)** | ❌ | Not performed |
| 17 | **Multi-machine validation (≥2)** | ❌ | Only developer machine |
| 18 | **Multi-app validation (≥3 call apps)** | ❌ | Not tested with Zoom / Teams / Meet |
| 19 | **Network disruption recovery validated** | ❌ | Not tested |
| 20 | **Translation quality evaluated** | ❌ | No manual review of ≥50 segments |
| 21 | Cross-tester feedback collected | ❌ | Only developer perspective |
| 22 | User-facing docs written | ❌ | User-guide, smoke-checks not updated |

## Blockers summary

### Hard blockers (no beta opt-in without these)

| # | Blocker | Category | Priority |
|---|---|---|---|
| B1 | No live-provider QA on real calls | Manual QA | P1 |
| B2 | No sustained soak test (≥30min streaming) | Reliability | P1 |
| B3 | No multi-machine Windows validation | Compatibility | P2 |
| B4 | No network disruption recovery test | Reliability | P2 |

### Soft blockers (should resolve before opt-in)

| # | Blocker | Category |
|---|---|---|
| B5 | No cross-app validation (Zoom/Teams/Meet) | Compatibility |
| B6 | No translation quality baseline | Quality |
| B7 | No multi-tester feedback | Product |
| B8 | No user-facing documentation | Docs |

## Decision rationale

The code implementation is solid: backend modules are complete with tests, frontend UI is functional, settings schema is stable, and all gates are in place. However, the feature has **never been tested on a real call with real STT/LLM providers**. Streaming audio quality, translation accuracy, reconnect behavior under real network conditions, and cross-machine audio device compatibility are all unknown.

A beta opt-in feature that "may work" is worse than an experimental feature that is clearly labeled as such. Premature opt-in would:
- Generate noise from testers who expect working behavior
- Risk exposing raw audio/transcript data under untested error paths
- Damage trust if the feature degrades unpredictably

**The feature stays experimental until B1–B4 are resolved.**

## Next steps

1. Complete live-provider QA on 1 machine (B1) → advances to P1
2. Run 30-minute soak test with network disruption (B2) → P1 confidence
3. Validate on second Windows machine (B3) → P2 candidate
4. Test with Zoom, Teams, Meet (B5) → P2 confidence
5. Collect feedback from ≥2 beta testers (B7) → P2 gate
6. Write user-facing docs (B8) → P2 gate
7. **Then** decide on beta opt-in

## Related docs

- `docs/archive/experimental/bilingual-roadmap.md` — Full P0–P3 roadmap
- `docs/archive/experimental/bilingual-implementation-status.md` — Code inventory
- `docs/product/limitations.md` — Current limitations
- `docs/product/privacy.md` — Data flow
