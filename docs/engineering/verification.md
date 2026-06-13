# Engineering Verification Guide

Canonical verification reference for local development, handoff, release, and optional E2E lanes.

Green in one lane does not mean green everywhere. `pnpm smoke`, `pnpm verify:fast`, runtime probes, and E2E lanes prove different things and must not be used as substitutes for each other.

## Verify lanes

| Lane | Command | When to run | What it proves | What it does not prove |
| --- | --- | --- | --- | --- |
| Quick local loop | `pnpm test:quick` | Small local iteration before commit | Fast type/lint/UI feedback | Full compile/test baseline, runtime readiness |
| Smoke baseline | `pnpm smoke` | Any behavior change before broader verification | Compile/build + deterministic unit/contract baseline | Security/public footprint, release readiness, live runtime |
| Default PR/local gate | `pnpm verify:fast` | Every code change and default local handoff gate | `smoke` plus security/public-footprint lanes | Release-only, addon, or live-provider coverage |
| Pre-handoff local gate | `pnpm verify:standard` | Substantial local handoff | `verify:fast` plus lifecycle and advisory freeze checks | Dependency audits, strict release/runtime/product gates |
| Release gate | `pnpm verify:full` | Release decisions, dependency changes, or final readiness pass | `verify:standard` plus strict freeze, dependency/security, runtime/product quality, strict reports | Optional addon lanes, manual QA, live provider proof |
| Addon/nightly lane | `pnpm verify:extended` | After `verify:full` when you need broader confidence | Coverage, fixtures, optional E2E, experimental addon lanes | It does not replace `verify:full` |
| Operator release lane | `pnpm verify:release-local` | Local packaging / release-operator pass | Local release packaging posture | Product/runtime quality by itself |

## When to run which lane

### `pnpm verify:fast`

Run when:

- any code behavior changed
- you need the required PR/local baseline
- docs/scripts touched validation-sensitive paths and you want the standard repo baseline

### `pnpm verify:full`

Run when:

- preparing a release or final local handoff
- `package.json` or `pnpm-lock.yaml` changed
- Rust dependencies or release-sensitive contracts changed
- you need strict freeze/dependency/runtime/product quality gates, not just baseline confidence

### `pnpm verify:extended`

Run when:

- `verify:full` is already green
- you want addon confidence from coverage, fixtures, optional E2E, or experimental lanes
- CI/nightly/operator flow explicitly asks for the extended lane

Do not treat `verify:extended` as a replacement for `verify:full`.

### `pnpm verify:release-local`

Run when:

- validating local packaging or release-operator workflow
- checking release execution posture on a workstation

Do not use it as a shorthand for product correctness or runtime proof.

## Desktop and web E2E

| Lane | Command | Use |
| --- | --- | --- |
| Web smoke E2E | `pnpm test:e2e:web` or `pnpm test:e2e:web:smoke` | Credential-free happy-path regression for the web shell |
| Web visual E2E | `pnpm test:e2e:web:visual` | Optional screenshot drift lane when visual evidence matters |
| Desktop smoke E2E | `pnpm test:e2e:desktop` | Optional desktop artifact/session smoke; may `SKIP` outside prepared environments |
| Desktop required E2E | `pnpm test:e2e:desktop:required` | Release/operator lane when non-skip desktop artifact validation is mandatory |

Use E2E when:

- UI flow changes affect launch, navigation, or shell behavior
- release/operator flow requires explicit desktop artifact confirmation
- visual drift or browser-only regression risk is material

Do not infer native runtime/provider correctness from mocked E2E results.

## Boundaries

- `pnpm smoke` and `pnpm verify:fast` are not runtime proof.
- `pnpm verify:full` is not live-provider proof.
- `pnpm verify:extended` is addon coverage, not the main release gate.
- Desktop and web E2E validate launch and UI flow, not provider latency or real STT/LLM behavior.

## See also

- [runtime.md](runtime.md)
- [manual-qa.md](manual-qa.md)
- [../test-quality-fixtures.md](../test-quality-fixtures.md)
