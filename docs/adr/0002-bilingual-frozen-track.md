# ADR 0002: Bilingual Frozen Track — Future Decision

> **Date:** 2026-06-16
> **Status:** Accepted
> **Supersedes:** ADR 0001 § «Bilingual frozen»

## Context

The bilingual interview mode (passive EN transcript streaming + RU translation +
interview answer card generation) was built as an experimental track in early 2026.
It was frozen in ADR 0001 as part of the ContextPack pivot — disabled by default,
no new features, no expansion.

Since then, the product direction has solidified around **WorkConversation +
ContextPack**. The bilingual track adds material code, docs, and settings
complexity without being shipped or planned for a near-term release.

This ADR evaluates three options for the bilingual track's future.

## Options

### A. Keep compiled but fully env-gated (status quo)

**Description:** Code stays in the repository, always compiled, but inaccessible
without `REPLYLINE_EXPERIMENTAL_BILINGUAL=1` env flag AND
`bilingualInterviewEnabled: true` setting. Both gates are enforced in bootstrap
and all 4 bilingual commands.

**Pros:**
- Zero implementation work — already done.
- Fast to reactivate if bilingual becomes a priority (just set env + setting).
- No risk of merge conflicts with ongoing main development.

**Cons:**
- Adds ~2500 LOC of complexity to the codebase.
- Every refactor touching `mod.rs`, `types.rs`, `settings.rs`, or `state.rs`
  must account for bilingual fields.
- Frontend surface, controller, model, and locale entries remain even though
  they're hidden by default.
- Compilation includes bilingual code regardless of whether it's used.

### B. cfg-gate behind a Cargo feature flag

**Description:** Wrap all bilingual Rust code in `#[cfg(feature = "bilingual")]`.
Add a Cargo feature `bilingual` (off by default). CI builds without the feature.
Frontend code stays but is guarded by the existing env + setting gates.

**Pros:**
- Bilingual code excluded from compilation when feature is off — faster builds,
  smaller binary.
- Code stays in repo for future reference.

**Cons:**
- Requires significant implementation: every `mod`, `use`, struct field, enum
  variant, and test touched by bilingual needs `#[cfg]` annotation.
- Conditional compilation adds its own complexity (accidentally broken builds
  when feature is off, harder to grep/reason about code paths).
- Frontend code still present — only Rust side is affected.
- CI must test both feature-on and feature-off configurations.

### C. Archive and remove from the codebase

**Description:** Delete all bilingual code from the active codebase. Preserve
a reference snapshot in `docs/archive/experimental/` for historical record.
Clean up settings fields, state, types, and imports.

**Pros:**
- Maximum simplification — removes ~2500 LOC, 8 settings fields, 4 commands,
  5 Rust modules, 5 frontend files.
- Product direction is clear: WorkConversation + ContextPack.
- No ongoing maintenance cost for unused code.
- Cleaner architecture, easier refactoring.

**Cons:**
- **Irreversible without git history** — if bilingual becomes needed again, it
  must be rewritten or carefully reverted from git.
- **Large blast radius** — touching many files risks regressions in CI, build,
  and unrelated tests.
- **Settings migration complexity** — removing fields from `AppSettings` may
  break existing `settings.json` files (unknown fields cause parse warnings).
- **Frontend imports** — removing `BilingualInterviewSurface` etc. may break
  barrel exports and UI shell mounting.

## Recommendation: **Option A — Keep compiled, fully env-gated, with sunset timeline**

Bilingual stays in its current frozen state for the remainder of the beta cycle
(v0.2.x). The env gate (`REPLYLINE_EXPERIMENTAL_BILINGUAL=1` + setting) is
already enforced and tested.

**Sunset timeline:**
- **v0.2.x (current):** Keep frozen. No changes.
- **v0.3 planning:** Re-evaluate. If no user demand or internal roadmap signal
  for bilingual by v0.3 planning, proceed with Option C (removal).
- **v0.3 implementation:** If removal is decided, schedule as a dedicated block
  with explicit migration safety tests.

**Rationale for not removing now:**
1. Beta.3 was just released. Removing a large chunk of code immediately after a
   release increases risk of regressions.
2. The env gate is working and tested — bilingual adds zero runtime cost when
   disabled (both gates return early).
3. The bilingual code has been stable and hasn't caused bugs in the current cycle.
4. Removal is a significant engineering task (~10+ files, settings migration)
   that deserves its own focused block, not a side effect of this decision.

**Option B is not recommended** because:
- Cargo features add complexity disproportionate to the benefit (bilingual
  compiles quickly and doesn't affect binary size meaningfully).
- The main pain point is code complexity, not compilation cost.
- Feature flags don't help with frontend code or settings fields.

## Consequences

### What stays the same
- Bilingual code remains compiled and registered in all builds.
- Both env flag and setting must be true for any bilingual functionality.
- Bilingual UI remains hidden by default.
- No new bilingual features, tests, or docs.

### What changes
- This ADR documents the explicit decision and sunset timeline.
- Architecture docs updated with the sunset plan.
- No code changes in this block.

### What to watch
- If bilingual code causes a bug or regression in the v0.2.x cycle, escalate
  to early removal.
- If a contributor asks about bilingual, point to this ADR.

## Implementation follow-up blocks (for v0.3 planning)

If removal is decided:

1. **Settings migration**: Remove 8 bilingual fields from `AppSettings`,
   add migration v10→v11 that drops unknown fields silently.
2. **Rust removal**: Delete `src-tauri/src/bilingual/`, remove 4 commands
   from `mod.rs` and `registry.rs`, remove `bilingual_session` from state,
   clean up types, events, shared guard.
3. **Frontend removal**: Delete `BilingualInterviewSurface.*`,
   `bilingualInterviewController.*`, `bilingualExperimental.ts`, locale entries.
4. **Docs update**: Move current archive docs to a `removed-features/` folder
   or add a historical note.
5. **Test cleanup**: Remove bilingual-specific test files and fixtures.
6. **Public footprint update**: Update `check-public-footprint.mjs` expected
   file count.

## Related
- ADR 0001: ContextPack Simplification (bilingual freeze decision)
- `docs/archive/experimental/bilingual-implementation-status.md`
- `docs/engineering/architecture.md` § Experimental tracks
