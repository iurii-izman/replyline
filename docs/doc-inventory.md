# Replyline Documentation Inventory

Инвентаризация текущих markdown-документов и минимальная целевая структура без
перемещений/удалений на этом шаге.

## Proposed Minimal Target Structure

- `README.md`, `BETA_TESTING.md`, `CHANGELOG.md`, `CONTRIBUTING.md`: корневые
  точки входа.
- `docs/product/`: пользовательские и beta-facing product docs.
- `docs/testing/`: smoke, QA, verification, tester workflows.
- `docs/ops/`: release, handoff, evidence, operator runbooks.
- `docs/engineering/`: architecture, ADR, contracts, internal technical guides.
- `docs/archive/`: historical release notes, migration notes, superseded docs.

## Inventory

| path | current role | audience | keep / merge / archive / delete candidate | proposed destination | reason |
| --- | --- | --- | --- | --- | --- |
| `README.md` | Repo landing and product overview | public user | keep | `README.md` | Public entry point; should stay short and honest about beta posture. |
| `BETA_TESTING.md` | 15-minute beta tester guide | beta tester | keep | `BETA_TESTING.md` | Canonical tester entry point; already linked from root docs. |
| `CHANGELOG.md` | Version history | public user | keep | `CHANGELOG.md` | Standard public release history. |
| `CODE_OF_CONDUCT.md` | Community policy | contributor | keep | `CODE_OF_CONDUCT.md` | Standard repo governance document. |
| `CONTRIBUTING.md` | Contribution and verification workflow | contributor | keep | `CONTRIBUTING.md` | Canonical contributor workflow and checks. |
| `AGENTS.md` | AI-agent repository policy | contributor | keep | `AGENTS.md` | Repo-wide automation contract; not product docs, but active developer docs. |
| `.github/SECURITY.md` | Security reporting policy | public user | keep | `.github/SECURITY.md` | Public GitHub security route should remain separate. |
| `.github/SUPPORT.md` | Support routing | public user | keep | `.github/SUPPORT.md` | Public GitHub support routing. |
| `.github/PULL_REQUEST_TEMPLATE.md` | Default PR checklist | contributor | keep | `.github/PULL_REQUEST_TEMPLATE.md` | Active contributor template. |
| `.github/PULL_REQUEST_TEMPLATE/beta-handoff.md` | Beta handoff PR checklist | release operator | keep | `.github/PULL_REQUEST_TEMPLATE/beta-handoff.md` | Release/operator PR checklist, not beta-user docs. |
| `.github/ISSUE_TEMPLATE/beta_handoff_release.md` | Legacy markdown beta handoff issue template | release operator | delete candidate | `.github/ISSUE_TEMPLATE/beta_handoff_release.yml` | Markdown issue template overlaps with newer form-based templates and should not remain the long-term surface. |
| `.github/copilot-instructions.md` | IDE assistant guidance | contributor | keep | `.github/copilot-instructions.md` | Developer-only automation context. |
| `docs/README.md` | Docs index | contributor | keep | `docs/README.md` | Keep as thin directory index, not as a second product README. |
| `docs/doc-inventory.md` | Documentation inventory and restructure map | contributor | keep | `docs/doc-inventory.md` | Working map for cleanup sequencing. |
| `docs/accessibility.md` | Keyboard and accessibility notes | public user | keep | `docs/product/accessibility.md` | End-user capability reference. |
| `docs/bilingual-interview-mode.md` | Bilingual interview mode description | beta tester | keep | `docs/product/bilingual-interview-mode.md` | User-facing mode doc; should stay clearly beta-scoped. |
| `docs/candidate-pack.md` | Candidate Pack behavior and boundaries | beta tester | keep | `docs/product/candidate-pack.md` | Active beta feature documentation. |
| `docs/error-catalog.md` | Error code reference | beta tester | keep | `docs/product/error-catalog.md` | User-facing troubleshooting companion. |
| `docs/glossary.md` | Product glossary | public user | keep | `docs/product/glossary.md` | Useful shared vocabulary for public/beta docs. |
| `docs/interview-mode.md` | Interview Mode workflow | beta tester | keep | `docs/product/interview-mode.md` | Core beta-mode documentation. |
| `docs/known-limitations.md` | Legacy limitations entrypoint | public user | keep as stub | `docs/product/limitations.md` | Preserve existing links while canonical source moves. |
| `docs/privacy-policy.md` | Legacy privacy/data-flow entrypoint | public user | keep as stub | `docs/product/privacy.md` | Preserve existing links while canonical source moves. |
| `docs/privacy-and-trust.md` | Legacy privacy/trust explainer | public user | keep as stub | `docs/product/privacy.md` | Preserve existing links while canonical source moves. |
| `docs/settings-reference.md` | Settings surface reference | beta tester | keep | `docs/product/settings-reference.md` | User-facing configuration guide. |
| `docs/third-party-providers.md` | Legacy provider route and caveats | beta tester | keep as stub | `docs/product/privacy.md` + `docs/product/limitations.md` | Provider boundaries now live inside canonical public docs. |
| `docs/troubleshooting.md` | Problem-solving guide | beta tester | keep | `docs/product/troubleshooting.md` | User-facing support doc. |
| `docs/beta-doctor.md` | `beta:doctor` setup/diagnostic guide | beta tester | keep | `docs/testing/beta-doctor.md` | Belongs with tester setup and readiness checks. |
| `docs/beta-feedback-loop.md` | Feedback intake and triage loop | release operator | keep | `docs/ops/beta-feedback-loop.md` | Operator workflow, not beta-user reading. |
| `docs/beta-ops-diagnostics.md` | Beta ops diagnostic runbook | release operator | keep | `docs/ops/beta-ops-diagnostics.md` | Internal/operator runbook. |
| `docs/archive/handoff/beta-readiness.md` | Historical beta handoff checklist | internal archive | archive | `docs/engineering/release.md` | Archived after release/handoff guidance was consolidated. |
| `docs/beta-smoke-report.md` | Sanitized smoke report instructions | beta tester | keep | `docs/testing/beta-smoke-report.md` | Active tester-facing reporting guide. |
| `docs/github-beta-operations-kit.md` | GitHub-side beta operations guidance | release operator | keep | `docs/ops/github-beta-operations-kit.md` | Operator-facing process doc, not product docs. |
| `docs/live-runtime-matrix.md` | Live runtime coverage matrix | release operator | merge | `docs/testing/runtime-live-qa.md` | Same operator lane as live QA; should not be split across two docs. |
| `docs/manual-ui-qa.md` | Manual UI checklist | release operator | merge | `docs/testing/manual-qa.md` | Should be one consolidated manual QA checklist. |
| `docs/manual-visual-qa.md` | Manual visual QA checklist | release operator | merge | `docs/testing/manual-qa.md` | Same lane as other manual QA docs. |
| `docs/manual-windows-ux-qa.md` | Manual Windows UX checklist | release operator | merge | `docs/testing/manual-qa.md` | Same lane as other manual QA docs. |
| `docs/public-vs-local-artifacts.md` | Artifact sharing and sensitivity rules | release operator | keep | `docs/ops/public-vs-local-artifacts.md` | Important operator trust boundary; not general user-facing docs. |
| `docs/release-checklist.md` | Release execution checklist | release operator | keep | `docs/ops/release-checklist.md` | Internal release procedure. |
| `docs/release-freeze-matrix.md` | Redirect stub to engineering release guide | release operator | keep | `docs/engineering/release.md` | Kept as a compatibility link for existing references. |
| `docs/release-incident-classification.md` | Redirect stub to engineering release guide | release operator | keep | `docs/engineering/release.md` | Kept as a compatibility link for existing references. |
| `docs/release-local-readiness.md` | Redirect stub to engineering release guide | release operator | keep | `docs/engineering/release.md` | Old path kept only for compatibility. |
| `docs/release-readiness.md` | Redirect stub to engineering release guide | release operator | keep | `docs/engineering/release.md` | Old path kept only for compatibility. |
| `docs/runtime-evidence.md` | Runtime evidence policy and claim labels | release operator | keep | `docs/ops/runtime-evidence.md` | Canonical evidence/claim policy. |
| `docs/runtime-live-qa.md` | Live runtime QA runbook | release operator | keep | `docs/testing/runtime-live-qa.md` | Main operator/tester live-validation guide. |
| `docs/smoke-checks.md` | Manual smoke checklist | beta tester | keep | `docs/testing/smoke-checks.md` | Canonical smoke path for testers. |
| `docs/stale-beta-policy.md` | Stale beta handling policy | release operator | keep | `docs/ops/stale-beta-policy.md` | Operator-only release hygiene doc. |
| `docs/test-feedback-template.md` | Test feedback template | beta tester | keep | `docs/testing/test-feedback-template.md` | Tester-facing reporting template. |
| `docs/test-inventory.md` | Test surface inventory | contributor | keep | `docs/engineering/test-inventory.md` | Engineering inventory, not end-user docs. |
| `docs/testing-stack-setup.md` | Test environment setup | contributor | keep | `docs/testing/testing-stack-setup.md` | Contributor/tester setup doc. |
| `docs/verification-lanes.md` | Verification profile model | contributor | keep | `docs/testing/verification-lanes.md` | Active verification reference. |
| `docs/architecture.md` | System architecture overview | contributor | keep | `docs/engineering/architecture.md` | Canonical engineering architecture doc. |
| `docs/adr/0001-interview-card-engine.md` | Architecture decision record | contributor | keep | `docs/engineering/adr/0001-interview-card-engine.md` | ADR should stay preserved and isolated. |
| `docs/benchmark-policy.md` | Performance/evidence labeling policy | contributor | merge | `docs/ops/runtime-evidence.md` | Claim-label policy is tightly coupled to runtime evidence and need not live separately. |
| `docs/card-schema-v3-migration.md` | Historical migration note | internal archive | archive | `docs/archive/card-schema-v3-migration.md` | Historical migration doc should not look like active shipped guidance. |
| `docs/copy-rules.md` | Product/trust wording contract | contributor | keep | `docs/engineering/copy-rules.md` | Active repo policy doc for docs/product copy. |
| `docs/interview-golden-dataset-v1.md` | Interview evaluation dataset spec | contributor | keep | `docs/engineering/interview-golden-dataset-v1.md` | Internal evaluation asset spec. |
| `docs/interview-quality.md` | Interview quality gate | contributor | keep | `docs/engineering/interview-quality.md` | Engineering quality contract. |
| `docs/model-ladder.md` | Model/provider selection ladder | contributor | keep | `docs/engineering/model-ladder.md` | Technical provider/model policy. |
| `docs/observability-v2.md` | Observability/logging design | contributor | keep | `docs/engineering/observability-v2.md` | Internal technical contract. |
| `docs/product-scenario-benchmark.md` | Product scenario benchmark method | contributor | keep | `docs/engineering/product-scenario-benchmark.md` | Internal benchmark method, not product docs. |
| `docs/prompt-contract-lane.md` | Prompt contract verification lane | contributor | keep | `docs/engineering/prompt-contract-lane.md` | Engineering contract doc. |
| `docs/runtime-bringup.md` | Runtime bring-up guide | contributor | keep | `docs/testing/runtime-bringup.md` | Setup/verification guide fits testing lane better than product docs. |
| `docs/runtime-decisions.md` | Runtime architecture decisions | contributor | keep | `docs/engineering/runtime-decisions.md` | Internal design rationale. |
| `docs/runtime-persistence-debug.md` | Local persistence/debug guide | contributor | keep | `docs/engineering/runtime-persistence-debug.md` | Internal troubleshooting for developers/operators. |
| `docs/runtime-probe-credentials.md` | Probe credentials setup | contributor | keep | `docs/engineering/runtime-probe-credentials.md` | Internal runtime probe setup, not beta-user docs. |
| `docs/runtime-quality-harness.md` | Synthetic runtime quality harness | contributor | keep | `docs/engineering/runtime-quality-harness.md` | Engineering validation framework. |
| `docs/runtime-scenario-matrix.md` | Deterministic runtime scenario matrix | contributor | keep | `docs/engineering/runtime-scenario-matrix.md` | Internal scenario coverage reference. |
| `docs/rust-dependency-security.md` | Rust dependency review policy | contributor | keep | `docs/engineering/rust-dependency-security.md` | Internal dependency/security policy. |
| `docs/script-lifecycle-matrix.md` | Script lifecycle and ownership matrix | contributor | keep | `docs/engineering/script-lifecycle-matrix.md` | Engineering maintenance inventory. |
| `docs/secrets-management.md` | Secrets handling guide | contributor | keep | `docs/engineering/secrets-management.md` | Internal security/setup doc. |
| `docs/test-quality-fixtures.md` | Test fixtures guidance | contributor | keep | `docs/engineering/test-quality-fixtures.md` | Internal testing guidance. |
| `docs/ui-layout-contract.md` | UI layout contract | contributor | keep | `docs/engineering/ui-layout-contract.md` | Internal UI contract. |
| `docs/release-notes/v0.2.0-beta.1.md` | Historical beta release notes | internal archive | archive | `docs/release-notes/v0.2.0-beta.1.md` | Historical release note moved out of the visible release draft area. |
| `docs/releases/v0.2.0-beta.2.md` | Draft/historical beta release notes | internal archive | archive | `docs/archive/releases/v0.2.0-beta.2.md` | Draft release note should not appear as active shipped guidance. |
| `docs/releases/v0.2.0-beta.2/screenshots/README.md` | Screenshot checklist for a past release | internal archive | archive | `docs/archive/releases/v0.2.0-beta.2/screenshots/README.md` | Release-artifact helper for a past beta, not active docs. |

## Duplicate And Ambiguous Groups

### Privacy / provider / limitations overlap

- `docs/product/privacy.md` is the single canonical public privacy/trust/data-flow doc.
- `docs/privacy-policy.md`, `docs/privacy-and-trust.md`, and `docs/third-party-providers.md` remain as redirect stubs for link stability.
- `docs/product/limitations.md` is the canonical public limitations doc.
- `docs/known-limitations.md` remains as a redirect stub for link stability.

### Runtime / evidence / QA overlap

- `docs/runtime-evidence.md` is the right canonical policy doc for claim labels
  and evidence meaning.
- `docs/live-runtime-matrix.md` and `docs/runtime-live-qa.md` belong to the same
  live-validation lane and should converge.
- `docs/manual-ui-qa.md`, `docs/manual-visual-qa.md`, and
  `docs/manual-windows-ux-qa.md` should become one manual QA checklist.
- `docs/smoke-checks.md`, `docs/runtime-bringup.md`, and `docs/beta-smoke-report.md`
  are adjacent but serve different moments; they should stay separate and cross-link
  rather than drift into copy-pasted checklists.

### Release / handoff docs not needed by beta users

- `docs/archive/handoff/beta-readiness.md`
- `docs/beta-feedback-loop.md`
- `docs/beta-ops-diagnostics.md`
- `docs/github-beta-operations-kit.md`
- `docs/public-vs-local-artifacts.md`
- `docs/release-checklist.md`
- `docs/release-freeze-matrix.md`
- `docs/release-incident-classification.md`
- `docs/release-local-readiness.md`
- `docs/release-readiness.md`
- `docs/engineering/release.md`
- `docs/stale-beta-policy.md`
- `.github/PULL_REQUEST_TEMPLATE/beta-handoff.md`
- `.github/ISSUE_TEMPLATE/beta_handoff_release.md`

These should remain available for operators/contributors but should not read like
primary beta-user documentation in the eventual docs IA.

### Experimental / future / historical docs that should not look shipped

- `docs/card-schema-v3-migration.md`
- `docs/release-notes/v0.2.0-beta.1.md`
- `docs/releases/v0.2.0-beta.2.md`
- `docs/releases/v0.2.0-beta.2/screenshots/README.md`

These are better treated as archive/history, not as active product guidance.

## Explicit Non-Inventory Items

These files were reviewed as docs-like artifacts but are not part of the primary
documentation inventory:

- `reports/*.md`: generated evidence/report artifacts, not maintained docs
- `tests/fixtures/runtime-live-evidence/good/runtime-live-qa.md`: test fixture
- `landing/robots.txt`: site config, not documentation
