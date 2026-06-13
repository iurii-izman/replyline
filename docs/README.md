# Replyline Documentation

Start with the public entrypoints:

- [README.md](../README.md) - product overview, setup path, and high-level links.
- [BETA_TESTING.md](../BETA_TESTING.md) - short 15-minute beta smoke test.

Use this page as role-based navigation. For the full document inventory, merge candidates, and archive plan, see [doc-inventory.md](doc-inventory.md).

## Start Here By Role

### Product / beta user

- [product/limitations.md](product/limitations.md) - current beta scope, non-shipped tracks, and platform boundaries.
- [product/privacy.md](product/privacy.md) - canonical capture, storage, provider, and user-control policy.
- [troubleshooting.md](troubleshooting.md) - setup and runtime problem-solving guide.
- [settings-reference.md](settings-reference.md) - active settings surface and configuration reference.

### Beta tester

- [BETA_TESTING.md](../BETA_TESTING.md) - canonical short beta smoke path.
- [beta-doctor.md](beta-doctor.md) - environment readiness and local setup diagnostics.
- [beta-smoke-report.md](beta-smoke-report.md) - sanitized reporting flow after a smoke run.
- [engineering/runtime.md](engineering/runtime.md) - runtime bring-up, evidence, and claim-label guide for local validation.
- [testing-stack-setup.md](testing-stack-setup.md) - local test environment setup for deeper validation.

### Contributor

- [CONTRIBUTING.md](../CONTRIBUTING.md) - canonical contributor workflow and verification lanes.
- [architecture.md](architecture.md) - core system structure and boundaries.
- [copy-rules.md](copy-rules.md) - product/trust wording rules for docs and UI copy.
- [engineering/verification.md](engineering/verification.md) - validation model and lane expectations.

### Release/operator

- [engineering/release.md](engineering/release.md) - canonical engineering release guide, freeze semantics, and packaging truth.
- [release-checklist.md](release-checklist.md) - release execution checklist.
- [engineering/runtime.md](engineering/runtime.md) - runtime evidence policy, proof boundaries, and live validation flow.
- [engineering/manual-qa.md](engineering/manual-qa.md) - compact operator manual QA checklist.
- [public-vs-local-artifacts.md](public-vs-local-artifacts.md) - sharing and sensitivity rules for generated artifacts.
- [github-beta-operations-kit.md](github-beta-operations-kit.md) - GitHub-side beta operations and routing.

### Internal/archive

- [doc-inventory.md](doc-inventory.md) - documentation inventory, merge map, and archive candidates.
- [archive/experimental/bilingual-interview-mode.md](archive/experimental/bilingual-interview-mode.md) - archived experimental bilingual interview concept; not shipped in current public beta.
- [archive/handoff/beta-readiness.md](archive/handoff/beta-readiness.md) - archived beta handoff plan.
- [release-notes/v0.2.0-beta.1.md](release-notes/v0.2.0-beta.1.md) - historical beta release note.
- [releases/v0.2.0-beta.2.md](releases/v0.2.0-beta.2.md) - historical/draft beta release note.
- [card-schema-v3-migration.md](card-schema-v3-migration.md) - historical migration note.

## Secondary Docs

These docs stay available, but they are not part of the main visible role map on this page:

- to be merged/archived: see [doc-inventory.md](doc-inventory.md) for the canonical cleanup map
- legacy redirect stubs: [verification-lanes.md](verification-lanes.md), [runtime-live-qa.md](runtime-live-qa.md), [runtime-bringup.md](runtime-bringup.md), [runtime-evidence.md](runtime-evidence.md), [manual-ui-qa.md](manual-ui-qa.md), [manual-windows-ux-qa.md](manual-windows-ux-qa.md), [manual-visual-qa.md](manual-visual-qa.md), [test-feedback-template.md](test-feedback-template.md)
- examples: `release-local-readiness.md`, `release-readiness.md`

Treat these as supporting material to be merged or archived over time rather than primary entrypoints. Experimental/future-track docs should stay out of the public product path unless a canonical product doc explicitly marks them as shipped.
