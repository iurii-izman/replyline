# Manual UI QA Checklist

This checklist is a lightweight visual QA harness for shell/main/settings/candidate pack surfaces.
Run it before beta handoff and after any UI refactor.

## Window Sizes

- compact: `700px` width
- normal: `1000px` width
- wide/fullscreen: `1440px+` width

For each size, check layout landmarks:

- app shell (`app-shell`)
- main column (`main-surface`)
- side panel in wide-ready markup (`main-side-panel`, `.main-cockpit-layout.is-wide`)
- action bar (`action-row`)
- settings nav (`settings-nav-mobile`, `settings-sidebar`)
- candidate studio panels (`candidate-pack-ai-section`, `candidate-pack-preview`)

## Scenarios

1. first launch

- Expected: settings opens with setup hints and setup progress visible.

2. setup incomplete

- Expected: missing setup steps are marked and CTA to first missing section is visible.

3. card ready

- Expected: work card sections render and copy/retry actions are enabled after successful capture.

4. interview session active

- Expected: session controls work, interview state is visible, and end session remains available.
- Expected: mode banner in side panel clearly indicates Interview Mode vs WorkConversation default.

5. reports full/redacted

- Expected: report summary appears after ending session.
- Expected: both export actions are enabled and produce paths for full/redacted markdown.

6. candidate pack

- Expected (empty): preview shows empty status, save prepared profile is disabled.
- Expected (empty): top status banner shows `Пусто` and local/cloud boundary hint is visible.
- Expected (preview/saved): preview metrics/chips render and saved status counters update.
- Expected (draft/prepared/saved/processing): status chip changes accordingly and primary action label reflects current stage.

## Suggested Manual Capture Flow

1. Start `pnpm tauri dev`.
2. Run through all scenarios in compact/normal/wide sizes.
3. Save screenshots locally for each scenario-state pair.
4. Include notable regressions in handoff notes.

## Automated Coverage Link

- UI state landmarks are validated in `src/app/App.ui.test.tsx` (`pnpm test:ui`).
- This checklist complements tests and does not require external credentials.
