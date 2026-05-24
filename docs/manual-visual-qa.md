# Manual Visual QA - Warm Precision AI Cockpit

This checklist locks the visual direction after the warm precision redesign cycle without changing runtime behavior.

## How to Use

- Execute checks in RU-first UI baseline.
- For each screen, capture one screenshot artifact and mark `Pass` or `Fail`.
- Record concrete mismatch notes (token drift, contrast issue, spacing, wrong control style).
- Do not block on optional animations if `prefers-reduced-motion` is active.

## Checklist

| Screen                    | Expected visual result                                                                                                                                        | Pass/Fail | Notes |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----- |
| Main setup missing        | Warm canvas + clear setup guidance; missing steps visually distinct; primary CTA styled with Replyline button tokens; no raw `missing/ready/optional` text.   |           |       |
| Main idle ready           | Stable two-column cockpit (`main + aside`), readable contrast, calm accent usage, sticky actions compact and aligned.                                         |           |       |
| Main recording            | Recording state clearly visible with warning/recording semantics; no overpowering full-screen accent wash; controls remain readable and active.               |           |       |
| Main analyzing            | Analyzing state uses restrained blue semantic state; hierarchy preserved; no noisy dashboard clutter.                                                         |           |       |
| Main answer ready         | Ready/copy state clearly distinguished; hero/result area uses tokenized elevation; primary/secondary actions visually consistent.                             |           |       |
| Settings overview         | Section nav and active section are obvious; no giant empty panels; no admin-panel look.                                                                       |           |       |
| Settings speech           | Speech fields and status labels readable in RU-first flow; tokenized controls and focus ring visible.                                                         |           |       |
| Settings LLM              | Key/provider controls use product styles (not browser-default); warning/danger copy remains legible and calm.                                                 |           |       |
| Settings hotkey           | Hotkey capture state is clear; no fake glass/random shadows; disabled style only where truly blocked.                                                         |           |       |
| Settings reports          | Report/export section keeps visual hierarchy and spacing; no excessive bordered-card fragmentation.                                                           |           |       |
| Settings reports IA       | Everyday report/privacy controls are visually separated from diagnostics/ops (`debugTrace*`), and `full_local` warning is clear.                              |           |       |
| Candidate Studio empty    | 3-step workflow visible (`Исходные данные -> Подготовка -> Профиль`), concise empty guidance, no giant blank preview slab.                                    |           |       |
| Candidate Studio states   | Status banner distinguishes empty/draft/prepared/saved/processing states with readable chips and no ambiguity around local/cloud boundary.                      |           |       |
| Candidate Studio prepared | Quality summary/facts/keywords/warnings are readable and grouped; saved profile section remains styled and structured.                                        |           |       |
| Error/recovery            | Error and recovery states are clearly distinguished with semantic danger/safe affordances; actions remain discoverable and not visually disabled by accident. |           |       |

## Visual Anti-Pattern Guard (manual)

- Excessive beige / beige mush.
- Low-contrast gray text.
- Random shadows.
- Fake glass effects.
- Too many bordered cards.
- Giant empty panels.
- Disabled controls everywhere.
- Unstyled browser controls in critical flows.
- Unicode/emoji icons in critical UI.
- Overuse of accent color.
- Dashboard clutter.
- Generic admin-panel look.

## Stop Criteria (Cycle Lock)

- Target visual score for this cycle: `80-88`.
- Stop CSS polish when runtime behavior/latency/answer quality are not yet validated.
- After this visual pass, next work direction is real beta scenario quality, not indefinite visual tuning.
