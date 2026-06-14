# Engineering Release Guide

Canonical engineering source of truth for release decisions, freeze semantics, packaging truth, and operator handoff.

## Purpose

- Keep release claims honest and evidence-based.
- Define the difference between local readiness, release-quality readiness, and public binary publication.
- Consolidate the previous `release-readiness`, `release-local-readiness`, `release-freeze-matrix`, and `release-incident-classification` guidance into one active document.

## Release Decision Model

Use these decision states:

| Decision | Meaning | Minimum truth |
| --- | --- | --- |
| `No-Go` | Release or handoff is blocked. | At least one open `S0` or `S1`, or a required gate is red. |
| `Conditional Go` | Release can proceed only with explicit risk sign-off. | Only `S2` issues remain, mitigations are documented, and an owner/date exists. |
| `Go` | Release/handoff can proceed. | Required gates are green and only `S3` or accepted non-blocking notes remain. |

Decision rules:

1. Any open `S0` or `S1` means `No-Go`.
2. Only `S2` issues may be accepted, and only with explicit mitigation, owner, and recheck date.
3. `S3` issues do not block release, but they should still be tracked when they affect operator confidence.

## Required Gates

### Default engineering handoff

Run:

```bash
pnpm verify
pnpm release:freeze:check
```

`verify` is the default public validation profile for normal code changes. Internal automation may still refer to `verify:fast`, but that name is not a public canonical entrypoint.

### Release-quality decision

Run:

```bash
pnpm verify:full
```

`verify:full` is the release-quality profile and includes:

- internal pre-handoff composition such as `pnpm verify:standard`
- `pnpm release:freeze:check:strict`
- `pnpm rust:deps`
- `pnpm audit:npm`
- one canonical `pnpm test:quality` pass
- artifact-only strict summary/readiness reports

### Required conditional gates

- If `package.json` or `pnpm-lock.yaml` changed: run `pnpm audit:npm`.
- If `src-tauri/Cargo.toml` or the Rust dependency graph changed: run `pnpm rust:deps`.
- For docs/path cleanup affecting docs or policy references: run `pnpm test:doc-links` and `pnpm test:consistency`.

### Evidence/report gates used in release decisions

- Blocking inside `pnpm verify:full`:
- `pnpm report:release-readiness:strict`
- `pnpm report:runtime-quality:strict`
- Advisory/manual when extra interview evidence is needed:
- `pnpm report:interview-quality:strict`

These reports do not replace the verify lanes. They provide structured evidence for final release judgment.

## Release-Freeze Semantics

Freeze baseline source of truth:

- `docs/release-freeze-baseline.json`

Commands:

```bash
pnpm release:freeze:check
pnpm release:freeze:check:strict
```

Semantics:

- `pnpm release:freeze:check` is advisory. It reports changed files, outside-freeze paths, and writes `reports/release-freeze-check.json`.
- `pnpm release:freeze:check:strict` is blocking. It exits non-zero when out-of-freeze changes are detected.
- In CI with `--base <ref>`, the guard uses three-dot comparison semantics and excludes local untracked files.

Freeze guardrails:

- No stack expansion.
- No architecture boundary drift across `src/app/model.ts`, `src/app/platform.ts`, and `src/app/controller.ts`.
- Core quality/security lanes must remain intact: `pnpm verify`, `pnpm rust:deps`, `pnpm audit:npm`.

Baseline scenarios protected by freeze:

- `bootstrap-load`
- `hotkey-capture-release`
- `capture-stop-analyze`
- `retry-last-analysis`
- `settings-save-and-reload`
- `secrets-persist-separate-from-settings`
- `clear-context`
- `runtime-probe-and-evidence`

## Incident Classification

| Severity | Definition | Release decision |
| --- | --- | --- |
| `S0` | Data leak, credential exposure, or critical trust/security breach. | `No-Go` |
| `S1` | Core path unavailable (`capture -> stt -> llm -> card`) or repeat crash/restart loop. | `No-Go` |
| `S2` | Degraded core quality with workaround, retry path, or partial failure. | `Conditional Go` |
| `S3` | Minor UX, docs, or non-core drift. | `Go` |

Severity sync rules:

- Any `pnpm audit:npm` high/critical advisory is treated as `S0`.
- Any `pnpm rust:deps` non-allowlisted failure is treated as `S0`.
- Diagnostics bundle regressions that remove required `stage`, `outcome`, or `code` fields are at least `S1`.

## Packaging Truth

Current packaging and publication truth:

- Unsigned artifacts are internal artifacts only.
- A public release binary is allowed only after an Authenticode-verified signed package exists.
- Source/developer beta remains the current public posture unless evidence and signing posture change.

Operational boundaries:

- `release-on-tag.yml` can build Windows bundles on `v*` tags.
- `release-on-tag.yml` must rerun `pnpm verify:full` before packaging or attaching release artifacts.
- `.github/workflows/dependency-checks.yml` owns scheduled/manual `pnpm rust:deps` and `pnpm audit:npm` runs outside the fast PR lane.
- `.github/workflows/windows-packaging-manual.yml` is a manual packaging lane for operator review.
- `.github/workflows/windows-packaging-manual.yml` must run `pnpm verify` before building artifacts.
- If signing secrets are absent, or Authenticode verification fails, artifacts remain internal/unsigned workflow artifacts.
- Public GitHub Release binary attachment is valid only for signed and verified Windows packages.
- Do not claim public installer readiness from unsigned artifacts, workflow artifacts, or local builds.

Evidence still required before public installer claims:

- Clean Windows 10 install pass.
- Clean Windows 11 install pass.
- First launch success and tray lifecycle sanity (`open`, `hide`, `quit`).
- Uninstall/local data behavior documented truthfully.
- Same-day packaged runtime sanity for `capture -> stt -> llm -> card`.

## Release Operator Checklist

1. Confirm scope: the release stays within the current product direction and freeze guardrails.
2. Run `pnpm verify` only when you need the default non-release baseline separately.
3. Run `pnpm test:doc-links` for docs/path updates.
4. Run `pnpm test:consistency` when policy/docs contract content changed.
5. Run `pnpm release:freeze:check` and summarize any advisory findings.
6. Run `pnpm verify:full` for the single release-quality decision pass.
7. Review `pnpm report:release-readiness:strict` output and capture blockers/warnings.
8. Classify any open incidents as `S0`/`S1`/`S2`/`S3`.
9. Verify packaging truth before any public claim:
   - unsigned artifacts remain internal
   - signed Authenticode-verified package is required for a public binary
10. Link the active release notes draft plus evidence artifacts, not a historical handoff plan.
11. Record residual risks explicitly when using `Conditional Go`.

## Manual Release Checklist

These checks stay manual even when `pnpm beta:release-check` is green.

### Setup and accessibility

- First launch shows the expected setup guidance.
- Missing provider inputs are explained clearly.
- Settings save and return flow remains obvious.
- The release flow remains usable with keyboard only.
- Focus order stays predictable in Settings and Interview Mode.
- Primary actions have visible focus states.

### Windows environment sanity

- Verified on a separate clean Windows profile.
- App starts without relying on pre-existing local state.
- The evidence is recorded as manual proof, not an automated claim.

### Provider setup paths

- Deepgram key entry, error handling, and recovery steps remain clear.
- OpenRouter base URL, key, and model selection remain understandable.
- Custom OpenAI-compatible endpoint and model configuration still work as documented.

### Interview and export paths

- Candidate Pack prepare/save/clear and preview flow still work in Interview Mode.
- Full markdown export remains explicitly sensitive.
- Redacted markdown export remains the preferred sharing path.

### Local data and screenshots

- Release notes explain how to clear local reports and app data.
- The docs distinguish uninstall from local data cleanup.
- No claim is made that uninstall removes every local artifact automatically.
- Release screenshots stay under `docs/releases/v0.2.0-beta.2/screenshots/`.
- Capture first-run, Settings, Interview Mode, Candidate Pack, and export states.

## Reporting Rule

- Use the sanitized smoke report for issue filing.
- Do not paste raw transcripts, prompts, Candidate Pack values, or provider bodies into public issue text.
- Link the report instead of paraphrasing raw diagnostic output.

## Related Docs

- [engineering/testing.md](testing.md)
- [engineering/runtime.md](runtime.md)
- [engineering/operations.md](operations.md)
- [engineering/manual-qa.md](manual-qa.md)
- [beta-smoke-report.md](../beta-smoke-report.md)
- [release-notes/v0.2.0-beta.1.md](../release-notes/v0.2.0-beta.1.md)
