# Replyline Accessibility Checklist

> **Date:** 2026-06-18
> **Scope:** Practical accessibility pass — not a formal WCAG certification
> **Baseline:** Post-beta.3 with ContextPack, setup wizard, and settings reorganization

## 1. Keyboard Navigation

| Check | Status | Notes |
|---|---|---|
| All interactive elements focusable via Tab | ✅ | Buttons, inputs, selects, textareas — all native focusable elements |
| Focus order is logical (left→right, top→bottom) | ✅ | Header → main content → sticky footer |
| `:focus-visible` styles visible on all controls | ✅ | Tokenized `--focus-ring` + `--focus-shadow` on buttons, inputs, sidebar links |
| Escape dismisses notices/errors | ✅ | `Escape` key handler in keyboard shortcuts |
| Enter/Space activates focused buttons | ✅ | Native browser behavior for `<button>` |
| Arrow keys navigate settings tabs | ✅ | `ArrowLeft/Right/Up/Down/Home/End` in SettingsNav |
| Arrow keys navigate interview cards | ✅ | `ArrowLeft/Right` + `1-6` keys in interview carousel |
| No keyboard traps | ✅ | All panels have back/close actions reachable via keyboard |

## 2. Screen Reader Support

| Check | Status | Notes |
|---|---|---|
| Icon buttons have `aria-label` | ✅ | Settings (gear), hide-to-tray, copy button |
| Error states use `role="alert"` | ✅ | Startup error + pipeline error recovery cards |
| Notices use `aria-live` | ✅ | `polite` for info, `assertive` for errors; `aria-atomic="true"` |
| Phase status dot is `aria-hidden` | ✅ | Decorative pulse/spinner indicators hidden from screen readers |
| Interview carousel uses `role="tablist"` | ✅ | `role="tab"` + `role="tabpanel"` with `aria-selected` and `aria-controls` |
| Form labels associated with inputs | ✅ | Implicit `<label>` wrapping for context pack editor fields |
| Headings form a logical hierarchy | ✅ | `h2` for panel titles, `h3` for section titles, `h4` for subsections |
| Status badges convey meaning programmatically | ✅ | Status text inside badges is visible and not icon-only |

## 3. Color & Contrast

| Check | Status | Notes |
|---|---|---|
| Semantic color tokens used (not hardcoded) | ✅ | `--color-text-primary`, `--color-accent`, `--color-warning`, etc. |
| No low-contrast gray-on-warm text | ✅ | Enforced by UI layout contract |
| Status states visually distinct | ✅ | Recording (amber pulse), analyzing (blue shimmer), ready (green), error (red) |
| Focus ring has sufficient contrast | ✅ | `--color-focus-ring` + `--color-focus-shadow` tokens |
| Critical controls don't look disabled when active | ✅ | Primary CTAs use `btn-primary` class with clear affordance |

## 4. Motion & Timing

| Check | Status | Notes |
|---|---|---|
| `prefers-reduced-motion` respected | ✅ | Motion tokens zeroed, animations forced to `0.01ms`, `animation-name: none` |
| Motion tokens used (not raw durations) | ✅ | `--motion-fast` (120ms), `--motion-normal` (180ms), `--ease-out` |
| No auto-playing animations >5 seconds | ✅ | Pulse/spin animations are subtle and loop only during active states |
| Notice auto-dismiss is reasonable (2.8s) | ✅ | Context pack save notice; errors persist until user action |

## 5. Content & Readability

| Check | Status | Notes |
|---|---|---|
| User-facing text is localized (RU-first) | ✅ | 394 locale keys, RU primary, EN mirror |
| No raw mixed-language labels in TSX | ✅ | Enforced by locale key contract |
| Error messages are in user language | ✅ | Pipeline errors, bootstrap errors, setup hints — all locale-driven |
| Button labels are action-oriented | ✅ | «Сохранить», «Пересобрать», «Создать контекст» — imperative mood |
| No Unicode emoji in critical controls | ✅ | SVG icons with `currentColor`; `←` arrow is the only non-SVG glyph (decorative) |

## 6. Known Gaps (Not Blocking)

| Gap | Severity | Planned |
|---|---|---|
| No skip-to-content link | Low | Not planned — app is single-page with few interactive regions |
| No landmark roles on main layout regions | Low | `data-testid` is used for testing; could add `role="main"` / `role="navigation"` |
| Interview card carousel shows `←` `→` as navigation | Low | Text arrows; could use SVG chevrons for consistency |
| Context pack editor uses implicit label wrapping | Low | Works in all modern screen readers; explicit `htmlFor`/`id` could be added |
| Color-only status indicators (dots) | Low | Status text accompanies each dot in the sidebar and header |

## 7. Verification

Run these commands to verify accessibility-related contracts:

```bash
pnpm test:ui              # UI tests include focus/keyboard/aria checks
pnpm test:locale-keys     # Ensures all labels are localized
pnpm test:contracts       # UI shell contract checks landmarks
pnpm test:public-footprint # No secret leaks in public files
```

Manual checks for each release:

- [ ] Tab through all screens: idle → setup → answer → context pack → settings → error
- [ ] Verify focus ring visible on every interactive element
- [ ] Test with Windows High Contrast mode
- [ ] Test with screen reader (Narrator on Windows)
- [ ] Verify `Escape` works in every panel
- [ ] Verify hotkey instruction is visible and readable
