# Postman Audit Follow-Up Execution Blocks And Prompts

Status: draft follow-up prompt pack  
Audit source: external Postman-style audit supplied by operator  
Local verification baseline: `e2af8fbe84098b6c5c7f83ff5d564b56ee214fd0`  
Purpose: convert the external audit recommendations into large, high-quality implementation blocks

## 1. Current Confirmation Snapshot

The external audit is broadly aligned with the current repository state, with a few corrections from local verification.

| Item | External audit claim | Local verification |
| --- | --- | --- |
| Frontend files | 34 TS/TSX, about 8,200 lines | Confirmed: 34 TS/TSX, 8,194 lines |
| Frontend production files | not separated | 27 production TS/TSX, 5,926 lines |
| Rust backend | 40 files, about 10,700 lines | Confirmed: 40 files, 10,749 lines |
| Docs | 66 Markdown files | Confirmed: 66 Markdown files |
| Scripts | 60 mjs/ps1 files | Confirmed: 60 files |
| Rust tests | about 148 annotations | Current: 151 `#[test]` / `#[tokio::test]` annotations |
| TS tests | 7 files | Confirmed: 7 files |
| Reports | 984 generated artifacts | Current local tree after cleanup/report generation: 12 files under `reports/` |
| `authors = ["<placeholder>"]` | Still present | Confirmed in `src-tauri/Cargo.toml` |
| CSP `https://*` | Needs justification / narrowing | Justification now exists in `docs/privacy-and-trust.md`; security lane checks it |
| Release binaries | Not published by `release-on-tag.yml` | Confirmed and documented |
| Candidate Pack boundary | Earlier risk | Now fixed by tests: WorkConversation excludes Candidate Pack by default |

Verification already run on the local repository:

- `pnpm verify:release-local` passed.
- `verify:fast` passed as part of release-local.
- `scripts:lifecycle` passed.
- `test:doc-links` passed.
- `test:public-footprint` passed.
- `report:release-readiness:strict` passed with `blockers=0 warnings=2 overallScore=97`.

## 2. Follow-Up Priority Map

| Order | Block | Primary upgrade |
| ---: | --- | --- |
| 1 | Frontend Test Expansion | Raise TS/controller confidence and coverage discipline |
| 2 | Public Release Packaging And Manifest Hygiene | Prepare eventual public binaries without pretending they exist |
| 3 | CSP And Provider Endpoint Policy Hardening | Keep flexible providers while reducing wildcard risk |
| 4 | Docs Portfolio Rationalization | Reduce docs overlap and archive stale operational snapshots |
| 5 | Dependency And Override Maintenance Lane | Keep overrides intentional and surface outdated risk |
| 6 | Extended Quality And Mandatory E2E | Decide what optional lanes become blocking and add one desktop happy path |
| 7 | Optional API/Postman Lane Maturity | Make Postman/Newman lane useful without making it brittle |

## 3. Common Execution Rules

Every block must start with:

```bash
git status --short --branch
git rev-parse HEAD
```

If the worktree is dirty, classify changed files before editing. Do not touch unrelated files.

Every block must end with:

- changed files;
- validation matrix;
- commands not run and why;
- residual risk;
- whether `release:freeze:check:strict` passes;
- next recommended block.

Do not claim checks passed unless they were actually executed.

## 4. Block 1 - Frontend Test Expansion

### Objective

Increase confidence in `src/app/controller/*`, setup state, mode state, Candidate Pack UI state, and Settings diagnostics/report flows.

### Why This Matters

The backend has strong Rust test density. Frontend tests remain the main quality asymmetry: 7 TS test files for 27 production TS/TSX files. The target is not artificial line coverage; the target is regression protection around orchestration and critical UX state.

### Target Files

- `src/app/controller/*`
- `src/app/*.test.ts`
- `src/app/*.test.tsx`
- `src/app/model.ts`
- `src/app/platform.ts`
- `src/app/MainSurface.tsx`
- `src/app/SettingsSurface.tsx`
- `src/app/CandidatePackStudio.tsx`
- `src/app/locale.ts`
- `docs/testing-stack-setup.md`
- `docs/verification-lanes.md`
- `docs/manual-ui-qa.md`

### Non-Goals

- Do not rewrite controller architecture.
- Do not add new frontend dependencies unless absolutely necessary.
- Do not chase arbitrary coverage percentages before critical paths are covered.
- Do not make brittle DOM snapshots that fail on harmless copy/layout changes.

### Implementation Scope

1. Add focused tests for controller modules:
   - `pipelineActions`;
   - `lifecycle`;
   - `traySync`;
   - `settingsActions`;
   - `hotkeys`;
   - `notices`;
   - `selectors`;
   - `keyboardShortcuts`.
2. Add UI tests for:
   - WorkConversation default mode banner;
   - Interview active mode banner;
   - Candidate Pack empty/preparing/prepared/saved states;
   - Settings diagnostics warnings for `full_local`;
   - full vs redacted report export copy.
3. Make `pnpm test:ui:coverage` useful for local review.
4. Decide whether coverage stays advisory or becomes part of `verify:extended`.
5. Update docs to explain expected frontend test strategy.

### Acceptance Criteria

- At least one meaningful test covers each controller submodule or the module is explicitly documented as covered through an integration-style UI test.
- Critical mode and privacy UI states have regression tests.
- `pnpm test:ui` remains stable with `--maxWorkers=1`.
- `pnpm test:ui:coverage` runs locally and produces a readable signal.
- No hardcoded TSX locale violations are introduced.

### Verification Commands

```bash
pnpm test:ui
pnpm test:ui:coverage
pnpm test:locale-keys
pnpm copy:check
pnpm verify:fast
pnpm release:freeze:check:strict
```

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Implement Postman Follow-Up Block 1: Frontend Test Expansion.

Role:
Act as a senior Solid.js/TypeScript test engineer and frontend architecture reviewer.

Goal:
Raise frontend regression confidence, especially around src/app/controller/*, mode state, Candidate Pack UI, Settings diagnostics, and report export copy. Do not rewrite the app.

Before editing:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md and CLAUDE.md
- Read src/app/model.ts, src/app/platform.ts, src/app/controller.ts, src/app/controller/*
- Read src/app/MainSurface.tsx, src/app/SettingsSurface.tsx, src/app/CandidatePackStudio.tsx, src/app/locale.ts
- Read existing src/app/*.test.ts and src/app/*.test.tsx
- Read docs/testing-stack-setup.md and docs/verification-lanes.md

Implementation requirements:
1. Map existing frontend tests to controller modules and critical UI states.
2. Add tests for controller modules that currently have no direct or integration-style coverage.
3. Add tests for:
   - WorkConversation default mode;
   - active Interview Mode;
   - Candidate Pack empty/preparing/prepared/saved states;
   - Settings diagnostics full_local warning;
   - full vs redacted report export labels/copy.
4. Keep tests deterministic and low-RAM friendly.
5. Avoid brittle full snapshots.
6. Update docs with a concise frontend test strategy and when to run test:ui:coverage.

Acceptance criteria:
- Every controller submodule has meaningful coverage or documented integration coverage.
- Critical privacy/mode UI states are covered.
- pnpm test:ui and pnpm test:ui:coverage run successfully.
- verify:fast remains green.

Verification:
- pnpm test:ui
- pnpm test:ui:coverage
- pnpm test:locale-keys
- pnpm copy:check
- pnpm verify:fast
- pnpm release:freeze:check:strict

Delivery:
- changed files
- test coverage map by controller module
- validation matrix
- residual frontend testing gaps
```

## 5. Block 2 - Public Release Packaging And Manifest Hygiene

### Objective

Prepare Replyline for eventual public binary release while preserving the current truth that `release-on-tag.yml` publishes notes only.

### Why This Matters

The current internal stable beta can function without binary publishing. Public beta cannot. The first non-controversial fix is manifest hygiene: placeholder `authors` metadata should not ship in public metadata.

### Target Files

- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `.github/workflows/release-on-tag.yml`
- new workflow only if explicitly approved
- `docs/release-readiness.md`
- `docs/release-local-readiness.md`
- `docs/known-limitations.md`
- `docs/beta-readiness.md`
- `docs/naming-decision-brief.md`

### Non-Goals

- Do not silently add binary publishing to the current release workflow.
- Do not introduce signing secrets without explicit operator approval.
- Do not claim installers exist before workflow artifacts are proven.
- Do not change productName/identifier without a naming decision.

### Implementation Scope

1. Replace placeholder `authors` value with the correct owner/organization value.
2. Document release metadata decisions: product name, identifier, author, versioning.
3. Create a packaging design doc for Windows installer/portable artifact, signing, checksums, and release artifact retention.
4. Optionally add a dry-run workflow or disabled/manual packaging workflow if approved.
5. Keep `release-on-tag.yml` truthfully documented as release notes only until packaging exists.

### Acceptance Criteria

- Public manifest no longer contains placeholder author metadata.
- Release docs distinguish current release notes workflow from future binary packaging.
- If a workflow is added, it is manual or clearly non-publishing by default unless approved.
- No public docs imply signed binaries are available before they are.

### Verification Commands

```bash
pnpm test:doc-links
pnpm test:consistency
pnpm copy:check
pnpm verify:fast
pnpm release:freeze:check:strict
```

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Implement Postman Follow-Up Block 2: Public Release Packaging And Manifest Hygiene.

Role:
Act as a Tauri release engineer and public beta readiness reviewer.

Goal:
Clean public manifest metadata and prepare a truthful, staged Windows packaging plan without pretending binaries already exist.

Before editing:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md and CLAUDE.md
- Read src-tauri/Cargo.toml and src-tauri/tauri.conf.json
- Read .github/workflows/release-on-tag.yml
- Read docs/release-readiness.md, docs/release-local-readiness.md, docs/known-limitations.md, docs/beta-readiness.md, docs/naming-decision-brief.md

Implementation requirements:
1. Replace placeholder Cargo authors metadata with the correct project owner value.
2. Confirm productName, identifier, version, and bundle metadata are coherent for public beta.
3. Update release docs to clearly separate:
   - current release-on-tag notes-only behavior;
   - future Windows binary/installer packaging;
   - signing/checksum requirements;
   - what must be measured before public beta.
4. If adding a packaging workflow, make it workflow_dispatch/manual and non-publishing unless explicitly approved.
5. Do not add secrets, signing config, or artifact publication without explicit approval.

Acceptance criteria:
- No placeholder `authors` value remains.
- Docs do not imply installer artifacts exist.
- Public beta packaging path is concrete enough to implement later.
- verify:fast and release-freeze strict pass.

Verification:
- rg -n 'authors = \\[\"you\"\\]' src-tauri/Cargo.toml docs README.md
- pnpm test:doc-links
- pnpm test:consistency
- pnpm copy:check
- pnpm verify:fast
- pnpm release:freeze:check:strict

Delivery:
- changed files
- manifest before/after
- packaging posture: current vs future
- validation matrix
- residual release blockers
```

## 6. Block 3 - CSP And Provider Endpoint Policy Hardening

### Objective

Keep OpenAI-compatible provider flexibility while reducing risk around broad `connect-src https://*`.

### Current State

`https://*` is currently documented in `docs/privacy-and-trust.md` and checked by `scripts/check-security-lanes.mjs`. That closes the documentation gap from the external audit. The next maturity step is not simply deleting `https://*`; it is designing runtime endpoint validation and allowlist semantics that preserve custom providers.

### Target Files

- `src-tauri/tauri.conf.json`
- `src-tauri/src/settings.rs`
- `src-tauri/src/llm.rs`
- `src-tauri/src/providers/openai_compatible.rs`
- `scripts/check-security-lanes.mjs`
- `docs/privacy-and-trust.md`
- `docs/third-party-providers.md`
- `docs/settings-reference.md`
- `docs/security` docs if added

### Non-Goals

- Do not break custom HTTPS LLM providers.
- Do not remove `https://*` from CSP unless an alternative is proven.
- Do not add a provider registry that blocks OpenAI-compatible endpoints by default.
- Do not claim CSP is narrow when it remains broad.

### Implementation Scope

1. Keep or improve explicit CSP rationale.
2. Add tests around LLM base URL validation if gaps exist.
3. Consider a runtime provider endpoint policy:
   - HTTPS remote required;
   - HTTP allowed only for loopback/private network/`.local`;
   - display provider host in Settings/preflight;
   - warn for unknown remote hosts without blocking if custom provider is intended.
4. Make `check-security-lanes.mjs` assert both CSP and docs rationale.
5. Document why static Tauri CSP cannot follow runtime settings dynamically.

### Acceptance Criteria

- Custom HTTPS LLM endpoints still work.
- Remote HTTP is rejected.
- Local/private HTTP remains supported for local models/proxies.
- CSP wildcard remains explicitly justified or is safely narrowed.
- Security lane catches accidental undocumented CSP changes.

### Verification Commands

```bash
pnpm test:security-lanes
cargo test --manifest-path src-tauri/Cargo.toml settings
pnpm test:runtime-preflight-contract
pnpm test:doc-links
pnpm verify:fast
pnpm release:freeze:check:strict
```

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Implement Postman Follow-Up Block 3: CSP And Provider Endpoint Policy Hardening.

Role:
Act as a Tauri security reviewer and provider-architecture maintainer.

Goal:
Reduce risk around CSP connect-src https://* without breaking user-configured OpenAI-compatible LLM endpoints.

Before editing:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md and CLAUDE.md
- Read src-tauri/tauri.conf.json
- Read src-tauri/src/settings.rs, src-tauri/src/llm.rs, src-tauri/src/providers/openai_compatible.rs
- Read scripts/check-security-lanes.mjs
- Read docs/privacy-and-trust.md, docs/third-party-providers.md, docs/settings-reference.md

Implementation requirements:
1. Verify current LLM URL validation behavior in Rust tests.
2. Add missing tests for:
   - remote HTTPS allowed;
   - remote HTTP rejected;
   - loopback/private HTTP allowed;
   - malformed URL rejected safely.
3. Strengthen security lane so CSP wildcard and documentation rationale stay in sync.
4. If feasible, improve Settings/preflight copy to show the configured provider host and cloud/local implication.
5. Do not remove https://* unless all configured provider use cases still pass.

Acceptance criteria:
- Security posture is stricter or better documented.
- Provider flexibility is preserved.
- Tests cover URL policy.
- No false claim that CSP is narrow if it still contains https://*.

Verification:
- pnpm test:security-lanes
- cargo test --manifest-path src-tauri/Cargo.toml settings
- pnpm test:runtime-preflight-contract
- pnpm test:doc-links
- pnpm verify:fast
- pnpm release:freeze:check:strict

Delivery:
- changed files
- CSP decision retained/changed and why
- validation matrix
- remaining CSP risks
```

## 7. Block 4 - Docs Portfolio Rationalization

### Objective

Reduce documentation overlap without losing operational history or breaking docs links.

### Why This Matters

The docs set is strong but large. Several readiness/evidence/runtime docs are close in purpose. The goal is not deletion for its own sake; the goal is navigability and lower stale-doc risk.

### Target Files

- `docs/README.md`
- `docs/release-readiness.md`
- `docs/release-local-readiness.md`
- `docs/beta-readiness.md`
- `docs/runtime-bringup.md`
- `docs/runtime-evidence.md`
- `docs/runtime-quality-harness.md`
- `docs/internal-alpha-*`
- `docs/archive/` only if tracked archive is desired
- `.gitignore` only if archive policy changes

### Non-Goals

- Do not hide history that is still useful for governance.
- Do not move docs into ignored paths if they must remain tracked.
- Do not break links from README or CI scripts.
- Do not rewrite all docs.

### Implementation Scope

1. Classify docs:
   - Read first;
   - Runtime/release;
   - Architecture/contracts;
   - Product/trust;
   - Internal history;
   - Future tracks.
2. Add clear owner/purpose/status to overlapping docs where needed.
3. Move stale historical docs to a tracked archive path only if `.gitignore` allows it intentionally.
4. Update docs index and links.
5. Add a lightweight doc lifecycle policy.

### Acceptance Criteria

- A contributor can identify which readiness doc to use for which situation.
- Historical docs are marked historical.
- Future docs are marked future-only.
- No docs link check failures.

### Verification Commands

```bash
pnpm test:doc-links
pnpm test:consistency
pnpm copy:check
pnpm release:freeze:check:strict
```

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Implement Postman Follow-Up Block 4: Docs Portfolio Rationalization.

Role:
Act as a documentation architect and release-governance maintainer.

Goal:
Make the large docs set easier to navigate and less prone to stale claims without deleting useful history.

Before editing:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md and CLAUDE.md
- Read docs/README.md
- Read docs/release-readiness.md, docs/release-local-readiness.md, docs/beta-readiness.md
- Read docs/runtime-bringup.md, docs/runtime-evidence.md, docs/runtime-quality-harness.md
- Read docs/internal-alpha-* if present
- Inspect .gitignore archive rules

Implementation requirements:
1. Classify docs into clear categories in docs/README.md.
2. Add status/purpose notes to overlapping readiness/runtime docs.
3. Mark internal-alpha docs as historical if they remain tracked.
4. Mark memory/local STT/Advanced docs as future-only where needed.
5. Do not move files into ignored archive paths unless the archive should be tracked and .gitignore supports it.
6. Preserve all useful links and script references.

Acceptance criteria:
- docs/README.md acts as a reliable map.
- No current docs imply historical/future docs are shipped behavior.
- Link checks pass.

Verification:
- pnpm test:doc-links
- pnpm test:consistency
- pnpm copy:check
- pnpm release:freeze:check:strict

Delivery:
- changed files
- docs classification summary
- links/checks status
- residual docs cleanup candidates
```

## 8. Block 5 - Dependency And Override Maintenance Lane

### Objective

Make dependency drift and override review explicit without slowing every PR.

### Why This Matters

`pnpm.overrides` is useful but needs periodic review. Optional heavy testing tools should remain optional, but the project should know when they drift.

### Target Files

- `package.json`
- `pnpm-lock.yaml` only if command changes require it
- `scripts/`
- `docs/rust-dependency-security.md`
- `docs/verification-lanes.md`
- `docs/testing-stack-setup.md`
- `.github/workflows/extended-quality.yml`

### Non-Goals

- Do not upgrade dependencies blindly.
- Do not make `pnpm outdated` blocking on every PR.
- Do not remove overrides without audit evidence.
- Do not add Renovate if Dependabot is sufficient.

### Implementation Scope

1. Add a non-blocking or scheduled dependency freshness lane:
   - npm outdated;
   - cargo outdated if tool is available, otherwise docs-only;
   - override review report.
2. Document how to review `pnpm.overrides`.
3. Consider adding a script like `pnpm deps:outdated` or `pnpm deps:review`.
4. Wire it into `extended-quality.yml` as scheduled/non-blocking unless operator wants stricter policy.

### Acceptance Criteria

- Dependency freshness is visible.
- Overrides have a review process.
- Default `verify:fast` remains practical.
- Supply-chain security gates remain blocking where they already are.

### Verification Commands

```bash
pnpm scripts:lifecycle
pnpm test:security-lanes
pnpm test:doc-links
pnpm verify:fast
pnpm release:freeze:check:strict
```

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Implement Postman Follow-Up Block 5: Dependency And Override Maintenance Lane.

Role:
Act as a supply-chain security engineer and release workflow maintainer.

Goal:
Add a practical dependency freshness/override review lane without making every PR slow or noisy.

Before editing:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md and CLAUDE.md
- Read package.json and pnpm-lock.yaml
- Read docs/rust-dependency-security.md, docs/verification-lanes.md, docs/testing-stack-setup.md
- Read .github/workflows/extended-quality.yml
- Read scripts/check-security-lanes.mjs and scripts/check-script-lifecycle.mjs

Implementation requirements:
1. Add or document a dependency review command for npm outdated / override review.
2. Keep audit gates (`pnpm audit:npm`, `pnpm rust:deps`) blocking where they already are.
3. Keep outdated/freshness review scheduled or operator-run, not default PR-blocking.
4. Update script lifecycle matrix if package scripts are added.
5. Do not update dependencies unless specifically required to make the lane work.

Acceptance criteria:
- Operators have one documented command/path to review stale dependencies and overrides.
- verify:fast remains unchanged or equally practical.
- scripts:lifecycle passes.

Verification:
- pnpm scripts:lifecycle
- pnpm test:security-lanes
- pnpm test:doc-links
- pnpm verify:fast
- pnpm release:freeze:check:strict

Delivery:
- changed files
- dependency lane behavior
- validation matrix
- whether any dependencies were changed
```

## 9. Block 6 - Extended Quality And Mandatory E2E

### Objective

Decide which optional lanes should become blocking and add one mandatory desktop happy-path E2E scenario when practical.

### Why This Matters

Optional lanes are pragmatic. But before public beta, at least one end-to-end desktop flow should protect the real product shell.

### Target Files

- `package.json`
- `.github/workflows/ci.yml`
- `.github/workflows/extended-quality.yml`
- `tests/e2e/`
- `tests/desktop/`
- `scripts/run-optional-lane.mjs`
- `docs/testing-stack-setup.md`
- `docs/verification-lanes.md`
- `docs/manual-windows-ux-qa.md`

### Non-Goals

- Do not make all optional lanes blocking at once.
- Do not require GUI credentials or paid providers in default CI.
- Do not add flaky desktop automation without isolation.
- Do not block low-RAM local development with heavy E2E in `verify:fast`.

### Implementation Scope

1. Define one mandatory E2E happy path:
   - app launches;
   - bootstrap/settings state renders;
   - mock/fixture capture path or card render path works;
   - no real provider credentials required.
2. Decide whether it belongs in `verify:release-local`, CI, or extended-quality.
3. Keep heavy real desktop/call-app flows manual or scheduled until stable.
4. Consider making one security optional lane periodically blocking on `main`, not PR.
5. Document flake policy and skip behavior.

### Acceptance Criteria

- One E2E scenario is deterministic and credential-free.
- It does not make `verify:fast` too heavy unless intentionally accepted.
- CI docs explain which lanes are required vs optional.
- Optional lane failures are not silently ignored in scheduled quality reports.

### Verification Commands

```bash
pnpm test:e2e:desktop
pnpm test:e2e:web
pnpm verify:fast
pnpm verify:release-local
pnpm test:doc-links
pnpm release:freeze:check:strict
```

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Implement Postman Follow-Up Block 6: Extended Quality And Mandatory E2E.

Role:
Act as a desktop E2E test engineer and CI reliability owner.

Goal:
Create one deterministic, credential-free E2E happy path and define which optional quality lanes should become blocking before public beta.

Before editing:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md and CLAUDE.md
- Read package.json
- Read .github/workflows/ci.yml and .github/workflows/extended-quality.yml
- Read scripts/run-optional-lane.mjs
- Read docs/testing-stack-setup.md, docs/verification-lanes.md, docs/manual-windows-ux-qa.md
- Inspect tests/e2e and tests/desktop if present

Implementation requirements:
1. Identify current E2E capabilities and optional lane behavior.
2. Add or harden one credential-free happy path:
   - launch/render shell;
   - bootstrap/settings state visible;
   - fixture card render or mock capture path;
   - no Deepgram/LLM real credentials.
3. Decide where the test belongs:
   - release-local;
   - CI on Windows;
   - extended-quality only.
4. Keep low-RAM developer workflow practical.
5. Document flake policy, skip conditions, and how to run locally.
6. Do not make every optional lane blocking.

Acceptance criteria:
- At least one E2E path can run deterministically or there is a documented blocker.
- CI/release docs match actual lane behavior.
- verify:fast remains practical.

Verification:
- pnpm test:e2e:desktop
- pnpm test:e2e:web
- pnpm verify:fast
- pnpm verify:release-local
- pnpm test:doc-links
- pnpm release:freeze:check:strict

If a command skips due missing optional tooling:
- Report SKIP exactly.
- Decide whether tooling should be installed or the lane should remain optional.

Delivery:
- changed files
- E2E scenario description
- validation matrix
- flake/skipped-tooling notes
- recommendation on blocking policy
```

## 10. Block 7 - Optional API/Postman Lane Maturity

### Objective

Make the Postman/Newman API lane useful and documented without pretending Replyline is an API-first product.

### Why This Matters

The external audit mentions Postman/Newman optional lanes. Replyline is a desktop app, so API tests should remain scoped to local mock/harness endpoints if they exist. The goal is to keep this lane from becoming dead weight.

### Target Files

- `package.json`
- `tests/api/postman/*`
- `scripts/run-optional-lane.mjs`
- `docs/testing-stack-setup.md`
- `docs/verification-lanes.md`
- `docs/public-vs-local-artifacts.md`
- `docs/beta-ops-diagnostics.md`

### Non-Goals

- Do not add a production HTTP API.
- Do not expose local debug endpoints in shipped runtime just for Postman.
- Do not require Postman/Newman for `verify:fast`.
- Do not commit local secrets in Postman environments.

### Implementation Scope

1. Verify whether `tests/api/postman` assets exist.
2. If absent, ensure optional lane skips cleanly and docs say so.
3. If present, ensure collection uses safe local endpoints and redacted environment values.
4. Add a small README for Postman lane purpose and limitations.
5. Ensure public footprint ignores or scans Postman local environments correctly.

### Acceptance Criteria

- `pnpm test:api:postman` either runs or skips with clear reason.
- No secrets are present in Postman environment files.
- Docs do not imply Replyline has a public API.
- Script lifecycle remains consistent.

### Verification Commands

```bash
pnpm test:api:postman
pnpm scripts:lifecycle
pnpm test:public-footprint
pnpm test:doc-links
pnpm verify:fast
pnpm release:freeze:check:strict
```

### Ready-To-Use Prompt

```text
You are working in C:\Dev\replyline on main. Implement Postman Follow-Up Block 7: Optional API/Postman Lane Maturity.

Role:
Act as an API test lane maintainer and privacy reviewer.

Goal:
Make the optional Postman/Newman lane clear, safe, and useful without changing Replyline into an API-first product.

Before editing:
- Run git status --short --branch
- Run git rev-parse HEAD
- Read AGENTS.md and CLAUDE.md
- Read package.json
- Inspect tests/api/postman if present
- Read scripts/run-optional-lane.mjs
- Read docs/testing-stack-setup.md, docs/verification-lanes.md, docs/public-vs-local-artifacts.md

Implementation requirements:
1. Determine whether Postman collection/environment files exist.
2. If missing, ensure pnpm test:api:postman skips cleanly and docs explain the skip.
3. If present, verify:
   - no real secrets;
   - no raw transcripts;
   - no production endpoints;
   - only safe local/mock harness endpoints.
4. Add or update docs explaining what this optional lane validates and what it does not validate.
5. Keep it out of verify:fast unless explicitly approved.
6. Update script lifecycle matrix if scripts change.

Acceptance criteria:
- pnpm test:api:postman has a clear RUN or SKIP outcome.
- Public footprint and secret scans remain green.
- Docs are accurate and do not imply a public API product.

Verification:
- pnpm test:api:postman
- pnpm scripts:lifecycle
- pnpm test:public-footprint
- pnpm test:doc-links
- pnpm verify:fast
- pnpm release:freeze:check:strict

Delivery:
- changed files
- Postman lane status: RUN or SKIP
- validation matrix
- residual API test lane risks
```

## 11. Recommended Execution Order

For maximum value with controlled risk:

1. Block 1 - Frontend Test Expansion.
2. Block 2 - Public Release Packaging And Manifest Hygiene.
3. Block 3 - CSP And Provider Endpoint Policy Hardening.
4. Block 5 - Dependency And Override Maintenance Lane.
5. Block 6 - Extended Quality And Mandatory E2E.
6. Block 4 - Docs Portfolio Rationalization.
7. Block 7 - Optional API/Postman Lane Maturity.

Rationale:

- Frontend test expansion closes the most concrete quality asymmetry.
- Manifest hygiene is low-risk and required before public release.
- CSP policy needs careful hardening after trust docs are already in place.
- Dependency review and E2E lanes should be added before public beta.
- Docs rationalization should happen after the new lanes settle, not before.

## 12. Stop Conditions

Stop and ask the operator before continuing if:

- A block requires new dependencies.
- A block requires signing secrets or release credentials.
- A block would make optional live provider tests mandatory.
- An E2E lane is flaky or requires GUI interaction in default CI.
- A proposed CSP change breaks custom LLM endpoints.
- A docs archive move would hide still-current release instructions.
- A Postman lane requires adding a production API surface.
