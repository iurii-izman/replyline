# Replyline Screenshot Checklist

> **Status:** Public-safe demo screenshot pack is available from the Playwright
> visual baseline. Signed desktop release screenshots are still a separate,
> pending deliverable.

This document defines the public-safe screenshot policy for README, user guide,
and release notes, plus the redaction rules and the reproducible export path.

## General rules

- **No AI-generated UI mockups.** Public screenshots must come from a real
  Replyline render path.
- **Synthetic/demo content only.** No real names, projects, companies,
  credentials, transcripts, or confidential details.
- **Redact before capture, not after.** Configure synthetic inputs first; do not
  rely on manual paint-over edits.
- **PNG format**, reasonable resolution (1200-1600px wide). Keep file sizes
  under 500 KB where possible.

## What must never appear in a public screenshot

| Category | Examples |
|---|---|
| API keys / tokens | Deepgram key, LLM API key, bearer tokens, any key-like string |
| Raw transcripts | Full captured text, STT output |
| Raw ContextPack content | Real role descriptions, company names, project details |
| Provider response bodies | Raw LLM JSON, card internals beyond what the UI shows |
| Personal data | Real names, emails, phone numbers, home paths with username |
| Debug traces | `full_local` trace content, WAV paths, internal file paths |
| Credential Manager entries | Screenshots of Windows Credential Manager |

## Screenshot / artifact policy

- **Public-safe demo pack:** committed Playwright PNG snapshots under
  `tests/e2e/web/visual.spec.ts-snapshots/`. These are synthetic, reproducible,
  and safe to reference in docs/release materials.
- **Docs surface:** `README.md`, `docs/product/user-guide.md`, and release notes
  reference named screenshot slots/states instead of embedding ad-hoc local files.
- **Signed desktop release captures:** still pending. Do not present web visual
  snapshots as signed-build proof or installer screenshots.
- **No binary screenshots under `docs/product/screenshots/` yet.** Keep this
  document as the source of truth for slots, policy, and export instructions.

## Public-safe demo state matrix

These are the curated states for the docs/release demo pack. All are driven by
synthetic data in `tests/e2e/web/replyline-fixture.ts`.

| # | State | Snapshot files | Primary use |
|---|---|---|---|
| 1 | Idle - no context | `idle-ready-no-context-*.png` | README, user guide first launch |
| 2 | Idle - active context | `idle-ready-active-context-*.png` | user guide context activation |
| 3 | Context Workspace | `context-pack-active-*.png` | user guide ContextPack / workspace flow |
| 4 | Answer ready - rich card | `answer-ready-*.png` | README, user guide, release notes |
| 5 | Processing | `capturing.png`, `analyzing.png` | release notes / troubleshooting |
| 6 | Settings - overview | `settings-overview-*.png` | user guide setup/settings |
| 7 | Provider error recovery | `error-recovery-*.png` | user guide troubleshooting, release notes |

Additional automated states remain available when needed:

| State | Snapshot files |
|---|---|
| Setup missing | `setup-missing-*.png` |
| Context Workspace - empty | `context-pack-empty-*.png` |
| Settings - runtime check error | `settings-runtime-check-error-*.png` |

## Redaction checklist

Before publishing or sharing any screenshot, verify:

- [ ] No API key value visible
- [ ] No raw transcript text visible
- [ ] Synthetic content only - no real names, projects, or companies
- [ ] No full file paths with username (`C:\Users\...`)
- [ ] No provider response bodies
- [ ] No debug trace content
- [ ] `debugTraceMode` set to `off` or `redacted`
- [ ] ContextPack content is synthetic/generic
- [ ] Interview/report content, if shown, is synthetic only

## Reproducible screenshot command

Generate or refresh the public-safe demo pack locally:

```powershell
pnpm exec playwright test tests/e2e/web/visual.spec.ts --update-snapshots
New-Item -ItemType Directory -Force artifacts/demo-screenshot-pack | Out-Null
Copy-Item tests/e2e/web/visual.spec.ts-snapshots/*.png artifacts/demo-screenshot-pack/
```

This produces:

- committed baselines in `tests/e2e/web/visual.spec.ts-snapshots/`
- optional export copies in `artifacts/demo-screenshot-pack/`

If CI or a manual workflow generates `artifacts/demo-screenshot-pack/`, that
directory is safe to upload as a GitHub Actions artifact for review. Do not treat
it as signed-build evidence.

After regenerating screenshots:

1. Review PNGs visually.
2. Run `pnpm test:public-footprint`.
3. Run `pnpm test:e2e:web:visual` to confirm the baseline is stable.

## Manual desktop captures

Manual desktop captures are still allowed for future signed-release screenshots,
but they are a separate track from this public-safe demo pack.

Rules for that path:

1. Use a real Replyline build only.
2. Keep content synthetic.
3. Do not claim signed-build proof unless the signed artifact actually exists.
4. Run `pnpm test:public-footprint` after adding any PNG files to the repo.

## Automated visual coverage notes

- Visual regression snapshots live in `tests/e2e/web/visual.spec.ts-snapshots/`.
- The suite covers 11 UI states across 3 viewports
  (compact `900x620`, normal `1200x760`, wide `1440x900`).
- Layout safety checks also assert no horizontal overflow, visible sticky action
  dock, clean context-chip wrapping, no answer truncation, and bounded
  settings sidebar behavior.
- Snapshots are OS-specific. Current baselines are for `chromium-win32`.

## Related docs

- [copy-rules.md](../copy-rules.md) - product wording constraints
- [privacy.md](privacy.md) - data flow and storage boundaries
- [user-guide.md](user-guide.md) - setup and state references
- [engineering/release.md](../engineering/release.md) - release screenshot requirements
