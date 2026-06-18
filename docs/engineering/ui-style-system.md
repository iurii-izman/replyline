# UI Style System

> **Date:** 2026-06-18
> **Status:** Implemented
> **Goal:** Structured CSS modules without visual redesign

## 1. Design Tokens

`src/styles/tokens.css`

All CSS custom properties defined in `:root`. No selectors, no rules — only variables.

**Contents:**
- Typography tokens (`--font-sans`, `--font-mono`, `--text-*`, `--leading-*`)
- Spacing (`--space-*`)
- Radius (`--radius-*`)
- Shadow (`--shadow-*`)
- Color system (`--color-bg-*`, `--color-text-*`, `--color-border-*`, `--color-accent*`, `--color-success*`, `--color-warning*`, `--color-danger*`, `--color-state-*`, `--color-focus-*`, `--color-say-now-*`)
- Layout caps (`--workspace-max`, `--settings-max`, `--main-col-*`, `--settings-sidebar-width`, etc.)
- Motion tokens (`--motion-fast`, `--motion-normal`, `--ease-out`)
- Focus tokens (`--focus-ring`, `--focus-shadow`)
- Backward-compatible aliases (`--canvas-*`, `--surface-*`, `--accent`, `--warning`, `--danger`, etc.)

## 2. Base Reset

`src/styles/base.css`

Minimal reset and base element styles. No component classes.

**Contents:**
- `* { box-sizing: border-box }`
- `html, body, #root` full-height, no-margin
- `body` overflow hidden, scrollbar styling
- `button, input, select, textarea` font inheritance
- Scrollbar customization (WebKit + Firefox)

## 3. Layout Shell

`src/styles/layout.css`

Application shell layout: root flex container, header, workarea, view panels, breakpoint media queries.

**Contents:**
- `.app-root` (flex column, full height)
- `.shell-chrome`, `.shell-header`, `.app-header-*`
- `.app-workarea` (scroll container)
- `.app-view`, `.app-view--main`, `.app-view--settings`
- `.app-view-inner`
- `.app-page`, `.app-page-header`, `.app-page-body`, `.app-page-main`, `.app-page-aside`, `.app-sidebar`
- `.app-notice-area`, `.app-sticky-footer`
- `.surface-card`, `.surface-panel`
- Header components: brand, context, phase-wrap, phase, hotkey
- Header actions, icon buttons, UI icons
- All `@media` breakpoint rules (layout-specific)
- Context active chip (layout element)

## 4. Components

`src/styles/components.css`

All reusable UI component styles — buttons, cards, forms, settings panels, context-pack panel.

**Contents:**
- **Buttons:** `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-warning`, `.btn-safe`, `.btn-icon`, `.btn-compact`, `.btn-sm`
- **Status indicators:** `.status-pill`, `.saved-badge`, `.status-badge`, `.status-strip`
- **Cards:** `.section-card`, `.main-card`, `.settings-card`, `.result-card`, `.result-section`, `.result-text`, `.result-label`, `.result-meta`
- **Answer:** `.answer-hero`, `.answer-hero-header`, `.answer-copy-btn`, `.say-now-hint`, `.insight-section--*`
- **Cockpit:** `.main-cockpit-layout`, `.cockpit-main`, `.cockpit-side`, `.secondary-insights`, `.workspace-aside-stack`
- **Interview:** `.interview-card-controls`, `.interview-card-tabs`, `.interview-card-tab`
- **Action dock:** `.action-bar`, `.action-dock-item`, `.action-disabled-reason`
- **Forms:** `.field`, `.field-input`, `.field-label`, `.field-hint`, `.field-help`, `.field-checkbox-row`
- **Settings:** `.settings-layout`, `.settings-grid`, `.settings-content`, `.settings-nav-*`, `.settings-sidebar*`, `.settings-section*`, `.settings-collapsible*`, `.settings-form-stack`, `.settings-note*`, `.settings-checkbox*`, `.settings-window-card`, `.settings-cta`, `.settings-sticky-footer`, `.section-status-dot`
- **Setup:** `.setup-step`, `.setup-step-compact`, `.setup-step-status`, `.setup-label`, `.setup-overall-hint`, `.setup-fieldset`, `.setup-legend`, `.setup-focus-*`, `.setup-progress`, `.setup-banner*`, `.setup-missing-chip`
- **Check results:** `.check-results*`, `.check-item*`, `.check-overall`, `.check-summary`
- **Context pack:** `.context-pack-*`, `.badge-active`
- **Bilingual:** `.bilingual-*`
- **Mode banner:** `.mode-banner`
- **Notices:** `.notice-center`, `.notice-item`

## 5. States & Animations

`src/styles/states.css`

Phase-dependent visual states, processing indicators, error states, and keyframe animations.

**Contents:**
- **Phase cards:** `.phase-card`, `.phase-card--recording`, `.phase-card--analyzing`, `.phase-card--error`
- **Processing:** `.phase-activity-pulse`, `.phase-progress-line`, `.processing-step-count`
- **Readiness:** `.readiness-state`, `.readiness-dot`, `.readiness-title`, `.readiness-instruction`, `.status-rail*`
- **Idle:** `.idle-secondary-area`
- **Error/startup:** startup readiness error
- **Motion:** `@media (prefers-reduced-motion: reduce)`
- **Keyframes:** `@keyframes phase-pulse`, `@keyframes phase-spin`, `@keyframes busy-shimmer`, `@keyframes card-enter`

## 6. Entry Point

`src/App.css`

```css
@import "./styles/tokens.css";
@import "./styles/base.css";
@import "./styles/layout.css";
@import "./styles/components.css";
@import "./styles/states.css";
```

## 7. Module Dependency Rules

- `tokens.css` — no dependencies (pure variables)
- `base.css` — depends on tokens (uses `var(--*)`)
- `layout.css` — depends on tokens + base
- `components.css` — depends on tokens + base
- `states.css` — depends on tokens + components (overrides)
- All modules are self-contained — no cross-module `@import`

## 8. Split Safety Rules

- ❌ Do not rename any CSS class
- ❌ Do not change any selector specificity
- ❌ Do not reorder rules within a module
- ❌ Do not change any property values
- ✅ Only split existing rules into files
- ✅ Preserve comment blocks as section markers
- ✅ Verify: build passes, UI tests pass, contracts pass

## 9. Vite CSS Import Behavior

Vite natively resolves `@import` in CSS files during development and production builds. Imported CSS files are:
- Processed through PostCSS (if configured)
- Inlined into the final bundle in import order
- Hot-reloaded in dev mode

No additional Vite plugins are required for CSS `@import`.
