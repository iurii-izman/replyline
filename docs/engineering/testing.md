# Engineering Testing Guide

Canonical guide for testing, verification, fixture boundaries, CI mapping, and script lifecycle semantics.

Green in one lane does not mean green everywhere. `test:*`, `check:*`, `report:*`, `probe:*`, `smoke`, and `verify:*` cover different risks and are not interchangeable.

## 1. Public profiles

These are the commands contributors should see first.

| Profile | Command | Purpose | Includes | Does not prove |
| --- | --- | --- | --- | --- |
| Quick local loop | `pnpm test:quick` | Fast iteration before a broader gate | `typecheck`, `lint`, `test:ui` | Rust compile/tests, contracts, release readiness, runtime/provider behavior |
| Default verification | `pnpm verify` | Required default baseline for normal changes | alias to `verify:fast` | release-only strict gates, dependency audits, addon lanes, live-provider proof |
| Release profile | `pnpm verify:full` | Release and handoff decision lane | `verify:standard` + `release:freeze:check:strict` + `rust:deps` + `audit:npm` + one canonical `test:quality` pass + strict reports | optional addon lanes, manual QA, live-provider proof |
| Addon/nightly/operator | `pnpm verify:extended` | Extra confidence after the required baseline is green | coverage, fixture hygiene/gate, optional E2E, experimental security/UX lanes | it does not replace `verify:full` or rerun canonical quality gates |

Normal flow:

1. `pnpm test:quick`
2. `pnpm verify`
3. `pnpm verify:full` when release-sensitive or handoff-ready confidence is required

## 2. Internal building blocks

These commands are supported and important, but they are not the primary public entrypoints.

| Building block | Command | Purpose | Includes | Does not prove |
| --- | --- | --- | --- | --- |
| Unit baseline | `pnpm test:unit` | Deterministic unit/component/script-unit regression | Rust tests, UI tests, parser/evaluator/report unit lanes | full build baseline, contracts, runtime/provider behavior |
| Contract baseline | `pnpm test:contracts` | Deterministic drift detection | docs/copy/prompt/IPC/locale checks | runtime quality, usefulness, live-provider behavior |
| Quality bundle | `pnpm test:quality` | Canonical deterministic quality pass | interview, runtime-answer, product-scenarios, `say_now`, SLO checks | compile/build health, dependency audits, live-provider behavior |
| Compile-and-test baseline | `pnpm smoke` | Broad local quality gate before verify profiles | build + Rust compile/lint/fmt + `test:unit` + `test:contracts` | release freeze, dependency audits, optional E2E, live-provider proof |

Implementation note:

- `pnpm verify:fast` is the internal implementation behind `pnpm verify`.
- `pnpm verify:standard` is the internal pre-handoff composition used by `pnpm verify:full`.

## 3. Targeted lanes

Use these when the task or failure mode is narrower than a full profile.

### E2E

- `pnpm test:e2e:web:smoke` is the canonical web smoke lane.
- `pnpm test:e2e:web` is only a compatibility alias to `test:e2e:web:smoke`.
- `pnpm test:e2e:web:visual` is optional visual drift coverage.
- `pnpm test:e2e:desktop` is workstation-dependent and optional.
- `pnpm test:e2e:desktop:required` is the non-optional desktop validation lane when environment prerequisites are guaranteed.

E2E proves launch and UI flow, not real provider latency, STT accuracy, or live LLM behavior.

### Runtime probes

- `pnpm probe:runtime`
- `pnpm probe:bench`
- `pnpm probe:durations`
- `pnpm probe:live-source`
- `pnpm runtime:preflight`
- `pnpm evidence:bundle`

These lanes are operator/runtime evidence tools. They are not substitutes for deterministic CI gates.

### Reports

- `pnpm report:runtime-quality:strict`
- `pnpm report:release-readiness:strict`
- `pnpm report:interview-quality:strict`
- `pnpm report:runtime-answer-quality`
- `pnpm report:product-quality`

Reports summarize or enforce evidence thresholds. They should not be renamed as `test:*` unless they become blocking validation lanes.

### Dependency/security

- `pnpm rust:deps` owns Rust dependency policy and audit checks.
- `pnpm audit:npm` owns npm production dependency audit checks.
- `pnpm test:security-lanes` and `pnpm test:public-footprint` stay inside the verify baseline.
- `pnpm test:sec:zap` is addon/experimental coverage, not baseline verification.

## 4. Naming policy

- Use `test:*` for deterministic validation lanes and profile building blocks.
- Use `check:*` for focused threshold/policy assertions that fail on unmet criteria without being broad profiles.
- Use `report:*` for evidence or summary generation, including strict report gates.
- Use `probe:*` for runtime/operator measurement commands that inspect an environment instead of proving canonical CI health.

Rules:

- Public docs should present `pnpm verify`, `pnpm verify:full`, and `pnpm verify:extended` before internal implementation commands.
- Compatibility aliases are not canonical profiles just because they resolve to the same underlying command.
- Canonical threshold assertions live under `check:*`.
- Blocking evidence-style commands should use explicit `:strict` suffixes.

## 5. Quality fixture responsibilities

### Prompt contract

- Command: `pnpm test:prompt-contract`
- Owns schema shape, deterministic mapping rules, banned wording/drift, and prompt-source guardrails.
- Does not own product usefulness or runtime behavior.

### Say-now

- Command: `pnpm check:say-now-scenarios`
- Owns deterministic `say_now` threshold assertions and repair-policy coverage inside the quality bundle.

### Interview quality

- Command: `pnpm test:interview-quality`
- Strict evidence lane: `pnpm report:interview-quality:strict`
- Owns interview-card quality expectations against the golden dataset.

### Runtime answer quality

- Command: `pnpm check:runtime-answer-quality`
- Unit support lane: `pnpm test:runtime-answer-quality:unit`
- Owns deterministic runtime-answer scoring and thresholds.

### Product scenarios

- Command: `pnpm check:product-scenarios`
- Report lane: `pnpm report:product-quality`
- Owns deterministic scenario usefulness, brevity, trust, and privacy assertions.

Boundary rule:

- `pnpm test:quality` composes the canonical deterministic quality bundle exactly once.
- `prompt-contract` covers schema/contract drift.
- `interview-quality` covers interview-card quality.
- `check:runtime-answer-quality` covers synthetic runtime-answer thresholds.
- `check:say-now-scenarios` covers `say_now` thresholds.
- `check:product-scenarios` covers product benchmark thresholds.

## 6. CI alignment

- `.github/workflows/ci.yml`
  - blocking PR/main lane
  - runs `pnpm verify`, blocking web smoke E2E, and strict release-freeze guard
- `.github/workflows/dependency-checks.yml`
  - scheduled/manual dependency lane
  - owns `pnpm rust:deps` and `pnpm audit:npm`
- `.github/workflows/release-on-tag.yml`
  - reruns `pnpm verify:full` before packaging tag artifacts
- `.github/workflows/windows-packaging-manual.yml`
  - packaging/operator workflow
  - requires at least `pnpm verify:fast` before building internal artifacts
- `.github/workflows/extended-quality.yml`
  - runs `pnpm verify:full` as the baseline and `pnpm verify:extended` as addon-only follow-up
  - `PASS_WITH_SKIP` is valid only for skipped optional addon tooling, never for skipped blocking baseline checks

## 7. Lifecycle classification

`pnpm scripts:lifecycle` validates that each package script has exactly one lifecycle class.

- `required`
  - blocking path commands used by canonical local/CI verification
- `advisory`
  - intentional but non-default handoff or evidence lanes such as addon verification and advisory reports
- `optional`
  - targeted developer/operator helpers, probes, wrappers, and non-required reports
- `experimental`
  - machine-dependent addon lanes such as optional security/UX tooling

Classification rules:

- Public documentation should point to canonical public profiles first.
- Internal building blocks may stay stable without becoming public entrypoints.
- Aliases do not change lifecycle class.
- A passing addon lane does not upgrade a missing baseline into a pass.

## Related guides

- [runtime.md](runtime.md)
- [release.md](release.md)
- [manual-qa.md](manual-qa.md)
