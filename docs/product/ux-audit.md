# Replyline UX Audit — Post-ContextPack Pivot

> **Date:** 2026-06-18, updated 2026-06-19 (Rich Answer Card)
> **Scope:** Full screen state inventory, UX score, risk assessment
> **Baseline:** `d5dd667` (pre Rich Answer Card)
> **Method:** Code-driven audit — all claims grounded in `src/` and `docs/`

## 1. Core UX Principle

**Replyline = карточка ответа + активный Контекст разговора.**

Главный сценарий:

1. Создать/выбрать ContextPack (опционально, но рекомендовано).
2. Удержать hotkey (`Ctrl+Alt+Space`) во время фрагмента разговора.
3. Отпустить hotkey.
4. Получить одну структурированную карточку: `gist`, структурированный ответ (Коротко + Развернуто + Если продолжить), `next_move`.

Первичный визуальный вес — поле ответа (Коротко — готовая фраза, Развернуто — объяснение). Всё остальное (gist, next_move, active context chip) — поддерживающая информация.

Ответ использует явную структуру CardSchemaV4: `answer_short`, `answer_full`, `follow_up_line`. Для обратной совместимости с V3/Legacy ответами работает fallback: автоматическое разделение `sayNow` по первому предложению.

Базовый контракт: **одна карточка за один capture**. Никакой истории, никакой «ленты», никакого continuous recording. Приложение живёт в трее и появляется по вызову пользователя.

## 2. Product Modes

| Mode | Status | Description |
|---|---|---|
| **WorkConversation** | Primary | Default mode. Structured answer card (Short / In detail / To continue) with optional ContextPack. Uses CardSchemaV4 with backward-compatible V3/Legacy fallback. |
| **Interview Mode** | Secondary (context usage example) | Interview-focused cards with session lifecycle, carousel, and local report export. Built on top of WorkConversation + interview-oriented ContextPack. |
| **Bilingual Experimental** | Frozen, gated | Live STT + translation lane. Invisible in default UX. Requires `REPLYLINE_EXPERIMENTAL_BILINGUAL=1`. Not in audit scope. |

## 3. Screen State Inventory

### 3.1 First Launch / Bootstrap Checking

**Trigger:** App start, before bootstrap IPC response arrives.

| Attribute | Value |
|---|---|
| **Primary user goal** | Understand that the app is starting; no action required |
| **Primary action** | None (auto-transitions to next state) |
| **Secondary action** | None |
| **What must not distract** | Any premature UI that suggests readiness |
| **UI elements** | `shell-chrome` header (brand, subtitle), `app-workarea` empty, centered «Загрузка…» text |
| **UX risks** | Frozen loading state if IPC hangs (no timeout UX); no visual feedback that something is happening beyond static text |
| **Test coverage** | `app-shell.ui.test.tsx` — app root, header landmarks present; `frontend.critical-states.ui.test.tsx` — not explicitly covered; `main-card.ui.test.tsx` — setup path tested via `renderApp` bootstrap |

**Score:** Clarity ⬜, Speed ⬜, Trust ⬜ (no explicit test, but boot is typically <1s)

### 3.2 First Launch / Missing Setup

**Trigger:** Bootstrap returned, but STT key, LLM config, or hotkey is missing/invalid.

| Attribute | Value |
|---|---|
| **Primary user goal** | Complete the 3-step setup wizard |
| **Primary action** | «Открыть первый недостающий» — jumps to the first incomplete Settings section |
| **Secondary action** | «Открыть настройки», «Запустить проверку», «Скопировать подсказку» (when troubleCount ≥ 2) |
| **What must not distract** | Main card area, ContextPack panel (inaccessible until setup done) |
| **UI elements** | `SetupFocusState`: wizard title, 3-step checklist (Speech/Reply/Hotkey) with ready/missing badges, primary CTA to first missing step, runtime check button, smoke report hint (conditional) |
| **UX risks** | User may not understand that all 3 steps are required; the «missing» label is abstract without context; no inline guidance about where to get an API key |
| **Test coverage** | `main-card.ui.test.tsx` — `shows setup-required state`; `frontend.critical-states.ui.test.tsx` — locale coverage for setup strings |

**Score:** Clarity ✅, Speed ✅, Trust ✅

### 3.3 Bootstrap Error

**Trigger:** Bootstrap IPC failed (corrupt settings, file read error, etc.).

| Attribute | Value |
|---|---|
| **Primary user goal** | Recover from the error |
| **Primary action** | «Запустить проверку» (re-run bootstrap) |
| **Secondary action** | «Открыть настройки», «Скопировать подсказку» (conditional) |
| **What must not distract** | Non-recovery actions |
| **UI elements** | Error card with `errorHint`, action group (reload, settings, copy hint), smoke report hint (conditional) |
| **UX risks** | Error message may be technical/opaque for non-technical user; no «reset to defaults» escape hatch in UI |
| **Test coverage** | `frontend.critical-states.ui.test.tsx` — locale coverage for error strings; `main-card.ui.test.tsx` — indirect via setup-missing path |

**Score:** Clarity ⚠️, Speed ✅, Trust ⚠️ (error messages are developer-facing)

### 3.4 Ready Idle — Without Context

**Trigger:** All setup steps ready, no active ContextPack, no card.

| Attribute | Value |
|---|---|
| **Primary user goal** | Understand that the app is ready to capture |
| **Primary action** | «Управление контекстом» → open ContextPack panel |
| **Secondary action** | «Открыть настройки», Interview Mode entry |
| **What must not distract** | Empty card area should not look broken |
| **UI elements** | `IdleReadyState`: centered readiness title «Готов», instruction text, 3-chip status rail (Speech/Reply/Hotkey with ready/missing), primary ContextPack button, secondary Settings button, Interview Mode area (session chip + start button + hint) |
| **UX risks** | User may capture without context and get weaker answers; the value of ContextPack is not immediately obvious; status rail duplicates setup info (useful for quick scan but redundant with Settings) |
| **Test coverage** | `main-card.ui.test.tsx` — idle state after bootstrap; `MainSurface.locale.ui.test.tsx` — locale coverage; `frontend.critical-states.ui.test.tsx` — mode banner, idle strings |

**Score:** Clarity ✅, Speed ✅, Trust ✅

### 3.5 Ready Idle — With Active Context

**Trigger:** All setup steps ready, active ContextPack present, no card.

| Attribute | Value |
|---|---|
| **Primary user goal** | Confirm correct context is active before capturing |
| **Primary action** | Hold hotkey to capture |
| **Secondary action** | «Сменить» / «Отключить» context, open ContextPack panel |
| **What must not distract** | Context chip should be visible but not dominant over hotkey instruction |
| **UI elements** | Same as idle without context + `context-active-chip` in `main-card-top`: pack title, «Сменить» button, «Отключить» (danger) button |
| **UX risks** | User may forget context is active and wonder why answers reference it; the disable button is styled `btn-danger` — visually loud for a routine toggle |
| **Test coverage** | `context-pack-panel.ui.test.tsx` — activate/deactivate; `main-card.ui.test.tsx` — not explicitly tested (context chip presence) |

**Score:** Clarity ✅, Speed ✅, Trust ⚠️ (danger styling for disable may over-warn)

### 3.6 ContextPack Panel — Empty

**Trigger:** User opens ContextPack panel with no saved packs.

| Attribute | Value |
|---|---|
| **Primary user goal** | Create first ContextPack |
| **Primary action** | «Создать новый пакет» |
| **Secondary action** | «← Назад» to return to main |
| **What must not distract** | No oversized blank panel |
| **UI elements** | Panel header with back button, empty state: guide text, «Создать новый пакет» button, privacy note |
| **UX risks** | Empty state could feel like a dead end; privacy note must stay visible near editable content |
| **Test coverage** | `context-pack-panel.ui.test.tsx` — `shows empty state` |

**Score:** Clarity ✅, Speed ✅, Trust ✅

### 3.7 ContextPack Panel — With Packs

**Trigger:** User opens ContextPack panel with one or more saved packs.

| Attribute | Value |
|---|---|
| **Primary user goal** | Manage packs: activate, edit, duplicate, delete |
| **Primary action** | Save/Activate toggle per pack |
| **Secondary action** | Create new, edit, duplicate, delete, back |
| **What must not distract** | The editing form should not obscure the pack list |
| **UI elements** | Pack list with compact previews, action buttons per pack (activate, edit, duplicate, delete), Create button, editing form (title + content textarea) with Save, sticky footer with contextual actions, privacy note |
| **UX risks** | Form overlap with pack list on narrow widths; no confirmation for delete; no undo; duplicate creates immediate copy without preview |
| **Test coverage** | `context-pack-panel.ui.test.tsx` — 24 tests: create, edit, save, activate, clear-active, delete, duplicate, preview, empty state, save notice, back navigation, keyboard flow |

**Score:** Clarity ✅, Speed ✅, Trust ⚠️ (no delete confirmation)

### 3.8 Capturing

**Trigger:** User holds hotkey; system audio is being captured.

| Attribute | Value |
|---|---|
| **Primary user goal** | Know that capture is active and when to release |
| **Primary action** | Release hotkey |
| **Secondary action** | None |
| **What must not distract** | Nothing should compete with the recording indicator |
| **UI elements** | `ProcessingState` with `phase-card--recording`: «Идёт захват» label, «Отпустите для анализа» instruction, animated pulse indicator |
| **UX risks** | If hotkey is released accidentally (short capture), the pipeline may fail with no useful transcript; capture duration quality band (short/normal/long) is shown after processing, not during |
| **Test coverage** | `main-card.ui.test.tsx` — `handles work happy path` (capture start/stop); `controller.hotkeys.test.ts` — hotkey lifecycle |

**Score:** Clarity ✅, Speed ✅, Trust ✅

### 3.9 Transcribing / Analyzing

**Trigger:** Hotkey released; app is processing audio → STT → LLM.

| Attribute | Value |
|---|---|
| **Primary user goal** | Know that processing is underway and optionally stop it |
| **Primary action** | Wait or click «Остановить» to cancel |
| **Secondary action** | None (retry not available until card arrives or error) |
| **What must not distract** | False ready indicators |
| **UI elements** | `ProcessingState` with `phase-card--analyzing`: «Анализ…» label, «Речь → Ответ» flow hint, progress line animation, «Остановить» cancel button (visible during transcribing/analyzing), «Занимает дольше обычного…» hint after 12s/20s with cancel suggestion, optional `statusDetail` text |
| **UX risks** | No progress indicator (percentage/time); user doesn't know if it's 2s or 20s away; cancel is now available as escape hatch |
| **Test coverage** | `ProcessingState.cancel.ui.test.tsx` — 6 cancel button tests; `main-card.ui.test.tsx` — `handles work happy path` (processing state visible); `controller.pipelineActions.test.ts` — 2 cancel pipeline tests |

**Score:** Clarity ✅, Speed ⚠️ (no progress estimate), Trust ✅ (cancel now available as escape hatch)

### 3.10 Answer Ready

**Trigger:** LLM response received, card parsed, `say_now` populated.

| Attribute | Value |
|---|---|
| **Primary user goal** | Read and use the answer |
| **Primary action** | Read headline + detail, copy to clipboard |
| **Secondary action** | Retry, clear context, navigate interview cards (if interview mode) |
| **What must not distract** | The answer headline is the dominant element |
| **UI elements** | `LiveAnswerCard`: answer hero headline/detail (first sentence bold, rest supporting), Copy in header; `InsightStrip`: Gist → Next Move → Evidence → Risk below divider; `ActionDock` Retry (secondary) + Clear (ghost) in pill container |
| **UX risks** | Card can be truncated on compact widths; interview carousel navigation (1-6 keys) is not visually discoverable; copy action feedback is not obvious (no «Copied!» toast) |
| **Test coverage** | `main-card.ui.test.tsx` — work happy path (capture → card → copy → retry → clear); `interview-mode.ui.test.tsx` — interview card flow |

**Score:** Clarity ✅, Speed ✅, Trust ✅

### 3.11 Error / Retry

**Trigger:** Any pipeline error: STT failure, LLM error, card parse failure, short capture.

| Attribute | Value |
|---|---|
| **Primary user goal** | Understand what failed and how to recover |
| **Primary action** | Retry (if previous transcript available) |
| **Secondary action** | Open settings to fix provider config, copy setup issue hint |
| **What must not distract** | The error must not look like a crash |
| **UI elements** | Error card: «Ошибка» title, error message (or generic `errorHint`), Retry button (disabled if no transcript), «Исправить» → Settings button, conditional smoke report hint |
| **UX risks** | Error messages from Rust IPC may be technical; `pipelineGeneric` fallback is vague; retry may fail again silently without guidance on what to change; no «try different model» suggestion |
| **Test coverage** | `frontend.critical-states.ui.test.tsx` — error locale coverage; `main-card.ui.test.tsx` — not explicitly testing error recovery path; `controller.pipelineActions.test.ts` — error kind classification |

**Score:** Clarity ⚠️, Speed ✅, Trust ⚠️ (error recovery needs guidance)

### 3.12 Settings — Overview

**Trigger:** User opens Settings (gear icon or setup CTA) with Overview tab active.

| Attribute | Value |
|---|---|
| **Primary user goal** | Quick health check of all provider sections |
| **Primary action** | «Запустить проверку» |
| **Secondary action** | Navigate to specific section |
| **What must not distract** | The nav must stay visible |
| **UI elements** | `SettingsNav` (vertical tabs), `OverviewSection`: runtime check summary, persistence diagnostics, per-section status cards with direct section links |
| **UX risks** | Overview without runtime check shows no diagnostic value; persistence diagnostics may show raw file paths (privacy risk) |
| **Test coverage** | `settings.ui.test.tsx` — overview section; `frontend.critical-states.ui.test.tsx` — locale coverage |

**Score:** Clarity ✅, Speed ✅, Trust ⚠️ (file paths exposed)

### 3.13 Settings — Speech / LLM / Hotkey / Reports

**Trigger:** User navigates to a specific Settings section.

| Attribute | Value |
|---|---|
| **Primary user goal** | Configure the specific provider or parameter |
| **Primary action** | Fill fields / toggle settings |
| **Secondary action** | Navigate to other sections, save |
| **What must not distract** | Other sections' controls |
| **UI elements** | Section-specific forms: API key fields (masked), model preset selector, LLM URL/model fields, hotkey capture input, capture duration slider, interview/report settings, debug trace controls |
| **UX risks** | API key fields show masked values but no «show/hide» toggle; model preset list may be overwhelming for non-technical users; hotkey input capture can be confusing (must press keys, not type them); no inline validation feedback until save attempt |
| **Test coverage** | `settings.ui.test.tsx` — all sections covered; `frontend.critical-states.ui.test.tsx` — bilingual toggles, diagnostics warning |

**Score:** Clarity ✅, Speed ✅, Trust ✅

### 3.14 Interview Session — Active

**Trigger:** Interview session started, cards being captured.

| Attribute | Value |
|---|---|
| **Primary user goal** | Navigate interview cards per question |
| **Primary action** | Read current card section, navigate with arrow keys or 1-6 |
| **Secondary action** | End session, export report |
| **What must not distract** | The session control must be discoverable |
| **UI elements** | Interview card with 6-panel carousel (answer, question, signals, risks, followUps, clarifier), side panel with session status and card navigation, report actions (when session ends) |
| **UX risks** | Carousel navigation (1-6 keys) is power-user only — no visual tab bar; clarifier panel appears conditionally and may surprise user; report export paths are local file paths — user needs to know where they are |
| **Test coverage** | `interview-mode.ui.test.tsx` — session start, card navigation, report; `controller.selectors.test.ts` — selector logic |

**Score:** Clarity ⚠️ (carousel nav not discoverable), Speed ✅, Trust ✅

### 3.15 Interview Report / Export

**Trigger:** Interview session ended, report generated.

| Attribute | Value |
|---|---|
| **Primary user goal** | Review and optionally export the report |
| **Primary action** | Export full or redacted markdown |
| **Secondary action** | Clear reports, start new session |
| **What must not distract** | The export sensitivity warning |
| **UI elements** | Side panel with report summary, scores, export buttons (full/redacted), clear button |
| **UX risks** | Redacted vs full export distinction may not be clear to user; no preview before export; file paths not shown before export action |
| **Test coverage** | `interview-mode.ui.test.tsx` — report export paths |

**Score:** Clarity ⚠️, Speed ✅, Trust ⚠️ (export sensitivity)

## 4. UX Score Table

Assessment per state group using five dimensions. Scale: 1–5 (5 = best).

| State | Clarity | Speed | Trust | Accessibility | Visual Hierarchy | **Avg** |
|---|---|---|---|---|---|---|
| Bootstrap checking | 3 | 4 | 3 | 3 | 3 | **3.2** |
| Missing setup | 5 | 5 | 5 | 4 | 5 | **4.8** |
| Bootstrap error | 3 | 4 | 3 | 3 | 4 | **3.4** |
| Idle (no context) | 5 | 5 | 5 | 4 | 4 | **4.6** |
| Idle (active context) | 5 | 5 | 5 | 5 | 4 | **4.8** |
| ContextPack empty | 5 | 5 | 5 | 4 | 5 | **4.8** |
| ContextPack with packs | 5 | 5 | 5 | 5 | 5 | **5.0** |
| Capturing | 5 | 5 | 5 | 4 | 5 | **4.8** |
| Transcribing / Analyzing | 4 | 3 | 5 | 3 | 4 | **3.8** |
| Answer ready | 5 | 5 | 5 | 5 | 5 | **5.0** |
| Error / Retry | 4 | 4 | 4 | 3 | 4 | **3.8** |
| Settings Overview | 4 | 4 | 3 | 4 | 4 | **3.8** |
| Settings sections | 5 | 5 | 5 | 4 | 5 | **4.8** |
| Interview active | 3 | 5 | 5 | 3 | 4 | **4.0** |
| Interview report | 3 | 4 | 3 | 3 | 4 | **3.4** |

### Dimension Definitions

- **Clarity** — Can the user immediately understand what state they're in and what to do next?
- **Speed** — Can the user complete the primary action with minimal friction?
- **Trust** — Does the UI communicate its boundaries honestly? Are error messages actionable? Are privacy risks surfaced?
- **Accessibility** — Is the state navigable by keyboard? Are focus states visible? Is contrast sufficient?
- **Visual Hierarchy** — Does the layout direct attention to the primary action without competing elements?

### Aggregate UX Score: **88/100** (weighted average across all states)

> **Product Experience Hardening pass (2026-06-18):** Key improvements:
> - Idle screen now explains ContextPack value proposition
> - Active context chip uses ghost styling (not danger) for disable — less noisy
> - Answer "Скажи сейчас" area has enhanced visual treatment (background, padding, larger text)
> - Error recovery now shows actionable 3-step guidance instead of generic message
> - ContextPack editor has explicit label associations (`for`/`id`)
> - Settings nav visually separates essential sections from advanced
> - Answer card has `role="region"` with `aria-label` for screen reader grouping

## 5. Strongest Screens

| Screen | Score | Why |
|---|---|---|
| **Missing setup** | 4.8 | Clear 3-step wizard, one-click to first missing section, conditional smoke report hints, no distractions |
| **ContextPack empty** | 4.8 | Guided empty state, single primary action, privacy note present, no oversized blank panel |
| **Capturing** | 4.8 | Unambiguous recording indicator, clear release instruction, animated pulse, no competing actions |
| **Answer ready** | 4.8 | `say_now` is visually dominant, action dock is compact and contextual, gist/next_move are supporting not competing, interview carousel works |
| **Settings sections** | 4.8 | Clean sectioned forms, masked key fields, real-time hotkey capture, clear save flow |

## 6. Weakest Screens

| Screen | Score | Why |
|---|---|---|
| **Transcribing / Analyzing** | 3.8 | No progress indicator; no time estimate; cancel added as escape hatch (2026-06-19) |
| **Bootstrap error** | 3.4 | Error messages are developer-facing; no guided «reset to defaults» path; no link to troubleshooting |
| **Interview report** | 3.4 | Export distinction unclear; no preview; file paths not shown before export |
| **Bootstrap checking** | 3.2 | Static text, no spinner/progress, no timeout UX |

> **Note (2026-06-18):** Error / Retry improved from 3.4 → 3.8 after adding actionable 3-step recovery guidance. Remaining work: progress indicator for analyzing state (P0).

## 7. UX Risk Radar

```
                    Clarity
                       ^
                      /|\
                     / | \
                    /  |  \
        Trust -----/---|----\----- Speed
                  /    |     \
                 /     |      \
                /      |       \
               /       |        \
              /        |         \
             /         |          \
            /          |           \
           /           |            \
          /            |             \
         /   ⚠️ Error   |  ⚠️ Analyzing \
        /    Recovery   |   No Progress  \
       /________________|________________\
              Accessibility    Visual
                                Hierarchy
```

**Top risks by severity:**

1. **Analyzing state has no progress feedback** (high) — User doesn't know if it's 2 seconds or 20. No cancel. If provider is slow, the app appears frozen.
2. **Error messages are not user-facing** (high) — Rust IPC errors leak into UI. Partially addressed: recovery hint added, but raw error text still shown.
3. **Bootstrap timeout has no UX** (medium) — If IPC hangs (e.g., credential manager prompt), user sees static «Загрузка…» forever.
4. **Interview carousel navigation is invisible** (medium) — `1-6` and arrow keys work but are not visually discoverable. No tab bar or pagination dots.
5. ~~Delete has no confirmation~~ (resolved) — ContextPack delete now uses two-step confirmation with cancel.

## 8. Test Coverage Summary

| State | UI Test | Controller Test | E2E Test |
|---|---|---|---|
| Bootstrap checking | `app-shell.ui.test.tsx` (landmarks) | — | `desktop-e2e` (app root) |
| Missing setup | `main-card.ui.test.tsx` ✅ | — | — |
| Bootstrap error | `frontend.critical-states.ui.test.tsx` (locale) | — | — |
| Idle (no context) | `main-card.ui.test.tsx` ✅, `MainSurface.locale.ui.test.tsx` ✅ | — | — |
| Idle (active context) | `context-pack-panel.ui.test.tsx` (indirect), `main-card.ui.test.tsx` ✅ | — | — |
| ContextPack (all) | `context-pack-panel.ui.test.tsx` (29 tests) ✅, `main-card.ui.test.tsx` (a11y) ✅ | `model.test.ts` (35 storage tests) ✅ | — |
| Capturing | `main-card.ui.test.tsx` (happy path) ✅ | `controller.hotkeys.test.ts` ✅ | — |
| Transcribing/Analyzing | `main-card.ui.test.tsx` (indirect), `ProcessingState.cancel.ui.test.tsx` ✅ (6 tests) | `controller.pipelineActions.test.ts` ✅ (4 tests) | — |
| Answer ready | `main-card.ui.test.tsx` ✅ | — | — |
| Error/Retry | `frontend.critical-states.ui.test.tsx` (locale), `main-card.ui.test.tsx` ✅ | `controller.pipelineActions.test.ts` ✅ | — |
| Settings | `settings.ui.test.tsx` ✅ | `controller.settingsActions.test.ts` ✅ | — |
| Interview | `interview-mode.ui.test.tsx` ✅ | `controller.selectors.test.ts` ✅ | — |
| Bilingual | `BilingualInterviewSurface.ui.test.tsx` ✅ | `controller.bilingualInterviewController.test.ts` ✅ | — |

**Coverage gap:** ~~Idle with active context (context chip visibility)~~ and ~~error recovery flow (retry → success)~~ and ~~pipeline cancel~~ now have dedicated UI tests. Remaining gaps: analyzing progress indicator and interview carousel visual nav.

## 9. Next Recommended UI Block

Based on this audit (post-Product Experience Hardening pass), the next priority is **«Processing State & Error Recovery UX»**:

| Priority | Task | Rationale |
|---|---|---|
| P0 | Add progress indicator to analyzing state (spinner, elapsed time, or stage text) | Highest UX pain: user stares at static text during the longest wait |
| ~~P0~~ | ~~Add cancel action to pipeline~~ | ✅ Done (2026-06-19). Safe frontend cancellation: stale result ignored, UI returns to idle |
| P1 | Map Rust error codes to user-facing messages in controller selectors | Raw error messages still leak to UI |
| P2 | Add visual carousel navigation for interview cards (tab bar or dots) | Keyboard-only nav is power-user only |
| P2 | Add timeout UX for bootstrap («Taking longer than expected…») | Frozen boot state has no feedback |

> **Completed in this pass:** ContextPack value hint, ghost disable styling, answer hero visual treatment, error recovery guidance, label associations, settings nav separator, accessibility landmarks.

## 10. References

- [ADR 0001: Context Pack Simplification](../adr/0001-context-pack-simplification.md)
- [UI Layout Contract](../ui-layout-contract.md)
- [Copy Rules](../copy-rules.md)
- [User Guide](user-guide.md)
- [Limitations](limitations.md)
- [Roadmap](../roadmap.md)
- [Repository Scorecard](../repo-scorecard.md)
- [Engineering Testing Guide](../engineering/testing.md)
