# Repository Scorecard

> **Date:** 2026-06-22
> **Scope:** Post Rich Answer, live evidence, UX recovery, and support snapshot consolidation
> **Latest tag present:** `v0.2.0-beta.3`
> **Current release target:** beta.5 decision draft only
> **Tracked files:** 465

## Overall: 93/100

`Replyline` is in a strong source-beta state: the product boundary is clear, the
core `capture -> stt -> llm -> card` UX is coherent, contracts are disciplined,
and public-footprint controls are working. The release is still not a full `Go`
because installer trust and live-provider proof remain blocked.

| Direction | Score | Status |
| --- | --- | --- |
| Product clarity | 95 | Core product is explicit: WorkConversation + ContextPack + one card per capture |
| UI / UX | 89 | Rich Answer landed, processing cancel exists, recovery is better, but progress/time estimate is still weak |
| Runtime evidence | 84 | Deterministic evidence is strong, live-provider path still blocked by missing keys |
| Packaging trust | 84 | Honest unsigned posture, release manifest and signing plan exist, certificate still absent |
| Answer quality | 94 | Interview, runtime-answer, product-scenario lanes are green with strong scores |
| Accessibility | 92 | Landmarking, labels, focus flow, reduced-motion, and keyboard surfaces are in good shape |
| Frontend / Rust architecture | 93 | Solid/Tauri boundaries are cleaner; command and UI domains are split sanely |
| Tests / CI | 92 | `verify`, contracts, quality, and footprint lanes are strong; smoke was refreshed for current fixture wording |
| Minimalism | 88 | Product scope stays narrow, but bilingual/frozen paths and docs surface still add weight |

## Why this score

### Strongest areas

- **Product clarity** is stable. The public posture remains honest: source/developer beta, no signed installer claim, no fake local-only claim.
- **Answer quality** is currently the strongest execution area. `pnpm test:quality` passed with:
  - interview quality `30/30`
  - runtime-answer quality `50/51`, average `99.8`
  - product scenarios `97.2`, pass
  - say-now scenarios `19/19`
- **Architecture** is no longer carrying obvious beta debt. Frontend state/model/controller boundaries remain intact, and the Tauri command surface is modularized.
- **Public safety** is materially better. Support/export docs now point to a public-safe diagnostic snapshot instead of ad-hoc manual sharing.

### Biggest constraints

- **No live provider proof on this machine.** As of 2026-06-22, manual provider scenarios remain blocked by missing `DEEPGRAM_API_KEY` and LLM API credentials.
- **No signed Windows installer.** Packaging docs are honest and ready, but Authenticode trust is still unavailable without a certificate.
- **Processing feedback remains incomplete.** Cancel exists, but the user still does not get a real progress estimate or elapsed stage timing during the longest wait.
- **SLO drift is visible even though the lane passes.** `pnpm test:quality` reported non-blocking misses for `llm_request_p50_ms` and `release_to_card_p50_ms`.

## Beta.5 Decision

### Decision: Conditional Go

Reasoning:

- Required deterministic gates are green.
- No known `S0` or `S1` blocker is currently evidenced by the requested validation set.
- Remaining blockers are `S2`-class release-trust/runtime-evidence issues, not core correctness failures.
- Beta.5 should stay a **source/developer beta decision**, not a public installer release decision.

### Why not `Go`

- Signed installer trust is still absent.
- Live provider evidence is still blocked.
- Windows 10 cross-machine smoke is still missing.
- Quality lane exposes non-blocking latency drift that should stay visible in release notes.

### Why not `No-Go`

- `pnpm verify` is green.
- Contracts and public-footprint lanes are green.
- The web smoke failure found on 2026-06-22 was a stale fixture assertion, not a product regression, and it is now aligned with the current rich-answer fixture wording.

## Top Remaining Risks

| # | Risk | Severity | Impact |
| --- | --- | --- | --- |
| 1 | No live provider evidence on the current machine | S2 | Cannot convert runtime claims from deterministic/measured fixtures to real capture proof |
| 2 | No Authenticode certificate / signed installer | S2 | Public binary release remains blocked |
| 3 | Processing state still lacks time/progress estimate | S2 UX | Long waits still feel opaque even with cancel available |
| 4 | Non-blocking SLO misses in quality lane | S2 | Latency posture is acceptable for beta but not yet confidence-inspiring |
| 5 | Windows 10 clean-machine smoke still missing | S3 | Desktop confidence remains single-machine biased |

## Recommended Next Block

1. Unblock live-provider proof with synthetic/public-safe evidence only.
2. Add processing elapsed/stage feedback.
3. Acquire signing certificate or explicitly keep beta.5 source-only.
4. Run clean Windows 10 smoke once packaging trust is unblocked.

## Validation Snapshot

| Command | Result |
| --- | --- |
| `pnpm verify` | PASS |
| `pnpm test:quality` | PASS with non-blocking SLO deviations |
| `pnpm test:e2e:web:smoke` | PASS after fixture assertion refresh |
| `pnpm test:public-footprint` | PASS |
| `pnpm test:doc-links` | pending this docs update |
| `pnpm test:contracts` | pending this docs update |

