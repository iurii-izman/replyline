# Engineering Manual QA Checklist

Canonical manual QA guide for desktop UI, Windows UX, compact visual sanity, and privacy-sensitive flows.

Run this after UI-affecting changes and before beta/release handoff. Keep notes compact, attach local artifact paths only, and never include secrets or raw transcript dumps in shared notes.

Operational intake, GitHub routing, diagnostics collection, and stale handling live in [operations.md](operations.md).

## Run metadata

- Date: `<YYYY-MM-DD>`
- Build/commit: `<git sha or build id>`
- Tester: `<name>`
- Windows version: `<Windows 10/11 + build>`
- Window sizes checked: `700px`, `1000px`, `1440px+ / fullscreen`

## Evidence note

For each failing or notable check, record:

- expected vs actual
- reproducibility: `once` / `sometimes` / `always`
- severity: `S0` / `S1` / `S2` / `S3`
- privacy sensitivity: `low` / `medium` / `high`
- local artifact path

## Checklist

### Launch / window / tray

- App launches as a normal Windows window with native chrome and no always-on-top overlay behavior.
- Main window is visible in Alt+Tab and taskbar while open.
- Native minimize, maximize/restore, and close work correctly.
- Close follows configured hide-to-tray behavior; tray reopen restores a usable focused window.
- Tray `Quit` fully exits the app.
- Compact, normal, wide, and fullscreen states remain usable without dead space or landmark loss.

### Setup / settings

- First launch or incomplete setup shows clear missing-step guidance with actionable links.
- Settings navigation works across sections and active status labels are readable in RU-first UX.
- Speech and LLM sections are independently editable and save correctly.
- Check/preflight results render in a dedicated readable state, not as broken raw output.
- Reports/privacy controls stay separate from diagnostics/ops controls.

### Core capture / card / retry

- Idle state is stable with no stale recording indicators.
- `Ctrl+Alt+Space` starts and stops capture with visible state transitions.
- Successful capture produces the expected card flow with usable copy/retry actions.
- `Copy reply` copies current `say_now` text and gives visible feedback.
- Retry works without corrupting state; clear/reset restores the next capture cycle cleanly.
- Provider/setup errors route the user to understandable recovery guidance.

### Interview Mode / report export

- Interview session start/end controls work and mode state is clearly visible.
- Interview report path completes after session end.
- Full markdown export remains explicitly sensitive.
- Redacted markdown export works and preserves the privacy contract.
- Report retention and clear-reports controls behave as documented.

### Candidate Pack Studio

- Studio opens as a separate, understandable workflow and Back returns to the expected surface.
- Empty state is concise and explains paste -> prepare -> preview.
- Stepper/status states remain clear across empty, processing, draft, prepared, and saved states.
- Prepared preview shows summary/facts/keywords/warnings without giant blank panels.
- Save, save draft, prepare, clear, and back actions map to the current state correctly.
- Compact and wide layouts remain readable.

### Layout / responsive / scrollbars

- Main, Settings, and Candidate Studio layouts remain usable at compact, normal, and wide/fullscreen sizes.
- Sticky footers/action bars do not overlap final fields or content.
- Scroll ownership is predictable; no broken nested full-height scrollbars.
- Critical controls do not fall back to raw browser-default styling in primary flows.
- Visual hierarchy stays readable; avoid giant empty panels, low-contrast text, or accidental disabled-looking controls.

### Privacy warnings

- Setup, provider, and export flows do not reveal keys/tokens in UI notes or screenshots.
- Privacy/sensitivity warnings are visible before sharing transcript/report artifacts.
- Full exports are clearly marked as sensitive local artifacts.
- Shared notes use artifact paths and redacted screenshots/log snippets only.

## Exit rule

Do not treat manual QA as complete if runtime-sensitive flows are visually green but privacy warnings, export boundaries, tray behavior, or layout/scroll regressions are still unverified.

## See also

- [testing.md](testing.md)
- [runtime.md](runtime.md)
- [../ui-layout-contract.md](../ui-layout-contract.md)
