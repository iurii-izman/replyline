# Keyboard-Only Accessibility

This is a practical keyboard-only audit for Replyline beta. It is not a full WCAG certification.

## Supported Keyboard Paths

- `Ctrl+Alt+Space`: start and stop capture in the main workflow.
- `ArrowLeft` / `ArrowRight`: move between interview cards in Interview Mode.
- `1`-`6`: jump directly to an interview card when that card exists.
- `Ctrl+C` / `Cmd+C`: copy the current card when the main card is active.
- `R`: retry the current analysis when retry is available.
- `Escape`: dismiss notices and clear the current error state.
- `Tab` / `Shift+Tab`: move through setup, settings, candidate pack, and report controls in DOM order.
- `Enter` / `Space`: activate focused buttons, tabs, and native form controls.
- Settings tabs also support arrow-key navigation between sections.

## Areas Covered

- Setup flow
- Main card
- Interview carousel
- Settings sections
- Candidate Pack Studio
- Model presets
- Runtime checks
- Session and report controls

## Known Limitations

- No full WCAG certification claim is made.
- No screen-reader-specific workflow beyond native HTML semantics and ARIA tabs/status text.
- The keyboard audit does not add a new shortcut system.
- Native text editing still takes priority inside inputs and textareas.
- The hidden mobile tab bar and desktop sidebar tab bar are both rendered; CSS decides which one is visible in the current layout.
- Browser and system-reserved shortcuts still take priority where applicable.
- This audit does not change the capture hotkey model.
