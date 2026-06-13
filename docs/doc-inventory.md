# Replyline Documentation Inventory

Финальный каталог после реструктуризации. Здесь фиксируется текущая роль
каждого `*.md` в корне репозитория и каждого `docs/**/*.md`.

## Status Legend

- `entrypoint` - основная точка входа.
- `canonical` - активный source of truth.
- `supporting` - активный вспомогательный документ.
- `compatibility stub` - короткий redirect для старых ссылок; новой политики здесь быть не должно.
- `historical archive` - история/черновик/архив; не использовать как active guidance.

## Root Docs

| path | audience | final status | purpose |
| --- | --- | --- | --- |
| `README.md` | public user | `entrypoint` | Главная product/start page. |
| `BETA_TESTING.md` | beta tester | `entrypoint` | Короткий beta smoke path для тестеров. |
| `CHANGELOG.md` | public user | `supporting` | Публичная история релизов и draft notes. |
| `CONTRIBUTING.md` | contributor | `entrypoint` | Канонический contributor workflow и verify lanes. |
| `CODE_OF_CONDUCT.md` | contributor | `supporting` | Community policy. |
| `AGENTS.md` | contributor/automation | `canonical` | Repo-wide automation contract. |

## Active Product Docs

| path | audience | final status | purpose |
| --- | --- | --- | --- |
| `docs/README.md` | mixed | `canonical` | Финальная role-based карта документации. |
| `docs/product/user-guide.md` | public user | `canonical` | Компактный user guide: setup, settings, flows, exports, troubleshooting, accessibility. |
| `docs/product/privacy.md` | public user | `canonical` | Capture, storage, provider, and export trust boundary. |
| `docs/product/limitations.md` | public user | `canonical` | Current beta scope, installer truth, and non-shipped tracks. |
| `docs/reference/errors.md` | mixed | `canonical` | Canonical error and diagnostics reference. |
| `docs/reference/glossary.md` | mixed | `canonical` | Shared vocabulary for product and engineering docs. |
| `docs/beta-doctor.md` | beta tester | `canonical` | `pnpm beta:doctor` readiness guide. |
| `docs/beta-smoke-report.md` | beta tester | `canonical` | Sanitized smoke-report generation and sharing. |
| `docs/smoke-checks.md` | beta tester | `canonical` | Manual smoke checklist. |

## Active Engineering And Operator Docs

| path | audience | final status | purpose |
| --- | --- | --- | --- |
| `docs/engineering/architecture.md` | contributor | `canonical` | High-level system structure and code boundaries. |
| `docs/engineering/testing.md` | contributor | `canonical` | Test profiles, verification lanes, fixture boundaries, E2E policy, lifecycle, and CI alignment. |
| `docs/engineering/runtime.md` | release operator/contributor | `canonical` | Runtime proof, evidence, and claim-label guide. |
| `docs/engineering/release.md` | release operator | `canonical` | Release decision, freeze, packaging, and handoff truth. |
| `docs/engineering/operations.md` | release operator | `canonical` | Compact beta/operator guide for intake, routing, diagnostics, sharing, and stale policy. |
| `docs/engineering/manual-qa.md` | release operator | `canonical` | Manual QA checklist. |
| `docs/copy-rules.md` | contributor | `canonical` | Product/trust wording guardrails. |
| `docs/adr/0001-interview-card-engine.md` | contributor | `supporting` | ADR for interview-card architecture split. |
| `docs/benchmark-policy.md` | contributor | `supporting` | Runtime-claim label shorthand. |
| `docs/interview-golden-dataset-v1.md` | contributor | `supporting` | Interview dataset reference note. |
| `docs/model-ladder.md` | contributor | `supporting` | Model/provider selection policy. |
| `docs/prompt-contract-lane.md` | contributor | `supporting` | Prompt-contract lane specifics. |
| `docs/release-checklist.md` | release operator | `supporting` | Release execution checklist. |
| `docs/runtime-decisions.md` | contributor | `supporting` | Runtime architecture decisions and anti-goals. |
| `docs/runtime-probe-credentials.md` | contributor | `supporting` | Runtime probe credential setup. |
| `docs/runtime-scenario-matrix.md` | contributor | `supporting` | Deterministic runtime scenario coverage map. |
| `docs/rust-dependency-security.md` | contributor | `supporting` | Rust dependency review and security policy. |
| `docs/test-inventory.md` | contributor | `supporting` | Historical audit note from test-surface cleanup. |
| `docs/ui-layout-contract.md` | contributor | `supporting` | Desktop UI layout contract. |

## Compatibility Stubs (forward-only redirects)

| path | canonical target |
| --- | --- |
| `docs/architecture.md` | `docs/engineering/architecture.md` |
| `docs/glossary.md` | `docs/reference/glossary.md` |
| `docs/accessibility.md` | `docs/product/user-guide.md` |
| `docs/candidate-pack.md` | `docs/product/user-guide.md` |
| `docs/interview-mode.md` | `docs/product/user-guide.md` |
| `docs/settings-reference.md` | `docs/product/user-guide.md` |
| `docs/troubleshooting.md` | `docs/product/user-guide.md` |
| `docs/interview-quality.md` | `docs/engineering/testing.md` |
| `docs/product-scenario-benchmark.md` | `docs/engineering/testing.md` |
| `docs/script-lifecycle-matrix.md` | `docs/engineering/testing.md` |
| `docs/test-quality-fixtures.md` | `docs/engineering/testing.md` |

## Historical And Archive Docs

| path | audience | final status | note |
| --- | --- | --- | --- |
| `docs/archive/experimental/bilingual-interview-mode.md` | internal archive | `historical archive` | Experimental concept, explicitly not shipped in the current public beta. |
| `docs/archive/handoff/beta-readiness.md` | internal archive | `historical archive` | Archived handoff plan. |
| `docs/release-notes/v0.2.0-beta.1.md` | internal archive | `historical archive` | Historical public beta release note. |

## Current Count Snapshot

- Active canonical docs: `25`
- Compatibility stubs: `11`
- Archive docs: `3`

## Out Of Scope Generated Artifacts

- `reports/*.md` - generated reports/evidence artifacts
- `tests/fixtures/runtime-live-evidence/good/runtime-live-qa.md` - test fixture
