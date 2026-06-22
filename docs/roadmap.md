# Replyline Development Roadmap

> **Date:** 2026-06-22
> **Phase:** beta.5 consolidation, no tag approved
> **Latest existing tag:** `v0.2.0-beta.3`

## Public Roadmap

### Core product

Replyline stays intentionally narrow:

- **WorkConversation**: one structured answer card per capture
- **ContextPack**: one active context primitive
- **Desktop-local user control**: explicit capture, explicit settings, explicit exports

Everything else stays secondary or frozen:

- **Interview Mode**: secondary usage path built on the same primitives
- **Bilingual experimental**: frozen, gated, invisible in default UX
- **Not planned**: meeting assistant, transcript archive, cloud accounts, stealth workflows

## Shipped

| Item | Status |
| --- | --- |
| ContextPack as the central context primitive | ✅ |
| Rich Answer card (`Short / In detail / To continue`) | ✅ |
| Product UX recovery pass (idle hint, error recovery, safer context controls) | ✅ |
| Processing cancel action during transcribing/analyzing | ✅ |
| Public-safe diagnostic snapshot for support/issues | ✅ |
| Runtime evidence/docs package for deterministic quality lanes | ✅ |
| Release manifest, signing-readiness docs, public-footprint guard | ✅ |

## Next

| Item | Status |
| --- | --- |
| beta.5 source-beta decision | ✅ ready for review |
| Live provider proof with synthetic/public-safe evidence discipline | ⚠️ blocked by missing provider keys |
| Signed Windows installer | ⚠️ blocked by certificate acquisition |
| Processing progress/time estimate | ⚠️ still open |
| Windows 10 clean-machine smoke | ⚠️ pending second-machine validation |

## Later

| Item | Notes |
| --- | --- |
| Cross-machine packaged smoke on Windows 10 + 11 | After signed build exists |
| SmartScreen reputation monitoring | After signed build exists |
| Expanded adversarial answer-quality fixtures | Useful after live-provider proof unblocks |
| Additional processing UX instrumentation | After elapsed/stage feedback lands |

## Not Planned

- Cloud account/auth/billing flows
- External DB/vector DB expansion
- Meeting assistant / transcript library UI
- Continuous recording or stealth/proctoring patterns
- Public claims of fully local operation when providers are remote

## Internal Release Focus

### Beta.5 should mean

- A **consolidated source/developer beta** with honest docs
- Stable deterministic gates
- Public-safe support/reporting story
- Clear statement of what is still blocked

### Beta.5 should not mean

- Signed public installer readiness
- Measured live-provider success without actual keys/evidence
- Cross-machine desktop confidence beyond the tested machine

## Current Decision Pressure

The release pressure is now concentrated in four places:

1. Live provider proof
2. Packaging trust
3. Processing feedback UX
4. Clean-machine smoke breadth

Those items are the line between a healthy source beta and a broader public binary beta.

