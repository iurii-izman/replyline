# UI Layout Contract

This document defines the baseline desktop layout contract for Replyline after native Windows decorations.

## Goals

- Full-window desktop canvas without floating outer shell.
- One primary scroll container.
- Shared primitives for Main, Settings, and Candidate Pack surfaces.
- Responsive behavior with width caps on wide and ultra-wide screens.

## Required Primitives

- `.app-root`: top-level application container for full window.
- `.app-header`: top application header.
- `.app-workarea`: single primary scroll container.
- `.app-view`: current panel wrapper with width cap.
- `.app-view-inner`: inner panel host.
- `.app-page`: page-level surface/card.
- `.app-page-header`: page title/status zone.
- `.app-page-body`: page content area.
- `.app-page-main`: primary page column.
- `.app-page-aside`: secondary page column.
- `.app-sidebar`: navigational or utility side column.
- `.app-sticky-footer`: sticky action/footer area inside a page.
- `.section-card`: reusable section block inside pages.
- `.status-badge`: reusable status label style hook.
- `.empty-state`: reusable empty/setup state block.

## Scroll Contract

- `body` must not create an additional vertical scrollbar.
- Vertical scrolling is owned by `.app-workarea`.
- Nested page sections should avoid creating independent full-height scroll contexts unless explicitly justified.

## Width Caps

- Workspace (`.app-view--main`): `1360px–1480px` (current target: `1440px`).
- Settings (`.app-view--settings`): `1160px–1280px` (current target: `1240px`).
- Candidate Studio sections: `1480px–1600px` (current target: `1580px`).
- Ultra-wide screens (`1680px+`) must preserve capped readable layouts and avoid endlessly stretched forms.

## Warm Precision Tokens

- Visual direction: `Warm Precision AI Cockpit` (warm stone/sand canvas, pine-green primary accent, amber setup/recording, restrained blue analyzing, deep-red danger, near-white hero surfaces).
- New UI styles must consume semantic tokens from `src/App.css` instead of hardcoded random colors.
- Baseline semantic token groups:
  - Backgrounds: `--color-bg-*`
  - Text: `--color-text-*`
  - Borders: `--color-border-*`
  - Accent/intent: `--color-accent*`, `--color-success*`, `--color-warning*`, `--color-danger*`
  - State/focus: `--color-state-*`, `--color-focus-*`
- Backward-compatible aliases (`--canvas-*`, `--surface-*`, `--text-*`, `--accent`, `--warning`, `--danger`, `--success`, `--text-say-now`, `--color-say-now-*`) must remain valid for existing components.

## Warm Precision AI Cockpit visual contract

- Brand attributes:
  - calm, confident, precise desktop cockpit;
  - warm-neutral base with restrained professional contrast;
  - clear hierarchy for setup -> run -> answer workflows.
- Color/token rules:
  - only semantic tokens from `src/App.css` for user-facing surfaces and controls;
  - core palette must keep warm canvas + pine accent + amber recording/setup + restrained blue analyzing + deep red danger;
  - avoid introducing one-off hardcoded colors for primary UX states.
- Surface/elevation rules:
  - near-white hero surfaces may use `--shadow-hero`;
  - regular cards use restrained depth (`--shadow-xs|--shadow-sm|--shadow-md`) and tokenized borders;
  - no detached floating "window inside window" shell.
- Status state rules:
  - setup, recording, analyzing, ready, error states must remain visually distinct and deterministic;
  - status meaning is driven by semantic state tokens, not ad-hoc color hacks.
- Icon rules:
  - critical header/actions use SVG `.ui-icon` primitives with `currentColor`;
  - no Unicode/emoji glyphs for critical controls or workflow actions.
- Motion rules:
  - transitions/animations use motion tokens (`--motion-fast`, `--motion-normal`) and easing tokens;
  - `prefers-reduced-motion` must remain respected.
- Accessibility rules:
  - body text and actionable labels must avoid low-contrast gray-on-warm backgrounds;
  - focus visibility must stay tokenized (`--color-focus-ring`, `--color-focus-shadow`);
  - critical controls must not look disabled when actionable.

## Breakpoints

- Compact: `< 760px`
- Normal: `760px–1279px`
- Wide: `1280px+`
- Ultra-wide cap: `1680px+`

Expected behavior:

- Compact: single column, sidebars/asides collapsed below main content.
- Normal: main column first, secondary blocks below or hidden.
- Wide: two-column layouts allowed (`main + aside`).
- Ultra-wide: keep content centered and capped.

## Sidebar vs Aside

Use `.app-sidebar` when:

- Column is primarily navigation, progress, anchors, or utility actions.

Use `.app-page-aside` when:

- Column complements the main workflow (context panels, report widgets, summaries).

A page can use both classes on the same element when both semantics apply.

## Sticky Footer Rules

- `.app-sticky-footer` is for page actions that must stay reachable while scrolling long content.
- Sticky footer should be tied to page context, not to an outer shell overlay.
- Keep action bars compact and avoid covering interactive content.
- Settings and Candidate Studio content must reserve bottom spacing for sticky actions (`padding-bottom` compensation), so footer never overlaps last interactive fields.
- For short sections, footer follows content naturally inside the active section width.
- For long sections, sticky footer uses soft/transparent background and compact width; never stretches as a detached full-screen stripe.

## Header Policy

- Header height target: `48px–56px`.
- Header must include:
  - Brand (`Replyline`, `Slim Stable Beta`) on the left.
  - Current section + compact status context in the center.
  - Utility actions on the right (settings + hide-to-tray), without custom window control buttons.
- On compact widths, center status context may collapse/hide.

## Icon Policy

- Critical UI controls must use SVG icon primitives (`.ui-icon`) with `currentColor` stroke.
- Main controls must not rely on Unicode emoji/symbol glyphs (for example `⚙`, `⤓`, `✓`, `✗`, `○`, `▾`) because Windows rendering is not stable across fonts.

## Prohibitions

- No outer rounded shadow shell that makes the app look like a window inside another window.
- No custom close/minimize/maximize controls replacing native window controls.
- No infinite full-width forms on wide displays.
- No default browser-looking primary critical actions in main flows; critical actions must use Replyline button classes.
- No raw mixed-language setup labels in user-facing JSX (`missing`, `ready`, `optional`, `Статус setup`).
- No excessive beige / beige mush that destroys contrast and hierarchy.
- No low-contrast gray text for primary/secondary content.
- No random non-tokenized shadows.
- No fake glass effects that do not belong to the warm precision direction.
- No over-fragmented UI made of too many bordered cards.
- No giant empty panels that consume screen space without actionable content.
- No "disabled controls everywhere" visual impression in normal ready flow.
- No unstyled browser-native controls in critical cockpit paths.
- No Unicode/emoji icons in critical UI controls.
- No overuse of accent color across large surfaces.
- No dashboard clutter with competing highlights.
- No generic admin-panel look that erodes product identity.

## Native Window Semantics

- Keep native decorations enabled (`decorations=true`) for the main window.
- Keep default shell behavior as a normal desktop window:
  - `alwaysOnTop=false`
  - `skipTaskbar=false`
- Main window must remain visible in both Alt+Tab and taskbar when open.
- Native minimize/maximize/close controls are the source of truth for window lifecycle.
- If hide-to-tray is enabled, native close may hide the window; explicit tray `Quit` must still perform full app exit.
- Defaults must stay desktop-normal: `alwaysOnTop=false` and `skipTaskbar=false`; temporary on-top is allowed only during capture flow when explicitly enabled by setting.

## Fullscreen Geometry

- In maximized/fullscreen state, app must use full canvas without dead space strips.
- `app-root -> app-workarea -> app-view` landmarks must be present and stable.
- Wide and ultra-wide layouts must stay capped (`--workspace-max`, `--settings-max`, `--studio-max`) to prevent giant web-form stretch.
- Main workspace grid must preserve explicit `main + aside` landmarks in wide mode.

## Regression Rules

The `test:contracts:ui` gate is required to catch shell/layout regressions early. It must fail on:

- default window shell drift (`decorations=false`, `alwaysOnTop=true`, `skipTaskbar=true`)
- custom close action in `ChromeSurface` that competes with native close semantics
- missing app layout landmarks (`app-root`, `app-workarea`, `app-view`, sticky footer host)
- missing Settings section navigation mode (all sections rendered as one always-visible giant form)
- Candidate Pack Studio no longer being a separate panel/surface from Settings summary
- missing width-cap tokens/classes and sticky-footer bottom padding compensation
- any reintroduction of mixed RU/EN raw setup labels in user-facing TSX
- main bottom action bar containing session/report/export actions that belong to side panel

## RU-First Labels

- RU is the primary UX baseline for desktop verification.
- Status badges and setup labels must be localized RU-first in default run; EN labels are allowed only in EN locale branch/tests.
- Avoid raw EN user labels in RU UI (`missing`, `ready`, `optional`, `Input`, `Preview and quality`, `Saved profile`).

## Candidate Studio Contract

- Candidate Pack Studio must remain a separate app view (`candidatePackStudio` panel), not an inline mega-section inside Settings.
- Studio must present a clear workflow contract, not three unrelated forms:
  - `1. Исходные данные`
  - `2. Подготовка`
  - `3. Профиль`
- Stepper is mandatory and must expose current/completed/future states.
- Empty preview state must be concise and guided (max 3 bullets), with no oversized blank panel.
- Prepared preview state must show quality summary, facts/weak facts, keywords, and warnings (when present).
- Saved profile editor must use a styled accordion (no default browser disclosure marker).
- Sticky action dock must stay contextual:
  - primary action switches by state (`Подготовить профиль` -> `Сохранить профиль`)
  - secondary action supports draft/profile save when available
  - danger action clears profile
  - back action returns to settings
- Privacy note must remain visible in Step 1 and must not be removed.

## Stop Criteria for This Visual Cycle

- Target visual score for this cycle: `80-88` (manual QA + contract checks).
- Do not continue CSS polish when runtime correctness, latency behavior, or answer quality are not yet validated.
- After visual pass is locked, next direction is real beta scenario quality (runtime reliability, latency, answer quality), not endless style iteration.
