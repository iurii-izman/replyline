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

## Active Product And Tester Docs

| path | audience | final status | purpose |
| --- | --- | --- | --- |
| `docs/README.md` | mixed | `canonical` | Финальная role-based карта документации. |
| `docs/accessibility.md` | public user | `supporting` | Keyboard и accessibility notes. |
| `docs/beta-doctor.md` | beta tester | `canonical` | `pnpm beta:doctor` readiness guide. |
| `docs/beta-smoke-report.md` | beta tester | `canonical` | Sanitized smoke-report generation and sharing. |
| `docs/candidate-pack.md` | beta tester | `canonical` | Candidate Pack flow, boundaries, and storage. |
| `docs/error-catalog.md` | beta tester | `canonical` | User-facing error reference. |
| `docs/glossary.md` | mixed | `supporting` | Shared vocabulary for product and engineering docs. |
| `docs/interview-mode.md` | beta tester | `canonical` | Interview Mode workflow and report/export boundary. |
| `docs/product/limitations.md` | public user | `canonical` | Current beta scope, installer truth, and non-shipped tracks. |
| `docs/product/privacy.md` | public user | `canonical` | Capture, storage, provider, and export trust boundary. |
| `docs/settings-reference.md` | beta tester | `canonical` | Current settings surface and sensitive options. |
| `docs/smoke-checks.md` | beta tester | `canonical` | Manual smoke checklist. |
| `docs/testing-stack-setup.md` | beta tester/contributor | `supporting` | Local test environment setup. |
| `docs/troubleshooting.md` | beta tester | `canonical` | Setup/runtime troubleshooting guide. |

## Active Engineering And Operator Docs

| path | audience | final status | purpose |
| --- | --- | --- | --- |
| `docs/adr/0001-interview-card-engine.md` | contributor | `canonical` | ADR for interview-card architecture split. |
| `docs/architecture.md` | contributor | `canonical` | High-level system structure and code boundaries. |
| `docs/benchmark-policy.md` | contributor | `supporting` | Short runtime-claim label shorthand; canonical rules live in `docs/engineering/runtime.md`. |
| `docs/beta-feedback-loop.md` | release operator | `canonical` | Feedback intake and follow-up loop. |
| `docs/beta-ops-diagnostics.md` | release operator | `canonical` | Operator diagnostics runbook. |
| `docs/copy-rules.md` | contributor | `canonical` | Product/trust wording guardrails. |
| `docs/doc-inventory.md` | contributor | `canonical` | Final documentation inventory and status map. |
| `docs/engineering/manual-qa.md` | release operator | `canonical` | Manual QA checklist. |
| `docs/engineering/release.md` | release operator | `canonical` | Release decision, freeze, packaging, and handoff truth. |
| `docs/engineering/runtime.md` | release operator/contributor | `canonical` | Runtime proof, evidence, and claim-label guide. |
| `docs/engineering/verification.md` | contributor | `canonical` | Verify lanes and lane boundaries. |
| `docs/github-beta-operations-kit.md` | release operator | `canonical` | GitHub-side beta operations guide. |
| `docs/interview-golden-dataset-v1.md` | contributor | `canonical` | Interview evaluation dataset spec. |
| `docs/interview-quality.md` | contributor | `canonical` | Interview quality gate and reporting contract. |
| `docs/model-ladder.md` | contributor | `canonical` | Model/provider selection policy. |
| `docs/observability-v2.md` | contributor | `canonical` | Observability and logging design contract. |
| `docs/product-scenario-benchmark.md` | contributor | `canonical` | Product benchmark method and scenario framing. |
| `docs/prompt-contract-lane.md` | contributor | `canonical` | Prompt-contract lane definition. |
| `docs/public-vs-local-artifacts.md` | release operator | `canonical` | Public vs local artifact sharing policy. |
| `docs/release-checklist.md` | release operator | `canonical` | Release execution checklist. |
| `docs/rust-dependency-security.md` | contributor | `canonical` | Rust dependency review and security policy. |
| `docs/runtime-decisions.md` | contributor | `canonical` | Runtime architecture decisions and anti-goals. |
| `docs/runtime-persistence-debug.md` | contributor | `canonical` | Local persistence/debug guide. |
| `docs/runtime-probe-credentials.md` | contributor | `canonical` | Runtime probe credential setup. |
| `docs/runtime-scenario-matrix.md` | contributor | `canonical` | Deterministic runtime scenario coverage map. |
| `docs/script-lifecycle-matrix.md` | contributor | `canonical` | Script ownership and lifecycle matrix. |
| `docs/secrets-management.md` | contributor | `canonical` | Secrets handling guide. |
| `docs/stale-beta-policy.md` | release operator | `canonical` | Stale beta handling policy. |
| `docs/test-inventory.md` | contributor | `canonical` | Test surface inventory and ownership map. |
| `docs/test-quality-fixtures.md` | contributor | `canonical` | Fixture and test-quality guidance. |
| `docs/ui-layout-contract.md` | contributor | `canonical` | Desktop UI layout contract. |

## Compatibility Stubs

| path | audience | final status | canonical target |
| --- | --- | --- | --- |
| `docs/known-limitations.md` | public user | `compatibility stub` | `docs/product/limitations.md` |
| `docs/live-runtime-matrix.md` | release operator | `compatibility stub` | `docs/engineering/runtime.md` |
| `docs/manual-ui-qa.md` | release operator | `compatibility stub` | `docs/engineering/manual-qa.md` |
| `docs/manual-visual-qa.md` | release operator | `compatibility stub` | `docs/engineering/manual-qa.md` |
| `docs/manual-windows-ux-qa.md` | release operator | `compatibility stub` | `docs/engineering/manual-qa.md` |
| `docs/privacy-and-trust.md` | public user | `compatibility stub` | `docs/product/privacy.md` |
| `docs/privacy-policy.md` | public user | `compatibility stub` | `docs/product/privacy.md` |
| `docs/release-freeze-matrix.md` | release operator | `compatibility stub` | `docs/engineering/release.md` |
| `docs/release-incident-classification.md` | release operator | `compatibility stub` | `docs/engineering/release.md` |
| `docs/release-local-readiness.md` | release operator | `compatibility stub` | `docs/engineering/release.md` |
| `docs/release-readiness.md` | release operator | `compatibility stub` | `docs/engineering/release.md` |
| `docs/runtime-bringup.md` | mixed | `compatibility stub` | `docs/engineering/runtime.md` |
| `docs/runtime-evidence.md` | mixed | `compatibility stub` | `docs/engineering/runtime.md` |
| `docs/runtime-live-qa.md` | mixed | `compatibility stub` | `docs/engineering/runtime.md` and `docs/engineering/manual-qa.md` |
| `docs/runtime-quality-harness.md` | contributor | `compatibility stub` | `docs/engineering/runtime.md` |
| `docs/test-feedback-template.md` | beta tester | `compatibility stub` | `docs/engineering/manual-qa.md` |
| `docs/third-party-providers.md` | beta tester | `compatibility stub` | `docs/product/privacy.md` and `docs/product/limitations.md` |
| `docs/verification-lanes.md` | contributor | `compatibility stub` | `docs/engineering/verification.md` |

## Historical And Archive Docs

| path | audience | final status | note |
| --- | --- | --- | --- |
| `docs/archive/experimental/bilingual-interview-mode.md` | internal archive | `historical archive` | Experimental concept, explicitly not shipped in the current public beta. |
| `docs/archive/handoff/beta-readiness.md` | internal archive | `historical archive` | Archived handoff plan. |
| `docs/card-schema-v3-migration.md` | internal archive | `historical archive` | Migration note kept for reference only. |
| `docs/release-notes/v0.2.0-beta.1.md` | internal archive | `historical archive` | Historical public beta release note. |
| `docs/releases/v0.2.0-beta.2.md` | internal archive | `historical archive` | Draft/historical release note, not active product guidance. |
| `docs/releases/v0.2.0-beta.2/screenshots/README.md` | internal archive | `historical archive` | Historical screenshot checklist for the beta 2 draft. |

## Out Of Scope Generated Artifacts

Эти markdown-файлы были зачеканы на ссылки, но не являются частью активной
карты документации:

- `reports/*.md` - generated reports/evidence artifacts
- `tests/fixtures/runtime-live-evidence/good/runtime-live-qa.md` - test fixture
