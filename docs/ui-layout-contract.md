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

- Workspace (`.app-view--main`): cap around `1480px–1560px` (current target: `1540px`).
- Settings (`.app-view--settings`): cap around `1320px–1440px` (current target: `1400px`).
- Candidate Studio sections: cap around `1560px`.
- Ultra-wide screens (`1680px+`) must preserve capped readable layouts and avoid endlessly stretched forms.

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

## Prohibitions

- No outer rounded shadow shell that makes the app look like a window inside another window.
- No custom close/minimize/maximize controls replacing native window controls.
- No infinite full-width forms on wide displays.
- No default browser-looking primary critical actions in main flows; critical actions must use Replyline button classes.
- No raw mixed-language setup labels in user-facing JSX (`missing`, `ready`, `optional`, `Статус setup`).

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

The `test:ui-shell-contract` gate is required to catch shell/layout regressions early. It must fail on:

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

## Candidate Studio Contract

- Candidate Pack Studio must remain a separate app view (`candidatePackStudio` panel), not an inline mega-section inside Settings.
- Studio keeps three-column wide layout with separate input/preview/saved panels and dedicated sticky action footer.
