## Scope

- [ ] Keeps the bounded beta paths and does not add hidden-mode or unrelated product behavior
- [ ] Follows the architecture boundaries in `AGENTS.md`
- [ ] Includes tests with behavior changes

## Validation

- [ ] `pnpm verify`
- [ ] `pnpm verify:full` for release-sensitive or substantial changes
- [ ] Additional conditional dependency/security gates were run when required

## Privacy And Trust

- [ ] No credentials, raw transcripts, provider responses, or Candidate Pack values are included
- [ ] User-facing wording follows `docs/copy-rules.md`
- [ ] Runtime claims use `measured`, `target`, or `pending verification` accurately

## Summary

Describe the problem, the smallest useful change, validation evidence, and any residual risk.
