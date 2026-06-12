# Script Lifecycle Matrix

`package.json` commands are classified in
[`scripts/check-script-lifecycle.mjs`](../scripts/check-script-lifecycle.mjs).
Run `pnpm scripts:lifecycle` to verify that every command has exactly one
classification.

## Required

Build, test, policy, security and release commands used by `verify:fast`,
`verify:full`, `verify:extended` and `verify:release-local`.

## Advisory

Readiness and release-freeze reports that provide evidence without replacing a
blocking quality gate.

## Optional

Developer tools, targeted tests, runtime probes, E2E wrappers and report
generators that are useful for a specific task but not required for every PR.

## Experimental

Machine-dependent performance, ZAP and Lighthouse lanes. Their absence or skip
must never be represented as completed validation.

Deprecated aliases are removed instead of being kept indefinitely. Git history
preserves their previous behavior.
