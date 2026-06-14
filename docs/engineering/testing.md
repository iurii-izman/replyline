# Engineering Testing Guide

Detailed engineering source of truth for verification lane composition, fixture quality gates, E2E scope, lifecycle policy, and CI alignment. For the small public profile set contributors should memorize, use [verification.md](verification.md).

Green in one lane does not mean green everywhere. `pnpm smoke`, `pnpm verify:*`, deterministic fixture gates, runtime-quality lanes, and E2E lanes prove different things and must not be used as substitutes for each other.

## Public / canonical profiles

| Profile | Command | Primary use | Includes | Does not prove |
| --- | --- | --- | --- | --- |
| Quick local loop | `pnpm test:quick` | Fast local iteration | `typecheck`, `lint`, `test:ui` | Full compile baseline, Rust checks, contracts, runtime, release readiness |
| Default verification | `pnpm verify` | Required baseline for normal code changes | Alias to `verify:fast` | Release-only strict gates, addon lanes, manual QA, live-provider proof |
| Release-quality gate | `pnpm verify:full` | Release decisions and dependency-sensitive handoff | `verify:standard` + strict freeze/dependency/runtime/report gates | Optional addon lanes, manual QA, live-provider proof |
| Addon/nightly/operator lane | `pnpm verify:extended` | Extra confidence after baseline is already green | coverage, fixture hygiene, runtime/product scenario reruns, optional E2E, experimental lanes | It does not replace `verify:full` |

Ordinary developer flow is `pnpm test:quick`, then `pnpm verify`, and before release-sensitive handoff `pnpm verify:full`.

## Internal building blocks

| Profile | Command | Primary use | Includes | Does not prove |
| --- | --- | --- | --- | --- |
| Deterministic unit baseline | `pnpm test:unit` | Focused unit/component/script-unit regression | Rust tests, UI tests, parser/evaluator/report unit lanes | Build, contract lanes, security, runtime, release readiness |
| Deterministic contract baseline | `pnpm test:contracts` | Prompt/docs/IPC/locale/policy drift detection | `test:consistency`, `test:doc-links`, IPC, locale, prompt, copy lanes | Runtime quality, product usefulness, live-provider behavior |
| Compile-and-test baseline | `pnpm smoke` | Any behavior change before broader verification | build/compile checks + `test:unit` + `test:contracts` + `test:interview-quality` | Public-footprint/security lane, freeze, dependency audits, runtime/live proof |
| Default PR/local gate | `pnpm verify:fast` | Required baseline for code changes and default PR gate | `smoke` + `test:security-lanes` + `test:public-footprint` | Release-only strict gates, addon lanes, manual QA, live-provider proof |
| Local pre-handoff gate | `pnpm verify:standard` | Substantial local handoff | `verify:fast` + `scripts:lifecycle` + advisory `release:freeze:check` | Strict freeze, dependency audits, runtime/product benchmark evidence |

## When To Run What

- `pnpm test:quick`
  - use during small UI or TypeScript iteration when you want the shortest feedback loop
- `pnpm verify`
  - use for every normal code change and as the public default validation profile
- `pnpm verify:full`
  - use for release decisions, dependency changes, release-sensitive contract changes, or when strict freeze/dependency/runtime/report gates are required
- `pnpm verify:extended`
  - use only after the required baseline is already green and you explicitly want addon confidence from coverage, optional E2E, or experimental tooling
- `pnpm test:unit`
  - internal building block for targeted unit/component/script-unit diagnosis without the full smoke profile
- `pnpm test:contracts`
  - internal building block for prompt/docs/IPC/locale/policy drift diagnosis
- `pnpm smoke`
  - internal compile-and-test baseline used by the default verify lane
- `pnpm verify:fast`
  - internal implementation of `pnpm verify`
- `pnpm verify:standard`
  - internal pre-handoff composition used by `pnpm verify:full`

If `package.json` or `pnpm-lock.yaml` changes, run `pnpm audit:npm`.
If Rust dependencies or `src-tauri/Cargo.toml` changes, run `pnpm rust:deps`.
For release/handoff readiness, include `pnpm release:freeze:check` or use `pnpm verify:full`.

## Deterministic Vs Runtime And Live-Provider Lanes

### Deterministic lanes

- `test:quick`, `test:unit`, `test:contracts`, `smoke`, `verify:fast`, and most of `verify:full`
- prompt contract, interview quality, runtime-answer fixture scoring, and product scenarios
- provider-free synthetic/runtime fixtures and mocked UI/E2E flows

These lanes are suitable for CI and local regression because they do not require real provider calls or live workstation conditions.

### Runtime-quality lanes

- `pnpm test:runtime-quality`
- `pnpm report:runtime-quality:strict`
- `pnpm check:slo`
- local runtime probes and evidence/report commands

These lanes validate synthetic runtime-answer quality, latency parsing, and available runtime artifacts. They are stronger than pure schema checks, but they are still not proof of real provider behavior on a real machine.

### Live-provider / workstation proof

- manual runtime bring-up
- runtime probes with credentials
- operator manual QA
- desktop artifact validation on the target workstation

Use [runtime.md](runtime.md) for proof labels and live-validation policy. Do not upgrade claims to runtime-measured or provider-proven from `pnpm smoke`, `pnpm verify:*`, or mocked E2E alone.

## E2E Lanes

| Lane | Command | Status | Notes |
| --- | --- | --- | --- |
| Web smoke | `pnpm test:e2e:web:smoke` | blocking in CI, optional locally | Credential-free happy-path regression for the web shell |
| Web alias | `pnpm test:e2e:web` | compatibility alias | Currently points to the smoke lane only |
| Web visual | `pnpm test:e2e:web:visual` | optional | Screenshot drift lane when visual evidence matters |
| Web required | `pnpm test:e2e:web:required` | required when skip is unacceptable | Runs smoke spec without optional wrapper |
| Desktop optional | `pnpm test:e2e:desktop` | optional | Returns `SKIP` outside prepared environments |
| Desktop required | `pnpm test:e2e:desktop:required` | required for operator/release artifact validation | Fails when prerequisites are missing |

Desktop prerequisites:

- build artifact with `pnpm tauri build`
- set `TAURI_APP_PATH`
- ensure optional packages and desktop driver tooling are installed

E2E lanes validate launch and UI flow. They do not prove provider latency, STT accuracy, or real LLM behavior.

## Quality Fixtures

### Prompt contract

- Command: `pnpm test:prompt-contract`
- Supporting lane: `pnpm test:fixtures`
- Scope:
  - `CardSchemaV3` contract
  - deterministic V3-to-legacy mapping
  - banned wording/drift
  - prompt source guardrails
  - fixture corpus hygiene
- Does not prove:
  - product usefulness
  - runtime/provider behavior

### Interview quality

- Command: `pnpm test:interview-quality`
- Strict evidence lane: `pnpm report:interview-quality:strict`
- Dataset: `tests/fixtures/interview-quality/golden-dataset-v1.json`
- Scope:
  - `InterviewCardSchemaV1` shape
  - word-limit/profile rules
  - no fabricated metrics or resume anchors
  - direct-answer / STAR-like expectations
  - clarifier policy
- Does not prove:
  - all real interview questions
  - cross-provider equivalence

### Product scenarios

- Command: `pnpm test:product-scenarios`
- Report lane: `pnpm report:product-quality`
- Dataset family:
  - `tests/fixtures/product-scenarios/*.json`
  - `tests/fixtures/product-scenarios/golden/*.json`
  - `tests/fixtures/product-scenarios/negative-cases.json`
- Scope:
  - scenario benchmark for usefulness, brevity, tone, next step, hallucination, privacy
- Does not prove:
  - live-provider behavior
  - GUI/runtime path on a real machine

### Runtime quality

- Command: `pnpm test:runtime-quality`
- Inputs:
  - runtime-answer fixtures
  - quality thresholds
  - latency parser fixtures/artifacts
  - SLO budget check
  - `say_now` heuristic scenarios
- Scope:
  - synthetic runtime-answer quality
  - runtime artifact threshold checks without live providers
- Does not prove:
  - end-to-end provider behavior in a real call app

### Fixture boundary rule

- `prompt-contract` owns schema and contract drift
- `interview-quality` owns interview-card deterministic quality
- `product-scenarios` owns product benchmark usefulness
- `runtime-quality` owns synthetic runtime-answer and artifact thresholds

Keep these lanes distinct. Do not collapse them into one generic “quality” signal.

## Script Lifecycle Policy

`pnpm scripts:lifecycle` verifies that every package script has exactly one lifecycle class from `scripts/check-script-lifecycle.mjs`.

- Required
  - build, test, policy, security, and release commands on the blocking path of `test:quick`, `test:unit`, `test:contracts`, `smoke`, `verify:fast`, `verify:standard`, and `verify:full`
- Advisory
  - readiness, addon, and evidence commands reviewed intentionally but not part of the default PR gate; includes `verify:extended`, `verify:release-local`, and advisory reports such as `release:freeze:check`
- Optional
  - targeted developer tools, runtime probes, operator helpers, wrappers, and report generators not required for every PR
- Experimental
  - machine-dependent lanes such as k6, ZAP, and Lighthouse

Blocking report lanes must use explicit `:strict` names. Canonical docs and workflows should point to public canonical profiles first. Compatibility aliases and internal building blocks may remain temporarily, but they are not equivalent to canonical public profiles.

## CI Alignment

- `.github/workflows/ci.yml`
  - blocking PR/main lane
  - runs `verify`, blocking web smoke E2E, and strict freeze guard
- `.github/workflows/extended-quality.yml`
  - non-blocking addon workflow
  - must surface `PASS`, `PASS_WITH_SKIP`, or `FAIL_NON_BLOCKING`
- `.github/workflows/release-on-tag.yml`
  - reruns release-relevant verification for immutable tag flow
- `.github/workflows/windows-packaging-manual.yml`
  - packaging/operator workflow; should not bypass required verification expectations

CI and local profiles should stay semantically aligned, but exact workflow composition may differ by platform or blocking semantics.

## Deprecated And Compatibility Aliases

- `pnpm verify` -> `pnpm verify:fast`
- `pnpm test:e2e:web` -> `pnpm test:e2e:web:smoke`
- `pnpm report:interview-quality` -> `pnpm report:interview-quality:strict`
- `pnpm report:runtime-quality` -> `pnpm report:runtime-quality:strict`
- `pnpm test:runtime-answer-quality` -> `pnpm test:runtime-answer-quality:gate`
- `pnpm test:product-scenarios` -> `pnpm test:product-scenarios:gate`
- `pnpm check:slo` and `pnpm test:slo-budget` are equivalent threshold lanes

Prefer canonical names in docs, workflows, and handoff notes. Keep compatibility aliases short-lived and explicitly documented.

## Related Guides

- [release.md](release.md)
- [runtime.md](runtime.md)
- [manual-qa.md](manual-qa.md)
