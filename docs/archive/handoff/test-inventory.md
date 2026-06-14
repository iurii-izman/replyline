# Test Inventory Archive

Historical audit artifact for the verification surface. Active guidance moved to [../../engineering/testing.md](../../engineering/testing.md).

## Current summary

### Public profiles

- `pnpm test:quick`
- `pnpm verify`
- `pnpm verify:full`
- `pnpm verify:extended`

### Internal building blocks

- `pnpm test:unit`
- `pnpm test:contracts`
- `pnpm test:quality`
- `pnpm smoke`
- `pnpm verify:fast`
- `pnpm verify:standard`

### Targeted lanes

- Docs/policy: `pnpm test:consistency`, `pnpm test:doc-links`, `pnpm copy:check`, `pnpm scripts:lifecycle`
- E2E: `pnpm test:e2e:web:smoke`, `pnpm test:e2e:web:visual`, `pnpm test:e2e:desktop`
- Runtime/operator: `pnpm probe:*`, `pnpm runtime:preflight`, `pnpm evidence:bundle`
- Reports: `pnpm report:*`
- Dependency/security: `pnpm rust:deps`, `pnpm audit:npm`, `pnpm test:security-lanes`

### Alias note

- `pnpm verify` -> `pnpm verify:fast`
- `pnpm verify:full` -> internal pre-handoff composition + strict release/dependency gates

This file is archival and should not be expanded into a second canonical guide.
