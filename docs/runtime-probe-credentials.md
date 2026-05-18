# Runtime Probe Credentials (Local Only)

`pnpm probe:runtime` is a real provider/runtime lane. It intentionally fails when required credentials are missing.

## Required environment variables

- `DEEPGRAM_API_KEY`
- `OPENROUTER_API_KEY` or `LLM_API_KEY`

`DEEPGRAM_API_KEY` is mandatory for STT probe.  
At least one LLM key (`OPENROUTER_API_KEY` or `LLM_API_KEY`) is mandatory for LLM probe.

## Local-only usage

- These variables are for local workstation runtime verification.
- Never commit real secrets to Git.
- Do not put real keys into tracked files (`.env`, docs, scripts, fixtures, reports).

## PowerShell temporary session example

```powershell
$env:DEEPGRAM_API_KEY = "your-deepgram-key"
$env:LLM_API_KEY = "your-llm-key"
pnpm probe:runtime
```

You can set `OPENROUTER_API_KEY` instead of `LLM_API_KEY` when that matches your provider route.

## Cleanup after run

```powershell
Remove-Item Env:DEEPGRAM_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:LLM_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:OPENROUTER_API_KEY -ErrorAction SilentlyContinue
```

## Expected failure semantics

If credentials are missing, `pnpm probe:runtime` failure is expected and is not a regression by itself.  
Runtime regression means probe fails even with valid local credentials and valid runtime setup.

## Optional helper script

- Template: `scripts/runtime-probe-env.example.ps1`
- Suggested local copy: `scripts/runtime-probe-env.local.ps1` (ignored by Git)
