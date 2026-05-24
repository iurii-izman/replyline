# Manual Windows UX QA Checklist

Use this checklist for manual Windows desktop UX validation before beta handoff.

## Run Metadata

- Date: `<YYYY-MM-DD>`
- Build/commit: `<git sha or build id>`
- Tester: `<name>`
- Windows version: `<Windows 10/11 + build>`

## Checklist

| Scenario                        | Expected result                                                                                                                | Pass/Fail     | Notes     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------- | --------- |
| first launch                    | App starts in expected baseline state; no always-on-top overlay behavior; native titlebar/decorations visible.                 | `<PASS/FAIL>` | `<notes>` |
| normal window launch            | Main window opens as a normal desktop window and restores foreground focus correctly.                                          | `<PASS/FAIL>` | `<notes>` |
| Alt+Tab visibility              | Replyline appears in Alt+Tab and can be switched to/from other apps reliably.                                                  | `<PASS/FAIL>` | `<notes>` |
| taskbar visibility              | Replyline appears in Windows taskbar while main window is visible.                                                             | `<PASS/FAIL>` | `<notes>` |
| native minimize/maximize/close  | Native minimize, maximize/restore, and close controls work without custom window chrome conflicts.                             | `<PASS/FAIL>` | `<notes>` |
| no custom overlay behavior      | Window does not behave like overlay tool by default (not pinned on top, normal focus/restore semantics).                       | `<PASS/FAIL>` | `<notes>` |
| close/hide-to-tray behavior     | Closing window follows configured hide-to-tray behavior; app remains available from tray if enabled.                           | `<PASS/FAIL>` | `<notes>` |
| tray open main window           | Tray action restores/open main window and focus is usable.                                                                     | `<PASS/FAIL>` | `<notes>` |
| resize to compact width         | Window can be resized down to compact width and layout remains usable (no broken overlap).                                     | `<PASS/FAIL>` | `<notes>` |
| maximize/fullscreen             | Maximize/fullscreen/restore keep layout landmarks and controls accessible.                                                     | `<PASS/FAIL>` | `<notes>` |
| fullscreen dead space           | Fullscreen does not show empty dead-space bands; workspace uses full height with readable capped content.                      | `<PASS/FAIL>` | `<notes>` |
| header status context           | Header shows current section and compact status (setup/ready/recording/analyzing/answer ready) in fullscreen.                  | `<PASS/FAIL>` | `<notes>` |
| no awkward floating footer      | Main/Settings/Studio footers stay attached to page context and do not look like detached full-width strips.                    | `<PASS/FAIL>` | `<notes>` |
| setup missing flow              | Missing setup state is clearly shown with actionable guidance to required sections.                                            | `<PASS/FAIL>` | `<notes>` |
| settings navigation             | Settings section navigation works (sidebar/chips + active section switching).                                                  | `<PASS/FAIL>` | `<notes>` |
| settings IA separation          | In `Reports`, everyday retention/clear controls are separate from diagnostics/ops controls and labels are unambiguous.        | `<PASS/FAIL>` | `<notes>` |
| settings sidebar labels         | Sidebar statuses are localized and clear (`Не заполнено/Сохранено/Готово/Опционально`), no mixed raw EN text.                  | `<PASS/FAIL>` | `<notes>` |
| LLM/Speech sections             | Speech and LLM sections are reachable and editable as independent sections.                                                    | `<PASS/FAIL>` | `<notes>` |
| check results card              | Check results render in dedicated card; status labels and open-step action are readable and styled.                            | `<PASS/FAIL>` | `<notes>` |
| Candidate Pack Studio open/back | Candidate Pack Studio opens as separate view and Back returns to expected previous surface.                                    | `<PASS/FAIL>` | `<notes>` |
| candidate studio stepper        | Studio shows workflow stepper (`1. Исходные данные`, `2. Подготовка`, `3. Профиль`) with clear active/completed/future states. | `<PASS/FAIL>` | `<notes>` |
| candidate studio guided empty   | Empty preview state is concise (max 3 bullets) and explains paste -> prepare -> preview flow.                                  | `<PASS/FAIL>` | `<notes>` |
| candidate studio prepared state | After prepare, quality summary/facts/weak facts/keywords/warnings render correctly; no oversized blank panel.                  | `<PASS/FAIL>` | `<notes>` |
| candidate studio accordion      | Saved profile editor uses styled accordion (no default browser triangle), opened section is visually clear.                    | `<PASS/FAIL>` | `<notes>` |
| candidate studio action dock    | Primary/secondary/danger/back actions map to current state: prepare/save/save draft/clear/back to settings.                    | `<PASS/FAIL>` | `<notes>` |
| candidate studio responsive     | Fullscreen/wide/compact layouts keep workflow readable: wide can split sections, compact is single-column.                     | `<PASS/FAIL>` | `<notes>` |
| record/analyze/copy             | Core workflow actions (record/analyze/copy) are reachable and functional in UI flow.                                           | `<PASS/FAIL>` | `<notes>` |
| retry/clear                     | Retry and clear actions are available where expected and update UI state correctly.                                            | `<PASS/FAIL>` | `<notes>` |
| disabled critical buttons       | Disabled critical actions show clear disabled state/title (no raw default button look).                                        | `<PASS/FAIL>` | `<notes>` |
| start/end interview session     | Interview session start/end controls work and state transitions are reflected in UI.                                           | `<PASS/FAIL>` | `<notes>` |
| mode clarity banner             | Side panel mode banner clearly shows Interview Mode active vs WorkConversation default.                                        | `<PASS/FAIL>` | `<notes>` |
| full markdown export warning    | Full markdown export path shows expected sensitivity/warning semantics before sharing.                                         | `<PASS/FAIL>` | `<notes>` |
| redacted markdown export        | Redacted export works and omits sensitive content according to contract.                                                       | `<PASS/FAIL>` | `<notes>` |
| clear reports                   | Clear reports action is accessible and removes stored reports as expected.                                                     | `<PASS/FAIL>` | `<notes>` |
| footer overlap                  | Sticky footers do not overlap final form fields/content in Main, Settings, and Candidate Studio.                               | `<PASS/FAIL>` | `<notes>` |
| scrollbars                      | Scroll behavior is single-owner and predictable; no conflicting nested full-height scrollbars.                                 | `<PASS/FAIL>` | `<notes>` |
