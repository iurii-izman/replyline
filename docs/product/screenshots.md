# Replyline Screenshot Checklist

> **Status:** Placeholder slots defined. Actual screenshots pending — do not add fake or
> AI-generated screenshots. Every slot must be filled from a real build.

This document lists every screenshot needed for public docs, what each must show,
what must be redacted, and which slots are public-safe.

## General rules

- **No fake screenshots.** Every image must come from a real Replyline build.
- **Redact before capture, not after.** Configure the app with synthetic/test data
  before taking the screenshot.
- **Use synthetic content only.** No real names, company names, project names,
  credentials, or confidential information in any screenshot.
- **PNG format**, reasonable resolution (1200–1600px wide). Keep file sizes
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

## Public-safe screenshot slots

These slots are needed for public-facing docs (README, user-guide, landing page).
All use synthetic/test content only.

| # | Slot | Filename | What it shows | Used in |
|---|---|---|---|---|
| 1 | First launch — idle state | `first-launch-idle.png` | Tray icon + MainSurface idle: ContextPack hint, hotkey instruction (`Ctrl+Alt+Space`), no active capture | user-guide §2 |
| 2 | Settings — providers configured | `settings-providers.png` | Settings panel: Deepgram key field (dots/hidden), LLM base URL filled, model name filled, preset selector visible | user-guide §2 |
| 3 | ContextPack — create form | `context-pack-create.png` | ContextPack panel: create form with synthetic name and context text filled, Save button visible | user-guide §2 |
| 4 | ContextPack — active badge | `context-pack-active.png` | MainSurface with active ContextPack badge visible, idle state, pack name shown | user-guide §2 |
| 5 | First card result | `first-card.png` | MainSurface showing completed card: gist, say_now, next_move visible. No raw transcript shown | user-guide §2 |
| 6 | ContextPack list | `context-pack-list.png` | ContextPack panel: list of 2–3 saved packs, one active (highlighted), edit/delete buttons visible | user-guide §7 |
| 7 | Settings — model presets | `settings-model-presets.png` | Settings panel: model preset dropdown expanded showing available presets | user-guide §4, provider-setup |
| 8 | Interview Mode — session active | `interview-mode-session.png` | Interview Mode surface: session active, first card visible, card navigation visible | user-guide §6 |
| 9 | Export dialog | `export-dialog.png` | Export dialog: redacted vs full export options visible, warning text about sensitivity | user-guide §8 |
| 10 | Tray menu | `tray-menu.png` | Windows system tray: Replyline icon, right-click menu with Show/Hide/Quit | user-guide §2 |

## Internal-only slots

These slots are for internal docs (release notes, beta evidence, engineering docs).
They may contain more detail but still follow the same redaction rules.

| # | Slot | Filename | What it shows | Used in |
|---|---|---|---|---|
| I1 | Settings — full panel | `settings-full.png` | Entire Settings panel scrolled to show all sections | release notes |
| I2 | ContextPack — edit form | `context-pack-edit.png` | ContextPack edit form with existing content, Save/Cancel buttons | engineering docs |
| I3 | Error state — missing key | `error-missing-key.png` | MainSurface error notice when Deepgram key is missing | troubleshooting |
| I4 | Health check result | `health-check.png` | Settings health check result panel | release notes |

## Redaction checklist (per slot)

Before publishing any screenshot, verify:

- [ ] No API key value visible (field shows dots or is blank)
- [ ] No raw transcript text visible
- [ ] Synthetic content only — no real names, projects, companies
- [ ] No full file paths with username (`C:\Users\...`)
- [ ] No provider response bodies
- [ ] No debug trace content
- [ ] `debugTraceMode` set to `off` or `redacted` before capture
- [ ] ContextPack content is synthetic/generic
- [ ] Interview report content (if shown) is synthetic only

## Capturing screenshots

### Windows built-in

```
Win+Shift+S  →  select area  →  paste into image editor  →  save as PNG
```

### Recommended workflow

1. Launch Replyline with `pnpm beta:start`.
2. Configure providers with synthetic/test keys (or leave fields empty for
   UI-only screenshots).
3. Create a synthetic ContextPack with generic content.
4. Capture a synthetic audio snippet for card screenshots.
5. Take the screenshot with `Win+Shift+S`.
6. Review the captured area for any redaction violations before saving.
7. Save to `docs/product/screenshots/` (create directory if missing).
8. Run `pnpm test:public-footprint` to confirm no secret leaks in image metadata.

## Placeholder policy

Until actual screenshots are captured, docs use placeholder markers:

```
> **Screenshot placeholder**: `filename.png` — description of what the slot shows.
```

Once a real screenshot is captured:

1. Save the file to `docs/product/screenshots/`.
2. Replace the placeholder with a proper image markdown reference.
3. Update this checklist to mark the slot as filled.

**Never** use AI-generated images, mockups from design tools, or screenshots from
other applications as placeholders for Replyline UI.

## Related docs

- [copy-rules.md](../copy-rules.md) — product wording constraints
- [privacy.md](privacy.md) — data flow and storage boundaries
- [user-guide.md](user-guide.md) — where screenshots are placed
- [engineering/release.md](../engineering/release.md) — release screenshot requirements
