$ErrorActionPreference = 'Continue'

$checks = @(
  @{ Name = 'winget'; Cmd = 'winget --version' },
  @{ Name = 'node'; Cmd = 'node -v' },
  @{ Name = 'pnpm'; Cmd = 'pnpm -v' },
  @{ Name = 'rustc'; Cmd = 'rustc -V' },
  @{ Name = 'cargo'; Cmd = 'cargo -V' },
  @{ Name = 'playwright'; Cmd = 'pnpm exec playwright --version' },
  @{ Name = 'bru'; Cmd = 'pnpm exec bru --version' },
  @{ Name = 'newman'; Cmd = 'pnpm exec newman --version' },
  @{ Name = 'lhci'; Cmd = 'pnpm exec lhci --version' },
  @{ Name = 'wdio'; Cmd = 'pnpm exec wdio --version' },
  @{ Name = 'k6'; Cmd = '& "C:\Program Files\k6\k6.exe" version' },
  @{ Name = 'tauri-driver'; Cmd = '& "$env:USERPROFILE\.cargo\bin\tauri-driver.exe" --help' },
  @{ Name = 'msedgedriver'; Cmd = '.\msedgedriver.exe --version' },
  @{ Name = 'zap'; Cmd = '& "C:\Program Files\ZAP\Zed Attack Proxy\zap.bat" -version' }
)

foreach ($c in $checks) {
  Write-Host "=== $($c.Name) ==="
  try {
    Invoke-Expression $c.Cmd
  } catch {
    Write-Host "FAILED: $($_.Exception.Message)"
  }
}
