# Replyline Documentation Inventory

Финальный каталог после реструктуризации. Здесь фиксируется текущая роль
каждого `*.md` в корне репозитория и каждого `docs/**/*.md`, а также
минимальная целевая активная структура для следующего cleanup-блока.

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

## Active Product And Tester Docs

| path | audience | final status | purpose | minimum target action |
| --- | --- | --- | --- | --- |
| `docs/README.md` | mixed | `canonical` | Финальная role-based карта документации. | `keep active` |
| `docs/product/user-guide.md` | public user | `canonical` | Компактный user guide: setup, settings, flows, exports, troubleshooting, accessibility. | `keep active` |
| `docs/beta-doctor.md` | beta tester | `canonical` | `pnpm beta:doctor` readiness guide. | `keep concise active guide` |
| `docs/beta-smoke-report.md` | beta tester | `canonical` | Sanitized smoke-report generation and sharing. | `keep concise active guide` |
| `docs/accessibility.md` | public user | `compatibility stub` | Legacy keyboard/accessibility entrypoint. | `keep short stub` |
| `docs/candidate-pack.md` | beta tester | `compatibility stub` | Legacy Candidate Pack entrypoint. | `keep short stub` |
| `docs/error-catalog.md` | beta tester | `compatibility stub` | `docs/reference/errors.md` | `delete stub after next beta tag` |
| `docs/glossary.md` | mixed | `supporting` | Shared vocabulary for product and engineering docs. | `keep active` |
| `docs/interview-mode.md` | beta tester | `compatibility stub` | Legacy Interview Mode entrypoint. | `keep short stub` |
| `docs/product/limitations.md` | public user | `canonical` | Current beta scope, installer truth, and non-shipped tracks. | `keep active` |
| `docs/product/privacy.md` | public user | `canonical` | Capture, storage, provider, and export trust boundary. | `keep active` |
| `docs/settings-reference.md` | beta tester | `compatibility stub` | Legacy settings entrypoint. | `keep short stub` |
| `docs/smoke-checks.md` | beta tester | `canonical` | Manual smoke checklist. | `keep active` |
| `docs/testing-stack-setup.md` | beta tester/contributor | `compatibility stub` | Legacy testing setup entrypoint. | `keep short stub` |
| `docs/troubleshooting.md` | beta tester | `compatibility stub` | Legacy troubleshooting entrypoint. | `keep short stub` |

## Active Engineering And Operator Docs

| path | audience | final status | purpose | minimum target action |
| --- | --- | --- | --- | --- |
| `docs/adr/0001-interview-card-engine.md` | contributor | `canonical` | ADR for interview-card architecture split. | `archive` |
| `docs/architecture.md` | contributor | `canonical` | High-level system structure and code boundaries. | `keep active` |
| `docs/benchmark-policy.md` | contributor | `supporting` | Short runtime-claim label shorthand; canonical rules live in `docs/engineering/runtime.md`. | `archive` |
| `docs/copy-rules.md` | contributor | `canonical` | Product/trust wording guardrails. | `archive` |
| `docs/doc-inventory.md` | contributor | `canonical` | Final documentation inventory and status map. | `archive` |
| `docs/engineering/manual-qa.md` | release operator | `canonical` | Manual QA checklist. | `keep active` |
| `docs/engineering/operations.md` | release operator | `canonical` | Compact beta/operator guide for intake, routing, diagnostics, sharing, and stale policy. | `keep active` |
| `docs/engineering/release.md` | release operator | `canonical` | Release decision, freeze, packaging, and handoff truth. | `keep active` |
| `docs/engineering/runtime.md` | release operator/contributor | `canonical` | Runtime proof, evidence, and claim-label guide. | `keep active` |
| `docs/reference/errors.md` | release operator/contributor | `canonical` | Canonical error and diagnostics reference. | `keep active` |
| `docs/engineering/testing.md` | contributor | `canonical` | Test profiles, verification lanes, fixture boundaries, E2E policy, lifecycle, and CI alignment. | `keep active` |
| `docs/engineering/verification.md` | contributor | `compatibility stub` | Legacy verification entrypoint. | `keep short stub` |
| `docs/interview-golden-dataset-v1.md` | contributor | `supporting` | Interview dataset reference note. | `keep active` |
| `docs/interview-quality.md` | contributor | `compatibility stub` | Legacy interview-quality entrypoint. | `keep short stub` |
| `docs/model-ladder.md` | contributor | `canonical` | Model/provider selection policy. | `archive` |
| `docs/observability-v2.md` | contributor | `compatibility stub` | `docs/reference/errors.md` | `delete stub after next beta tag` |
| `docs/product-scenario-benchmark.md` | contributor | `compatibility stub` | Legacy product-scenarios entrypoint. | `keep short stub` |
| `docs/prompt-contract-lane.md` | contributor | `supporting` | Prompt-contract lane specifics with canonical policy in testing guide. | `keep active` |
| `docs/release-checklist.md` | release operator | `canonical` | Release execution checklist. | `merge into engineering/operations.md` |
| `docs/rust-dependency-security.md` | contributor | `canonical` | Rust dependency review and security policy. | `archive` |
| `docs/runtime-decisions.md` | contributor | `canonical` | Runtime architecture decisions and anti-goals. | `archive` |
| `docs/runtime-persistence-debug.md` | contributor | `compatibility stub` | `docs/reference/errors.md` | `delete stub after next beta tag` |
| `docs/runtime-probe-credentials.md` | contributor | `canonical` | Runtime probe credential setup. | `merge into engineering/operations.md` |
| `docs/runtime-scenario-matrix.md` | contributor | `supporting` | Deterministic runtime scenario coverage map. | `keep active` |
| `docs/script-lifecycle-matrix.md` | contributor | `compatibility stub` | Legacy lifecycle entrypoint. | `keep short stub` |
| `docs/secrets-management.md` | contributor | `compatibility stub` | `docs/engineering/runtime.md` | `delete stub after next beta tag` |
| `docs/test-inventory.md` | contributor | `supporting` | Historical audit note from test-surface cleanup. | `keep concise` |
| `docs/test-quality-fixtures.md` | contributor | `compatibility stub` | Legacy fixture-boundary entrypoint. | `keep short stub` |
| `docs/ui-layout-contract.md` | contributor | `canonical` | Desktop UI layout contract. | `archive` |

## Compatibility Stubs

| path | audience | final status | canonical target | minimum target action |
| --- | --- | --- | --- | --- |
| `docs/known-limitations.md` | public user | `compatibility stub` | `docs/product/limitations.md` | `delete stub after next beta tag` |
| `docs/live-runtime-matrix.md` | release operator | `compatibility stub` | `docs/engineering/runtime.md` | `delete stub after next beta tag` |
| `docs/manual-ui-qa.md` | release operator | `compatibility stub` | `docs/engineering/manual-qa.md` | `delete stub after next beta tag` |
| `docs/manual-visual-qa.md` | release operator | `compatibility stub` | `docs/engineering/manual-qa.md` | `delete stub after next beta tag` |
| `docs/manual-windows-ux-qa.md` | release operator | `compatibility stub` | `docs/engineering/manual-qa.md` | `delete stub after next beta tag` |
| `docs/beta-feedback-loop.md` | release operator | `compatibility stub` | `docs/engineering/operations.md` | `delete stub after next beta tag` |
| `docs/beta-ops-diagnostics.md` | release operator | `compatibility stub` | `docs/engineering/operations.md` and `docs/reference/errors.md` | `delete stub after next beta tag` |
| `docs/github-beta-operations-kit.md` | release operator | `compatibility stub` | `docs/engineering/operations.md` | `delete stub after next beta tag` |
| `docs/privacy-and-trust.md` | public user | `compatibility stub` | `docs/product/privacy.md` | `delete stub after next beta tag` |
| `docs/privacy-policy.md` | public user | `compatibility stub` | `docs/product/privacy.md` | `delete stub after next beta tag` |
| `docs/public-vs-local-artifacts.md` | release operator | `compatibility stub` | `docs/engineering/operations.md` | `delete stub after next beta tag` |
| `docs/release-freeze-matrix.md` | release operator | `compatibility stub` | `docs/engineering/release.md` | `delete stub after next beta tag` |
| `docs/release-incident-classification.md` | release operator | `compatibility stub` | `docs/engineering/release.md` | `delete stub after next beta tag` |
| `docs/release-local-readiness.md` | release operator | `compatibility stub` | `docs/engineering/release.md` | `delete stub after next beta tag` |
| `docs/release-readiness.md` | release operator | `compatibility stub` | `docs/engineering/release.md` | `delete stub after next beta tag` |
| `docs/runtime-bringup.md` | mixed | `compatibility stub` | `docs/engineering/runtime.md` | `delete stub after next beta tag` |
| `docs/runtime-evidence.md` | mixed | `compatibility stub` | `docs/engineering/runtime.md` | `delete stub after next beta tag` |
| `docs/runtime-live-qa.md` | mixed | `compatibility stub` | `docs/engineering/runtime.md` and `docs/engineering/manual-qa.md` | `delete stub after next beta tag` |
| `docs/runtime-quality-harness.md` | contributor | `compatibility stub` | `docs/engineering/runtime.md` | `delete stub after next beta tag` |
| `docs/stale-beta-policy.md` | release operator | `compatibility stub` | `docs/engineering/operations.md` | `delete stub after next beta tag` |
| `docs/test-feedback-template.md` | beta tester | `compatibility stub` | `docs/engineering/manual-qa.md` | `delete stub after next beta tag` |
| `docs/third-party-providers.md` | beta tester | `compatibility stub` | `docs/product/privacy.md` and `docs/product/limitations.md` | `delete stub after next beta tag` |
| `docs/verification-lanes.md` | contributor | `compatibility stub` | `docs/engineering/testing.md` | `delete stub after next beta tag` |

## Historical And Archive Docs

| path | audience | final status | note |
| --- | --- | --- | --- |
| `docs/archive/experimental/bilingual-interview-mode.md` | internal archive | `historical archive` | Experimental concept, explicitly not shipped in the current public beta. |
| `docs/archive/handoff/beta-readiness.md` | internal archive | `historical archive` | Archived handoff plan. |
| `docs/card-schema-v3-migration.md` | internal archive | `historical archive` | Migration note kept for reference only. |
| `docs/release-notes/v0.2.0-beta.1.md` | internal archive | `historical archive` | Historical public beta release note. |
| `docs/releases/v0.2.0-beta.2.md` | internal archive | `historical archive` | Draft/historical release note, not active product guidance. |
| `docs/releases/v0.2.0-beta.2/screenshots/README.md` | internal archive | `historical archive` | Historical screenshot checklist for the beta 2 draft. |

## Current Count Snapshot

- Active root docs count: `6`
- Active product docs count: `10`
- Active engineering/operator docs count: `27`
- Compatibility stubs count: `28`
- Archive docs count: `6`

## Minimum Active Set

Следующий cleanup должен оставить активными только этот набор:

### Root

- `README.md`
- `BETA_TESTING.md`
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `AGENTS.md`

### Docs

- `docs/README.md`
- `docs/product/user-guide.md`
- `docs/product/privacy.md`
- `docs/product/limitations.md`
- `docs/engineering/architecture.md`
- `docs/engineering/testing.md`
- `docs/engineering/runtime.md`
- `docs/engineering/release.md`
- `docs/engineering/operations.md`
- `docs/reference/errors.md`
- `docs/reference/glossary.md`
- `docs/archive/**`

### Cleanup Notes

- `docs/architecture.md` should stay active until its content is moved into `docs/engineering/architecture.md`.
- `docs/glossary.md` should stay active until its content is moved into `docs/reference/glossary.md`.
- Compatibility stubs should remain only until the next beta tag, then be deleted in one sweep after link/backlink verification.
- `docs/doc-inventory.md` is an audit/planning artifact for this phase and should be archived once the cleanup lands.

## Out Of Scope Generated Artifacts

Эти markdown-файлы были зачеканы на ссылки, но не являются частью активной
карты документации:

- `reports/*.md` - generated reports/evidence artifacts
- `tests/fixtures/runtime-live-evidence/good/runtime-live-qa.md` - test fixture
