# replyline/scripts/run-probe-with-credentials.ps1
# Loads API keys from Windows Credential Manager, then runs runtime_probe.
# Usage: pwsh -File scripts/run-probe-with-credentials.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== Replyline Live Probe Runner ===" -ForegroundColor Cyan
Write-Host ""

# Load the credential helper
. "$PSScriptRoot\set-probe-env.ps1"

# Check if keys were loaded
if (-not $env:DEEPGRAM_API_KEY) {
    Write-Host "ERROR: DEEPGRAM_API_KEY is not set. Cannot run probe." -ForegroundColor Red
    Write-Host "Please configure your Deepgram API key via the app settings or set the environment variable." -ForegroundColor Red
    exit 1
}
if (-not $env:LLM_API_KEY) {
    Write-Host "ERROR: LLM_API_KEY is not set. Cannot run probe." -ForegroundColor Red
    Write-Host "Please configure your LLM API key via the app settings or set the environment variable." -ForegroundColor Red
    exit 1
}

# Ensure OPENROUTER_API_KEY is also set (runtime_probe checks both)
if (-not $env:OPENROUTER_API_KEY) {
    $env:OPENROUTER_API_KEY = $env:LLM_API_KEY
}

Write-Host ""
Write-Host "Running runtime probe..." -ForegroundColor Cyan
Write-Host ""

# Run the probe
$result = cargo run --manifest-path src-tauri/Cargo.toml --bin runtime_probe 2>&1
$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "=== Probe finished (exit code: $exitCode) ===" -ForegroundColor Cyan

# Output the result
$result

exit $exitCode
