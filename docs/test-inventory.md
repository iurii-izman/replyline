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
| `pnpm verify:full` | `public canonical` | Release-quality profile |
| `pnpm verify:extended` | `public canonical` | Addon lane after required baseline; coverage + fixture/E2E/experimental only |
| `pnpm test:quality` | `public canonical` | Canonical deterministic quality gate used by release-oriented profiles |
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
| `pnpm check:slo` | `deprecated alias` | Equivalent threshold lane alongside `test:slo-budget` |
| `pnpm test:runtime-quality` | `deprecated alias` | Compatibility alias to `test:quality`; do not use as a second quality pass |

Compatibility aliases are intentionally preserved for transition safety, but they are not canonical profile names and must not be documented as equivalent public profiles.
