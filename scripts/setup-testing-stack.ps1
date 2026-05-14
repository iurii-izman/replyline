param(
  [switch]$SkipWinget,
  [switch]$SkipNpm,
  [switch]$SkipRust
)

$ErrorActionPreference = 'Stop'

function Install-WingetPackage([string]$Id) {
  $installed = winget list --id $Id --accept-source-agreements 2>$null
  if ($LASTEXITCODE -eq 0 -and $installed -match $Id) {
    Write-Host "$Id already installed"
    return
  }
  winget install --id $Id -e --accept-package-agreements --accept-source-agreements
}

if (-not $SkipWinget) {
  Install-WingetPackage 'Postman.Postman'
  Install-WingetPackage 'Postman.Postman.CLI'
  Install-WingetPackage 'Bruno.Bruno'
  Install-WingetPackage 'GrafanaLabs.k6'
  Install-WingetPackage 'ZAP.ZAP'
}

if (-not $SkipNpm) {
  pnpm add -Dw @playwright/test @axe-core/playwright @lhci/cli @usebruno/cli @wdio/cli webdriverio newman
  pnpm exec playwright install
}

if (-not $SkipRust) {
  cargo install tauri-driver --locked
  cargo install --git https://github.com/chippers/msedgedriver-tool
  & "$env:USERPROFILE\.cargo\bin\msedgedriver-tool.exe"
}

Write-Host 'Testing stack bootstrap complete.'
