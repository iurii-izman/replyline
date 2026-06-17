# Desktop E2E Smoke Guide

> **Status:** Optional/manual lane. Not a blocking CI gate.
> **Scope:** Artifact bring-up smoke — launch, shell render, input survival.
> **Does NOT prove:** Provider flows, settings persistence, full UX, cross-machine stability.

This guide covers the desktop E2E smoke lane for Windows. The lane checks that a
built Tauri artifact launches and the app shell renders correctly. It intentionally
stays minimal — full UX testing requires mocked platforms (web E2E) or live
provider keys (manual QA).

## What is Automated

| Check | Description | Requires keys? |
|---|---|---|
| Window handle | App launches and creates a WebDriver session | No |
| App root render | `data-testid="app-root"` is visible in any state | No |
| App header render | `data-testid="app-header"` (shell chrome) is present | No |
| Keyboard input | Sending `r` key doesn't crash the session | No |
| Tab navigation | Two Tab presses don't crash the session | No |

All 5 checks work regardless of provider configuration. The app may be in setup
state (no keys configured), idle state, or error state — the shell always renders.

## What is NOT Automated (remains manual)

| Check | Why manual |
|---|---|
| Settings panel opens and is interactive | Requires specific UI state (not setup) |
| ContextPack panel opens | Requires app to be past setup |
| Hotkey capture → STT → LLM → card | Requires live Deepgram + LLM keys |
| Retry path | Requires prior capture |
| Tray lifecycle (open/hide/quit) | Requires OS-level interaction beyond WebDriver |
| Cross-machine smoke | Requires ≥2 Windows machines |
| Visual regression | Requires stable rendering + baseline screenshots |

## How to Run

### Prerequisites

1. **Build the app:**
   ```powershell
   pnpm tauri build
   ```

2. **Install Tauri WebDriver:**
   ```powershell
   cargo install tauri-driver
   ```

3. **Install optional Node dependencies:**
   ```powershell
   pnpm install --include=optional
   ```

4. **Set environment variables:**
   ```powershell
   $env:TAURI_APP_PATH = 'src-tauri\target\release\replyline.exe'
   # Optional: custom WebDriver port
   $env:TAURI_DRIVER_PORT = '4444'
   ```

### Run

```powershell
# Optional lane — skips if deps/env missing
pnpm test:e2e:desktop

# Required lane — fails if deps/env missing
pnpm test:e2e:desktop:required
```

### Expected output (pass)

```
[desktop-e2e:required] TAURI_APP_PATH: C:\Dev\replyline\src-tauri\target\release\replyline.exe
[desktop-e2e:required] TAURI_DRIVER_PORT: 4444
[desktop-e2e:required] Running tauri.smoke.mjs...

 tauri desktop artifact smoke
    ✓ launches the desktop artifact and creates a webdriver session
    ✓ renders the app root element in any state
    ✓ renders the app header (shell chrome is present)
    ✓ accepts minimal keyboard input without losing the session
    ✓ accepts Tab navigation without crashing

 5 passing

[desktop-e2e:required] Desktop E2E smoke PASSED.
```

## Troubleshooting

### `TAURI_APP_PATH is not set`

The env var is required. Build the app first, then set the path:
```powershell
pnpm tauri build
$env:TAURI_APP_PATH = 'src-tauri\target\release\replyline.exe'
```

### `webdriverio is not installed`

Desktop E2E uses WebDriverIO, which is an optional dependency:
```powershell
pnpm install --include=optional
```

### `Failed to spawn wdio`

Tauri WebDriver (`tauri-driver`) must be installed separately:
```powershell
cargo install tauri-driver
```

Verify it's available:
```powershell
tauri-driver --version
```

### `Another instance of replyline.exe is already running`

The WebDriver lane launches its own instance. Kill any existing `replyline.exe`
processes before running:
```powershell
Get-Process replyline -ErrorAction SilentlyContinue | Stop-Process -Force
```

### `App root element exists but is not visible`

The app launched but the window may not be rendering. Check:
- Windows display scaling (try 100%).
- GPU driver issues (WebView2 requires GPU acceleration or software fallback).
- `app.log` in `%LOCALAPPDATA%\com.replyline.app\logs\` for startup errors.

### `Session crashed during Tab navigation`

Focus handling may have triggered an unexpected state. Check `app.log` for errors.
This is often caused by the app being in a transitional state (booting/setup) when
Tab is pressed. Retry after a short wait.

### `Session became unavailable after keyboard input`

The app process crashed. Check:
- `app.log` for crash details.
- Windows Event Viewer → Application logs.
- Antivirus may have terminated the process.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `TAURI_APP_PATH` | ✅ Yes | — | Path to the built `replyline.exe` |
| `TAURI_DRIVER_PORT` | No | `4444` | WebDriver server port |

## CI Integration

Desktop E2E is **not** a blocking CI gate:

| Workflow | Desktop E2E status |
|---|---|
| `ci.yml` (push/PR) | ❌ Not run — requires Windows runner + artifact build |
| `verify:extended` (weekly) | ⚠️ Optional — runs if deps present, skips gracefully |
| `release-on-tag.yml` | ❌ Not run — uses `verify:full` which excludes desktop E2E |

Desktop E2E can be added to CI when:
- Windows runner with GPU/WebView2 support is reliably available.
- Artifact build time is acceptable in the CI budget.
- The lane proves stable over ≥10 consecutive runs.

Until then, it remains a local operator tool.

## Related Docs

- [testing.md](testing.md) — canonical testing guide, lane boundaries
- [release.md](release.md) — release decision model
- [manual-qa.md](manual-qa.md) — manual QA checklist
- [runtime.md](runtime.md) — runtime evidence and claim labels
- [../../tests/e2e/desktop/tauri.smoke.mjs](../../tests/e2e/desktop/tauri.smoke.mjs) — the smoke spec
- [../../tests/e2e/desktop/wdio.tauri.conf.mjs](../../tests/e2e/desktop/wdio.tauri.conf.mjs) — WebDriverIO config
- [../../scripts/run-required-desktop-e2e.mjs](../../scripts/run-required-desktop-e2e.mjs) — required lane runner
