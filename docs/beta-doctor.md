# Beta Doctor

`pnpm beta:doctor` is a fast local readiness check for Windows beta setup.

## What it checks

- Windows vs non-Windows execution context
- PowerShell version
- Node.js version
- `pnpm` version and compatibility with `pnpm@9.15.9`
- `git` availability
- `rustc`, `cargo`, and the Windows MSVC Rust target when available
- local Tauri CLI availability through the workspace package
- WebView2 Runtime presence or likely availability
- Visual Studio Build Tools / MSVC prerequisites when they can be detected safely
- repository root sanity and required project files
- core package scripts: `smoke`, `verify`, `beta:doctor`

## Usage

```bash
pnpm beta:doctor
pnpm beta:doctor -- --json
pwsh -File scripts/beta-doctor.ps1 -Json
```

## Output model

- `PASS` means the check is available and matches the expected baseline.
- `WARN` means the check is not fully confirmed or is non-blocking for a first pass.
- `FAIL` means the check is missing or cannot be trusted.

Final verdicts:

- `ready`
- `ready_with_warnings`
- `blocked`

## How to read warnings

Every `WARN` or `FAIL` row includes a next action. Use that action before retrying the doctor.

This command does not install anything automatically and does not fetch runtime dependencies from the network.

## What it does not do

- It does not validate provider credentials.
- It does not download WebView2, Node.js, Rust, or Visual Studio Build Tools.
- It does not run product smoke tests or change app configuration.
