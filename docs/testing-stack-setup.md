# Testing Stack Setup

## Install From Scratch

```powershell
pwsh -File scripts/setup-testing-stack.ps1
```

## Verify Installed Toolchain

```powershell
pwsh -File scripts/verify-testing-stack.ps1
```

## Run Layers

- API Bruno: `pnpm test:api:bruno`
- API Postman/Newman: `pnpm test:api:postman`
- Web E2E: `pnpm test:e2e:web`
- Desktop E2E: `pnpm test:e2e:desktop` (requires `TAURI_APP_PATH` and `tauri-driver`)
- k6 smoke: `pnpm test:perf:k6`
- Lighthouse: `pnpm test:ux:lighthouse`
- ZAP baseline: `pnpm test:sec:zap`

## PR vs Weekly

- Baseline install gate: `pnpm install --frozen-lockfile`
- PR fast lane: `pnpm verify`
- Weekly extended lane: API + E2E + perf + UX + sec scripts

## Secrets And Env

- Never put tokens in git-tracked files.
- Postman CLI login/token should be provided by local env/session.
- Use local env vars like `ZAP_TARGET_URL`, `K6_BASE_URL`, `E2E_BASE_URL`, `TAURI_APP_PATH`.

## Troubleshooting

- Installed but not in `PATH`: use absolute path or restart shell.
- Postman CLI auth missing: run `postman-cli login`.
- Edge version changed: rerun `msedgedriver-tool.exe`.
- Desktop smoke exit code `2`: set `TAURI_APP_PATH`.
