param(
    [string]$ProjectRoot = "C:\Dev\replyline",
    [string]$VaultName = "DevVault"
)

$loader = Join-Path $HOME ".dev-secrets\Load-ProjectSecrets.ps1"
if (-not (Test-Path $loader)) {
    Write-Host "Missing loader: $loader" -ForegroundColor Yellow
    return
}

. $loader

if (-not (Test-Path $ProjectRoot)) {
    Write-Host "Project path not found: $ProjectRoot" -ForegroundColor Yellow
    return
}

Set-Location $ProjectRoot
Load-ProjectSecrets -VaultName $VaultName

# Prefer a session GH_TOKEN for gh CLI commands.
if (-not $env:GH_TOKEN -and $env:GITHUB_CLASSIC_API_KEY) {
    $env:GH_TOKEN = $env:GITHUB_CLASSIC_API_KEY
}

Write-Host "Replyline dev session is ready in $ProjectRoot"
Write-Host "Next: pnpm tauri dev"
