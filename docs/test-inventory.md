# Test Inventory

Status inventory for the verification surface. Canonical guidance lives in [engineering/testing.md](engineering/testing.md); [engineering/verification.md](engineering/verification.md) remains only as a compatibility pointer.

## Status legend

- `public canonical` - main profile that contributors should run and docs should present as a primary entry point
- `internal building block` - supported command used to compose a canonical profile or targeted workflow, but not advertised as the main profile
- `targeted` - focused lane for a specific scope such as docs, contracts, E2E, reports, or probes
- `operator` - workstation- or release-operations-oriented lane
- `deprecated alias` - compatibility wrapper; do not treat it as equal to a canonical profile

## Inventory

| Command | Status | Notes |
| --- | --- | --- |
| `pnpm test:quick` | `public canonical` | Fast local loop |
| `pnpm verify` | `public canonical` | Default validation profile; alias to `verify:fast` |
| `pnpm verify:full` | `public canonical` | Release-quality profile; runs canonical `test:quality` exactly once |
| `pnpm verify:extended` | `public canonical` | Addon lane after required baseline; coverage + fixture/E2E/experimental only, without rerunning runtime/product/interview quality |
| `pnpm test:quality` | `public canonical` | Canonical deterministic quality gate: interview + runtime-answer + product-scenarios + say-now + SLO |
| `pnpm check:runtime-answer-quality` | `public canonical` | Canonical threshold gate for deterministic runtime-answer assertions; report artifact lives in `report:runtime-answer-quality` |
| `pnpm check:product-scenarios` | `public canonical` | Canonical threshold gate for deterministic product-scenario assertions; report artifact lives in `report:product-quality` |
| `pnpm check:say-now-scenarios` | `public canonical` | Canonical threshold gate for deterministic `say_now` scenario assertions |
| `pnpm check:slo` | `public canonical` | Canonical SLO threshold gate |
| `pnpm test:unit` | `internal building block` | Deterministic unit/component/script-unit baseline |
| `pnpm test:contracts` | `internal building block` | Deterministic docs/copy/prompt/ipc/locale baseline |
| `pnpm smoke` | `internal building block` | Compile-and-test baseline under `verify:fast` |
| `pnpm verify:fast` | `internal building block` | Internal implementation behind `verify` |
| `pnpm verify:standard` | `internal building block` | Internal pre-handoff composition behind `verify:full` |
| `pnpm test:consistency` | `targeted` | Policy/content consistency guard |
| `pnpm test:doc-links` | `targeted` | Markdown link integrity |
| `pnpm scripts:lifecycle` | `targeted` | Script lifecycle classification validation |
| `pnpm test:e2e:web:smoke` | `targeted` | Web smoke E2E lane |
| `pnpm test:e2e:desktop` | `operator` | Optional workstation-dependent desktop lane |
| `pnpm verify:release-local` | `operator` | Local release-oriented composition |
| `pnpm test:e2e:web` | `deprecated alias` | Compatibility alias to `test:e2e:web:smoke` |
| `pnpm verify:fast` via `pnpm verify` | `deprecated alias` | Alias relationship only; canonical public name is `verify` |

Compatibility aliases are intentionally narrow and must not be documented as equivalent public profiles.
