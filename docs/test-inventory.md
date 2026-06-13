# Test and Verification Inventory

Audit snapshot: 2026-06-13, worktree after verification-architecture cleanup.

This document describes the current test, policy, report, and release lanes. It
does not change their behavior. `Current profile usage` is transitive: an entry
listed under `smoke` is also used by profiles that call `smoke`.

## Summary

- Frontend: 17 Vitest files under `src/app`, run as one serialized suite.
- Backend: 208 Rust tests in 32 modules, run by `cargo test`.
- Script tests: 9 `scripts/*.test.mjs` files; all now have either a package
  command, a canonical profile owner, or both.
- E2E: 2 Playwright web specs and 1 WebdriverIO/Tauri desktop smoke spec.
- Profiles are nested: `verify:fast` -> `smoke`; `verify:standard` ->
  `verify:fast`; `verify:full` -> `verify:standard`.
- `verify:extended` is an addon lane that runs separately from `verify:full`.

## Inventory

| Command / file / workflow                                                                                              | Type         | Speed             | Deterministic | Requires credentials | Requires Windows | Current profile usage                                | Recommendation | Reason                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------- | ------------- | -------------------- | ---------------- | ---------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                                                                                       | contract     | quick             | yes           | no                   | no               | smoke                                                | keep           | TypeScript compile contract; PowerShell wrapper removes build metadata.                                        |
| `pnpm lint`                                                                                                            | policy       | quick             | yes           | no                   | no               | smoke                                                | keep           | Static source-quality gate.                                                                                    |
| `pnpm build`                                                                                                           | integration  | medium            | yes           | no                   | no               | smoke, CI                                            | keep           | Validates the production frontend bundle.                                                                      |
| `cargo check` / `cargo clippy -D warnings` / `cargo fmt --check`                                                       | policy       | medium            | yes           | no                   | no               | smoke                                                | keep           | Distinct compile, lint, and formatting signals despite shared compilation cost.                                |
| `pnpm test:rust`; `cargo test --manifest-path src-tauri/Cargo.toml`                                                    | unit         | medium            | yes           | no                   | no               | smoke, verify:fast, verify:full, verify:extended, CI | keep           | Runs 208 tests in 32 modules; some platform behavior is Windows-oriented, but most tests are portable.         |
| `src-tauri/src/{card_v3,interview_card_v1,types,settings,privacy}.rs` tests                                            | unit         | medium            | yes           | no                   | no               | smoke                                                | keep           | Largest Rust groups cover schemas, migration, normalization, and privacy.                                      |
| Remaining `src-tauri/src/**` `cfg(test)` modules                                                                       | unit         | medium            | yes           | no                   | no               | smoke                                                | keep           | Covers providers, capture pipeline, reports, logging, bilingual flow, and filesystem behavior.                 |
| `pnpm test:ui`; 17 `src/app/**/*.test.{ts,tsx}` files                                                                  | component    | medium            | yes           | no                   | no               | smoke, verify:fast, verify:full, verify:extended, CI | keep           | Main frontend regression suite; serialized to reduce shared mock/state interference.                           |
| `App.ui.test.tsx`, `frontend.critical-states.ui.test.tsx`, `MainSurface.locale.ui.test.tsx`                            | component    | medium            | yes           | no                   | no               | smoke                                                | split          | Broad and partly overlapping UI/state coverage; split by feature ownership while retaining integration cases.  |
| Controller/model/locale/observability frontend tests                                                                   | unit         | quick             | yes           | no                   | no               | smoke                                                | keep           | Focused deterministic unit and contract coverage.                                                              |
| `pnpm test:ui:coverage`                                                                                                | report       | medium            | yes           | no                   | no               | verify:extended, CI                                  | keep           | Coverage evidence; correctly outside the default fast lane.                                                    |
| `pnpm test:consistency`                                                                                                | policy       | medium            | conditional   | no                   | yes              | smoke                                                | split          | Aggregates unrelated docs/product contracts plus a Windows-only integration test.                              |
| `scripts/check-consistency.mjs`                                                                                        | policy       | quick             | yes           | no                   | no               | smoke                                                | keep           | Cross-file product and documentation invariants.                                                               |
| `scripts/beta-start.test.mjs`                                                                                          | integration  | medium            | conditional   | no                   | yes              | smoke via `test:consistency`                         | split          | Windows process-launch integration test is hidden inside a general consistency lane.                           |
| `scripts/check-ui-shell-contract.mjs` / `pnpm test:ui-shell-contract`                                                  | contract     | quick             | yes           | no                   | no               | smoke; optional direct command                       | keep           | Source-level shell and accessibility contract.                                                                 |
| `scripts/check-model-preset-contract.mjs`                                                                              | contract     | quick             | yes           | no                   | no               | smoke via `test:consistency`                         | keep           | Frontend/backend preset parity.                                                                                |
| `scripts/check-runtime-preflight-contract.mjs` / `pnpm test:runtime-preflight-contract`                                | integration  | medium            | yes           | no                   | yes              | smoke; optional direct command                       | keep           | Runs PowerShell against current and migration fixtures and checks redaction.                                   |
| `scripts/verify-live-runtime-evidence.test.mjs` / `pnpm test:live-runtime-evidence`                                    | contract     | quick             | yes           | no                   | no               | smoke; optional direct command                       | rename         | It validates synthetic evidence fixtures, not live runtime execution.                                          |
| `scripts/check-observability-events-contract.mjs` / `pnpm test:observability-contract`                                 | contract     | quick             | yes           | no                   | no               | smoke; optional direct command                       | keep           | Event-name and source coverage contract.                                                                       |
| `pnpm test:ipc-contract`; `scripts/check-ipc-handler-contract.mjs`                                                     | contract     | quick             | yes           | no                   | no               | smoke                                                | keep           | Rust registration, command category, and frontend DTO parity.                                                  |
| `pnpm test:locale-keys`; `scripts/check-locale-keys.mjs`                                                               | contract     | quick             | yes           | no                   | no               | smoke                                                | keep           | Locale key reachability and hardcoded-copy guard.                                                              |
| `pnpm test:prompt-contract`; `scripts/check-prompt-contract.mjs`                                                       | contract     | medium            | yes           | no                   | no               | smoke                                                | keep           | Validates legacy, Card V3, mapping, repair, and prompt source contracts.                                       |
| `pnpm copy:check`; `scripts/copy-check.mjs`                                                                            | policy       | quick             | yes           | no                   | no               | smoke                                                | keep           | Product/trust wording guard.                                                                                   |
| `pnpm test:interview-quality`; `scripts/test-interview-quality.mjs`                                                    | contract     | medium            | yes           | no                   | no               | smoke, verify:extended                               | keep           | Blocking deterministic golden-dataset quality gate.                                                            |
| `pnpm test:security-lanes`; `scripts/check-security-lanes.mjs`                                                         | security     | medium            | yes           | no                   | no               | verify:fast, verify:full, verify:extended, CI        | keep           | Source privacy checks and lockfile advisory guard.                                                             |
| `pnpm test:public-footprint`                                                                                           | security     | quick             | yes           | no                   | no               | verify:fast, verify:full, verify:extended, CI        | keep           | Combines repository footprint and report secret scans.                                                         |
| `scripts/check-public-footprint.mjs`                                                                                   | policy       | quick             | conditional   | no                   | no               | verify:fast, CI                                      | keep           | Git-index-aware public-source allow/block policy.                                                              |
| `scripts/check-report-secret-leaks.mjs`; `pnpm test:report-secret-leaks`                                               | security     | quick             | yes           | no                   | no               | verify:fast; CI via `test:public-footprint`          | keep           | Report/docs secret and sensitive-content scan.                                                                 |
| `pnpm smoke`                                                                                                           | integration  | slow              | yes           | no                   | yes              | smoke, verify:fast, verify:full, verify:extended, CI | keep           | Canonical compile, unit, component, policy, and contract baseline.                                             |
| `pnpm verify` / `pnpm verify:fast`                                                                                     | release      | slow              | yes           | no                   | yes              | verify:fast, CI                                      | merge          | `verify` is a pure alias; keep one documented canonical name or explicitly retain the compatibility alias.     |
| `pnpm verify:full`                                                                                                     | release      | slow              | conditional   | no                   | yes              | verify:full, verify:extended, CI                     | keep           | Adds freeze, dependency/security tooling, and interview report.                                                |
| `pnpm verify:extended`                                                                                                 | release      | slow              | conditional   | no                   | yes              | verify:extended, CI                                  | keep           | Adds coverage, fixtures, runtime quality, and product scenarios.                                               |
| `pnpm test:quick`                                                                                                      | integration  | medium            | yes           | no                   | yes              | optional                                             | merge          | Subset of `smoke` with no unique checks; useful only as a documented developer shortcut.                       |
| `pnpm rust:deny` / `pnpm rust:audit` / `pnpm rust:deps`                                                                | security     | external          | conditional   | no                   | yes              | verify:full, verify:extended, CI                     | keep           | Supply-chain checks depend on installed cargo tools and advisory data.                                         |
| `pnpm audit:npm`                                                                                                       | security     | external          | conditional   | no                   | no               | verify:full, verify:extended, CI                     | keep           | npm advisory gate depends on registry data.                                                                    |
| `pnpm deps:review`                                                                                                     | report       | external          | conditional   | no                   | no               | optional                                             | keep           | Maintenance report, correctly non-blocking.                                                                    |
| `pnpm scripts:lifecycle`; `scripts/check-script-lifecycle.mjs`                                                         | policy       | quick             | yes           | no                   | no               | optional                                             | keep           | Ensures every package script has one lifecycle class.                                                          |
| `pnpm test:doc-links`; `scripts/check-doc-links.mjs`                                                                   | policy       | quick             | yes           | no                   | no               | optional                                             | keep           | Markdown link integrity; appropriate docs-only gate.                                                           |
| `pnpm release:freeze:check[:strict]`; `scripts/check-release-freeze.mjs`                                               | release      | quick             | conditional   | no                   | no               | verify:full, verify:extended, CI, optional           | keep           | Diff-sensitive guard; strict and advisory modes have distinct semantics.                                       |
| `scripts/check-release-freeze.test.mjs`; `pnpm test:release-freeze-guard`                                              | unit         | medium            | yes           | no                   | no               | optional                                             | keep           | Tests guard behavior in temporary Git repositories, but is not in a profile.                                   |
| `pnpm test:fixtures`; `scripts/check-fixtures.mjs`                                                                     | contract     | quick             | yes           | no                   | no               | verify:extended                                      | merge          | Corpus shape checks overlap the stronger prompt-contract fixture validation.                                   |
| `pnpm test:fixture-gate`; `scripts/run-fixture-gate.mjs`                                                               | integration  | medium            | yes           | no                   | no               | optional                                             | keep           | Executes the Rust `fixture_gate` binary; distinct from JSON shape checks.                                      |
| `pnpm test:say-now-scenarios`; `scripts/check-say-now-scenarios.mjs`                                                   | contract     | quick             | yes           | no                   | no               | verify:extended and again via `test:runtime-quality` | merge          | Same command runs twice inside `verify:extended`.                                                              |
| `pnpm test:runtime-answer-quality`; `scripts/evaluate-runtime-answer-quality.mjs`                                      | report       | quick             | yes           | no                   | no               | verify:extended via `test:runtime-quality`           | rename         | Produces dated reports while enforcing thresholds; name should expose gate plus report side effect.            |
| `scripts/evaluate-runtime-answer-quality.test.mjs`; `pnpm test:runtime-answer-quality:unit`                            | unit         | quick             | yes           | no                   | no               | optional                                             | keep           | Focused evaluator unit coverage, currently outside profiles.                                                   |
| `pnpm test:latency-parser`; `scripts/parse-pipeline-latency.test.mjs`                                                  | unit         | quick             | yes           | no                   | no               | verify:extended via `test:runtime-quality`           | keep           | Pure parser/aggregation test.                                                                                  |
| `pnpm parse:latency`; `scripts/parse-pipeline-latency.mjs`                                                             | report       | quick             | conditional   | no                   | no               | optional                                             | rename         | Parses local or fixture logs and writes report artifacts; not a test.                                          |
| `pnpm check:slo` / `pnpm test:slo-budget`; `scripts/check-slo-budget.mjs`                                              | runtime      | quick             | conditional   | no                   | no               | verify:extended via `test:runtime-quality`           | merge          | Pure alias duplication; result depends on available soak/latency artifacts.                                    |
| `pnpm test:runtime-quality`                                                                                            | runtime      | medium            | conditional   | no                   | no               | verify:extended                                      | keep           | Composite deterministic/synthetic runtime-quality gate.                                                        |
| `pnpm test:product-scenarios`; `scripts/evaluate-product-scenarios.mjs` plus its test                                  | contract     | medium            | yes           | no                   | no               | verify:extended, optional                            | split          | Gate, report generation, and evaluator unit test are bundled in one command.                                   |
| `scripts/evaluate-product-scenarios.test.mjs`                                                                          | unit         | quick             | yes           | no                   | no               | verify:extended via composite                        | keep           | Evaluator and negative-regression unit coverage.                                                               |
| `pnpm report:product-quality`                                                                                          | report       | quick             | yes           | no                   | no               | optional                                             | keep           | Explicit report-only mode is clearer than the composite test command.                                          |
| `pnpm report:interview-quality`                                                                                        | report       | medium            | yes           | no                   | no               | verify:full, verify:extended                         | merge          | Re-runs the same golden evaluator already run by blocking `test:interview-quality`; only presentation differs. |
| `pnpm report:runtime-quality`; `scripts/report-runtime-quality-summary.mjs`                                            | report       | medium            | conditional   | no                   | no               | optional                                             | keep           | Orchestrates five checks and writes dated summaries; report command can fail.                                  |
| `pnpm report:card-quality`; `scripts/runtime-card-quality-report.mjs`                                                  | report       | machine-dependent | conditional   | no                   | yes              | optional                                             | keep           | Reads the local app log; correctly outside automated profiles.                                                 |
| `report:sonar-residual`, `report:live-evidence-pack`, `report:internal-beta-seal`, `report:release-readiness[:strict]` | report       | medium            | conditional   | no                   | no               | optional                                             | keep           | Evidence aggregation/readiness reports, not independent tests.                                                 |
| `scripts/report-release-readiness.test.mjs`; `pnpm test:report-release-readiness`                                     | unit         | medium            | yes           | no                   | no               | smoke via `test:unit`                                | keep           | Release-readiness report behavior is now covered through an explicit package lane in the unit profile.         |
| `scripts/beta-doctor.test.mjs`; `pnpm test:beta-doctor`                                                               | integration  | medium            | conditional   | no                   | yes              | smoke via `test:contracts:beta`                      | keep           | Windows beta-doctor path now has an explicit package test entrypoint and contract owner.                       |
| `scripts/beta-smoke-report.test.mjs`; `pnpm test:beta-smoke-report`                                                   | unit         | quick             | yes           | no                   | no               | smoke via `test:unit`                                | keep           | Sanitization/report rendering test now runs through a package lane inside the unit profile.                    |
| `beta:doctor`, `beta:smoke-report`, `beta:start`, `beta:preflight`, `beta:seal`                                        | release      | machine-dependent | conditional   | no                   | yes              | optional                                             | keep           | Windows beta operator workflows; several produce reports rather than test signals.                             |
| Runtime probes, benches, soak, evidence bundle, handoff/template/scaffold commands                                     | runtime      | machine-dependent | no            | yes                  | yes              | optional                                             | keep           | Local hardware/provider evidence; must not be represented as deterministic CI validation.                      |
| `pnpm test:e2e:web` / `test:e2e:web:required`; `playwright.config.ts`                                                  | e2e          | medium            | conditional   | no                   | no               | CI, optional                                         | keep           | Credential-free mocked platform flow; optional wrapper may return `SKIP`, required lane cannot.                |
| `tests/e2e/web/smoke.spec.ts`                                                                                          | e2e          | medium            | yes           | no                   | no               | CI, optional                                         | keep           | Functional happy path with mocked IPC/platform.                                                                |
| `tests/e2e/web/visual.spec.ts` and Windows snapshot                                                                    | e2e          | medium            | conditional   | no                   | yes              | CI, optional                                         | split          | Pixel snapshot is Windows-specific while Playwright config itself is cross-platform.                           |
| `pnpm test:e2e:desktop[:required]`; WebdriverIO/Tauri files                                                            | e2e          | machine-dependent | conditional   | no                   | yes              | optional, CI                                         | keep           | Requires built app, `TAURI_APP_PATH`, driver, and optional packages.                                           |
| `pnpm test:perf:k6` / `test:optional:perf:k6`                                                                          | experimental | external          | conditional   | no                   | no               | optional, CI                                         | archive        | `tests/perf/k6-smoke.js` is absent, so the optional wrapper always reports `SKIP`.                             |
| `pnpm test:sec:zap` / `test:optional:sec:zap`                                                                          | experimental | external          | conditional   | no                   | yes              | optional, CI                                         | keep           | Real external tool lane; wrapper skips when tooling is absent.                                                 |
| `pnpm test:ux:lighthouse` / optional alias                                                                             | experimental | external          | conditional   | no                   | no               | optional, CI                                         | keep           | Browser/tool-dependent UX report.                                                                              |
| `pnpm test:experimental`                                                                                               | experimental | external          | conditional   | no                   | yes              | CI                                                   | keep           | Explicit non-blocking aggregate, but includes the permanently skipped k6 lane.                                 |
| `.github/workflows/ci.yml`                                                                                             | release      | slow              | conditional   | no                   | yes              | CI                                                   | keep           | Blocking Windows `verify:fast`, web E2E, and strict freeze; separate Ubuntu footprint precheck.                |
| `.github/workflows/extended-quality.yml`                                                                               | experimental | slow              | conditional   | no                   | yes              | CI                                                   | split          | Non-blocking signal, but repeats `verify:full` through `verify:extended` and repeats web E2E.                  |
| `.github/workflows/release-on-tag.yml`                                                                                 | release      | slow              | conditional   | yes                  | yes              | CI                                                   | keep           | Re-runs `verify:fast`, builds, optionally signs, and publishes only signed artifacts.                          |
| `.github/workflows/windows-packaging-manual.yml`                                                                       | release      | slow              | conditional   | no                   | yes              | CI                                                   | split          | Builds without any verification gate, unlike tag packaging.                                                    |
| Pages, labeler, and dependency-PR workflows                                                                            | policy       | external          | conditional   | yes                  | no               | CI                                                   | keep           | Repository automation, not product test coverage.                                                              |
| `docs/verification-lanes.md`, `docs/testing-stack-setup.md`, `docs/script-lifecycle-matrix.md`                         | policy       | quick             | conditional   | no                   | no               | optional                                             | keep           | Canonical profile and lifecycle documentation; consistency must track package scripts and workflows.           |

## Duplicate Checks

1. `verify:full` still runs `test:interview-quality` through `smoke`, then runs
   `report:interview-quality:strict` for evidence output. The repeated dataset
   evaluation is intentional but remains the main heavy duplicate inside release
   verification.
2. `test:fixtures` still overlaps partly with `test:prompt-contract`, but its
   role is now explicitly limited to addon fixture-shape coverage in
   `verify:extended`.
3. `verify`/`verify:fast`, `check:slo`/`test:slo-budget`, and the
   `test:optional:*` commands are compatibility or readability aliases rather
   than distinct checks.
4. `check-public-footprint.mjs` still runs once in the Ubuntu pre-job and again
   inside Windows `verify:fast`. This remains deliberate cross-platform defense
   rather than accidental duplication.

## Fixtures and Schema Versions

- `tests/fixtures/runtime/settings-v7-legacy.json`,
  `settings-v8-legacy.json`, and `settings-v9-invalid-retention.json` are old
  schema versions, but they are intentional migration/negative fixtures and are
  actively used by Rust tests and the runtime-preflight contract. Keep them.
- `settings-vcurrent.json` and `settings-missing-optional.json` are schema v10
  and actively used by the runtime-preflight contract.
- The naming in Rust migration tests is stale in places (`v10` data stored in a
  variable named `v8`, and v8 data named `v7`). Rename test locals separately;
  the fixture files themselves are not stale.
- `golden-dataset-v1.json` and report schemas such as
  `replyline.beta-smoke-report.v1` are current by reference, but there is no
  central schema-version registry or freshness check. Treat future version
  bumps as an explicit migration task.
- `tests/e2e/web/visual.spec.ts-snapshots/home-smoke-chromium-win32.png` is
  intentionally platform-specific and should not be treated as portable.

## Reports That Look Like Tests

- `test:runtime-answer-quality` writes dated quality reports.
- `test:product-scenarios` both writes reports and runs evaluator unit tests.
- `test:runtime-quality` aggregates report-producing commands.
- `check:slo` evaluates whatever runtime artifacts are present and can fall
  back to fixture/probe mode.
- `beta:smoke-report`, `report:runtime-quality`, `report:release-readiness`, and
  `beta:seal` can fail and therefore behave like gates, but their primary output
  is evidence/reporting.

Recommended naming convention for a later scripts change: use `test:*` for
deterministic assertions with no durable report side effect, `check:*` for
blocking policy/threshold gates, and `report:*` for evidence generation.

## Optional and Experimental Lanes

- Web E2E is optional locally but blocking in `ci.yml`.
- Desktop E2E is machine-dependent and correctly has optional and required
  variants.
- ZAP and Lighthouse are real optional tool lanes.
- k6 is currently a placeholder lane because its checked test file is absent;
  it cannot produce a test signal until the file is restored or the script is
  removed.
- Optional wrappers exit successfully on `SKIP`.
- `.github/workflows/extended-quality.yml` now records `PASS`, `PASS_WITH_SKIP`,
  and `FAIL_NON_BLOCKING`, plus the exact optional tools that were skipped.
- `verify:extended` still requires `pnpm install --include=optional` when the
  optional E2E or experimental tooling is expected to run for real.

## CI Duplication and Gaps

- Main CI and tag release both run `verify:fast`; this is appropriate for tag
  immutability but expensive.
- Extended Quality no longer re-runs `verify:full` through `verify:extended`,
  and it no longer hides optional-tool skips behind a generic pass result.
- Manual Windows packaging now runs `pnpm verify:fast` before `pnpm tauri build`.
- Extended Quality still surfaces failed lanes as a failed scheduled/manual run;
  that is acceptable because it is not a PR-blocking workflow, and the summary
  artifact now states that the failure is non-blocking.
- CI installs `cargo-deny` and `cargo-audit` before `verify:fast`, although that
  profile does not call them. They are needed only by full/dependency lanes.
- No `scripts/*.test.mjs` file is orphaned anymore; each one now has an
  explicit package command or a canonical profile owner.

## Recommended Next Block

Finish the remaining cleanup without changing product behavior:

1. Decide whether the interview-quality strict report should remain a separate
   second pass inside `verify:full`, or whether evidence can be generated from
   the blocking test run.
2. Separate report generation from evaluator gates where a `test:*` command still
   writes durable artifacts.
3. Remove or restore the placeholder k6 lane.
4. Revisit whether CI really needs cargo audit tooling preinstalled on the fast lane.
