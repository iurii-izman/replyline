# Script Lifecycle Matrix

`package.json` commands are classified in
[`scripts/check-script-lifecycle.mjs`](../scripts/check-script-lifecycle.mjs).
Run `pnpm scripts:lifecycle` to verify that every command has exactly one
classification.

## Required

Build, test, policy, security, and release commands that are on a blocking
path of the canonical local/release profiles: `test:quick`, `test:unit`,
`test:contracts`, `smoke`, `verify:fast`, `verify:standard`, and
`verify:full`.

## Advisory

Readiness, addon, and evidence commands that are reviewed intentionally but are
not part of the default PR gate. This includes `verify:extended`,
`verify:release-local`, and standalone advisory reports such as
`release:freeze:check`.
When a report is intended to be blocking inside a release profile, its
canonical name must end with `:strict`.

## Optional

Developer tools, targeted tests, runtime probes, operator/beta helpers, E2E
wrappers, and report generators that are useful for a specific task but not
required for every PR.

## Experimental

Machine-dependent performance, ZAP and Lighthouse lanes. Their absence or skip
must never be represented as completed validation.

Compatibility aliases may remain temporarily, but canonical docs/workflows must
point to the non-alias profile names.
