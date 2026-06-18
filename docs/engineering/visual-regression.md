# Visual Regression Testing

> **Date:** 2026-06-18
> **Scope:** Playwright-based visual snapshot testing for public-safe UI states
> **Baseline:** Synthetic/demo data only — no real keys, transcripts, or context

## 1. Covered States

| # | State | Screenshot | Trigger |
|---|---|---|---|
| 1 | Idle ready — no context | `idle-ready-no-context.png` | Default bootstrap |
| 2 | Idle ready — active context chip | `idle-ready-active-context.png` | Bootstrap with active ContextPack |
| 3 | ContextPack panel — empty | `context-pack-empty.png` | Navigate to ContextPack panel (no packs) |
| 4 | ContextPack panel — active pack | `context-pack-active.png` | Navigate with active pack |
| 5 | Answer ready — work card | `answer-ready.png` | Trigger E2E shortcut (capture → analyze) |
| 6 | Settings — overview | `settings-overview.png` | Navigate to Settings → Overview tab |
| 7 | Settings — runtime check errors | `settings-runtime-check-error.png` | Settings with missing providers, run check |

> **Note:** "Setup missing" state is covered by unit tests (`main-card.ui.test.tsx`). The E2E fixture currently cannot reliably reproduce it because the bootstrap → lifecycle → selector chain needs deeper mocking.

## 2. Snapshot Location

```
tests/e2e/web/visual.spec.ts-snapshots/
```

Snapshots are platform-specific: `*-chromium-win32.png`.

## 3. How to Update Snapshots

When visual changes are intentional (e.g., UI redesign, spacing adjustments):

```bash
# Update all visual snapshots
pnpm exec playwright test tests/e2e/web/visual.spec.ts --update-snapshots

# Update a single test
pnpm exec playwright test tests/e2e/web/visual.spec.ts -g "idle ready" --update-snapshots
```

Commit the updated `.png` files alongside the code changes.

## 4. How to Run

```bash
# Run visual regression tests (fails if snapshots differ)
pnpm test:e2e:web:visual

# Run smoke test (functional, not visual)
pnpm test:e2e:web:smoke
```

Both are optional lanes (gated behind `@playwright/test` availability).

## 5. Redaction Rules

All visual test data is **synthetic/demo-only**. The following must never appear in committed screenshots:

- ❌ Real API keys, tokens, or credentials
- ❌ Real transcript content (names, phone numbers, emails)
- ❌ Real ContextPack content (company names, project details)
- ❌ Local file paths containing usernames
- ❌ Any personally identifiable information

The E2E fixture uses hardcoded demo values:
- ContextPack: "Team lead — Sprint review" / "Client negotiation prep"
- Answer card: "I can own this stream and show measurable delivery impact."
- Settings: OpenRouter preset "openrouter_free_dev"

## 6. Snapshot Policy

- ✅ Binary screenshots are committed to the repository
- ✅ Snapshots are generated on `chromium` / `win32` platform
- ✅ Snapshots are updated via `--update-snapshots` flag (never automatically)
- ❌ Do not commit screenshots from different platforms without explicit approval
- ❌ Do not commit screenshots containing real data

## 7. CI Integration

Visual tests are **optional** in CI (not blocking). They depend on:
- `@playwright/test` package installed
- Chromium browser available
- `pnpm exec vite` dev server running on port 4173

To run in CI:
```bash
pnpm install
pnpm exec playwright install chromium
pnpm test:e2e:web:visual
```

## 8. Adding New States

To add a new visual test:

1. Determine the UI state you want to capture
2. Check if the E2E fixture supports setting up that state
3. If not, extend `replyline-fixture.ts` or `installReplylineE2EPlatform`
4. Add a `test("visual: ...")` block in `visual.spec.ts`
5. Run `--update-snapshots` to create the baseline
6. Verify the screenshot doesn't contain sensitive data
7. Commit the test + snapshot

## 9. See Also

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- `tests/e2e/web/replyline-fixture.ts` — E2E platform mock
- `tests/e2e/web/replyline-e2e-settings.ts` — E2E settings factory
- `src/app/main-card.ui.test.tsx` — Unit tests covering setup states
