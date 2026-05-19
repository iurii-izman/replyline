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

## Prohibitions

- No outer rounded shadow shell that makes the app look like a window inside another window.
- No custom close/minimize/maximize controls replacing native window controls.
- No infinite full-width forms on wide displays.
