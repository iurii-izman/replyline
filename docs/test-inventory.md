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
| `pnpm verify:extended` | `public canonical` | Addon lane after required baseline; coverage + fixture/E2E + targeted experimental ZAP/Lighthouse only, without rerunning runtime/product/interview quality |
| `.github/workflows/dependency-checks.yml` | `operator` | Scheduled/manual CI lane for `rust:deps` and `audit:npm`; keeps fast PR CI free of dependency-tool bootstrap cost |
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
| `pnpm test:optional:e2e:web` | `targeted` | Readable extended-lane bundle for web smoke + visual E2E |
| `pnpm test:e2e:desktop` | `operator` | Optional workstation-dependent desktop lane |
| `pnpm verify:release-local` | `operator` | Local release-oriented composition |
| `pnpm test:e2e:web` | `deprecated alias` | Compatibility alias to `test:e2e:web:smoke` |
| `pnpm verify:fast` via `pnpm verify` | `deprecated alias` | Alias relationship only; canonical public name is `verify` |

Compatibility aliases are intentionally narrow and must not be documented as equivalent public profiles.

Workflow note: `PASS_WITH_SKIP` is valid only for optional addon tooling in non-blocking workflows such as `extended-quality.yml`; it must not be used to present skipped blocking validation as a pass.

## Scratch UI Coverage Matrix

Temporary matrix for pruning duplicate frontend assertions while preserving critical coverage.

| Flow / state | Covered by file | Duplicate coverage? | Decision |
| --- | --- | --- | --- |
| App shell root + header chrome | `src/app/app-shell.ui.test.tsx` | Partial overlap with panel-specific tests | `keep` |
| Header -> Settings navigation + breadcrumb section label | `src/app/app-shell.ui.test.tsx` | Some overlap with settings helper path | `keep` as single full-app navigation proof |
| Hide-to-tray / on-top shell wiring | `src/app/app-shell.ui.test.tsx` | No meaningful duplicate | `keep` |
| Idle main surface without action row | `src/app/MainSurface.locale.ui.test.tsx`, `src/app/main-card.ui.test.tsx`, `src/app/app-shell.ui.test.tsx` | Yes | `keep` only in `MainSurface.locale.ui.test.tsx`; trim shell/integration duplicates |
| Setup required main state | `src/app/main-card.ui.test.tsx`, `src/app/settings.ui.test.tsx`, `src/app/MainSurface.locale.ui.test.tsx`, `src/app/app-shell.ui.test.tsx` | Yes | `keep` component contract + one integration path; trim extra startup/setup repeats |
| Work happy path: hotkey press/release -> ready -> copy/retry/clear | `src/app/main-card.ui.test.tsx` | Minor overlap with controller tests only | `keep` |
| Error recovery with hidden answer actions | `src/app/main-card.ui.test.tsx`, `src/app/MainSurface.locale.ui.test.tsx`, `src/app/interview-mode.ui.test.tsx` | Partial | `keep` one work-card integration + interview retry recovery |
| Work/interview layout switching | `src/app/main-card.ui.test.tsx` | No equivalent elsewhere | `keep` |
| Settings form submit path | `src/app/settings.ui.test.tsx` | Repeated section-open assertions around it | `merge` into one submit-focused test |
| Settings reports warning `full_local` | `src/app/frontend.critical-states.ui.test.tsx`, `src/app/settings.ui.test.tsx` | Low | `keep` warning text contract in isolated test; keep save flow in settings test |
| Repeated settings section opening (`LLM`, `Reports`, `Hotkey`) | `src/app/settings.ui.test.tsx`, helpers in `src/app/test-utils/appUi.tsx` | Yes | `delete` redundant content checks when dedicated section tests already exist |
| Candidate Pack empty / preparing / prepared / saved labels | `src/app/frontend.critical-states.ui.test.tsx`, `src/app/candidate-pack-studio.ui.test.tsx` | Yes | `move` to dedicated studio integration file |
| Candidate Pack keyboard reachability | `src/app/frontend.critical-states.ui.test.tsx` | No direct duplicate, but low-risk relative to current goal | `delete` for slimmer UI matrix |
| No stealth / cheating copy in visible UI | `src/app/app-shell.ui.test.tsx` | No duplicate | `keep` |
