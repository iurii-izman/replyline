# Release Checklist

Canonical checklist for beta release readiness and handoff review.

## Purpose

- Keep release claims honest.
- Separate automated gates from manual verification.
- Point testers to the exact docs and artifacts needed for review.

## Automated gates

- `pnpm beta:doctor`
- `pnpm beta:smoke-report`
- `pnpm verify`
- `pnpm verify:full`
- `pnpm test:quality`
- `pnpm test:doc-links`
- `pnpm release:freeze:check:strict`

## Advisory evidence

- `pnpm report:interview-quality:strict` when you need a dedicated interview-quality report after the canonical gate

## Required docs and artifacts

- [Engineering release guide](engineering/release.md)
- [Sanitized smoke report](beta-smoke-report.md)

## Manual checklist

These items must be reviewed by a human. They are not auto-marked as complete by `beta:release-check`.

### first-run setup UX audit

- [ ] First launch shows the expected setup guidance.
- [ ] Missing provider inputs are explained clearly.
- [ ] Settings save and return flow remains obvious.

### keyboard-only accessibility

- [ ] App shell can be navigated without a mouse.
- [ ] Focus order is predictable in Settings and Interview Mode.
- [ ] Primary actions have visible focus states.

### clean Windows profile install

- [ ] Verified on a separate clean Windows profile.
- [ ] App starts without relying on pre-existing local state.
- [ ] This is documented as manual evidence, not an automated claim.

### Deepgram setup path

- [ ] API key entry is clear.
- [ ] Error states point back to Settings.
- [ ] Recovery steps are visible and understandable.

### OpenRouter setup path

- [ ] Base URL and key fields are understood.
- [ ] Model selection and preset behavior are clear.
- [ ] Provider errors are explainable without raw leakage.

### custom OpenAI-compatible path

- [ ] Custom base URL works as documented.
- [ ] Model field is sufficient for the route.
- [ ] The path does not imply OpenRouter-only behavior.

### Candidate Pack preparation

- [ ] Candidate Pack can be prepared from pasted source material.
- [ ] Save and clear actions behave as expected.
- [ ] Preview and warning copy stay readable.

### Interview report export

- [ ] Full markdown export is treated as sensitive.
- [ ] Redacted markdown export is the preferred sharing path.
- [ ] Exported files are reviewed before sharing outside the repo.

### uninstall/clear local data note

- [ ] The release notes explain how to clear local reports and app data.
- [ ] The docs distinguish uninstall from local data cleanup.
- [ ] No claim is made that uninstall automatically removes every local artifact.

## Screenshot expectations

- Keep release screenshots under `docs/releases/v0.2.0-beta.2/screenshots/`.
- Capture first-run, Settings, Interview Mode, Candidate Pack, and export states.
- Update the checklist alongside any UI changes that affect release visuals.

## Reporting rule

- Use the sanitized smoke report for issue filing.
- Do not paste raw transcripts, prompts, Candidate Pack values, or provider bodies into public issue text.
- Link the report instead of paraphrasing the raw diagnostic output.
