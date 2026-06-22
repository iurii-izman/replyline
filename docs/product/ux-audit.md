# Replyline UX Audit

> **Date:** 2026-06-22
> **Scope:** Post Rich Answer, processing cancel, support snapshot
> **Baseline:** latest tagged release is `v0.2.0-beta.3`

## Aggregate UX Score: 89/100

The product feels substantially more intentional than the beta.3 baseline:

- the answer surface is clearer
- the idle state explains the value of context
- recovery paths are less opaque
- processing is safer because the user can cancel
- support/reporting now has a public-safe path

The remaining UX debt is concentrated, not broad: long-wait feedback, bootstrap timeout
feedback, and a few advanced discoverability gaps.

## Strongest screens

| Screen | Score | Why |
| --- | --- | --- |
| Missing setup | 4.8/5 | Clear checklist, direct CTA to first missing section |
| Idle with active context | 4.8/5 | Context is visible without overpowering the main action |
| Context Workspace | 4.8/5 | CRUD flow is clear and bounded |
| Answer ready | 5.0/5 | Rich Answer structure is easy to scan and act on |
| Settings advanced/reports | 4.5/5 | Safe diagnostic snapshot gives users a low-risk support action |

## Weakest screens

| Screen | Score | Why |
| --- | --- | --- |
| Bootstrap checking | 3.3/5 | Still static and timeout-poor |
| Transcribing / analyzing | 4.0/5 | Cancel exists, but no elapsed time or concrete progress estimate |
| Interview report/export | 3.6/5 | Export sensitivity is still not visually rich enough |

## State Notes

### Idle

- Clearer than before because the product explains why ContextPack matters before capture.
- Still benefits from screenshots and a more explicit “best results with active context” cue.

### Processing

- Improvement: user can cancel the pipeline during `transcribing` and `analyzing`.
- Improvement: long-running state shows stronger “taking longer than expected” feedback.
- Remaining gap: no elapsed timer, no stage completion model, no confidence estimate.

### Answer ready

- Rich Answer is now the right visual center of gravity.
- The card is easier to skim because `Short / In detail / To continue` maps to real user intent.
- Copy/share actions are now credible enough for beta, though copy feedback can still be more visible.

### Settings and support

- Advanced/Reports now contains a public-safe support action: `Скопировать diagnostic snapshot`.
- This meaningfully reduces the chance that users paste raw transcript/context/provider data into issues.
- Trust improved here even though some lower-level diagnostics remain developer-oriented.

## UX Risks That Still Matter

1. **No real progress estimate during the longest wait.**
2. **Bootstrap has no strong timeout recovery UX.**
3. **Interview export sensitivity is still easy to misunderstand.**
4. **Some advanced settings still assume technical literacy.**

## UX Decision for beta.5

### Status: acceptable for Conditional Go

Why:

- No obvious P0 interaction dead-end is left in the core path.
- Rich Answer and recovery improvements are real, not cosmetic.
- Processing cancel closes an important “frozen app” feeling gap.
- Support snapshot reduces public-sharing risk.

Why not full `Go`:

- processing still lacks strong progress semantics
- bootstrap timeout handling is still thin
- packaged/clean-machine UX is not yet broadly proven

## Next UX Block

1. Add elapsed/stage feedback to processing.
2. Add bootstrap timeout escalation with a recovery CTA.
3. Make interview export sensitivity more explicit before file write.
4. Capture real screenshot states from the validated build surface.

