# Script Lifecycle Matrix

`package.json` commands are classified in
[`scripts/check-script-lifecycle.mjs`](../scripts/check-script-lifecycle.mjs).
Run `pnpm scripts:lifecycle` to verify that every command has exactly one
classification.

## Required

Build, test, policy, security and release commands used by canonical profiles
such as `test:unit`, `test:contracts`, `verify:fast`, `verify:standard`,
`verify:full`, `verify:extended` and `verify:release-local`.
`verify:extended` is the canonical owner of the addon lanes it composes, so CI
should reference `pnpm verify:extended` directly instead of duplicating its
child commands as separate canonical steps.

## Advisory

Readiness and evidence commands that are not themselves the canonical gate.
When a report is intended to be blocking, its canonical name must end with
`:strict`.

## Optional

Developer tools, targeted tests, runtime probes, E2E wrappers and report
generators that are useful for a specific task but not required for every PR.

## Experimental

Machine-dependent performance, ZAP and Lighthouse lanes. Their absence or skip
must never be represented as completed validation.

Compatibility aliases may remain temporarily, but canonical docs/workflows must
point to the non-alias profile names.
